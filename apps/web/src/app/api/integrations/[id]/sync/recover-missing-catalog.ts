/**
 * Recover catalog_object_ids referenced by orders but missing from the
 * local `integration_entity_mapping` table. Called once per sync after all
 * order chunks have been processed.
 *
 * Strategy:
 *   1. Fetch the missing ids from Square via /v2/catalog/batch-retrieve
 *      (include_deleted_objects + include_related_objects) so we can recover
 *      archived variations/modifiers that `/v2/catalog/search` skipped.
 *   2. For each returned object, create a local item + mapping (archived,
 *      is_active=false) — enough to carry stock semantics.
 *   3. For ids Square will not return (hard-deleted), synthesize a placeholder
 *      item from the hint we captured while processing the order line that
 *      referenced it.
 */

import { insertMapping, makeMappingKey, type MappingKey } from './square-import';

type SupabaseClient = { from: (table: string) => any };

export type MissingCatalogHint = {
  sourceType: 'catalog_variation' | 'catalog_modifier_item';
  name: string;
  unitPrice: number;
  taxIncluded: boolean;
};

export type RecoverResult = {
  recovered: number;
  synthesized: number;
  errors: number;
  newMappings: Map<MappingKey, number>;
};

const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';
const SQUARE_API_BASE = SQUARE_USE_SANDBOX
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';

