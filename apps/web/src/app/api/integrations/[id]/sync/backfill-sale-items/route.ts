import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getMappedAppEntityId } from '@/app/api/integrations/[id]/sync/square-import';
import { replaceSaleStockMovements } from '@/lib/sales/replace-sale-stock-movements';
import type { SupabaseClient as DbSupabaseClient } from '@supabase/supabase-js';

type SupabaseClient = { from: (table: string) => any; auth: any };

async function getIntegrationAndVerifyAccess(
  supabase: any,
  integrationId: string,
  token: string
): Promise<{ integration: any; error: any }> {
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { integration: null, error: { status: 401, message: 'Unauthorized' } };
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!account) return { integration: null, error: { status: 404, message: 'Account not found' } };
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('account_id', account.id)
    .single();
  if (error) return { integration: null, error: { status: 404, message: 'Integration not found' } };
  return { integration, error: null };
}

/**
 * Rebuild the line-row sequence the same way sync-processor does for an order:
 * one row per line_item followed by one row per modifier (parent=line_item).
 * Returns the ordered catalog_object_id list so we can match by sort_order.
 */
function buildOrderEntrySequence(order: any): { catalogObjectId: string | null; isModifier: boolean }[] {
  const out: { catalogObjectId: string | null; isModifier: boolean }[] = [];
  const lineItems = order?.line_items || [];
  for (const line of lineItems) {
    out.push({ catalogObjectId: line.catalog_object_id || null, isModifier: false });
    const mods = Array.isArray(line.modifiers) ? line.modifiers : [];
    for (const mod of mods) {
      out.push({ catalogObjectId: mod?.catalog_object_id || null, isModifier: true });
    }
  }
  return out;
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

    const supabase = supabaseServer() as unknown as SupabaseClient;
    const { integration, error: accessError } = await getIntegrationAndVerifyAccess(supabase, id, token);
    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: accessError.status });
    }
    const integrationId = integration.id as number;

    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(500, parseInt(url.searchParams.get('limit') ?? '200', 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10));

    const { count: total } = await supabase
      .from('integration_entity_mapping')
      .select('id', { count: 'exact', head: true })
      .eq('integration_id', integrationId)
      .eq('source_type', 'order')
      .eq('app_entity_type', 'sale');

    const { data: mappings, error: mapErr } = await supabase
      .from('integration_entity_mapping')
      .select('source_id, app_entity_id')
      .eq('integration_id', integrationId)
      .eq('source_type', 'order')
      .eq('app_entity_type', 'sale')
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);
    if (mapErr) return NextResponse.json({ error: mapErr.message }, { status: 500 });

    const results = {
      sales_scanned: 0,
      lines_updated: 0,
      movements_written: 0,
      missing_payload: 0,
      unmapped_items: 0,
      errors: 0,
    };

    type Event = {
      saleId: number;
      squareOrderId: string;
      status: 'missing_payload' | 'unmapped' | 'updated' | 'no_change' | 'error';
      lines_updated: number;
      movements_written: number;
      total_lines: number;
      message?: string;
    };
    const events: Event[] = [];
    const log = (e: Event) => {
      events.push(e);
      console.log(`[backfill-sale-items] int=${integrationId} sale=${e.saleId} order=${e.squareOrderId} status=${e.status} lines_updated=${e.lines_updated} movements_written=${e.movements_written} total_lines=${e.total_lines}${e.message ? ` msg="${e.message}"` : ''}`);
    };

    console.log(`[backfill-sale-items] START int=${integrationId} offset=${offset} limit=${limit} total=${total ?? '?'} batch_size=${(mappings || []).length}`);

    for (const m of mappings || []) {
      results.sales_scanned += 1;
      const saleId = m.app_entity_id as number;
      const squareOrderId = m.source_id as string;

      const { data: staged } = await supabase
        .from('sync_square_data')
        .select('payload')
        .eq('data_type', 'order')
        .eq('source_id', squareOrderId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!staged?.payload) {
        results.missing_payload += 1;
        log({ saleId, squareOrderId, status: 'missing_payload', lines_updated: 0, movements_written: 0, total_lines: 0, message: 'No staged Square payload found' });
        continue;
      }

      const seq = buildOrderEntrySequence(staged.payload);

      const resolved: (number | null)[] = [];
      for (const entry of seq) {
        let itemId: number | null = null;
        if (entry.catalogObjectId) {
          if (entry.isModifier) {
            itemId = await getMappedAppEntityId(
              supabase as unknown as any,
              integrationId,
              'catalog_modifier_item',
              entry.catalogObjectId
            );
          } else {
            itemId = await getMappedAppEntityId(
              supabase as unknown as any,
              integrationId,
              'catalog_variation',
              entry.catalogObjectId
            );
            if (itemId == null) {
              itemId = await getMappedAppEntityId(
                supabase as unknown as any,
                integrationId,
                'catalog_item',
                entry.catalogObjectId
              );
            }
          }
        }
        resolved.push(itemId);
      }

      const { data: sale } = await supabase
        .from('sales')
        .select('date')
        .eq('id', saleId)
        .maybeSingle();
      if (!sale) {
        log({ saleId, squareOrderId, status: 'error', lines_updated: 0, movements_written: 0, total_lines: 0, message: 'Sale row not found' });
        continue;
      }

      const { data: existingLines } = await supabase
        .from('sale_line_items')
        .select('id, item_id, quantity, sort_order')
        .eq('sale_id', saleId)
        .order('sort_order', { ascending: true });
      const lines = existingLines || [];

      let anyUpdated = false;
      let linesUpdatedHere = 0;
      let updateError: string | null = null;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const target = resolved[i] ?? null;
        if (target != null && l.item_id == null) {
          const { error: upErr } = await supabase
            .from('sale_line_items')
            .update({ item_id: target })
            .eq('id', l.id);
          if (upErr) {
            results.errors += 1;
            updateError = upErr.message;
            continue;
          }
          l.item_id = target;
          results.lines_updated += 1;
          linesUpdatedHere += 1;
          anyUpdated = true;
        }
      }

      const hasAnyMappedItem = lines.some((l: any) => l.item_id != null && Number(l.quantity) > 0);
      if (!hasAnyMappedItem) {
        results.unmapped_items += 1;
        log({ saleId, squareOrderId, status: 'unmapped', lines_updated: linesUpdatedHere, movements_written: 0, total_lines: lines.length, message: updateError ?? 'No mapped item_id after resolution' });
        continue;
      }

      const stockLines = lines.map((l: any) => ({
        itemId: l.item_id ?? undefined,
        quantity: Number(l.quantity) || 0,
      }));
      const res = await replaceSaleStockMovements(supabase as unknown as DbSupabaseClient, {
        saleId,
        movementDate: sale.date,
        lines: stockLines,
      });
      if (!res.ok) {
        results.errors += 1;
        log({ saleId, squareOrderId, status: 'error', lines_updated: linesUpdatedHere, movements_written: 0, total_lines: lines.length, message: ('message' in res ? res.message : undefined) || 'replaceSaleStockMovements failed' });
        continue;
      }
      const movementCount = stockLines.filter(
        (l: { itemId?: number; quantity: number }) => l.itemId != null && l.quantity > 0
      ).length;
      results.movements_written += movementCount;
      log({
        saleId,
        squareOrderId,
        status: anyUpdated ? 'updated' : 'no_change',
        lines_updated: linesUpdatedHere,
        movements_written: movementCount,
        total_lines: lines.length,
      });
    }

    const processed = (mappings || []).length;
    const nextOffset = offset + processed;
    const hasMore = total != null ? nextOffset < (total as number) : processed === limit;

    console.log(`[backfill-sale-items] DONE int=${integrationId} offset=${offset} processed=${processed} has_more=${hasMore} scanned=${results.sales_scanned} lines_updated=${results.lines_updated} movements=${results.movements_written} unmapped=${results.unmapped_items} missing_payload=${results.missing_payload} errors=${results.errors}`);

    return NextResponse.json({
      status: 'completed',
      total,
      offset,
      limit,
      processed,
      next_offset: hasMore ? nextOffset : null,
      has_more: hasMore,
      results,
      events,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
