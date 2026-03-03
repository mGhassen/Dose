// Sales API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Sale, CreateSaleData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';
import { StockMovementType, StockMovementReferenceType } from '@kit/types';
import { getItemStock } from '@/lib/stock/get-item-stock';
import { produceRecipe } from '@/lib/stock/produce-recipe';
import { getItemSellingPriceAsOf, getItemCostAsOf } from '@/lib/items/price-resolve';

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    item: undefined,
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
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Build count query
    let countQuery = supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    // Build data query (items will be fetched manually since there's no FK)
    let query = supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
      countQuery = countQuery
        .gte('date', startDate)
        .lte('date', endDate);
    }

    if (month) {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(`${month}-01`);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      query = query
        .gte('date', startOfMonth)
        .lte('date', endDate);
      countQuery = countQuery
        .gte('date', startOfMonth)
        .lte('date', endDate);
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
        const sellPrice = sale.unitPrice != null ? sale.unitPrice : (itemData.unit_price ? parseFloat(itemData.unit_price) : undefined);
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
    const body: CreateSaleData = await request.json();
    
    if (!body.date || !body.type || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: date, type, amount' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Validate itemId if provided - check if it exists in items or recipes
    if (body.itemId) {
      const [itemCheck, recipeCheck] = await Promise.all([
        supabase.from('items').select('id').eq('id', body.itemId).single(),
        supabase.from('recipes').select('id').eq('id', body.itemId).single(),
      ]);

      if (itemCheck.error && recipeCheck.error) {
        return NextResponse.json(
          { error: `Item or recipe with id ${body.itemId} not found` },
          { status: 400 }
        );
      }

      if (!body.quantity || body.quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity is required and must be greater than 0 when an item or recipe is selected' },
          { status: 400 }
        );
      }
      const dateStr = body.date.split('T')[0] || body.date;
      let priceLookupItemId: number | null = null;
      const { data: itemRow } = await supabase.from('items').select('id').eq('id', body.itemId).single();
      if (itemRow) priceLookupItemId = itemRow.id;
      else {
        const { data: produced } = await supabase.from('items').select('id').eq('produced_from_recipe_id', body.itemId).single();
        if (produced) priceLookupItemId = produced.id;
      }
      if (priceLookupItemId && dateStr) {
        if (body.unitPrice == null) {
          const resolved = await getItemSellingPriceAsOf(supabase, priceLookupItemId, dateStr);
          if (resolved != null) body.unitPrice = resolved;
        }
        if (body.unitCost == null) {
          const resolved = await getItemCostAsOf(supabase, priceLookupItemId, dateStr);
          if (resolved != null) body.unitCost = resolved;
        }
      }
    }
    
    const { data, error } = await supabase
      .from('sales')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    // Create an INPUT entry for the sale
    const { error: entryError } = await supabase
      .from('entries')
      .insert({
        direction: 'input',
        entry_type: 'sale',
        name: body.description || `Sale - ${body.type}`,
        amount: body.amount,
        description: body.description,
        entry_date: body.date,
        reference_id: data.id,
        is_active: true,
      });

    if (entryError) {
      console.error('Error creating entry for sale:', entryError);
    }

    if (body.itemId && (body.quantity != null && body.quantity > 0)) {
      const quantity = typeof body.quantity === 'number' ? body.quantity : parseFloat(String(body.quantity));
      const unit = body.unit || 'unit';
      const location = null;

      const [itemResult, recipeResult] = await Promise.all([
        supabase.from('items').select('id, unit, produced_from_recipe_id').eq('id', body.itemId).single(),
        supabase.from('recipes').select('id, unit').eq('id', body.itemId).single(),
      ]);

      if (itemResult.data) {
        const targetItemId = itemResult.data.id;
        const itemUnit = itemResult.data.unit || unit;

        const { error: outError } = await supabase.from('stock_movements').insert({
          item_id: targetItemId,
          movement_type: StockMovementType.OUT,
          quantity,
          unit: itemUnit,
          reference_type: StockMovementReferenceType.SALE,
          reference_id: data.id,
          location,
          movement_date: body.date,
          notes: `Sale #${data.id}`,
        });

        if (outError) {
          console.error('Error creating stock movement for sale:', outError);
          return NextResponse.json(
            { error: 'Failed to create stock movement', details: outError.message },
            { status: 500 }
          );
        }
      } else if (recipeResult.data) {
        let producedItemId: number;
        let producedItemUnit: string;

        const { data: producedItem } = await supabase
          .from('items')
          .select('id, unit')
          .eq('produced_from_recipe_id', body.itemId)
          .single();

        if (!producedItem) {
          const result = await produceRecipe(supabase, String(body.itemId), {
            quantity,
            location,
            notes: `Sale #${data.id}`,
          });
          producedItemId = result.producedItemId;
          producedItemUnit = recipeResult.data.unit || unit;
        } else {
          producedItemId = producedItem.id;
          producedItemUnit = producedItem.unit || unit;
          const stock = await getItemStock(supabase, producedItem.id, location);
          if (stock < quantity) {
            const toProduce = quantity - stock;
            await produceRecipe(supabase, String(body.itemId), {
              quantity: toProduce,
              location,
              notes: `Sale #${data.id} - auto-produced`,
            });
          }
        }

        const { error: outError } = await supabase.from('stock_movements').insert({
          item_id: producedItemId,
          movement_type: StockMovementType.OUT,
          quantity,
          unit: producedItemUnit,
          reference_type: StockMovementReferenceType.SALE,
          reference_id: data.id,
          location,
          movement_date: body.date,
          notes: `Sale #${data.id}`,
        });

        if (outError) {
          console.error('Error creating stock movement for sale:', outError);
          return NextResponse.json(
            { error: 'Failed to create stock movement', details: outError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(transformSale(data), { status: 201 });
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

