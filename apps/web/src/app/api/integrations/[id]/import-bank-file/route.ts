import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const STORAGE_BUCKET = 'bank-imports';

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function parseDecimal(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const s = input
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDateToYYYYMMDD(input: unknown): string | null {
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return null;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return input.toISOString().slice(0, 10);
  }
  return null;
}

async function getAccountAndIntegrationOrThrow(supabase: any, integrationId: string, token: string) {
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!account) {
    throw Object.assign(new Error('Account not found'), { status: 404 });
  }

  const { data: integration, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('account_id', account.id)
    .single();
  if (error || !integration) {
    throw Object.assign(new Error('Integration not found'), { status: 404 });
  }
  if (integration.integration_type !== 'csv_bank') {
    throw Object.assign(new Error('Integration type must be csv_bank'), { status: 400 });
  }
  if (integration.status !== 'connected') {
    throw Object.assign(new Error('Integration is not connected'), { status: 400 });
  }
  return { account, integration };
}

type ParsedTx = {
  execution_date: string;
  amount: number;
  currency?: string;
  label?: string;
  counterparty_name?: string;
  balance_after?: number;
};

function mapRowToTx(rawRow: Record<string, any>): ParsedTx | null {
  const row: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawRow)) row[normalizeKey(k)] = v;

  const date =
    parseDateToYYYYMMDD(row.execution_date) ??
    parseDateToYYYYMMDD(row.date) ??
    parseDateToYYYYMMDD(row.operation_date) ??
    parseDateToYYYYMMDD(row.date_operation) ??
    parseDateToYYYYMMDD(row.date_de_valeur) ??
    parseDateToYYYYMMDD(row.value_date);

  const amount =
    parseDecimal(row.amount) ??
    parseDecimal(row.montant) ??
    (() => {
      const credit = parseDecimal(row.credit);
      const debit = parseDecimal(row.debit);
      if (credit == null && debit == null) return null;
      return (credit ?? 0) - (debit ?? 0);
    })();

  if (!date || amount == null) return null;

  const tx: ParsedTx = {
    execution_date: date,
    amount,
  };

  const label =
    (typeof row.label === 'string' ? row.label : null) ??
    (typeof row.libelle === 'string' ? row.libelle : null) ??
    (typeof row.description === 'string' ? row.description : null);
  if (label) tx.label = label;

  const counterparty =
    (typeof row.counterparty_name === 'string' ? row.counterparty_name : null) ??
    (typeof row.tiers === 'string' ? row.tiers : null) ??
    (typeof row.counterparty === 'string' ? row.counterparty : null);
  if (counterparty) tx.counterparty_name = counterparty;

  const currency =
    (typeof row.currency === 'string' ? row.currency : null) ??
    (typeof row.devise === 'string' ? row.devise : null);
  if (currency) tx.currency = currency;

  const balance =
    parseDecimal(row.balance_after) ??
    parseDecimal(row.solde) ??
    parseDecimal(row.balance);
  if (balance != null) tx.balance_after = balance;

  return tx;
}

function parseBankFile(buffer: ArrayBuffer, filename: string, contentType?: string): ParsedTx[] {
  const lower = filename.toLowerCase();
  const isXlsx =
    contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    lower.endsWith('.xlsx');

  if (isXlsx) {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    const ws = sheetName ? wb.Sheets[sheetName] : null;
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });
    return rows.map(mapRowToTx).filter(Boolean) as ParsedTx[];
  }

  const text = new TextDecoder('utf-8').decode(buffer);
  const res = Papa.parse<Record<string, any>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  const rows = Array.isArray(res.data) ? res.data : [];
  return rows.map(mapRowToTx).filter(Boolean) as ParsedTx[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = supabaseServer();
    const { account, integration } = await getAccountAndIntegrationOrThrow(supabase, id, token);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file field "file"' }, { status: 400 });
    }

    const { data: jobRow, error: jobErr } = await supabase
      .from('sync_jobs')
      .insert({
        integration_id: integration.id,
        sync_type: 'transactions',
        status: 'pending',
        stats: {},
      })
      .select('id')
      .single();
    if (jobErr) {
      return NextResponse.json({ error: 'Failed to create sync job', details: jobErr.message }, { status: 500 });
    }
    const jobId = jobRow.id as number;

    const originalName = file.name || `bank-import-${jobId}`;
    const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
    const storagePath = `${account.id}/${jobId}/${originalName}`;

    const ab = await file.arrayBuffer();
    const uploadRes = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, ab, {
        contentType: file.type || (ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'),
        upsert: false,
      });
    if (uploadRes.error) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_message: uploadRes.error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return NextResponse.json({ job_id: jobId, status: 'failed', error_message: uploadRes.error.message }, { status: 200 });
    }

    const transactions = parseBankFile(ab, originalName, file.type);
    if (transactions.length === 0) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_message: 'No transactions parsed from file',
          completed_at: new Date().toISOString(),
          stats: { import_file_path: storagePath, transactions_staged: 0 },
        })
        .eq('id', jobId);
      return NextResponse.json({ job_id: jobId, status: 'failed', error_message: 'No transactions parsed from file' }, { status: 200 });
    }

    const rows = transactions.map((tx, i) => ({
      job_id: jobId,
      data_type: 'transaction',
      source_id: `csv_${jobId}_${i + 1}`,
      payload: tx,
    }));

    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: insertErr } = await supabase.from('sync_pennylane_data').insert(batch);
      if (insertErr) {
        await supabase
          .from('sync_jobs')
          .update({
            status: 'failed',
            error_message: insertErr.message,
            completed_at: new Date().toISOString(),
            stats: { import_file_path: storagePath, transactions_staged: i },
          })
          .eq('id', jobId);
        return NextResponse.json({ job_id: jobId, status: 'failed', error_message: insertErr.message }, { status: 200 });
      }
    }

    await supabase
      .from('sync_jobs')
      .update({
        stats: {
          import_file_path: storagePath,
          original_filename: originalName,
          transactions_staged: rows.length,
        },
      })
      .eq('id', jobId);

    await supabase
      .from('integrations')
      .update({ last_sync_status: 'in_progress', last_sync_error: null })
      .eq('id', integration.id);

    const origin = request.nextUrl.origin;
    const secret = process.env.CRON_SECRET;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['x-cron-secret'] = secret;
    fetch(`${origin}/api/cron/process-sync-jobs?job_id=${jobId}`, { method: 'POST', headers }).catch(() => {});

    return NextResponse.json({ job_id: jobId, message: 'Import started. Processing in background.' }, { status: 202 });
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 500;
    return NextResponse.json({ error: e?.message || 'Failed to import bank file' }, { status });
  }
}

