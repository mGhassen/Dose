// Sales API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Sale, CreateSaleData, CreateTransactionPayload, SaleLineItem, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';
import { StockMovementType, StockMovementReferenceType } from '@kit/types';
import { getItemStock } from '@/lib/stock/get-item-stock';
import { produceRecipe } from '@/lib/stock/produce-recipe';
import { getItemSellingPriceAsOf, getItemCostAsOf } from '@/lib/items/price-resolve';
import { upsertSellingPrice, upsertCost } from '@/lib/items/price-history-upsert';
import { getTaxRateForSaleLine } from '@/lib/tax-rules-resolve';

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
  return {
    id: row.id,
    saleId: row.sale_id,
    itemId: row.item_id ?? undefined,
    quantity: parseFloat(row.quantity),
    unitId: row.unit_id ?? undefined,
    unitPrice: parseFloat(row.unit_price),
    unitCost: row.unit_cost != null ? parseFloat(row.unit_cost) : undefined,
    taxRatePercent: row.tax_rate_percent != null ? parseFloat(row.tax_rate_percent) : undefined,
    taxAmount: row.tax_amount != null ? parseFloat(row.tax_amount) : undefined,
    lineTotal: parseFloat(row.line_total),
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateSaleData): Record<string, unknown> {
  const result: Record<string, unknown> = {
    date: data.date,
    type: data.type,
    amount: data.amount,
    description: data.description ?? null,
    item_id: data.itemId ?? null,
  };
  if (data.quantity != null) result.quantity = data.quantity;
  if (data.unit != null && data.unit !== '') result.unit = data.unit;
  if (data.unitId != null) result.unit_id = data.unitId;
  if (data.unitPrice != null) result.unit_price = data.unitPrice;
  if (data.unitCost != null) result.unit_cost = data.unitCost;
  if (data.subtotal != null) result.subtotal = data.subtotal;
  if (data.totalTax != null) result.total_tax = data.totalTax;
  if (data.totalDiscount != null) result.total_discount = data.totalDiscount;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const type = searchParams.get('type');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    let countQuery = supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    let query = supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });

    if (startDateParam && endDateParam) {
      query = query.gte('date', startDateParam).lte('date', endDateParam);
      countQuery = countQuery.gte('date', startDateParam).lte('date', endDateParam);
    } else {
      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('date', startDate).lte('date', endDate);
        countQuery = countQuery.gte('date', startDate).lte('date', endDate);
      }
      if (month) {
        const startOfMonth = `${month}-01`;
        const endOfMonth = new Date(`${month}-01`);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        const endDate = endOfMonth.toISOString().split('T')[0];
        query = query.gte('date', startOfMonth).lte('date', endDate);
        countQuery = countQuery.gte('date', startOfMonth).lte('date', endDate);
      }
    }

    if (type) {
      query = query.eq('type', type);
      countQuery = countQuery.eq('type', type);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    // Fetch items in batch to avoid N+1 queries
    const itemIds = [...new Set((data || []).map((row: any) => row.item_id).filter(Boolean))];
    const itemsMap = new Map<number, any>();
    
    if (itemIds.length > 0) {
      // Fetch items
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .in('id', itemIds);
      
      if (itemsData) {
        itemsData.forEach(item => {
          itemsMap.set(item.id, item);
        });
      }
      
      // Fetch recipes for remaining item_ids
      const foundItemIds = new Set(itemsData?.map(i => i.id) || []);
      const recipeIds = itemIds.filter(id => !foundItemIds.has(id));
      
      if (recipeIds.length > 0) {
        const { data: recipesData } = await supabase
          .from('recipes')
          .select('*')
          .in('id', recipeIds);
        
        if (recipesData) {
          recipesData.forEach(recipe => {
            itemsMap.set(recipe.id, { ...recipe, item_type: 'recipe' });
          });
        }
      }
    }

    // Transform sales with items
    const sales: Sale[] = (data || []).map((row: any) => {
      const sale = transformSale(row);
      
      if (sale.itemId && itemsMap.has(sale.itemId)) {
        const itemData = itemsMap.get(sale.itemId);
        const sellPrice = sale.unitPrice ?? undefined;
        const costPrice = sale.unitCost != null ? sale.unitCost : (itemData.unit_cost != null ? parseFloat(itemData.unit_cost) : undefined);
        if (itemData.item_type === 'recipe') {
          sale.item = {
            id: itemData.id,
            name: itemData.name,
            description: itemData.description,
            category: itemData.category,
            sku: undefined,
            unit: itemData.unit || 'serving',
            unitPrice: sellPrice,
            unitCost: costPrice,
            itemType: 'recipe',
            isActive: itemData.is_active,
            createdAt: itemData.created_at,
            updatedAt: itemData.updated_at,
          };
        } else {
          sale.item = {
            id: itemData.id,
            name: itemData.name,
            description: itemData.description,
            category: itemData.category,
            sku: itemData.sku,
            unit: itemData.unit,
            unitPrice: sellPrice,
            unitCost: costPrice,
            itemType: itemData.item_type,
            isActive: itemData.is_active,
            createdAt: itemData.created_at,
            updatedAt: itemData.updated_at,
          };
        }
      }
      
      return sale;
    });
    
    const total = count || 0;
    
    const response: PaginatedResponse<Sale> = createPaginatedResponse(
      sales,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSaleData & { lineItems?: Array<{ itemId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number }>; discount?: { type: 'amount' | 'percent'; value: number } } = await request.json();

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

    const supabase = createServerSupabaseClient();
    for (let i = 0; i < body.lineItems!.length; i++) {
        const line = body.lineItems![i];
        if (line.quantity == null || line.quantity <= 0 || line.unitPrice == null) {
          return NextResponse.json(
            { error: `Line ${i + 1}: quantity (positive) and unitPrice are required` },
            { status: 400 }
          );
        }
      }
      const dateStr = body.date.split('T')[0] || body.date;
      const lines: Array<{ itemId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; lineTotal: number; taxRatePercent: number; taxAmount: number }> = [];
      for (let i = 0; i < body.lineItems!.length; i++) {
        const line = body.lineItems![i];
        let unitPrice = line.unitPrice;
        let unitCost = line.unitCost;
        let priceLookupItemId: number | null = null;
        let itemCategory: string | null = null;
        if (line.itemId && dateStr) {
          const { data: itemRow } = await supabase.from('items').select('id, default_tax_rate_percent, category').eq('id', line.itemId).single();
          if (itemRow) {
            priceLookupItemId = itemRow.id;
            itemCategory = itemRow.category ?? null;
          } else {
            const { data: produced } = await supabase.from('items').select('id, default_tax_rate_percent, category').eq('produced_from_recipe_id', line.itemId).single();
            if (produced) {
              priceLookupItemId = produced.id;
              itemCategory = produced.category ?? null;
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
        let lineTaxRate = await getTaxRateForSaleLine(supabase, priceLookupItemId ?? line.itemId ?? null, itemCategory, body.type, dateStr);
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

      const { data: saleRow, error: saleError } = await supabase
        .from('sales')
        .insert({
          date: body.date,
          type: body.type,
          amount: total,
          subtotal,
          total_tax: totalTax,
          total_discount: discountAmount,
          description: body.description ?? null,
        })
        .select()
        .single();
      if (saleError) throw saleError;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await supabase.from('sale_line_items').insert({
          sale_id: saleRow.id,
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

      await supabase.from('entries').insert({
        direction: 'input',
        entry_type: 'sale',
        name: body.description || `Sale - ${body.type}`,
        amount: total,
        description: body.description,
        entry_date: dateStr,
        reference_id: saleRow.id,
        is_active: true,
      });

      for (const l of lines) {
        if (!l.itemId || l.quantity <= 0) continue;
        const [itemResult, recipeResult] = await Promise.all([
          supabase.from('items').select('id, unit, produced_from_recipe_id').eq('id', l.itemId).single(),
          supabase.from('recipes').select('id, unit').eq('id', l.itemId).single(),
        ]);
        if (itemResult.data) {
          const targetItemId = itemResult.data.id;
          const unit = itemResult.data.unit || 'unit';
          const { error: outError } = await supabase.from('stock_movements').insert({
            item_id: targetItemId,
            movement_type: StockMovementType.OUT,
            quantity: l.quantity,
            unit,
            reference_type: StockMovementReferenceType.SALE,
            reference_id: saleRow.id,
            movement_date: body.date,
            notes: `Sale #${saleRow.id}`,
          });
          if (outError) console.error('Stock movement error:', outError);
        } else if (recipeResult.data) {
          const { data: producedItem } = await supabase.from('items').select('id, unit').eq('produced_from_recipe_id', l.itemId).single();
          let producedItemId: number;
          let producedItemUnit: string;
          if (!producedItem) {
            const result = await produceRecipe(supabase, String(l.itemId), { quantity: l.quantity, location: null, notes: `Sale #${saleRow.id}` });
            producedItemId = result.producedItemId;
            producedItemUnit = recipeResult.data.unit || 'unit';
          } else {
            producedItemId = producedItem.id;
            producedItemUnit = producedItem.unit || 'unit';
            const stock = await getItemStock(supabase, producedItem.id, null);
            if (stock < l.quantity) {
              await produceRecipe(supabase, String(l.itemId), { quantity: l.quantity - stock, location: null, notes: `Sale #${saleRow.id}` });
            }
          }
          await supabase.from('stock_movements').insert({
            item_id: producedItemId,
            movement_type: StockMovementType.OUT,
            quantity: l.quantity,
            unit: producedItemUnit,
            reference_type: StockMovementReferenceType.SALE,
            reference_id: saleRow.id,
            movement_date: body.date,
            notes: `Sale #${saleRow.id}`,
          });
        }
      }

    const { data: lineItemsData } = await supabase.from('sale_line_items').select('*').eq('sale_id', saleRow.id).order('sort_order');
    const sale = transformSale(saleRow);
    sale.lineItems = (lineItemsData || []).map(transformLineItem);
    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    const details = error?.message || String(error);
    const hint = error?.hint || error?.details || '';
    return NextResponse.json(
      { error: 'Failed to create sale', details: `${details}${hint ? ` (${hint})` : ''}` },
      { status: 500 }
    );
  }
}

