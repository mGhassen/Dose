// Items API Route
// Items are actual inventory - can be raw ingredients OR produced items (from recipes)
// Recipes are NOT items - they're separate in recipes table

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Item, CreateItemData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformItem(row: any): Item {
  // Transform regular item from items table (not recipes)
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit || '',
    category: row.category,
    itemType: 'item' as const, // Items from items table are always 'item'
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Item-specific fields
    sku: row.sku,
    unitPrice: row.unit_price ? parseFloat(row.unit_price) : undefined,
    vendorId: row.vendor_id,
    notes: row.notes,
    producedFromRecipeId: row.produced_from_recipe_id,
  };
}

function transformToSnakeCase(data: CreateItemData): any {
  // Items should only have item fields, recipes are created via recipes API
  return {
    name: data.name,
    description: data.description,
    unit: data.unit,
    category: data.category,
    item_type: 'item', // Always 'item' for items table
    sku: data.sku,
    unit_price: data.unitPrice,
    vendor_id: data.vendorId,
    notes: data.notes,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const itemType = searchParams.get('itemType'); // Filter by item type
    const includeRecipes = searchParams.get('includeRecipes') === 'true'; // For selection purposes

    const supabase = createServerSupabaseClient();
    
    // Fetch items from items table
    // Items can be: raw ingredients OR produced items (with produced_from_recipe_id)
    let itemsQuery = supabase
      .from('items')
      .select('*');
    
    if (itemType) {
      itemsQuery = itemsQuery.eq('item_type', itemType);
    } else {
      // Default: only get items (not recipes)
      itemsQuery = itemsQuery.eq('item_type', 'item');
    }

    // Execute items query
    const { data: itemsData, error: itemsError } = await itemsQuery;
    if (itemsError) throw itemsError;

    let allData: any[] = [...(itemsData || [])];

    // If includeRecipes=true, also fetch recipes (for selection in sales/recipes)
    if (includeRecipes) {
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
    
    if (!body.name || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: name, unit' },
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
