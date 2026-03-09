// Sale by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Sale, UpdateSaleData, SaleLineItem } from '@kit/types';
import { getItemSellingPriceAsOf, getItemCostAsOf } from '@/lib/items/price-resolve';
import { upsertSellingPrice, upsertCost } from '@/lib/items/price-history-upsert';
import { getTaxRateForSaleLine } from '@/lib/tax-rules-resolve';
import { parseRequestBody, updateSaleTransactionSchema } from '@/shared/zod-schemas';

function transformSale(row: any): Sale {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: parseFloat(row.amount),
    quantity: row.quantity,
    unit: row.unit,
    unitId: row.unit_id,
    description: row.description,
    itemId: row.item_id,
    unitPrice: row.unit_price != null ? parseFloat(row.unit_price) : undefined,
    unitCost: row.unit_cost != null ? parseFloat(row.unit_cost) : undefined,
    subtotal: row.subtotal != null ? parseFloat(row.subtotal) : undefined,
    totalTax: row.total_tax != null ? parseFloat(row.total_tax) : undefined,
    totalDiscount: row.total_discount != null ? parseFloat(row.total_discount) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    item: undefined,
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
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.quantity !== undefined) result.quantity = data.quantity;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.unitId !== undefined) result.unit_id = data.unitId;
  if (data.description !== undefined) result.description = data.description;
  if (data.itemId !== undefined) result.item_id = data.itemId;
  if (data.unitPrice !== undefined) result.unit_price = data.unitPrice;
  if (data.unitCost !== undefined) result.unit_cost = data.unitCost;
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

    // Fetch item if item_id exists (could be from items or recipes table)
    if (sale.itemId) {
      // Try items table first
      const { data: itemData } = await supabase
        .from('items')
        .select('*')
        .eq('id', sale.itemId)
        .single();
      
      if (itemData) {
        const dateStr = sale.date ? sale.date.split('T')[0] : undefined;
        const sellPrice = sale.unitPrice != null ? sale.unitPrice : (dateStr ? await getItemSellingPriceAsOf(supabase, itemData.id, dateStr) : undefined);
        const costPrice = sale.unitCost ?? undefined;
        sale.item = {
          id: itemData.id,
          name: itemData.name,
          description: itemData.description,
          category: itemData.category,
          sku: itemData.sku,
          unit: itemData.unit,
          unitPrice: sellPrice ?? undefined,
          unitCost: costPrice ?? undefined,
          itemType: itemData.item_type,
          isActive: itemData.is_active,
          createdAt: itemData.created_at,
          updatedAt: itemData.updated_at,
        };
      } else {
        const { data: recipeData } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', sale.itemId)
          .single();
        
        if (recipeData) {
          sale.item = {
            id: recipeData.id,
            name: recipeData.name,
            description: recipeData.description,
            category: recipeData.category,
            sku: undefined,
            unit: recipeData.unit || 'serving',
            unitPrice: sale.unitPrice ?? undefined,
            unitCost: sale.unitCost ?? undefined,
            itemType: 'recipe',
            isActive: recipeData.is_active,
            createdAt: recipeData.created_at,
            updatedAt: recipeData.updated_at,
          };
        }
      }
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
    const lines: Array<{ itemId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; lineTotal: number; taxRatePercent: number; taxAmount: number }> = [];
    for (let i = 0; i < body.lineItems.length; i++) {
        const line = body.lineItems[i];
        let unitPrice = line.unitPrice;
        let unitCost = line.unitCost;
        let priceLookupItemId: number | null = null;
        let itemCategory: string | null = null;
        let itemCreatedAt: string | null = null;
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
              if (resolved != null) unitPrice = resolved;
            }
            if (unitCost == null) {
              const resolved = await getItemCostAsOf(supabase, priceLookupItemId, dateStr);
              if (resolved != null) unitCost = resolved;
            }
            if (unitPrice != null) await upsertSellingPrice(supabase, priceLookupItemId, dateStr, unitPrice);
            if (unitCost != null) await upsertCost(supabase, priceLookupItemId, dateStr, unitCost);
          }
        }
        let lineTaxRate = await getTaxRateForSaleLine(supabase, priceLookupItemId ?? line.itemId ?? null, itemCategory, body.type, dateStr, itemCreatedAt);
        if (line.taxRatePercent != null) lineTaxRate = line.taxRatePercent;
        const qty = typeof line.quantity === 'number' ? line.quantity : parseFloat(String(line.quantity));
        const lineTotal = Math.round(qty * (unitPrice ?? 0) * 100) / 100;
        const taxAmount = Math.round(lineTotal * (lineTaxRate / 100) * 100) / 100;
        lines.push({
          itemId: line.itemId,
          quantity: qty,
          unitId: line.unitId,
          unitPrice: unitPrice ?? 0,
          unitCost,
          lineTotal,
          taxRatePercent: lineTaxRate,
          taxAmount,
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

    const { data: saleRow, error: updateError } = await supabase
      .from('sales')
      .update({
        date: body.date,
        type: body.type,
        amount: total,
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
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await supabase.from('sale_line_items').insert({
        sale_id: id,
        item_id: l.itemId ?? null,
        quantity: l.quantity,
        unit_id: l.unitId ?? null,
        unit_price: l.unitPrice,
        unit_cost: l.unitCost ?? null,
        tax_rate_percent: l.taxRatePercent,
        tax_amount: l.taxAmount,
        line_total: l.lineTotal,
        sort_order: i,
      });
    }

    const { data: entries } = await supabase.from('entries').select('id').eq('entry_type', 'sale').eq('reference_id', id);
    if (entries?.length) {
      await supabase.from('entries').update({ amount: total, updated_at: new Date().toISOString() }).eq('id', entries[0].id);
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

