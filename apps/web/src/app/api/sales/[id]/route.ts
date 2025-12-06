// Sale by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Sale, UpdateSaleData } from '@kit/types';

function transformSale(row: any): Sale {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: parseFloat(row.amount),
    quantity: row.quantity,
    description: row.description,
    itemId: row.item_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    item: undefined, // Will be populated separately
  };
}

function transformToSnakeCase(data: UpdateSaleData): any {
  const result: any = {};
  if (data.date !== undefined) result.date = data.date;
  if (data.type !== undefined) result.type = data.type;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.quantity !== undefined) result.quantity = data.quantity;
  if (data.description !== undefined) result.description = data.description;
  if (data.itemId !== undefined) result.item_id = data.itemId;
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
        sale.item = {
          id: itemData.id,
          name: itemData.name,
          description: itemData.description,
          category: itemData.category,
          sku: itemData.sku,
          unit: itemData.unit,
          unitPrice: itemData.unit_price ? parseFloat(itemData.unit_price) : undefined,
          itemType: itemData.item_type,
          isActive: itemData.is_active,
          createdAt: itemData.created_at,
          updatedAt: itemData.updated_at,
        };
      } else {
        // Try recipes table
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
            unitPrice: undefined,
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

