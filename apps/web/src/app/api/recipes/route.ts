// Recipes API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Recipe, CreateRecipeData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';
import {
  producedIdsFromCreateBody,
  validateProducedOutputItems,
  insertRecipeProducedLinks,
} from '@/lib/recipes/produced-item-output-links';
import {
  replaceRecipeModifierQuantities,
  validateModifierQuantities,
} from '@/lib/recipes/modifier-quantities';

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
  };
}

function transformToSnakeCase(data: CreateRecipeData): any {
  const result: any = {
    name: data.name,
    description: data.description,
    unit: data.unit || 'serving',
    category: data.category,
    item_type: 'recipe',
    serving_size: data.servingSize,
    preparation_time: data.preparationTime,
    cooking_time: data.cookingTime,
    instructions: data.instructions,
    notes: data.notes,
    is_active: data.isActive ?? true,
  };
  if (data.unitId != null) result.unit_id = data.unitId;
  if (data.producedItemId !== undefined) result.produced_item_id = data.producedItemId;
  return result;
}

function recipeInsertRow(body: CreateRecipeData): Record<string, unknown> {
  const producedIds = producedIdsFromCreateBody(body);
  const row = transformToSnakeCase(body) as Record<string, unknown>;
  row.produced_item_id = producedIds.length === 1 ? producedIds[0] : null;
  return row;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams, {
      maxLimit: 1000,
    });

    const supabase = supabaseServer();
    
    // Count query - recipes are stored in the recipes table
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
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.createRecipeSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as CreateRecipeData;

    const supabase = supabaseServer();
    const producedIds = producedIdsFromCreateBody(body);

    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert(recipeInsertRow(body))
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Insert recipe items if provided (can be items or other recipes)
    if (body.items && body.items.length > 0) {
      const recipeItems = body.items.map(item => ({
        recipe_id: recipeData.id,
        item_id: item.itemId,
        quantity: item.quantity,
        unit: item.unit,
        unit_id: item.unitId,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from('recipe_items')
        .insert(recipeItems);

      if (itemsError) {
        // Rollback: delete the recipe
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        throw itemsError;
      }
    }
    
    // Also support legacy 'ingredients' field for backward compatibility
    const legacyIngredients = (body as { ingredients?: Array<{ ingredientId: number; quantity: number; unit: string; unitId?: number; notes?: string }> }).ingredients;
    if (legacyIngredients && legacyIngredients.length > 0) {
      const recipeItems = legacyIngredients.map(ing => ({
        recipe_id: recipeData.id,
        item_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_id: (ing as any).unitId,
        notes: ing.notes,
      }));

      const { error: itemsError } = await supabase
        .from('recipe_items')
        .insert(recipeItems);

      if (itemsError) {
        // Rollback: delete the recipe
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        throw itemsError;
      }
    }

    if (producedIds.length > 0) {
      const v = await validateProducedOutputItems(supabase, producedIds, Number(recipeData.id));
      if (!v.ok) {
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        return NextResponse.json({ error: v.message }, { status: v.status });
      }
      const linkErr = await insertRecipeProducedLinks(supabase, Number(recipeData.id), producedIds);
      if (linkErr.error) {
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        throw new Error(linkErr.error);
      }
    }

    if (body.modifierQuantities && body.modifierQuantities.length > 0) {
      if (producedIds.length === 0) {
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        return NextResponse.json(
          { error: 'Choose a produced item before saving modifier quantities' },
          { status: 400 }
        );
      }
      const valid = await validateModifierQuantities(
        supabase,
        Number(recipeData.id),
        body.modifierQuantities,
        { alsoAllowForProducedItemIds: producedIds }
      );
      if (!valid.ok) {
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        return NextResponse.json({ error: valid.message }, { status: valid.status });
      }
      const modErr = await replaceRecipeModifierQuantities(
        supabase,
        Number(recipeData.id),
        body.modifierQuantities
      );
      if (modErr.error) {
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        throw new Error(modErr.error);
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

