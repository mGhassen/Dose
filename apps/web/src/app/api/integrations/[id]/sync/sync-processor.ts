/**
 * Process a sync job: read staging data and push to items/sales/entries/payments.
 * Used by the cron (or triggered) processor route.
 *
 * Square → app mapping (orders):
 * - Order totals: net_amounts → sales.subtotal, total_tax, total_discount (amount = subtotal + total_tax - total_discount).
 * - Line item: base_price_money (per-unit), total_money, total_tax_money, catalog_object_id → item_id via integration_entity_mapping.
 * - Tax inclusion: order.taxes[].type === 'INCLUSIVE' → sale_line_items.tax_included true; else ADDITIVE/unknown → false/null.
 */

import {
  getMappedAppEntityId,
  getMappedAppEntityIdsBatch,
  insertMapping,
  centsToDecimal,
  makeMappingKey,
} from './square-import';
import {
  getDefaultUnitVariableId,
  resolveSquareMeasurementUnitId,
} from './square-measurement-unit';
import {
  ensureCatalogTaxVariableMapping,
  upsertItemTaxesFromSquareTaxIds,
} from './square-tax';
import { upsertSellingPrice } from '@/lib/items/price-history-upsert';
import { getItemCostsAsOfBatch } from '@/lib/items/price-resolve';
import type { SupabaseClient as DbSupabaseClient } from '@supabase/supabase-js';
import {
  replaceSaleStockMovements,
  type PreloadedItem,
  type PreloadedRecipe,
} from '@/lib/sales/replace-sale-stock-movements';
import type { MissingCatalogHint } from './recover-missing-catalog';

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

export async function getNextStepSequence(supabase: SupabaseClient, jobId: number): Promise<number> {
  const { data: rows } = await supabase
    .from('sync_job_steps')
    .select('sequence')
    .eq('job_id', jobId)
    .order('sequence', { ascending: false })
    .limit(1);
  const max = rows?.[0]?.sequence ?? 0;
  return max + 1;
}

export async function insertStep(
  supabase: SupabaseClient,
  jobId: number,
  sequence: number,
  name: string,
  status: 'pending' | 'running' | 'done' | 'failed',
  details: Record<string, number> = {}
): Promise<void> {
  await supabase.from('sync_job_steps').insert({
    job_id: jobId,
    sequence,
    name,
    status,
    details,
  });
}

export async function completeStep(
  supabase: SupabaseClient,
  jobId: number,
  sequence: number,
  details: Record<string, number>
): Promise<void> {
  await supabase
    .from('sync_job_steps')
    .update({ status: 'done', details, updated_at: new Date().toISOString() })
    .eq('job_id', jobId)
    .eq('sequence', sequence);
}

export type ChunkContext = {
  chunkIndex: number;
  totalChunks: number;
  accumulatedStats: Record<string, number>;
  missingCatalogHints?: Map<string, MissingCatalogHint>;
  affectedSales?: Map<number, { squareOrderId: string; dateStr: string }>;
};

function getCatalogObjectsFromRows(
  rows: { data_type: string; source_id: string; payload: any }[]
): any[] {
  const out: any[] = [];
  for (const row of rows) {
    if (row.data_type === 'catalog_batch') {
      const arr = Array.isArray(row.payload) ? row.payload : [row.payload];
      out.push(...arr);
    } else if (row.data_type === 'catalog_object' && row.payload != null) {
      out.push(row.payload);
    }
  }
  return out;
}

