// Recipes API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Recipe, CreateRecipeData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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

function transformToSnakeCase(data: CreateRecipeData): any {
  return {
    name: data.name,
    description: data.description,
    serving_size: data.servingSize,
    preparation_time: data.preparationTime,
    cooking_time: data.cookingTime,
    instructions: data.instructions,
    notes: data.notes,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Count query
    const countQuery = supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true });

    // Data query
    const query = supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const recipes: Recipe[] = (data || []).map(transformRecipe);
    const total = count || 0;
    
    const response: PaginatedResponse<Recipe> = createPaginatedResponse(
      recipes,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateRecipeData = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Start a transaction-like operation
    // Insert recipe
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Insert recipe ingredients if provided
    if (body.ingredients && body.ingredients.length > 0) {
      const recipeIngredients = body.ingredients.map(ing => ({
        recipe_id: recipeData.id,
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (ingredientsError) {
        // Rollback: delete the recipe
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        throw ingredientsError;
      }
    }

    return NextResponse.json(transformRecipe(recipeData), { status: 201 });
  } catch (error: any) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe', details: error.message },
      { status: 500 }
    );
  }
}

