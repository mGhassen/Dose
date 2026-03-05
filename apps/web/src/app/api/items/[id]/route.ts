// Items API Route - Get, Update, Delete by ID

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Item, UpdateItemData } from '@kit/types';
import { parseRequestBody, updateItemSchema } from '@/shared/zod-schemas';

function transformItem(row: any): Item {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit || '',
    unitId: row.unit_id,
    category: row.category,
    itemType: 'item' as const,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sku: row.sku,
    unitPrice: undefined,
    unitCost: row.unit_cost != null ? parseFloat(row.unit_cost) : undefined,
    vendorId: row.vendor_id,
    notes: row.notes,
    producedFromRecipeId: row.produced_from_recipe_id,
    defaultTaxRatePercent: row.default_tax_rate_percent != null ? parseFloat(row.default_tax_rate_percent) : undefined,
  };
}

function transformToSnakeCase(data: UpdateItemData): any {
  // Items should only have item fields, recipes are updated via recipes API
  const result: any = {};
  
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.unitId !== undefined) result.unit_id = data.unitId;
  if (data.category !== undefined) result.category = data.category;
  if (data.sku !== undefined) result.sku = data.sku;
  if (data.unitCost !== undefined) result.unit_cost = data.unitCost;
  if (data.vendorId !== undefined) result.vendor_id = data.vendorId;
  if (data.notes !== undefined) result.notes = data.notes;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.producedFromRecipeId !== undefined) result.produced_from_recipe_id = data.producedFromRecipeId;
  if (data.defaultTaxRatePercent !== undefined) result.default_tax_rate_percent = data.defaultTaxRatePercent;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    // Try to find in items table first
    let { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    // If not found in items, check if it's a recipe ID and if there's a produced item
    if (itemError && itemError.code === 'PGRST116') {
      // First check if there's a produced item for this recipe ID
      const { data: producedItemData } = await supabase
        .from('items')
        .select('*')
        .eq('produced_from_recipe_id', id)
        .single();
      
      if (producedItemData) {
        // Return the produced item instead
        itemData = producedItemData;
      } else {
        // Check if it's a recipe (for backward compatibility)
        const { data: recipeData, error: recipeError } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();

        if (recipeError) {
          if (recipeError.code === 'PGRST116') {
            return NextResponse.json(
              { error: 'Item not found' },
              { status: 404 }
            );
          }
          throw recipeError;
        }

        // Transform recipe to item format (for API response, not stored)
        itemData = {
          id: recipeData.id,
          name: recipeData.name,
          description: recipeData.description,
          unit: recipeData.unit || 'serving',
          unit_id: recipeData.unit_id,
          category: recipeData.category,
          item_type: 'recipe',
          serving_size: recipeData.serving_size,
          preparation_time: recipeData.preparation_time,
          cooking_time: recipeData.cooking_time,
          instructions: recipeData.instructions,
          notes: recipeData.notes,
          is_active: recipeData.is_active,
          created_at: recipeData.created_at,
          updated_at: recipeData.updated_at,
        };
      }
    } else if (itemError) {
      throw itemError;
    }

    if (!itemData) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Transform based on type
    if (itemData.item_type === 'recipe') {
      return NextResponse.json({
        id: itemData.id,
        name: itemData.name,
        description: itemData.description,
        unit: itemData.unit || 'serving',
        unitId: itemData.unit_id,
        category: itemData.category,
        itemType: 'recipe' as const,
        isActive: itemData.is_active,
        createdAt: itemData.created_at,
        updatedAt: itemData.updated_at,
        servingSize: itemData.serving_size,
        preparationTime: itemData.preparation_time,
        cookingTime: itemData.cooking_time,
        instructions: itemData.instructions,
        notes: itemData.notes,
      });
    } else {
      return NextResponse.json(transformItem(itemData));
    }
  } catch (error: any) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item', details: error.message },
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
    const parsed = await parseRequestBody(request, updateItemSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdateItemData;

    const supabase = createServerSupabaseClient();
    
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (itemError) throw itemError;

    return NextResponse.json(transformItem(itemData));
  } catch (error: any) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item', details: error.message },
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
      .from('items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item', details: error.message },
      { status: 500 }
    );
  }
}