function slugifyCategory(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

/**
 * Load all Square CATEGORY staging rows for the job (not just current chunk),
 * so item.category_id resolution works even when category and item land in
 * different chunks.
 */
async function loadAllCategoryObjectsForJob(
  supabase: SupabaseClient,
  jobId: number
): Promise<any[]> {
  const out: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('sync_square_data')
      .select('payload')
      .eq('job_id', jobId)
      .eq('data_type', 'catalog_object')
      .eq('payload->>type', 'CATEGORY')
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) break;
    const rows = (data || []) as { payload: any }[];
    for (const r of rows) if (r?.payload) out.push(r.payload);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

/**
 * Upsert a Square category into item_categories and return the local id.
 * Creates/updates mapping row (source_type='catalog_category') for stable re-sync.
 */
async function upsertItemCategoryFromSquare(
  supabase: SupabaseClient,
  integrationId: number,
  squareCategoryObj: any
): Promise<number | null> {
  const sqId = squareCategoryObj?.id;
  const label = (squareCategoryObj?.category_data?.name ?? '').trim();
  if (!sqId || !label) return null;

  const existingLocalId = await getMappedAppEntityId(
    supabase,
    integrationId,
    'catalog_category',
    sqId
  );

  if (existingLocalId != null) {
    await supabase
      .from('item_categories')
      .update({ label, is_active: !squareCategoryObj.is_deleted, updated_at: new Date().toISOString() })
      .eq('id', existingLocalId);
    return existingLocalId;
  }

  const slug = slugifyCategory(label);
  const { data: found } = await supabase
    .from('item_categories')
    .select('id, label')
    .ilike('name', slug)
    .maybeSingle();
  let localId: number | null = (found?.id as number | undefined) ?? null;

  if (localId == null) {
    const { data: inserted, error: insertErr } = await supabase
      .from('item_categories')
      .insert({ name: slug, label, is_active: !squareCategoryObj.is_deleted })
      .select('id')
      .single();
    if (insertErr || !inserted) return null;
    localId = inserted.id as number;
  } else if (found && found.label !== label) {
    await supabase
      .from('item_categories')
      .update({ label, updated_at: new Date().toISOString() })
      .eq('id', localId);
  }

  try {
    await insertMapping(supabase, integrationId, 'catalog_category', sqId, 'item_category', localId);
  } catch {
    // mapping may already exist (race); ignore
  }
  return localId;
}

export async function processSyncJob(
  supabase: SupabaseClient,
  job: { id: number; integration_id: number; sync_type: string },
  integration: any,
  stagingRows: { data_type: string; source_id: string; payload: any }[],
  chunkContext?: ChunkContext
): Promise<{ status: 'completed' | 'failed'; error_message?: string; stats: Record<string, number> }> {
  const jobId = job.id;
  const integrationId = integration.id as number;
  const syncType = job.sync_type;
  const today = new Date().toISOString().split('T')[0];
  const isChunked = chunkContext != null;
  const chunkIndex = chunkContext?.chunkIndex ?? 0;
  const totalChunks = chunkContext?.totalChunks ?? 1;
  const isLastChunk = chunkIndex === totalChunks - 1;
  const accumulatedStats = chunkContext?.accumulatedStats ?? {
    items_imported: 0,
    items_failed: 0,
    orders_imported: 0,
    orders_failed: 0,
    payments_imported: 0,
    payments_failed: 0,
    stock_reconciled: 0,
    stock_reconcile_failed: 0,
  };

  const stats: Record<string, number> = {
    items_imported: 0,
    items_failed: 0,
    orders_imported: 0,
    orders_failed: 0,
    payments_imported: 0,
    payments_failed: 0,
    stock_reconciled: 0,
    stock_reconcile_failed: 0,
  };

  const defaultUnitVariableId = await getDefaultUnitVariableId(supabase);

  const allCatalogObjects = getCatalogObjectsFromRows(stagingRows);
  if (allCatalogObjects.length > 0 && (syncType === 'catalog' || syncType === 'full')) {
    let stepSeq: number;
    let catalogStepSeq: number;
    if (isChunked) {
      stepSeq = await getNextStepSequence(supabase, jobId);
      catalogStepSeq = stepSeq;
      await insertStep(
        supabase,
        jobId,
        stepSeq,
        `Process catalog — chunk ${chunkIndex + 1}/${totalChunks}`,
        'running',
        { rows: allCatalogObjects.length }
      );
    } else {
      stepSeq = await getNextStepSequence(supabase, jobId);
      catalogStepSeq = stepSeq;
      await insertStep(supabase, jobId, stepSeq, 'Process catalog', 'running', {});
    }
    const itemsMap = new Map<string, any>();
    const variationsMap = new Map<string, any[]>();
    const categoriesMap = new Map<string, any>();
    const taxInclusionByTaxId = new Map<string, 'ADDITIVE' | 'INCLUSIVE'>();
    const taxObjectsMap = new Map<string, any>();
    const measurementUnitMap = new Map<string, any>();
    for (const obj of allCatalogObjects) {
      if (obj?.type === 'ITEM') {
        itemsMap.set(obj.id, obj);
        if (!variationsMap.has(obj.id)) variationsMap.set(obj.id, []);
      } else if (obj?.type === 'ITEM_VARIATION') {
        const iid = obj.item_variation_data?.item_id;
        if (iid) {
          if (!variationsMap.has(iid)) variationsMap.set(iid, []);
          variationsMap.get(iid)!.push(obj);
        }
      } else if (obj?.type === 'CATEGORY') {
        categoriesMap.set(obj.id, obj);
      } else if (obj?.type === 'TAX') {
        if (obj.id) taxObjectsMap.set(obj.id, obj);
        const inc = obj.tax_data?.inclusion_type;
        if (inc === 'ADDITIVE' || inc === 'INCLUSIVE') taxInclusionByTaxId.set(obj.id, inc);
      } else if (obj?.type === 'MEASUREMENT_UNIT' && obj.id) {
        measurementUnitMap.set(obj.id, obj);
      }
    }

    // Fill categoriesMap from the full job staging set so cross-chunk items can
    // still resolve their Square category → local item_categories id.
    if (itemsMap.size > 0) {
      const allCats = await loadAllCategoryObjectsForJob(supabase, jobId);
      for (const cat of allCats) {
        if (cat?.id && !categoriesMap.has(cat.id)) categoriesMap.set(cat.id, cat);
      }
    }

    // Upsert every Square category into item_categories and build Square-id → local-id map.
    const localCategoryIdBySquareId = new Map<string, number>();
    for (const [sqCatId, catObj] of categoriesMap) {
      try {
        const localId = await upsertItemCategoryFromSquare(supabase, integrationId, catObj);
        if (localId != null) localCategoryIdBySquareId.set(sqCatId, localId);
      } catch (e: any) {
        await recordImportError(supabase, jobId, 'catalog_category', sqCatId, e?.message || String(e));
      }
    }

    for (const [tid, tObj] of taxObjectsMap) {
      try {
        await ensureCatalogTaxVariableMapping(supabase, integrationId, tid, tObj, today);
      } catch (e: any) {
        await recordImportError(supabase, jobId, 'catalog_tax', tid, e?.message || String(e));
      }
    }

    for (const obj of allCatalogObjects) {
      if (obj?.type !== 'MODIFIER_LIST' || obj.is_deleted) continue;
      const sqListId = obj.id;
      try {
        const existingList = await getMappedAppEntityId(supabase, integrationId, 'catalog_modifier_list', sqListId);
        if (existingList != null) continue;
        const { data: listRow, error: listErr } = await supabase
          .from('modifier_lists')
          .insert({
            integration_id: integrationId,
            square_modifier_list_id: sqListId,
            name: obj.modifier_list_data?.name ?? null,
            selection_type: obj.modifier_list_data?.selection_type ?? null,
            ordinal: obj.modifier_list_data?.ordinal ?? null,
            raw_payload: obj,
          })
          .select('id')
          .single();
        if (listErr) {
          await recordImportError(supabase, jobId, 'catalog_modifier_list', sqListId, listErr.message);
          continue;
        }
        await insertMapping(supabase, integrationId, 'catalog_modifier_list', sqListId, 'modifier_list', listRow.id);
      } catch (e: any) {
        await recordImportError(supabase, jobId, 'catalog_modifier_list', sqListId, e?.message || String(e));
      }
    }

    for (const obj of allCatalogObjects) {
      if (obj?.type !== 'MODIFIER' || obj.is_deleted) continue;
      const sqModId = obj.id;
      try {
        const listSqId = obj.modifier_data?.modifier_list_id;
        if (!listSqId) {
          await recordImportError(supabase, jobId, 'catalog_modifier', sqModId, 'missing modifier_list_id');
          continue;
        }
        const listDbId = await getMappedAppEntityId(supabase, integrationId, 'catalog_modifier_list', listSqId);
        if (listDbId == null) continue;
        const priceCents = obj.modifier_data?.price_money?.amount;
        const modName = (obj.modifier_data?.name as string | undefined) || 'Modifier';

        const existingModRowId = await getMappedAppEntityId(supabase, integrationId, 'catalog_modifier', sqModId);
        let invItemId: number | null = null;

        if (existingModRowId != null) {
          const { data: existingRow } = await supabase
            .from('modifiers')
            .select('id, item_id, name')
            .eq('id', existingModRowId)
            .maybeSingle();
          if (!existingRow) continue;
          invItemId = existingRow.item_id;
          if (invItemId == null) {
            const label = (existingRow.name as string | null) || modName;
            const { data: newItem, error: insItemErr } = await supabase
              .from('items')
              .insert({
                name: label,
                description: null,
                category_id: null,
                unit_id: defaultUnitVariableId,
                item_types: ['modifier'],
                is_active: true,
                is_catalog_parent: false,
              })
              .select('id')
              .single();
            if (insItemErr) {
              await recordImportError(supabase, jobId, 'catalog_modifier', sqModId, insItemErr.message);
              continue;
            }
            invItemId = newItem.id as number;
            await supabase.from('modifiers').update({ item_id: invItemId }).eq('id', existingRow.id);
            stats.items_imported += 1;
          }
        } else {
          const { data: newItem, error: insItemErr } = await supabase
            .from('items')
            .insert({
              name: modName,
              description: null,
              category_id: null,
              unit_id: defaultUnitVariableId,
              item_types: ['modifier'],
              is_active: true,
              is_catalog_parent: false,
            })
            .select('id')
            .single();
          if (insItemErr) {
            await recordImportError(supabase, jobId, 'catalog_modifier', sqModId, insItemErr.message);
            continue;
          }
          invItemId = newItem.id as number;
          const { data: modRow, error: modErr } = await supabase
            .from('modifiers')
            .insert({
              modifier_list_id: listDbId,
              square_modifier_id: sqModId,
              name: obj.modifier_data?.name ?? null,
              price_amount_cents: typeof priceCents === 'number' ? priceCents : null,
              sort_order: obj.modifier_data?.ordinal ?? 0,
              item_id: invItemId,
              raw_payload: obj,
            })
            .select('id')
            .single();
          if (modErr) {
            await recordImportError(supabase, jobId, 'catalog_modifier', sqModId, modErr.message);
            continue;
          }
          await insertMapping(supabase, integrationId, 'catalog_modifier', sqModId, 'modifier', modRow.id);
          stats.items_imported += 1;
        }

        const existingItemMap = await getMappedAppEntityId(supabase, integrationId, 'catalog_modifier_item', sqModId);
        if (existingItemMap == null && invItemId != null) {
          await insertMapping(supabase, integrationId, 'catalog_modifier_item', sqModId, 'item', invItemId);
        }

        if (invItemId != null && typeof priceCents === 'number' && priceCents >= 0) {
          await upsertSellingPrice(supabase, invItemId, today, centsToDecimal(priceCents), undefined);
        }
      } catch (e: any) {
        await recordImportError(supabase, jobId, 'catalog_modifier', sqModId, e?.message || String(e));
      }
    }

    for (const [squareItemId, itemObj] of itemsMap) {
      const itemArchived = !!itemObj.is_deleted;
      const variations = variationsMap.get(squareItemId) || [];
      const itemData = itemObj.item_data ?? {};
      const categoriesArr = Array.isArray(itemData.categories) ? itemData.categories : [];
      const sqCategoryId =
        (itemData.reporting_category?.id as string | undefined) ??
        (categoriesArr[0]?.id as string | undefined) ??
        (itemData.category_id as string | undefined);
      let categoryLocalId: number | null = sqCategoryId
        ? localCategoryIdBySquareId.get(sqCategoryId) ?? null
        : null;
      // Fallback: category may have been staged in a previous job but not re-sent this run.
      if (categoryLocalId == null && sqCategoryId) {
        categoryLocalId = await getMappedAppEntityId(
          supabase,
          integrationId,
          'catalog_category',
          sqCategoryId
        );
        if (categoryLocalId != null) localCategoryIdBySquareId.set(sqCategoryId, categoryLocalId);
      }
      const rawItemName = itemObj.item_data?.name || 'Unnamed';
      const itemName = itemArchived ? `[archived] ${rawItemName}` : rawItemName;
      const itemDesc = itemObj.item_data?.description || '';

      const taxIds = itemObj.item_data?.tax_ids ?? [];
      const taxIncludedForItem =
        taxIds.length > 0
          ? taxIds.some((tid: string) => taxInclusionByTaxId.get(tid) === 'INCLUSIVE')
            ? true
            : taxIds.every((tid: string) => taxInclusionByTaxId.get(tid) === 'ADDITIVE')
              ? false
              : undefined
          : undefined;

      if (variations.length === 0) {
        try {
          const existing = await getMappedAppEntityId(supabase, integrationId, 'catalog_item', squareItemId);
          if (existing != null) {
            await supabase
              .from('items')
              .update({
                category_id: categoryLocalId ?? null,
                is_active: !itemArchived,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing);
            continue;
          }
          const { data: newItem, error: insertErr } = await supabase
            .from('items')
            .insert({
              name: itemName,
              description: itemDesc,
              category_id: categoryLocalId ?? null,
              unit_id: defaultUnitVariableId,
              item_types: ['product'],
              is_active: !itemArchived,
              is_catalog_parent: false,
            })
            .select('id')
            .single();
          if (insertErr) {
            await recordImportError(supabase, jobId, 'catalog_item', squareItemId, insertErr.message);
            stats.items_failed += 1;
            continue;
          }
          await insertMapping(supabase, integrationId, 'catalog_item', squareItemId, 'item', newItem.id);
          stats.items_imported += 1;
          if (Array.isArray(itemObj.item_data?.variations)) {
            for (const vid of itemObj.item_data.variations as string[]) {
              const vo = allCatalogObjects.find(
                (o: any) => o?.type === 'ITEM_VARIATION' && o.id === vid
              );
              const orphanCents = vo?.item_variation_data?.price_money?.amount;
              if (typeof orphanCents === 'number' && orphanCents >= 0) {
                await upsertSellingPrice(
                  supabase,
                  newItem.id as number,
                  today,
                  centsToDecimal(orphanCents),
                  taxIncludedForItem
                );
                break;
              }
            }
          }
          await upsertItemTaxesFromSquareTaxIds(
            supabase,
            integrationId,
            newItem.id as number,
            taxIds,
            taxInclusionByTaxId
          );
        } catch (e: any) {
          await recordImportError(supabase, jobId, 'catalog_item', squareItemId, e?.message || String(e));
          stats.items_failed += 1;
        }
        continue;
      }

      let parentItemId: number | null = await getMappedAppEntityId(
        supabase,
        integrationId,
        'catalog_item_parent',
        squareItemId
      );
      if (parentItemId != null) {
        await supabase
          .from('items')
          .update({
            category_id: categoryLocalId ?? null,
            is_active: !itemArchived,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parentItemId);
      }
      if (parentItemId == null) {
        try {
          const { data: parentRow, error: parentErr } = await supabase
            .from('items')
            .insert({
              name: itemName,
              description: itemDesc || null,
              category_id: categoryLocalId ?? null,
              unit_id: defaultUnitVariableId,
              item_types: ['product'],
              is_active: !itemArchived,
              is_catalog_parent: true,
            })
            .select('id')
            .single();
          if (parentErr) {
            await recordImportError(supabase, jobId, 'catalog_item_parent', squareItemId, parentErr.message);
            stats.items_failed += 1;
            continue;
          }
          parentItemId = parentRow.id as number;
          await insertMapping(
            supabase,
            integrationId,
            'catalog_item_parent',
            squareItemId,
            'item',
            parentItemId
          );
          stats.items_imported += 1;
        } catch (e: any) {
          await recordImportError(supabase, jobId, 'catalog_item_parent', squareItemId, e?.message || String(e));
          stats.items_failed += 1;
          continue;
        }
      }

      const modInfos = itemObj.item_data?.modifier_list_info || [];
      for (let mi = 0; mi < modInfos.length; mi++) {
        const info = modInfos[mi];
        const listSqId = info?.modifier_list_id;
        if (!listSqId) continue;
        const listDbId = await getMappedAppEntityId(supabase, integrationId, 'catalog_modifier_list', listSqId);
        if (listDbId == null || parentItemId == null) continue;
        const { error: linkErr } = await supabase.from('item_modifier_list_links').upsert(
          {
            item_id: parentItemId,
            modifier_list_id: listDbId,
            min_selected: info.min_selected_modifiers ?? null,
            max_selected: info.max_selected_modifiers ?? null,
            enabled: info.enabled !== false,
            modifier_overrides: info.modifier_overrides ?? null,
            sort_order: mi,
          },
          { onConflict: 'item_id,modifier_list_id' }
        );
        if (linkErr) {
          await recordImportError(
            supabase,
            jobId,
            'item_modifier_list_link',
            `${parentItemId}:${listDbId}`,
            linkErr.message
          );
        }
      }

      for (let vi = 0; vi < variations.length; vi++) {
        const variation = variations[vi];
        const variationId = variation.id;
        const vData = variation.item_variation_data || {};
        const variationArchived = itemArchived || !!variation.is_deleted;
        const rawDisplayName =
          variations.length > 1 ? `${rawItemName} - ${vData.name || variationId}` : rawItemName;
        const displayName = variationArchived ? `[archived] ${rawDisplayName}` : rawDisplayName;
        const sku = vData.sku || null;
        const priceCents = vData.price_money?.amount;
        const muId = vData.measurement_unit_id as string | undefined;
        const muObj = muId ? measurementUnitMap.get(muId) : null;

        try {
          const existingChild = await getMappedAppEntityId(supabase, integrationId, 'catalog_variation', variationId);
          if (existingChild != null) {
            await supabase
              .from('items')
              .update({
                category_id: categoryLocalId ?? null,
                is_active: !variationArchived,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingChild);
            if (parentItemId != null) {
              const { data: ivRow } = await supabase
                .from('item_variations')
                .select('id')
                .eq('variant_item_id', existingChild)
                .maybeSingle();
              if (!ivRow) {
                await supabase.from('item_variations').insert({
                  parent_item_id: parentItemId,
                  variant_item_id: existingChild,
                  square_variation_id: variationId,
                  sort_order: vData.ordinal ?? vi,
                  name_snapshot: vData.name || null,
                });
              }
            }
            if (typeof priceCents === 'number' && priceCents >= 0) {
              await upsertSellingPrice(
                supabase,
                existingChild,
                today,
                centsToDecimal(priceCents),
                taxIncludedForItem
              );
            }
            await upsertItemTaxesFromSquareTaxIds(
              supabase,
              integrationId,
              existingChild,
              taxIds,
              taxInclusionByTaxId
            );
            continue;
          }

          const resolvedUnitId = muId
            ? await resolveSquareMeasurementUnitId(
                supabase,
                integrationId,
                muId,
                muObj ?? null,
                defaultUnitVariableId
              )
            : defaultUnitVariableId;

          const { data: newItem, error: insertErr } = await supabase
            .from('items')
            .insert({
              name: displayName,
              description: itemDesc || null,
              category_id: categoryLocalId ?? null,
              sku,
              unit_id: resolvedUnitId,
              item_types: ['product'],
              is_active: !variationArchived,
              is_catalog_parent: false,
            })
            .select('id')
            .single();
          if (insertErr) {
            await recordImportError(supabase, jobId, 'catalog_variation', variationId, insertErr.message);
            stats.items_failed += 1;
            continue;
          }
          if (typeof priceCents === 'number' && priceCents >= 0) {
            await upsertSellingPrice(supabase, newItem.id, today, centsToDecimal(priceCents), taxIncludedForItem);
          }
          await insertMapping(supabase, integrationId, 'catalog_variation', variationId, 'item', newItem.id);
          stats.items_imported += 1;
          await upsertItemTaxesFromSquareTaxIds(
            supabase,
            integrationId,
            newItem.id as number,
            taxIds,
            taxInclusionByTaxId
          );

          if (parentItemId != null) {
            await supabase.from('item_variations').insert({
              parent_item_id: parentItemId,
              variant_item_id: newItem.id,
              square_variation_id: variationId,
              sort_order: vData.ordinal ?? vi,
              name_snapshot: vData.name || null,
            });
          }
        } catch (e: any) {
          await recordImportError(supabase, jobId, 'catalog_variation', variationId, e?.message || String(e));
          stats.items_failed += 1;
        }
      }
    }
    await completeStep(supabase, jobId, catalogStepSeq, {
      rows: allCatalogObjects.length,
      items_imported: stats.items_imported,
      items_failed: stats.items_failed,
    });
  }

  const orderRows = stagingRows.filter((r) => r.data_type === 'order');
  if (orderRows.length > 0 && (syncType === 'orders' || syncType === 'full')) {
    let stepSeq: number;
    let ordersStepSeq: number;
    if (isChunked) {
      stepSeq = await getNextStepSequence(supabase, jobId);
      ordersStepSeq = stepSeq;
      await insertStep(
        supabase,
        jobId,
        stepSeq,
        `Process orders — chunk ${chunkIndex + 1}/${totalChunks}`,
        'running',
        { rows: orderRows.length }
      );
    } else {
      stepSeq = await getNextStepSequence(supabase, jobId);
      ordersStepSeq = stepSeq;
      await insertStep(supabase, jobId, stepSeq, 'Process orders', 'running', {});
    }
    // ---- Preload per-chunk lookups to avoid N+1 round trips ----
    const orderSourceIds: string[] = [];
    const variationCatalogIds: string[] = [];
    const modifierCatalogIds: string[] = [];
    for (const row of orderRows) {
      const order = row.payload;
      const oid = order?.id || row.source_id;
      if (oid) orderSourceIds.push(String(oid));
      const lineItems = order?.line_items || [];
      for (const line of lineItems) {
        if (line?.catalog_object_id) variationCatalogIds.push(String(line.catalog_object_id));
        const mods = Array.isArray(line?.modifiers) ? line.modifiers : [];
        for (const mod of mods) {
          if (mod?.catalog_object_id) modifierCatalogIds.push(String(mod.catalog_object_id));
        }
      }
    }

    const [orderMap, variationMap, modifierMap] = await Promise.all([
      getMappedAppEntityIdsBatch(supabase, integrationId, ['order'], orderSourceIds),
      getMappedAppEntityIdsBatch(
        supabase,
        integrationId,
        ['catalog_variation', 'catalog_item'],
        variationCatalogIds
      ),
      getMappedAppEntityIdsBatch(
        supabase,
        integrationId,
        ['catalog_modifier_item'],
        modifierCatalogIds
      ),
    ]);

    const resolveVariationItemId = (sqId: string): number | null => {
      return (
        variationMap.get(makeMappingKey('catalog_variation', sqId)) ??
        variationMap.get(makeMappingKey('catalog_item', sqId)) ??
        null
      );
    };
    const resolveModifierItemId = (sqId: string): number | null => {
      return modifierMap.get(makeMappingKey('catalog_modifier_item', sqId)) ?? null;
    };

    const costPairs: { itemId: number; dateStr: string }[] = [];
    const referencedItemIds = new Set<number>();
    for (const row of orderRows) {
      const order = row.payload;
      const orderDate = (order?.created_at || '').split('T')[0];
      const dateStr = orderDate || today;
      const lineItems = order?.line_items || [];
      for (const line of lineItems) {
        const itemId = line?.catalog_object_id ? resolveVariationItemId(line.catalog_object_id) : null;
        if (itemId != null) {
          referencedItemIds.add(itemId);
          costPairs.push({ itemId, dateStr });
        }
        const mods = Array.isArray(line?.modifiers) ? line.modifiers : [];
        for (const mod of mods) {
          const modItemId = mod?.catalog_object_id ? resolveModifierItemId(mod.catalog_object_id) : null;
          if (modItemId != null) {
            referencedItemIds.add(modItemId);
            costPairs.push({ itemId: modItemId, dateStr });
          }
        }
      }
    }

    const [costMap, itemsRows, recipesRows] = await Promise.all([
      getItemCostsAsOfBatch(supabase, costPairs),
      referencedItemIds.size > 0
        ? supabase
            .from('items')
            .select('id, unit_id, produced_from_recipe_id, affects_stock')
            .in('id', Array.from(referencedItemIds))
        : Promise.resolve({ data: [] as PreloadedItem[] }),
      referencedItemIds.size > 0
        ? supabase
            .from('recipes')
            .select('id, unit_id')
            .in('id', Array.from(referencedItemIds))
        : Promise.resolve({ data: [] as PreloadedRecipe[] }),
    ]);

    const itemsById = new Map<number, PreloadedItem>();
    for (const it of (itemsRows?.data ?? []) as PreloadedItem[]) {
      itemsById.set(it.id, it);
    }
    const recipesById = new Map<number, PreloadedRecipe>();
    for (const r of (recipesRows?.data ?? []) as PreloadedRecipe[]) {
      recipesById.set(r.id, r);
    }
    const resolveCost = (itemId: number, dateStr: string): number | null => {
      const entry = costMap.get(`${itemId}:${dateStr}`);
      return entry?.unitCost ?? null;
    };

    for (const row of orderRows) {
      const order = row.payload;
      const orderId = order?.id || row.source_id;
      try {
        const existingSaleId = orderMap.get(makeMappingKey('order', String(orderId))) ?? null;
        if (existingSaleId != null) continue;

        const netAmounts = order?.net_amounts || {};
        const totalCents = netAmounts.total_money?.amount ?? 0;
        const taxCents = netAmounts.tax_money?.amount ?? 0;
        const discountCents = netAmounts.discount_money?.amount ?? 0;
        const amount = centsToDecimal(totalCents);
        const totalTax = centsToDecimal(taxCents);
        const totalDiscount = centsToDecimal(discountCents);
        const subtotal = amount - totalTax + totalDiscount;
        const orderDate = (order?.created_at || '').split('T')[0];
        const dateStr = orderDate || today;
        const saleDateIso =
          typeof order?.created_at === 'string' && order.created_at.length > 0
            ? order.created_at
            : `${dateStr}T12:00:00.000Z`;

        const orderTaxes = order?.taxes || [];
        const taxIncluded = orderTaxes.some((t: any) => t?.type === 'INCLUSIVE');

        const lineItems = order?.line_items || [];
        const lineRows: Array<{
          itemId: number | null;
          quantity: number;
          unitPrice: number;
          unitCost: number | null;
          lineTotal: number;
          taxAmount: number;
          taxRatePercent: number;
          taxIncluded: boolean | null;
          name?: string;
          parentLineIndex?: number;
          catalogObjectId?: string;
        }> = [];
        const catalogRefs: string[] = [];
        const missingCatalogRefs: string[] = [];
        for (const line of lineItems) {
          const qty = parseFloat(line.quantity) || 0;
          const catalogObjectId = line.catalog_object_id as string | undefined;
          const itemId = catalogObjectId ? resolveVariationItemId(catalogObjectId) : null;
          if (catalogObjectId) {
            catalogRefs.push(catalogObjectId);
            if (itemId == null) missingCatalogRefs.push(catalogObjectId);
          }
          const baseCents = line.base_price_money?.amount ?? 0;
          const lineTotalCents = line.total_money?.amount ?? (baseCents ? Math.round(baseCents * qty) : 0);
          const unitPrice = qty > 0 ? centsToDecimal(Math.round(lineTotalCents / qty)) : (baseCents ? centsToDecimal(baseCents) : 0);
          const lineTotal = centsToDecimal(lineTotalCents);
          const appliedTaxes = Array.isArray(line.applied_taxes) ? line.applied_taxes : [];
          const appliedTaxCents = appliedTaxes.reduce((sum: number, t: any) => sum + (t?.applied_money?.amount ?? 0), 0);
          const taxCentsRaw = line.total_tax_money?.amount ?? appliedTaxCents ?? 0;
          const taxAmount = centsToDecimal(taxCentsRaw);
          const baseForRate = Math.max(lineTotal - taxAmount, 0);
          const taxPct = baseForRate > 0 && taxAmount > 0 ? (taxAmount / baseForRate) * 100 : 0;
          const unitCost = itemId != null ? resolveCost(itemId, dateStr) : null;
          lineRows.push({
            itemId,
            quantity: qty,
            unitPrice,
            unitCost,
            lineTotal,
            taxAmount,
            taxRatePercent: taxPct,
            taxIncluded: taxIncluded ? true : false,
            name: line.name,
            catalogObjectId,
          });
          const baseIdx = lineRows.length - 1;
          const mods = Array.isArray(line.modifiers) ? line.modifiers : [];
          for (const mod of mods) {
            const modCatId = mod?.catalog_object_id as string | undefined;
            const modItemId = modCatId ? resolveModifierItemId(modCatId) : null;
            if (modCatId) {
              catalogRefs.push(modCatId);
              if (modItemId == null) missingCatalogRefs.push(modCatId);
            }
            const modTotalCents =
              mod?.total_price_money?.amount ??
              (typeof mod?.base_price_money?.amount === 'number' ? Math.round(mod.base_price_money.amount * qty) : 0);
            const modLineTotal = centsToDecimal(modTotalCents);
            const modUnitPrice = qty > 0 ? modLineTotal / qty : modLineTotal;
            const modTaxCents = mod?.total_tax_money?.amount ?? 0;
            const modTaxAmount = centsToDecimal(modTaxCents);
            const modBaseForRate = Math.max(modLineTotal - modTaxAmount, 0);
            const modTaxPct =
              modBaseForRate > 0 && modTaxAmount > 0 ? (modTaxAmount / modBaseForRate) * 100 : 0;
            const modUnitCost = modItemId != null ? resolveCost(modItemId, dateStr) : null;
            lineRows.push({
              itemId: modItemId,
              quantity: qty,
              unitPrice: modUnitPrice,
              unitCost: modUnitCost,
              lineTotal: modLineTotal,
              taxAmount: modTaxAmount,
              taxRatePercent: modTaxPct,
              taxIncluded: taxIncluded ? true : false,
              name: mod?.name,
              parentLineIndex: baseIdx,
              catalogObjectId: modCatId,
            });
          }
        }

        if (chunkContext?.missingCatalogHints && missingCatalogRefs.length > 0) {
          for (const l of lineRows) {
            if (l.catalogObjectId && l.itemId == null) {
              if (!chunkContext.missingCatalogHints.has(l.catalogObjectId)) {
                const isModifier = l.parentLineIndex != null;
                chunkContext.missingCatalogHints.set(l.catalogObjectId, {
                  sourceType: isModifier ? 'catalog_modifier_item' : 'catalog_variation',
                  name: (l.name || '').toString(),
                  unitPrice: l.unitPrice,
                  taxIncluded: !!l.taxIncluded,
                });
              }
            }
          }
        }

        const firstLine = lineRows[0];
        const description = order?.reference_id
          ? `Square #${order.reference_id}`
          : (firstLine?.name ? firstLine.name : null);

        const { data: saleRow, error: saleErr } = await supabase
          .from('sales')
          .insert({
            date: saleDateIso,
            type: 'retail',
            subtotal,
            total_tax: totalTax,
            total_discount: totalDiscount,
            description,
          })
          .select('id')
          .single();
        if (saleErr) {
          await recordImportError(supabase, jobId, 'order', orderId, saleErr.message);
          stats.orders_failed += 1;
          continue;
        }
        const saleId = saleRow.id;

        // Two-pass bulk insert: parents first (for their ids), then children.
        const insertedSaleLineIds: number[] = new Array(lineRows.length);
        const parentIndices: number[] = [];
        const parentPayloads: any[] = [];
        for (let li = 0; li < lineRows.length; li++) {
          const l = lineRows[li];
          if (l.parentLineIndex == null) {
            parentIndices.push(li);
            parentPayloads.push({
              sale_id: saleId,
              item_id: l.itemId,
              quantity: l.quantity,
              unit_price: l.unitPrice,
              unit_cost: l.unitCost,
              line_total: l.lineTotal,
              tax_rate_percent: l.taxRatePercent,
              tax_amount: l.taxAmount,
              tax_included: l.taxIncluded,
              parent_sale_line_id: null,
              sort_order: li,
            });
          }
        }
        if (parentPayloads.length > 0) {
          const { data: insertedParents, error: parentsErr } = await supabase
            .from('sale_line_items')
            .insert(parentPayloads)
            .select('id');
          if (parentsErr) throw parentsErr;
          const parentRows = (insertedParents ?? []) as { id: number }[];
          for (let k = 0; k < parentIndices.length; k++) {
            insertedSaleLineIds[parentIndices[k]] = parentRows[k]?.id as number;
          }
        }

        const childPayloads: any[] = [];
        const childOrigIndices: number[] = [];
        for (let li = 0; li < lineRows.length; li++) {
          const l = lineRows[li];
          if (l.parentLineIndex != null) {
            const parentSaleLineId = insertedSaleLineIds[l.parentLineIndex] ?? null;
            childOrigIndices.push(li);
            childPayloads.push({
              sale_id: saleId,
              item_id: l.itemId,
              quantity: l.quantity,
              unit_price: l.unitPrice,
              unit_cost: l.unitCost,
              line_total: l.lineTotal,
              tax_rate_percent: l.taxRatePercent,
              tax_amount: l.taxAmount,
              tax_included: l.taxIncluded,
              parent_sale_line_id: parentSaleLineId,
              sort_order: li,
            });
          }
        }
        if (childPayloads.length > 0) {
          const { data: insertedChildren, error: childrenErr } = await supabase
            .from('sale_line_items')
            .insert(childPayloads)
            .select('id');
          if (childrenErr) throw childrenErr;
          const childRows = (insertedChildren ?? []) as { id: number }[];
          for (let k = 0; k < childOrigIndices.length; k++) {
            insertedSaleLineIds[childOrigIndices[k]] = childRows[k]?.id as number;
          }
        }

        const stockLines = lineRows.map((l) => ({
          itemId: l.itemId ?? undefined,
          quantity: l.quantity,
        }));
        const hasAnyMappedItem = stockLines.some((l) => l.itemId != null && l.quantity > 0);
        const stockRes = await replaceSaleStockMovements(supabase as unknown as DbSupabaseClient, {
          saleId,
          movementDate: dateStr,
          lines: stockLines,
          preload: { itemsById, recipesById },
        });
        if (!stockRes.ok) {
          await supabase.from('stock_movements').delete().eq('reference_type', 'sale').eq('reference_id', saleId);
          await supabase.from('sale_line_items').delete().eq('sale_id', saleId);
          await supabase.from('sales').delete().eq('id', saleId);
          await recordImportError(supabase, jobId, 'order', orderId, stockRes.message);
          stats.orders_failed += 1;
          continue;
        }

        await supabase.from('entries').insert({
          direction: 'input',
          entry_type: 'sale',
          name: order?.reference_id ? `Sale - Square #${order.reference_id}` : `Sale - ${dateStr}`,
          amount,
          entry_date: dateStr,
          reference_id: saleId,
          is_active: true,
        });

        await insertMapping(supabase, integrationId, 'order', orderId, 'sale', saleId);
        stats.orders_imported += 1;
        if (missingCatalogRefs.length > 0 && chunkContext?.affectedSales) {
          chunkContext.affectedSales.set(saleId, { squareOrderId: orderId, dateStr });
        }
        if (hasAnyMappedItem || catalogRefs.length === 0) {
          stats.stock_reconciled += 1;
        } else {
          const uniqueMissing = Array.from(new Set(missingCatalogRefs));
          const preview = uniqueMissing.slice(0, 5).join(', ');
          const suffix = uniqueMissing.length > 5 ? `, +${uniqueMissing.length - 5} more` : '';
          await recordImportError(
            supabase,
            jobId,
            'sale_stock',
            String(saleId),
            `Catalog mapping missing for ${uniqueMissing.length} catalog_object_id(s) [${preview}${suffix}] — no stock movements created`
          );
          stats.stock_reconcile_failed += 1;
        }
      } catch (e: any) {
        await recordImportError(supabase, jobId, 'order', orderId, e?.message || String(e));
        stats.orders_failed += 1;
      }
    }

    await completeStep(supabase, jobId, ordersStepSeq, {
      rows: orderRows.length,
      orders_imported: stats.orders_imported,
      orders_failed: stats.orders_failed,
      stock_reconciled: stats.stock_reconciled,
      stock_reconcile_failed: stats.stock_reconcile_failed,
    });
  }

  const paymentRows = stagingRows.filter((r) => r.data_type === 'payment');
  if (paymentRows.length > 0 && (syncType === 'payments' || syncType === 'full')) {
    let stepSeq: number;
    let paymentsStepSeq: number;
    if (isChunked) {
      stepSeq = await getNextStepSequence(supabase, jobId);
      paymentsStepSeq = stepSeq;
      await insertStep(
        supabase,
        jobId,
        stepSeq,
        `Process payments — chunk ${chunkIndex + 1}/${totalChunks}`,
        'running',
        { rows: paymentRows.length }
      );
    } else {
      stepSeq = await getNextStepSequence(supabase, jobId);
      paymentsStepSeq = stepSeq;
      await insertStep(supabase, jobId, stepSeq, 'Process payments', 'running', {});
    }
    for (const row of paymentRows) {
      const payment = row.payload;
      const paymentId = payment?.id || row.source_id;
      try {
        const existingPayId = await getMappedAppEntityId(supabase, integrationId, 'payment', paymentId);
        if (existingPayId != null) continue;

        const orderId = payment?.order_id;
        if (!orderId) continue;
        const saleId = await getMappedAppEntityId(supabase, integrationId, 'order', orderId);
        if (saleId == null) continue;

        const { data: entryRow } = await supabase
          .from('entries')
          .select('id')
          .eq('reference_id', saleId)
          .eq('entry_type', 'sale')
          .maybeSingle();
        if (!entryRow) continue;

        const amountCents = payment?.amount_money?.amount ?? 0;
        const amount = centsToDecimal(amountCents);
        const createdAt = payment?.created_at || '';
        const paymentDate = createdAt.split('T')[0] || today;
        const paymentMethod = (payment?.source_type || 'CARD').toLowerCase();

        const { data: payRow, error: payInsertErr } = await supabase
          .from('payments')
          .insert({
            entry_id: entryRow.id,
            payment_date: paymentDate,
            amount,
            is_paid: true,
            paid_date: paymentDate,
            payment_method: paymentMethod,
          })
          .select('id')
          .single();
        if (payInsertErr) {
          await recordImportError(supabase, jobId, 'payment', paymentId, payInsertErr.message);
          stats.payments_failed += 1;
          continue;
        }
        await insertMapping(supabase, integrationId, 'payment', paymentId, 'payment', payRow.id);
        stats.payments_imported += 1;
      } catch (e: any) {
        await recordImportError(supabase, jobId, 'payment', paymentId, e?.message || String(e));
        stats.payments_failed += 1;
      }
    }
    await completeStep(supabase, jobId, paymentsStepSeq, {
      rows: paymentRows.length,
      payments_imported: stats.payments_imported,
      payments_failed: stats.payments_failed,
    });
  }

  if (isLastChunk && isChunked) {
    const totalItems = accumulatedStats.items_imported + stats.items_imported;
    const totalItemsFailed = accumulatedStats.items_failed + stats.items_failed;
    const totalOrders = accumulatedStats.orders_imported + stats.orders_imported;
    const totalOrdersFailed = accumulatedStats.orders_failed + stats.orders_failed;
    const totalPayments = accumulatedStats.payments_imported + stats.payments_imported;
    const totalPaymentsFailed = accumulatedStats.payments_failed + stats.payments_failed;
    const totalStockReconciled = accumulatedStats.stock_reconciled + stats.stock_reconciled;
    const totalStockReconcileFailed = accumulatedStats.stock_reconcile_failed + stats.stock_reconcile_failed;
    if (syncType === 'catalog' || syncType === 'full') {
      const seq = await getNextStepSequence(supabase, jobId);
      await insertStep(supabase, jobId, seq, 'Process catalog — complete', 'done', {
        items_imported: totalItems,
        items_failed: totalItemsFailed,
      });
    }
    if (syncType === 'orders' || syncType === 'full') {
      const seq = await getNextStepSequence(supabase, jobId);
      await insertStep(supabase, jobId, seq, 'Process orders — complete', 'done', {
        orders_imported: totalOrders,
        orders_failed: totalOrdersFailed,
        stock_reconciled: totalStockReconciled,
        stock_reconcile_failed: totalStockReconcileFailed,
      });
    }
    if (syncType === 'payments' || syncType === 'full') {
      const seq = await getNextStepSequence(supabase, jobId);
      await insertStep(supabase, jobId, seq, 'Process payments — complete', 'done', {
        payments_imported: totalPayments,
        payments_failed: totalPaymentsFailed,
      });
    }
  }

  const hasFailures =
    stats.items_failed > 0 || stats.orders_failed > 0 || stats.payments_failed > 0;
  const summary =
    hasFailures
      ? `${stats.items_failed} items, ${stats.orders_failed} orders, ${stats.payments_failed} payments failed`
      : undefined;

  return {
    status: 'completed',
    error_message: summary,
    stats,
  };
}
