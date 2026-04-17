/**
 * Process a sync job: read staging data and push to items/sales/entries/payments.
 * Used by the cron (or triggered) processor route.
 *
 * Square → app mapping (orders):
 * - Order totals: net_amounts → sales.subtotal, total_tax, total_discount (amount = subtotal + total_tax - total_discount).
 * - Line item: base_price_money (per-unit), total_money, total_tax_money, catalog_object_id → item_id via integration_entity_mapping.
 * - Tax inclusion: order.taxes[].type === 'INCLUSIVE' → sale_line_items.tax_included true; else ADDITIVE/unknown → false/null.
 */

import { getMappedAppEntityId, insertMapping, centsToDecimal } from './square-import';
import {
  getDefaultUnitVariableId,
  resolveSquareMeasurementUnitId,
} from './square-measurement-unit';
import {
  ensureCatalogTaxVariableMapping,
  upsertItemTaxesFromSquareTaxIds,
} from './square-tax';
import { upsertSellingPrice } from '@/lib/items/price-history-upsert';
import { getItemCostAsOf } from '@/lib/items/price-resolve';
import type { SupabaseClient as DbSupabaseClient } from '@supabase/supabase-js';
import { replaceSaleStockMovements } from '@/lib/sales/replace-sale-stock-movements';

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

async function getNextStepSequence(supabase: SupabaseClient, jobId: number): Promise<number> {
  const { data: rows } = await supabase
    .from('sync_job_steps')
    .select('sequence')
    .eq('job_id', jobId)
    .order('sequence', { ascending: false })
    .limit(1);
  const max = rows?.[0]?.sequence ?? 0;
  return max + 1;
}

async function insertStep(
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

async function completeStep(
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
                category: null,
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
              category: null,
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
      const categoryId = itemObj.item_data?.category_id;
      const categoryName = categoryId ? (categoriesMap.get(categoryId)?.category_data?.name || '') : '';
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
          if (existing != null) continue;
          const { data: newItem, error: insertErr } = await supabase
            .from('items')
            .insert({
              name: itemName,
              description: itemDesc,
              category: categoryName || null,
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
      if (parentItemId == null) {
        try {
          const { data: parentRow, error: parentErr } = await supabase
            .from('items')
            .insert({
              name: itemName,
              description: itemDesc || null,
              category: categoryName || null,
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
              category: categoryName || null,
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
    const touchedSales: { saleId: number; date: string }[] = [];
    for (const row of orderRows) {
      const order = row.payload;
      const orderId = order?.id || row.source_id;
      try {
        const existingSaleId = await getMappedAppEntityId(supabase, integrationId, 'order', orderId);
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
        }> = [];
        for (const line of lineItems) {
          const qty = parseFloat(line.quantity) || 0;
          const catalogObjectId = line.catalog_object_id;
          let itemId: number | null = null;
          if (catalogObjectId) {
            itemId = await getMappedAppEntityId(supabase, integrationId, 'catalog_variation', catalogObjectId);
            if (itemId == null) itemId = await getMappedAppEntityId(supabase, integrationId, 'catalog_item', catalogObjectId);
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
          let unitCost: number | null = null;
          if (itemId != null) {
            const cost = await getItemCostAsOf(supabase, itemId, dateStr);
            if (cost.unitCost != null) unitCost = cost.unitCost;
          }
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
          });
          const baseIdx = lineRows.length - 1;
          const mods = Array.isArray(line.modifiers) ? line.modifiers : [];
          for (const mod of mods) {
            const modCatId = mod?.catalog_object_id;
            let modItemId: number | null = null;
            if (modCatId) {
              modItemId = await getMappedAppEntityId(supabase, integrationId, 'catalog_modifier_item', modCatId);
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
            let modUnitCost: number | null = null;
            if (modItemId != null) {
              const cost = await getItemCostAsOf(supabase, modItemId, dateStr);
              if (cost.unitCost != null) modUnitCost = cost.unitCost;
            }
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
            });
          }
        }

        const firstLine = lineRows[0];
        const sumQty = lineRows.reduce((s, l) => s + l.quantity, 0) || 1;
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

        const insertedSaleLineIds: number[] = [];
        let sortOrder = 0;
        for (let li = 0; li < lineRows.length; li++) {
          const l = lineRows[li];
          const parentIdx = l.parentLineIndex;
          const parentSaleLineId =
            parentIdx != null && parentIdx >= 0 ? insertedSaleLineIds[parentIdx] ?? null : null;
          const { data: insLine, error: lineInsErr } = await supabase
            .from('sale_line_items')
            .insert({
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
              sort_order: sortOrder++,
            })
            .select('id')
            .single();
          if (lineInsErr) throw lineInsErr;
          insertedSaleLineIds[li] = insLine.id as number;
        }

        const stockLines = lineRows.map((l) => ({
          itemId: l.itemId ?? undefined,
          quantity: l.quantity,
        }));
        const stockRes = await replaceSaleStockMovements(supabase as unknown as DbSupabaseClient, {
          saleId,
          movementDate: dateStr,
          lines: stockLines,
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
        touchedSales.push({ saleId, date: dateStr });
      } catch (e: any) {
        await recordImportError(supabase, jobId, 'order', orderId, e?.message || String(e));
        stats.orders_failed += 1;
      }
    }

    if (touchedSales.length > 0) {
      const reconcileSeq = await getNextStepSequence(supabase, jobId);
      await insertStep(supabase, jobId, reconcileSeq, 'Reconcile sale stock movements', 'running', {
        sales: touchedSales.length,
      });
      for (const { saleId, date } of touchedSales) {
        const { data: linesFresh } = await supabase
          .from('sale_line_items')
          .select('item_id, quantity')
          .eq('sale_id', saleId);
        const lines: { itemId?: number; quantity: number }[] = (linesFresh || []).map(
          (r: { item_id: number | null; quantity: number | string }) => ({
            itemId: r.item_id ?? undefined,
            quantity: Number(r.quantity) || 0,
          })
        );
        const hasAnyMappedItem = lines.some((l) => l.itemId != null && l.quantity > 0);
        if (!hasAnyMappedItem) {
          await recordImportError(
            supabase,
            jobId,
            'sale_stock',
            String(saleId),
            'No mapped line items (catalog mapping missing) — no stock movements created'
          );
          stats.stock_reconcile_failed += 1;
          continue;
        }
        const res = await replaceSaleStockMovements(supabase as unknown as DbSupabaseClient, {
          saleId,
          movementDate: date,
          lines,
        });
        if (!res.ok) {
          await recordImportError(supabase, jobId, 'sale_stock', String(saleId), res.message);
          stats.stock_reconcile_failed += 1;
          continue;
        }
        stats.stock_reconciled += 1;
      }
      await completeStep(supabase, jobId, reconcileSeq, {
        stock_reconciled: stats.stock_reconciled,
        stock_reconcile_failed: stats.stock_reconcile_failed,
      });
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
