// Sale by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Sale, UpdateSaleData, SaleLineItem } from '@kit/types';
import { getItemSellingPriceAsOf, getItemCostAsOf } from '@/lib/items/price-resolve';
import { upsertSellingPrice, upsertCost } from '@/lib/items/price-history-upsert';
import { getTaxRateAndRuleForSaleLineWithItemTaxes, getTaxRateAndRuleForExpenseLineWithItemTaxes } from '@/lib/item-taxes-resolve';
import { lineTaxAmount, netUnitPriceFromInclusive, unitPriceExclToIncl } from '@/lib/transaction-tax';
import { parseRequestBody, updateSaleTransactionSchema } from '@/shared/zod-schemas';
import { paymentSlicesSumMatchesTotal, replacePaymentsForEntry } from '@/lib/ledger/replace-entry-payments';
import { replaceSaleStockMovements } from '@/lib/sales/replace-sale-stock-movements';

function transformSale(row: any): Sale {
  const subtotal = row.subtotal != null ? parseFloat(row.subtotal) : 0;
  const totalTax = row.total_tax != null ? parseFloat(row.total_tax) : 0;
  const totalDiscount = row.total_discount != null ? parseFloat(row.total_discount) : 0;
  const amount = Math.round((subtotal + totalTax - totalDiscount) * 100) / 100;
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount,
    description: row.description,
    subtotal: row.subtotal != null ? parseFloat(row.subtotal) : undefined,
    totalTax: row.total_tax != null ? parseFloat(row.total_tax) : undefined,
    totalDiscount: row.total_discount != null ? parseFloat(row.total_discount) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformLineItem(row: any): SaleLineItem {
  const quantity = parseFloat(row.quantity) || 0;
  const lineTotal = row.line_total != null ? parseFloat(row.line_total) : 0;
  const rawUnitPrice = row.unit_price != null ? parseFloat(row.unit_price) : NaN;
  const unitPrice = Number.isFinite(rawUnitPrice) ? rawUnitPrice : (quantity > 0 ? lineTotal / quantity : 0);
  return {
    id: row.id,
    saleId: row.sale_id,
    parentSaleLineId: row.parent_sale_line_id ?? undefined,
    itemId: row.item_id ?? undefined,
    quantity,
    unitId: row.unit_id ?? undefined,
    unitPrice,
    unitCost: row.unit_cost != null ? parseFloat(row.unit_cost) : undefined,
    taxRatePercent: row.tax_rate_percent != null ? parseFloat(row.tax_rate_percent) : undefined,
    taxAmount: row.tax_amount != null ? parseFloat(row.tax_amount) : undefined,
    lineTotal,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateSaleData): any {
  const result: any = { updated_at: new Date().toISOString() };
  if (data.date !== undefined) result.date = data.date;
  if (data.type !== undefined) result.type = data.type;
  if (data.description !== undefined) result.description = data.description;
  if (data.subtotal !== undefined) result.subtotal = data.subtotal;
  if (data.totalTax !== undefined) result.total_tax = data.totalTax;
  if (data.totalDiscount !== undefined) result.total_discount = data.totalDiscount;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }
      throw error;
    }

    const sale = transformSale(data);

    const { data: lineItemsData } = await supabase
      .from('sale_line_items')
      .select('*')
      .eq('sale_id', id)
      .order('sort_order');
    sale.lineItems = (lineItemsData || []).map(transformLineItem);

    const itemIds = [...new Set((sale.lineItems || []).map((l) => l.itemId).filter(Boolean))] as number[];
    if (itemIds.length > 0) {
      const { data: itemsData } = await supabase.from('items').select('id, name').in('id', itemIds);
      const itemsMap = new Map((itemsData || []).map((i) => [i.id, { id: i.id, name: i.name }]));
      const missingIds = itemIds.filter((id) => !itemsMap.has(id));
      let recipesMap = new Map<number, { id: number; name: string }>();
      if (missingIds.length > 0) {
        const { data: recipesData } = await supabase.from('recipes').select('id, name').in('id', missingIds);
        recipesMap = new Map((recipesData || []).map((r) => [r.id, { id: r.id, name: r.name }]));
      }
      sale.lineItems = sale.lineItems!.map((line) => {
        if (line.itemId == null) return line;
        const fromItems = itemsMap.get(line.itemId);
        const fromRecipes = recipesMap.get(line.itemId);
        const item = fromItems ?? fromRecipes;
        return item ? { ...line, item: { id: item.id, name: item.name } as any } : line;
      });
    }

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error('Error fetching sale:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await parseRequestBody(request, updateSaleTransactionSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
      return NextResponse.json(
        { error: 'lineItems (at least one line) is required' },
        { status: 400 }
      );
    }
    if (!body.date || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: date, type' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const dateStr = ((body.date ?? '').split('T')[0]) || (body.date ?? '');
    const lines: Array<{
      itemId?: number;
      quantity: number;
      unitId?: number;
      unitPrice: number;
      unitCost?: number;
      lineTotal: number;
      taxRatePercent: number;
      taxAmount: number;
      parentLineIndex?: number;
    }> = [];
    for (let i = 0; i < body.lineItems.length; i++) {
        const line = body.lineItems[i];
        let unitPrice = line.unitPrice;
        let unitCost = line.unitCost;
        let priceLookupItemId: number | null = null;
        let itemCategory: string | null = null;
        let itemCreatedAt: string | null = null;
        let resolvedPriceFromHistory: number | null = null;
        let resolvedTaxIncludedFromHistory: boolean | null = null;
        if (line.itemId && dateStr) {
          const { data: itemRow } = await supabase.from('items').select('id, category, created_at').eq('id', line.itemId).single();
          if (itemRow) {
            priceLookupItemId = itemRow.id;
            itemCategory = itemRow.category ?? null;
            itemCreatedAt = itemRow.created_at ?? null;
          } else {
            const { data: produced } = await supabase.from('items').select('id, category, created_at').eq('produced_from_recipe_id', line.itemId).single();
            if (produced) {
              priceLookupItemId = produced.id;
              itemCategory = produced.category ?? null;
              itemCreatedAt = produced.created_at ?? null;
            }
          }
          if (priceLookupItemId) {
            if (unitPrice == null) {
              const resolved = await getItemSellingPriceAsOf(supabase, priceLookupItemId, dateStr);
              if (resolved.unitPrice != null) {
                unitPrice = resolved.unitPrice;
                resolvedPriceFromHistory = resolved.unitPrice;
                resolvedTaxIncludedFromHistory = resolved.taxIncluded;
              }
            }
            if (unitCost == null) {
              const resolved = await getItemCostAsOf(supabase, priceLookupItemId, dateStr);
              if (resolved.unitCost != null) unitCost = resolved.unitCost;
            }
            if (unitCost != null) {
              const expenseTaxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(
                supabase,
                priceLookupItemId,
                itemCategory,
                dateStr,
                itemCreatedAt
              );
              await upsertCost(
                supabase,
                priceLookupItemId,
                dateStr,
                unitCost,
                expenseTaxRule.taxInclusive === true
              );
            }
          }
        }
        const taxRule = await getTaxRateAndRuleForSaleLineWithItemTaxes(supabase, priceLookupItemId ?? line.itemId ?? null, itemCategory, body.type, dateStr, itemCreatedAt);
        let lineTaxRate = line.taxRatePercent != null ? line.taxRatePercent : taxRule.rate;
        const taxInclusive = taxRule.taxInclusive ?? false;
        let netUnit = unitPrice ?? 0;
        if (resolvedPriceFromHistory != null && resolvedTaxIncludedFromHistory === true && lineTaxRate > 0) {
          netUnit = netUnitPriceFromInclusive(resolvedPriceFromHistory, lineTaxRate);
        }
        const qty = typeof line.quantity === 'number' ? line.quantity : parseFloat(String(line.quantity));
        const { lineTotalNet, taxAmount } = lineTaxAmount(qty, netUnit, lineTaxRate, taxInclusive);
        const lineTotal = lineTotalNet;
        const priceToSave = priceLookupItemId != null && netUnit > 0
          ? (taxInclusive && lineTaxRate > 0 ? unitPriceExclToIncl(netUnit, lineTaxRate) : netUnit)
          : null;
        if (priceLookupItemId != null && priceToSave != null) {
          await upsertSellingPrice(supabase, priceLookupItemId, dateStr, priceToSave, taxInclusive);
        }
        lines.push({
          itemId: line.itemId,
          quantity: qty,
          unitId: line.unitId,
          unitPrice: netUnit,
          unitCost,
          lineTotal,
          taxRatePercent: lineTaxRate,
          taxAmount,
          parentLineIndex: line.parentLineIndex,
        });
    }
    const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    const totalTax = Math.round(lines.reduce((s, l) => s + l.taxAmount, 0) * 100) / 100;
    let discountAmount = 0;
    if (body.discount?.value != null && body.discount.value > 0) {
      if (body.discount.type === 'percent') {
        discountAmount = Math.round(subtotal * (body.discount.value / 100) * 100) / 100;
      } else {
        discountAmount = Math.round(body.discount.value * 100) / 100;
      }
    }
    const total = Math.round((subtotal + totalTax - discountAmount) * 100) / 100;

    if (body.paymentSlices != null && body.paymentSlices.length > 0 && !paymentSlicesSumMatchesTotal(body.paymentSlices, total)) {
      return NextResponse.json({ error: 'Payment slices must sum to sale total' }, { status: 400 });
    }

    const { data: saleRow, error: updateError } = await supabase
      .from('sales')
      .update({
        date: body.date,
        type: body.type,
        subtotal,
        total_tax: totalTax,
        total_discount: discountAmount,
        description: body.description ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (updateError) {
      if (updateError.code === 'PGRST116') return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      throw updateError;
    }

    await supabase.from('sale_line_items').delete().eq('sale_id', id);
    const insertedLineIds: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const pIdx = l.parentLineIndex;
      const parentSaleLineId =
        pIdx != null && pIdx >= 0 && pIdx < insertedLineIds.length ? insertedLineIds[pIdx] ?? null : null;
      const { data: insRow, error: insErr } = await supabase
        .from('sale_line_items')
        .insert({
          sale_id: id,
          item_id: l.itemId ?? null,
          quantity: l.quantity,
          unit_id: l.unitId ?? null,
          unit_price: l.unitPrice,
          unit_cost: l.unitCost ?? null,
          tax_rate_percent: l.taxRatePercent,
          tax_amount: l.taxAmount,
          line_total: l.lineTotal,
          parent_sale_line_id: parentSaleLineId,
          sort_order: i,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      insertedLineIds[i] = insRow.id as number;
    }

    const { data: entries } = await supabase.from('entries').select('id').eq('entry_type', 'sale').eq('reference_id', id);
    if (entries?.length) {
      await supabase.from('entries').update({ amount: total, updated_at: new Date().toISOString() }).eq('id', entries[0].id);
    }

    const entryId = entries?.[0]?.id;
    if (entryId != null && body.paymentSlices != null) {
      const { error: payErr } = await replacePaymentsForEntry(supabase, entryId, body.paymentSlices);
      if (payErr) {
        return NextResponse.json({ error: 'Failed to persist payments', details: payErr }, { status: 500 });
      }
    }

    const stockRes = await replaceSaleStockMovements(supabase, {
      saleId: Number(id),
      movementDate: body.date,
      lines,
    });
    if (!stockRes.ok) {
      return NextResponse.json(
        { error: 'Failed to record stock', details: stockRes.message },
        { status: 500 }
      );
    }

    const { data: lineItemsData } = await supabase.from('sale_line_items').select('*').eq('sale_id', id).order('sort_order');
    const sale = transformSale(saleRow);
    sale.lineItems = (lineItemsData || []).map(transformLineItem);
    return NextResponse.json(sale);
  } catch (error: any) {
    console.error('Error updating sale:', error);
    return NextResponse.json(
      { error: 'Failed to update sale', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();

    const { error: movementError } = await supabase
      .from('stock_movements')
      .delete()
      .eq('reference_type', 'sale')
      .eq('reference_id', Number(id));

    if (movementError) throw movementError;

    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale', details: error.message },
      { status: 500 }
    );
  }
}

