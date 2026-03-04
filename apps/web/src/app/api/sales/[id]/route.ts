// Sale by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Sale, UpdateSaleData } from '@kit/types';
import { getItemSellingPriceAsOf, getItemCostAsOf } from '@/lib/items/price-resolve';
import { upsertSellingPrice, upsertCost } from '@/lib/items/price-history-upsert';

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

function transformToSnakeCase(data: UpdateSaleData): any {
  const result: any = {};
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
  result.updated_at = new Date().toISOString();
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
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

    let sale = transformSale(data);
    
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
        const costPrice = sale.unitCost != null ? sale.unitCost : (itemData.unit_cost != null ? parseFloat(itemData.unit_cost) : undefined);
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
    const body: UpdateSaleData = await request.json();

    const supabase = createServerSupabaseClient();
    
    // Validate itemId if provided - check if it exists in items or recipes
    if (body.itemId !== undefined) {
      if (body.itemId === null) {
        // null is allowed (no item linked)
      } else {
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
      }
    }
    const dateStr = body.date ? body.date.split('T')[0] : undefined;
    let priceLookupItemId: number | null = null;
    if (body.itemId) {
      const { data: itemRow } = await supabase.from('items').select('id').eq('id', body.itemId).single();
      if (itemRow) priceLookupItemId = itemRow.id;
      else {
        const { data: produced } = await supabase.from('items').select('id').eq('produced_from_recipe_id', body.itemId).single();
        if (produced) priceLookupItemId = produced.id;
      }
    }
    if (priceLookupItemId && dateStr) {
      if (body.unitPrice === undefined) {
        const resolved = await getItemSellingPriceAsOf(supabase, priceLookupItemId, dateStr);
        if (resolved != null) body.unitPrice = resolved;
      }
      if (body.unitCost === undefined) {
        const resolved = await getItemCostAsOf(supabase, priceLookupItemId, dateStr);
        if (resolved != null) body.unitCost = resolved;
      }
      if (body.unitPrice != null) {
        await upsertSellingPrice(supabase, priceLookupItemId, dateStr, body.unitPrice);
      }
      if (body.unitCost != null) {
        await upsertCost(supabase, priceLookupItemId, dateStr, body.unitCost);
      }
    }

    const { data, error } = await supabase
      .from('sales')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformSale(data));
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
    const supabase = createServerSupabaseClient();
    
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

