/**
 * Pennylane sync: staging transaction rows → bank_transactions + integration_entity_mapping.
 */

import { getMappedAppEntityId, insertMapping } from './square-import';

type SupabaseClient = { from: (table: string) => any };

async function recordImportError(
  supabase: SupabaseClient,
  jobId: number,
  dataType: string,
  sourceId: string,
  errorMessage: string
): Promise<void> {
  await supabase.from('sync_import_errors').insert({
    job_id: jobId,
    data_type: dataType,
    source_id: sourceId,
    error_message: errorMessage,
  });
}

function parseExecutionDate(payload: any): string | null {
  const d = payload?.execution_date ?? payload?.executed_at ?? payload?.date ?? payload?.created_at;
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return null;
}

function parseAmount(payload: any): number {
  const a = payload?.amount ?? payload?.amount_in_cents;
  if (typeof a === 'number') return payload?.amount_in_cents != null ? a / 100 : a;
  if (typeof a === 'string') return parseFloat(a) || 0;
  return 0;
}

export async function processPennylaneSyncJob(
  supabase: SupabaseClient,
  job: { id: number; integration_id: number; sync_type: string },
  integration: { id: number; account_id: string },
  stagingRows: { data_type: string; source_id: string; payload: any }[]
): Promise<{ status: 'completed' | 'failed'; error_message?: string; stats: Record<string, number> }> {
  const jobId = job.id;
  const integrationId = integration.id as number;
  const accountId = integration.account_id;

  const stats: Record<string, number> = {
    transactions_imported: 0,
    transactions_failed: 0,
  };

  const transactionRows = stagingRows.filter((r) => r.data_type === 'transaction');

  for (const row of transactionRows) {
    const sourceId = row.source_id || String(row.payload?.id ?? row.payload?.uuid ?? '');
    if (!sourceId) {
      await recordImportError(supabase, jobId, 'transaction', '', 'Missing source_id');
      stats.transactions_failed += 1;
      continue;
    }

    const existing = await getMappedAppEntityId(supabase, integrationId, 'bank_transaction', sourceId);
    if (existing != null) continue;

    const executionDate = parseExecutionDate(row.payload);
    if (!executionDate) {
      await recordImportError(supabase, jobId, 'transaction', sourceId, 'Missing execution date');
      stats.transactions_failed += 1;
      continue;
    }

    const amount = parseAmount(row.payload);
    const payload = row.payload || {};

    const insertRow = {
      account_id: accountId,
      integration_id: integrationId,
      source_id: sourceId,
      bank_account_id: payload.bank_account_id ?? payload.account_id ?? null,
      execution_date: executionDate,
      amount,
      currency: payload.currency ?? payload.amount_currency ?? 'EUR',
      label: payload.label ?? payload.description ?? null,
      source: payload.source ?? null,
      counterparty_name: payload.counterparty_name ?? payload.third_party_name ?? null,
      counterparty_id: payload.counterparty_id ?? payload.third_party_id ?? null,
      balance_after: payload.balance_after ?? payload.outstanding_balance ?? null,
      state: payload.state ?? null,
    };

    const { data: newRow, error: insertErr } = await supabase
      .from('bank_transactions')
      .insert(insertRow)
      .select('id')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') continue;
      await recordImportError(supabase, jobId, 'transaction', sourceId, insertErr.message);
      stats.transactions_failed += 1;
      continue;
    }

    await insertMapping(supabase, integrationId, 'bank_transaction', sourceId, 'bank_transaction', newRow.id);
    stats.transactions_imported += 1;
  }

  return {
    status: 'completed',
    stats,
  };
}
