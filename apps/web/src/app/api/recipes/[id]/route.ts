// Recipe by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Recipe, RecipeWithIngredients, UpdateRecipeData, RecipeIngredient } from '@kit/types';

function transformRecipe(row: any): Recipe {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
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

function transformRecipeIngredient(row: any): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    ingredientId: row.ingredient_id,
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
    
    // Get recipe
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

    // Get recipe ingredients with ingredient details
    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select(`
        *,
        ingredient:ingredients(*)
      `)
      .eq('recipe_id', id);

    if (ingredientsError) throw ingredientsError;

    const recipe: RecipeWithIngredients = {
      ...transformRecipe(recipeData),
      ingredients: (ingredientsData || []).map(ri => ({
        ...transformRecipeIngredient(ri),
        ingredient: ri.ingredient ? {
          id: ri.ingredient.id,
          name: ri.ingredient.name,
          description: ri.ingredient.description,
          unit: ri.ingredient.unit,
          category: ri.ingredient.category,
          isActive: ri.ingredient.is_active,
          createdAt: ri.ingredient.created_at,
          updatedAt: ri.ingredient.updated_at,
        } : undefined,
      })),
    };

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
    
    // Update recipe
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

    // Update ingredients if provided
    if (body.ingredients !== undefined) {
      // Delete existing ingredients
      await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id);

      // Insert new ingredients
      if (body.ingredients.length > 0) {
        const recipeIngredients = body.ingredients.map(ing => ({
          recipe_id: Number(id),
          ingredient_id: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(recipeIngredients);

        if (ingredientsError) throw ingredientsError;
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
    
    // Recipe ingredients will be deleted via CASCADE
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

