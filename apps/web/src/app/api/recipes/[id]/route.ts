// Recipe by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Recipe, RecipeWithItems, UpdateRecipeData, RecipeItem } from '@kit/types';
import { normalizeItemKinds } from '@kit/types';
import { getItemSellingPriceAsOf } from '@/lib/items/price-resolve';

function transformRecipe(row: any): Recipe {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    unitId: row.unit_id,
    category: row.category,
    servingSize: row.serving_size,
    preparationTime: row.preparation_time,
    cookingTime: row.cooking_time,
    instructions: row.instructions,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    producedItemId: row.produced_item_id ?? undefined,
  };
}

function transformRecipeItem(row: any): RecipeItem {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    itemId: row.item_id,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    unitId: row.unit_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateRecipeData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.unitId !== undefined) result.unit_id = data.unitId;
  if (data.category !== undefined) result.category = data.category;
  if (data.servingSize !== undefined) result.serving_size = data.servingSize;
  if (data.preparationTime !== undefined) result.preparation_time = data.preparationTime;
  if (data.cookingTime !== undefined) result.cooking_time = data.cookingTime;
  if (data.instructions !== undefined) result.instructions = data.instructions;
  if (data.notes !== undefined) result.notes = data.notes;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.producedItemId !== undefined) result.produced_item_id = data.producedItemId;
  return result;
}

function transformItem(row: any): any {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    unitId: row.unit_id,
    category: row.category,
    itemTypes: normalizeItemKinds(row.item_types),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    producedFromRecipeId: row.produced_from_recipe_id,
    sku: row.sku,
    notes: row.notes,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    
    // Get recipe from recipes table
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (recipeError) throw recipeError;
    if (!recipeData) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Get recipe items with item details (can be items or other recipes)
    const { data: itemsData, error: itemsError } = await supabase
      .from('recipe_items')
      .select(`
        *,
        item:items(*)
      `)
      .eq('recipe_id', id);

    if (itemsError) throw itemsError;

    const { data: producedLinks } = await supabase
      .from('recipe_produced_items')
      .select('item_id')
      .eq('recipe_id', id);
    const producedItemIds = (producedLinks || []).map((r: any) => r.item_id).filter(Boolean);
    let producedItemsData: any[] = [];
    if (producedItemIds.length > 0) {
      const { data: itemsRows } = await supabase
        .from('items')
        .select('*')
        .in('id', producedItemIds);
      producedItemsData = itemsRows || [];
    }
    const producedItems = producedItemsData.map(transformItem);
    const producedItemData: any = producedItemsData[0] ?? null;

    const recipe: RecipeWithItems = {
      ...transformRecipe(recipeData),
      producedItems: producedItems.length > 0 ? producedItems : undefined,
      items: (itemsData || []).map(ri => ({
        ...transformRecipeItem(ri),
        item: ri.item ? {
          id: ri.item.id,
          name: ri.item.name,
          description: ri.item.description,
          unit: ri.item.unit,
          unitId: ri.item.unit_id,
          category: ri.item.category,
          itemTypes: normalizeItemKinds(ri.item.item_types),
          isActive: ri.item.is_active,
          createdAt: ri.item.created_at,
          updatedAt: ri.item.updated_at,
        } : undefined,
      })),
    };
    
    // Also include legacy 'ingredients' field for backward compatibility
    (recipe as any).ingredients = recipe.items.map(item => ({
      ...item,
      ingredientId: item.itemId,
      ingredient: item.item,
    }));

    if (producedItemData) {
      const todayStr = new Date().toISOString().split('T')[0];
      const resolvedPrice = await getItemSellingPriceAsOf(supabase, producedItemData.id, todayStr);
      (recipe as any).producedItem = {
        ...transformItem(producedItemData),
        unitPrice: resolvedPrice.unitPrice ?? undefined,
      };
    }

    return NextResponse.json(recipe);
  } catch (error: any) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe', details: error.message },
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
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.updateRecipeSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdateRecipeData;
    const supabase = supabaseServer();
    
    const updateData = transformToSnakeCase(body);
    let recipeData: any = null;
    if (Object.keys(updateData).length > 0) {
      const { data, error: recipeError } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (recipeError) throw recipeError;
      recipeData = data;
    }
    if (!recipeData) {
      const { data, error: fetchError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      recipeData = data;
    }
    if (!recipeData) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }


    // Update items if provided (supports both 'items' and legacy 'ingredients')
    const itemsToUpdate = body.items || (body as { ingredients?: typeof body.items }).ingredients;
    if (itemsToUpdate !== undefined) {
      await supabase.from('recipe_items').delete().eq('recipe_id', id);
      if (itemsToUpdate.length > 0) {
        const recipeItems = itemsToUpdate.map(item => ({
          recipe_id: Number(id),
          item_id: item.itemId || (item as any).ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          unit_id: item.unitId,
          notes: item.notes,
        }));
        const { error: itemsError } = await supabase.from('recipe_items').insert(recipeItems);
        if (itemsError) throw itemsError;
      }
    }

    if (body.producedItemIds !== undefined) {
      await supabase.from('recipe_produced_items').delete().eq('recipe_id', id);
      if (body.producedItemIds.length > 0) {
        const { error: linkError } = await supabase.from('recipe_produced_items').insert(
          body.producedItemIds.map((itemId: number) => ({ recipe_id: Number(id), item_id: itemId }))
        );
        if (linkError) throw linkError;
      }
    }

    return NextResponse.json(transformRecipe(recipeData));
  } catch (error: any) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe', details: error.message },
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
    
    // Recipe items will be deleted via CASCADE
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe', details: error.message },
      { status: 500 }
    );
  }
}

