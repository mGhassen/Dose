// Items API Route
// Items are actual inventory - can be raw ingredients OR produced items (from recipes)
// Recipes are NOT items - they're separate in recipes table

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Item, CreateItemData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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
  };
}

function transformToSnakeCase(data: CreateItemData): any {
  const result: any = {
    name: data.name,
    description: data.description,
    category: data.category,
    item_type: 'item',
    sku: data.sku,
    unit_cost: data.unitCost,
    vendor_id: data.vendorId,
    notes: data.notes,
    is_active: data.isActive ?? true,
  };
  if (data.unitId != null) result.unit_id = data.unitId;
  if (data.unit != null) result.unit = data.unit;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const itemType = searchParams.get('itemType');
    const includeRecipes = searchParams.get('includeRecipes') === 'true';
    const producedOnly = searchParams.get('producedOnly') === 'true';

    const supabase = createServerSupabaseClient();

    let itemsQuery = supabase
      .from('items')
      .select('*');

    if (itemType) {
      itemsQuery = itemsQuery.eq('item_type', itemType);
    } else {
      itemsQuery = itemsQuery.eq('item_type', 'item');
    }

    if (producedOnly) {
      const { data: recipeLinks } = await supabase
        .from('recipes')
        .select('produced_item_id')
        .not('produced_item_id', 'is', null);
      const linkedIds = [...new Set((recipeLinks || []).map((r: any) => r.produced_item_id).filter(Boolean))];
      if (linkedIds.length > 0) {
        itemsQuery = itemsQuery.or(`produced_from_recipe_id.not.is.null,id.in.(${linkedIds.join(',')})`);
      } else {
        itemsQuery = itemsQuery.not('produced_from_recipe_id', 'is', null);
      }
    }

    const { data: itemsData, error: itemsError } = await itemsQuery;
    if (itemsError) throw itemsError;

    let allData: any[] = [...(itemsData || [])];

    if (includeRecipes && !producedOnly) {
      // Get produced item recipe IDs to exclude those recipes (avoid duplicates)
      const producedRecipeIds = new Set(
        (itemsData || [])
          .filter((item: any) => item.produced_from_recipe_id)
          .map((item: any) => item.produced_from_recipe_id)
      );

      // Fetch all active recipes
      const { data: allRecipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_active', true);
      
      if (recipesError) throw recipesError;
      
      // Filter out recipes that have produced items (in JavaScript)
      const recipesData = (allRecipesData || []).filter(
        (recipe: any) => !producedRecipeIds.has(recipe.id)
      );

      if (recipesError) throw recipesError;

      // Transform recipes to items format (for API response only)
      const recipesAsItems = (recipesData || []).map((recipe: any) => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        unit: recipe.unit || 'serving',
        category: recipe.category,
        item_type: 'recipe',
        is_active: recipe.is_active,
        created_at: recipe.created_at,
        updated_at: recipe.updated_at,
        serving_size: recipe.serving_size,
        preparation_time: recipe.preparation_time,
        cooking_time: recipe.cooking_time,
        instructions: recipe.instructions,
        notes: recipe.notes,
      }));

      allData = [...allData, ...recipesAsItems];
    }

    // Sort by created_at descending
    allData.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply pagination manually
    const total = allData.length;
    const paginatedData = allData.slice(offset, offset + limit);

    // Transform to Item type
    const items: Item[] = paginatedData.map((row: any) => {
      if (row.item_type === 'recipe') {
        // Transform recipe to Item format
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          unit: row.unit || 'serving',
          unitId: row.unit_id,
          category: row.category,
          itemType: 'recipe' as const,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          servingSize: row.serving_size,
          preparationTime: row.preparation_time,
          cookingTime: row.cooking_time,
          instructions: row.instructions,
          notes: row.notes,
        };
      } else {
        // Transform regular item
        return transformItem(row);
      }
    });
    
    const response: PaginatedResponse<Item> = createPaginatedResponse(
      items,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateItemData = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }
    if (body.unitId == null && body.unit == null) {
      return NextResponse.json(
        { error: 'Provide either unit or unitId' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: itemData, error } = await supabase
      .from('items')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformItem(itemData), { status: 201 });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item', details: error.message },
      { status: 500 }
    );
  }
}
