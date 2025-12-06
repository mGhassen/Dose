// Recipe by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Recipe, RecipeWithItems, UpdateRecipeData, RecipeItem } from '@kit/types';

function transformRecipe(row: any): Recipe {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    category: row.category,
    itemType: 'recipe' as const,
    servingSize: row.serving_size,
    preparationTime: row.preparation_time,
    cookingTime: row.cooking_time,
    instructions: row.instructions,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformRecipeItem(row: any): RecipeItem {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    itemId: row.item_id,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
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
  if (data.category !== undefined) result.category = data.category;
  if (data.servingSize !== undefined) result.serving_size = data.servingSize;
  if (data.preparationTime !== undefined) result.preparation_time = data.preparationTime;
  if (data.cookingTime !== undefined) result.cooking_time = data.cookingTime;
  if (data.instructions !== undefined) result.instructions = data.instructions;
  if (data.notes !== undefined) result.notes = data.notes;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
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

    const recipe: RecipeWithItems = {
      ...transformRecipe(recipeData),
      items: (itemsData || []).map(ri => ({
        ...transformRecipeItem(ri),
        item: ri.item ? {
          id: ri.item.id,
          name: ri.item.name,
          description: ri.item.description,
          unit: ri.item.unit,
          category: ri.item.category,
          itemType: ri.item.item_type || 'item',
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
    const body: UpdateRecipeData = await request.json();
    const supabase = createServerSupabaseClient();
    
    // Update recipe in recipes table
    const updateData = transformToSnakeCase(body);
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (recipeError) throw recipeError;
    if (!recipeData) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }


    // Update items if provided (supports both 'items' and legacy 'ingredients')
    const itemsToUpdate = body.items || body.ingredients;
    if (itemsToUpdate !== undefined) {
      // Delete existing items
      await supabase
        .from('recipe_items')
        .delete()
        .eq('recipe_id', id);

      // Insert new items
      if (itemsToUpdate.length > 0) {
        const recipeItems = itemsToUpdate.map(item => ({
          recipe_id: Number(id),
          item_id: item.itemId || (item as any).ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
        }));

        const { error: itemsError } = await supabase
          .from('recipe_items')
          .insert(recipeItems);

        if (itemsError) throw itemsError;
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
    const supabase = createServerSupabaseClient();
    
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