async function squareBatchRetrieve(
  accessToken: string,
  objectIds: string[]
): Promise<{ objects: any[]; relatedObjects: any[] }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Square-Version': '2024-01-18',
  };
  const res = await fetch(`${SQUARE_API_BASE}/v2/catalog/batch-retrieve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      object_ids: objectIds,
      include_deleted_objects: true,
      include_related_objects: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Square batch-retrieve failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return {
    objects: Array.isArray(data?.objects) ? data.objects : [],
    relatedObjects: Array.isArray(data?.related_objects) ? data.related_objects : [],
  };
}

function safeItemName(raw: string | undefined | null, fallback: string): string {
  const name = (raw ?? '').trim();
  if (name.length === 0) return fallback;
  if (name.length > 200) return name.slice(0, 200);
  return name;
}

async function insertItemAndMapping(
  supabase: SupabaseClient,
  integrationId: number,
  params: {
    sourceType: 'catalog_variation' | 'catalog_modifier_item';
    sourceId: string;
    displayName: string;
    unitId: number | null;
    itemTypes: string[];
  }
): Promise<{ itemId: number | null; error?: string }> {
  const { data: insertedItem, error: itemErr } = await supabase
    .from('items')
    .insert({
      name: params.displayName,
      description: null,
      category_id: null,
      unit_id: params.unitId,
      item_types: params.itemTypes,
      is_active: false,
      is_catalog_parent: false,
    })
    .select('id')
    .single();
  if (itemErr || !insertedItem) {
    return { itemId: null, error: itemErr?.message || 'items insert failed' };
  }
  try {
    await insertMapping(
      supabase,
      integrationId,
      params.sourceType,
      params.sourceId,
      params.sourceType === 'catalog_modifier_item' ? 'modifier_item' : 'item',
      insertedItem.id as number
    );
  } catch (e: any) {
    return { itemId: null, error: e?.message || 'mapping insert failed' };
  }
  return { itemId: insertedItem.id as number };
}

async function createItemsForReturnedObjects(
  supabase: SupabaseClient,
  integrationId: number,
  defaultUnitVariableId: number | null,
  objects: any[],
  hints: Map<string, MissingCatalogHint>,
  out: RecoverResult
): Promise<Set<string>> {
  const handled = new Set<string>();
  for (const obj of objects) {
    const sqId: string | undefined = obj?.id;
    if (!sqId) continue;
    const hint = hints.get(sqId);
    if (!hint) continue;
    const archived = !!obj.is_deleted;

    let displayName: string;
    let itemTypes: string[];
    if (obj.type === 'ITEM_VARIATION') {
      const variationName = obj.item_variation_data?.name || '';
      const rawName = variationName || hint.name || `Variation ${sqId.slice(0, 8)}`;
      displayName = safeItemName(archived ? `[archived] ${rawName}` : rawName, 'Variation');
      itemTypes = ['product'];
    } else if (obj.type === 'ITEM') {
      const rawName = obj.item_data?.name || hint.name || `Item ${sqId.slice(0, 8)}`;
      displayName = safeItemName(archived ? `[archived] ${rawName}` : rawName, 'Item');
      itemTypes = ['product'];
    } else if (obj.type === 'MODIFIER') {
      const rawName = obj.modifier_data?.name || hint.name || `Modifier ${sqId.slice(0, 8)}`;
      displayName = safeItemName(archived ? `[archived] ${rawName}` : rawName, 'Modifier');
      itemTypes = ['modifier'];
    } else {
      continue;
    }

    const res = await insertItemAndMapping(supabase, integrationId, {
      sourceType: hint.sourceType,
      sourceId: sqId,
      displayName,
      unitId: defaultUnitVariableId,
      itemTypes,
    });
    if (res.error || res.itemId == null) {
      out.errors += 1;
      continue;
    }
    out.newMappings.set(makeMappingKey(hint.sourceType, sqId), res.itemId);
    out.recovered += 1;
    handled.add(sqId);
  }
  return handled;
}

async function synthesizeMissing(
  supabase: SupabaseClient,
  integrationId: number,
  defaultUnitVariableId: number | null,
  unresolvedIds: string[],
  hints: Map<string, MissingCatalogHint>,
  out: RecoverResult
): Promise<void> {
  for (const sqId of unresolvedIds) {
    const hint = hints.get(sqId);
    if (!hint) continue;
    const rawName = hint.name || `Square ${sqId.slice(0, 8)}`;
    const displayName = safeItemName(`[missing] ${rawName}`, 'Missing Square item');
    const itemTypes = hint.sourceType === 'catalog_modifier_item' ? ['modifier'] : ['product'];

    const res = await insertItemAndMapping(supabase, integrationId, {
      sourceType: hint.sourceType,
      sourceId: sqId,
      displayName,
      unitId: defaultUnitVariableId,
      itemTypes,
    });
    if (res.error || res.itemId == null) {
      out.errors += 1;
      continue;
    }
    out.newMappings.set(makeMappingKey(hint.sourceType, sqId), res.itemId);
    out.synthesized += 1;
  }
}

export async function recoverMissingCatalog(
  supabase: SupabaseClient,
  integration: any,
  hints: Map<string, MissingCatalogHint>,
  defaultUnitVariableId: number | null
): Promise<RecoverResult> {
  const out: RecoverResult = {
    recovered: 0,
    synthesized: 0,
    errors: 0,
    newMappings: new Map<MappingKey, number>(),
  };
  const integrationId = integration.id as number;
  const accessToken = integration.access_token as string | undefined;
  if (!accessToken || hints.size === 0) return out;

  const ids = Array.from(hints.keys());
  const CHUNK = 1000;
  const notReturned = new Set<string>(ids);

  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    let objects: any[] = [];
    let relatedObjects: any[] = [];
    try {
      const res = await squareBatchRetrieve(accessToken, slice);
      objects = res.objects;
      relatedObjects = res.relatedObjects;
    } catch {
      out.errors += slice.length;
      continue;
    }
    const handled = await createItemsForReturnedObjects(
      supabase,
      integrationId,
      defaultUnitVariableId,
      [...objects, ...relatedObjects],
      hints,
      out
    );
    for (const id of handled) notReturned.delete(id);

    // Drop ids already mapped (another concurrent run inserted them).
    if (notReturned.size > 0) {
      const slice2 = Array.from(notReturned).filter((id) => slice.includes(id));
      if (slice2.length > 0) {
        const { data: existing } = await supabase
          .from('integration_entity_mapping')
          .select('source_type, source_id, app_entity_id')
          .eq('integration_id', integrationId)
          .in('source_type', ['catalog_variation', 'catalog_modifier_item'])
          .in('source_id', slice2);
        for (const row of (existing ?? []) as { source_type: string; source_id: string; app_entity_id: number }[]) {
          out.newMappings.set(
            makeMappingKey(row.source_type, row.source_id),
            row.app_entity_id
          );
          notReturned.delete(row.source_id);
        }
      }
    }
  }

  if (notReturned.size > 0) {
    await synthesizeMissing(
      supabase,
      integrationId,
      defaultUnitVariableId,
      Array.from(notReturned),
      hints,
      out
    );
  }
  return out;
}

/**
 * After recovery populates new mappings, re-resolve `sale_line_items.item_id`
 * for the affected sales and rewrite their stock movements.
 */
export async function backfillAffectedSales(
  supabase: SupabaseClient,
  integrationId: number,
  jobId: number,
  affectedSales: Map<number, { squareOrderId: string; dateStr: string }>
): Promise<{ sales_backfilled: number; stock_rewritten: number; errors: number }> {
  const stats = { sales_backfilled: 0, stock_rewritten: 0, errors: 0 };
  if (affectedSales.size === 0) return stats;
  const resolvedSaleIds: string[] = [];

  const { replaceSaleStockMovements } = await import('@/lib/sales/replace-sale-stock-movements');
  const { getMappedAppEntityId } = await import('./square-import');

  for (const [saleId, { squareOrderId, dateStr }] of affectedSales) {
    try {
      const { data: staged } = await supabase
        .from('sync_square_data')
        .select('payload')
        .eq('data_type', 'order')
        .eq('source_id', squareOrderId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!staged?.payload) continue;

      const order = staged.payload;
      const orderDate = (order?.created_at || '').split('T')[0];
      const fallbackDateStr = orderDate || dateStr;
      const saleDateIso =
        typeof order?.created_at === 'string' && order.created_at.length > 0
          ? order.created_at
          : `${fallbackDateStr}T12:00:00.000Z`;
      const seq: { catalogObjectId: string | null; isModifier: boolean }[] = [];
      for (const line of order.line_items || []) {
        seq.push({ catalogObjectId: line.catalog_object_id || null, isModifier: false });
        for (const mod of Array.isArray(line.modifiers) ? line.modifiers : []) {
          seq.push({ catalogObjectId: mod?.catalog_object_id || null, isModifier: true });
        }
      }

      const resolved: (number | null)[] = [];
      for (const entry of seq) {
        let itemId: number | null = null;
        if (entry.catalogObjectId) {
          if (entry.isModifier) {
            itemId = await getMappedAppEntityId(
              supabase as any,
              integrationId,
              'catalog_modifier_item',
              entry.catalogObjectId
            );
          } else {
            itemId = await getMappedAppEntityId(
              supabase as any,
              integrationId,
              'catalog_variation',
              entry.catalogObjectId
            );
            if (itemId == null) {
              itemId = await getMappedAppEntityId(
                supabase as any,
                integrationId,
                'catalog_item',
                entry.catalogObjectId
              );
            }
          }
        }
        resolved.push(itemId);
      }

      const { data: existingLines } = await supabase
        .from('sale_line_items')
        .select('id, item_id, quantity, sort_order')
        .eq('sale_id', saleId)
        .order('sort_order', { ascending: true });
      const lines = existingLines || [];

      let anyUpdated = false;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const target = resolved[i] ?? null;
        if (target != null && l.item_id == null) {
          const { error: upErr } = await supabase
            .from('sale_line_items')
            .update({ item_id: target })
            .eq('id', l.id);
          if (upErr) {
            stats.errors += 1;
            continue;
          }
          l.item_id = target;
          anyUpdated = true;
        }
      }

      const stockLines = lines.map((l: any) => ({
        itemId: l.item_id ?? undefined,
        quantity: Number(l.quantity) || 0,
      }));
      const hasAnyMapped = stockLines.some((l: any) => l.itemId != null && l.quantity > 0);
      if (!hasAnyMapped) continue;

      const res = await replaceSaleStockMovements(supabase as any, {
        saleId,
        movementDate: saleDateIso,
        lines: stockLines,
      });
      if (!res.ok) {
        stats.errors += 1;
        continue;
      }
      if (anyUpdated) stats.sales_backfilled += 1;
      stats.stock_rewritten += stockLines.filter(
        (l: any) => l.itemId != null && l.quantity > 0
      ).length;
      resolvedSaleIds.push(String(saleId));
    } catch {
      stats.errors += 1;
    }
  }

  if (resolvedSaleIds.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < resolvedSaleIds.length; i += CHUNK) {
      const slice = resolvedSaleIds.slice(i, i + CHUNK);
      await supabase
        .from('sync_import_errors')
        .delete()
        .eq('job_id', jobId)
        .eq('data_type', 'sale_stock')
        .in('source_id', slice);
    }
  }
  return stats;
}
