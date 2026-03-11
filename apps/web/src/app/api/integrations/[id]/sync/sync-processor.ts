/**
 * Process a sync job: read staging data and push to items/sales/entries/payments.
 * Used by the cron (or triggered) processor route.
 *
 * Square → app mapping (orders):
 * - Order totals: net_amounts.total_money, tax_money, discount_money → sales.amount, total_tax, total_discount, subtotal.
 * - Line item: base_price_money (per-unit), total_money, total_tax_money, catalog_object_id → item_id via integration_entity_mapping.
 * - Tax inclusion: order.taxes[].type === 'INCLUSIVE' → sale_line_items.tax_included true; else ADDITIVE/unknown → false/null.
 */

import { getMappedAppEntityId, insertMapping, centsToDecimal } from './square-import';
import { upsertSellingPrice } from '@/lib/items/price-history-upsert';
import { getItemCostAsOf } from '@/lib/items/price-resolve';

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

export async function processSyncJob(
  supabase: SupabaseClient,
  job: { id: number; integration_id: number; sync_type: string },
  integration: any,
  stagingRows: { data_type: string; source_id: string; payload: any }[]
): Promise<{ status: 'completed' | 'failed'; error_message?: string; stats: Record<string, number> }> {
  const jobId = job.id;
  const integrationId = integration.id as number;
  const syncType = job.sync_type;
  const today = new Date().toISOString().split('T')[0];

  const stats: Record<string, number> = {
    items_imported: 0,
    items_failed: 0,
    orders_imported: 0,
    orders_failed: 0,
    payments_imported: 0,
    payments_failed: 0,
  };

  let unitId: number | null = null;
  const { data: unitRow } = await supabase.from('units').select('id').eq('symbol', 'unit').maybeSingle();
  if (unitRow) unitId = unitRow.id;

  const catalogBatches = stagingRows.filter((r) => r.data_type === 'catalog_batch');
  if (catalogBatches.length > 0 && (syncType === 'catalog' || syncType === 'full')) {
    const allCatalogObjects: any[] = [];
    for (const row of catalogBatches) {
      const arr = Array.isArray(row.payload) ? row.payload : [row.payload];
      allCatalogObjects.push(...arr);
    }
    const itemsMap = new Map<string, any>();
    const variationsMap = new Map<string, any[]>();
    const categoriesMap = new Map<string, any>();
    for (const obj of allCatalogObjects) {
      if (obj.type === 'ITEM') {
        itemsMap.set(obj.id, obj);
        if (!variationsMap.has(obj.id)) variationsMap.set(obj.id, []);
      } else if (obj.type === 'ITEM_VARIATION') {
        const itemId = obj.item_variation_data?.item_id;
        if (itemId) {
          if (!variationsMap.has(itemId)) variationsMap.set(itemId, []);
          variationsMap.get(itemId)!.push(obj);
        }
      } else if (obj.type === 'CATEGORY') {
        categoriesMap.set(obj.id, obj);
      }
    }
    for (const [itemId, itemObj] of itemsMap) {
      if (itemObj.is_deleted) continue;
      const variations = variationsMap.get(itemId) || [];
      const categoryId = itemObj.item_data?.category_id;
      const categoryName = categoryId ? (categoriesMap.get(categoryId)?.category_data?.name || '') : '';
      const itemName = itemObj.item_data?.name || 'Unnamed';
      const itemDesc = itemObj.item_data?.description || '';

      if (variations.length === 0) {
        try {
          const existing = await getMappedAppEntityId(supabase, integrationId, 'catalog_item', itemId);
          if (existing != null) continue;
          const { data: newItem, error: insertErr } = await supabase
            .from('items')
            .insert({
              name: itemName,
              description: itemDesc,
              category: categoryName || null,
              unit: 'unit',
              unit_id: unitId,
              item_type: 'item',
              is_active: true,
            })
            .select('id')
            .single();
          if (insertErr) {
            await recordImportError(supabase, jobId, 'catalog_item', itemId, insertErr.message);
            stats.items_failed += 1;
            continue;
          }
          await insertMapping(supabase, integrationId, 'catalog_item', itemId, 'item', newItem.id);
          stats.items_imported += 1;
        } catch (e: any) {
          await recordImportError(supabase, jobId, 'catalog_item', itemId, e?.message || String(e));
          stats.items_failed += 1;
        }
      }

      for (const variation of variations) {
        if (variation.is_deleted) continue;
        const variationId = variation.id;
        try {
          const existing = await getMappedAppEntityId(supabase, integrationId, 'catalog_variation', variationId);
          if (existing != null) continue;
          const vData = variation.item_variation_data || {};
          const name = variations.length > 1 ? `${itemName} - ${vData.name || variationId}` : itemName;
          const sku = vData.sku || null;
          const priceCents = vData.price_money?.amount;
          const { data: newItem, error: insertErr } = await supabase
            .from('items')
            .insert({
              name,
              description: itemDesc || null,
              category: categoryName || null,
              sku,
              unit: 'unit',
              unit_id: unitId,
              item_type: 'item',
              is_active: true,
            })
            .select('id')
            .single();
          if (insertErr) {
            await recordImportError(supabase, jobId, 'catalog_variation', variationId, insertErr.message);
            stats.items_failed += 1;
            continue;
          }
          if (typeof priceCents === 'number' && priceCents >= 0) {
            await upsertSellingPrice(supabase, newItem.id, today, centsToDecimal(priceCents));
          }
          await insertMapping(supabase, integrationId, 'catalog_variation', variationId, 'item', newItem.id);
          stats.items_imported += 1;
        } catch (e: any) {
          await recordImportError(supabase, jobId, 'catalog_variation', variationId, e?.message || String(e));
          stats.items_failed += 1;
        }
      }
    }
  }

  const orderRows = stagingRows.filter((r) => r.data_type === 'order');
  if (orderRows.length > 0 && (syncType === 'orders' || syncType === 'full')) {
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
          const taxAmount = centsToDecimal(line.total_tax_money?.amount ?? 0);
          const taxPct = lineTotal > 0 && taxAmount > 0 ? (taxAmount / lineTotal) * 100 : 0;
          let unitCost: number | null = null;
          if (itemId != null) {
            const cost = await getItemCostAsOf(supabase, itemId, dateStr);
            if (cost != null) unitCost = cost;
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
        }

        const firstLine = lineRows[0];
        const sumQty = lineRows.reduce((s, l) => s + l.quantity, 0) || 1;
        const description = order?.reference_id
          ? `Square #${order.reference_id}`
          : (firstLine?.name ? firstLine.name : null);

        const { data: saleRow, error: saleErr } = await supabase
          .from('sales')
          .insert({
            date: dateStr,
            type: 'retail',
            amount,
            subtotal,
            total_tax: totalTax,
            total_discount: totalDiscount,
            description,
            item_id: firstLine?.itemId ?? null,
            quantity: sumQty,
            unit_price: firstLine?.unitPrice ?? null,
            unit_cost: firstLine?.unitCost ?? null,
          })
          .select('id')
          .single();
        if (saleErr) {
          await recordImportError(supabase, jobId, 'order', orderId, saleErr.message);
          stats.orders_failed += 1;
          continue;
        }
        const saleId = saleRow.id;

        let sortOrder = 0;
        for (const l of lineRows) {
          await supabase.from('sale_line_items').insert({
            sale_id: saleId,
            item_id: l.itemId,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            unit_cost: l.unitCost,
            line_total: l.lineTotal,
            tax_rate_percent: l.taxRatePercent,
            tax_amount: l.taxAmount,
            tax_included: l.taxIncluded,
            sort_order: sortOrder++,
          });
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
      } catch (e: any) {
        await recordImportError(supabase, jobId, 'order', orderId, e?.message || String(e));
        stats.orders_failed += 1;
      }
    }
  }

  const paymentRows = stagingRows.filter((r) => r.data_type === 'payment');
  if (paymentRows.length > 0 && (syncType === 'payments' || syncType === 'full')) {
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
