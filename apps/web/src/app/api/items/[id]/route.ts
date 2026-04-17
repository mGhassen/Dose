// Items API Route - Get, Update, Delete by ID

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Item, UpdateItemData } from '@kit/types';
import { normalizeItemKinds } from '@kit/types';
import { parseRequestBody, updateItemSchema } from '@/shared/zod-schemas';
import { getUnitVariableMap } from '../../_utils/unit-variables';

function mapCategoryRow(row: any): Item['category'] {
  const c = row?.category;
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    label: c.label,
    description: c.description ?? null,
    displayOrder: c.display_order ?? 0,
    isActive: c.is_active ?? true,
  };
}

function transformItem(row: any, unitMap: Map<number, { symbol: string }>): Item {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: unitMap.get(row.unit_id)?.symbol || '',
    unitId: row.unit_id,
    categoryId: row.category_id ?? null,
    category: mapCategoryRow(row),
    itemTypes: normalizeItemKinds(row.item_types),
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sku: row.sku,
    unitPrice: undefined,
    vendorId: row.vendor_id,
    notes: row.notes,
    producedFromRecipeId: row.produced_from_recipe_id,
    affectsStock: row.affects_stock ?? true,
    isCatalogParent: row.is_catalog_parent ?? false,
  };
}

function transformToSnakeCase(data: UpdateItemData): any {
  const result: any = {};

  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.unitId !== undefined) result.unit_id = data.unitId;
  if (data.categoryId !== undefined) result.category_id = data.categoryId;
  if (data.sku !== undefined) result.sku = data.sku;
  if (data.vendorId !== undefined) result.vendor_id = data.vendorId;
  if (data.notes !== undefined) result.notes = data.notes;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.producedFromRecipeId !== undefined) result.produced_from_recipe_id = data.producedFromRecipeId;
  if (data.itemTypes !== undefined) result.item_types = normalizeItemKinds(data.itemTypes);
  if (data.affectsStock !== undefined) result.affects_stock = data.affectsStock;
  return result;
}

const ITEM_SELECT_WITH_CATEGORY =
  '*, category:item_categories(id, name, label, description, display_order, is_active)';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    
    let { data: itemData, error: itemError } = await supabase
      .from('items')
      .select(ITEM_SELECT_WITH_CATEGORY)
      .eq('id', id)
      .single();

    if (itemError && itemError.code === 'PGRST116') {
      const { data: producedItemData } = await supabase
        .from('items')
        .select(ITEM_SELECT_WITH_CATEGORY)
        .eq('produced_from_recipe_id', id)
        .single();

      if (producedItemData) {
        itemData = producedItemData;
      } else {
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

        itemData = {
          id: recipeData.id,
          name: recipeData.name,
          description: recipeData.description,
          unit: recipeData.unit || 'serving',
          unit_id: recipeData.unit_id,
          category_id: null,
          category: recipeData.category
            ? { id: -1, name: recipeData.category, label: recipeData.category }
            : null,
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
    if (itemData.instructions != null) {
      return NextResponse.json({
        id: itemData.id,
        name: itemData.name,
        description: itemData.description,
        unit: itemData.unit || 'serving',
        unitId: itemData.unit_id,
        categoryId: itemData.category_id ?? null,
        category: mapCategoryRow(itemData),
        itemTypes: ['item'],
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
      const unitMap = await getUnitVariableMap(supabase as any, [itemData?.unit_id]);
      return NextResponse.json(transformItem(itemData, unitMap));
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

    const supabase = supabaseServer();
    
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select(ITEM_SELECT_WITH_CATEGORY)
      .single();

    if (itemError) throw itemError;

    const unitMap = await getUnitVariableMap(supabase as any, [itemData?.unit_id]);
    return NextResponse.json(transformItem(itemData, unitMap));
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
    const supabase = supabaseServer();
    
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
