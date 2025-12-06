// Items API Route (replaces ingredients)

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

    const supabase = createServerSupabaseClient();
    
    // Fetch both items and recipes, then combine them
    // This allows recipes to be used as items without duplication
    
    // Fetch items
    let itemsQuery = supabase
      .from('items')
      .select('*');
    
    if (itemType && itemType !== 'recipe') {
      itemsQuery = itemsQuery.eq('item_type', itemType);
    } else if (!itemType) {
      // If no filter, only get regular items (not recipes from items table)
      itemsQuery = itemsQuery.eq('item_type', 'item');
    }

    // Fetch recipes (they are items too)
    let recipesQuery = supabase
      .from('recipes')
      .select('*');
    
    // Apply itemType filter for recipes
    if (itemType === 'recipe') {
      // Only recipes
    } else if (!itemType) {
      // Include recipes when no filter
    } else {
      // If filtering for specific item type (not recipe), exclude recipes
      recipesQuery = recipesQuery.eq('id', -1); // Empty result
    }

    // Execute both queries
    const [{ data: itemsData, error: itemsError }, { data: recipesData, error: recipesError }] = await Promise.all([
      itemsQuery,
      recipesQuery,
    ]);

    if (itemsError) throw itemsError;
    if (recipesError) throw recipesError;

    // Transform recipes to items format (for API response only, not stored in items table)
    const recipesAsItems = (recipesData || []).map((recipe: any) => {
      const recipeItem: any = {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        unit: recipe.unit || 'serving',
        category: recipe.category,
        item_type: 'recipe',
        is_active: recipe.is_active,
        created_at: recipe.created_at,
        updated_at: recipe.updated_at,
        // Recipe-specific fields
        serving_size: recipe.serving_size,
        preparation_time: recipe.preparation_time,
        cooking_time: recipe.cooking_time,
        instructions: recipe.instructions,
        notes: recipe.notes,
      };
      return recipeItem;
    });

    // Combine items and recipes
    const allData = [...(itemsData || []), ...recipesAsItems];
    
    // Sort by created_at descending
    allData.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply pagination manually
    const total = allData.length;
    const paginatedData = allData.slice(offset, offset + limit);

    // Transform items and recipes to Item type
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
          // Recipe-specific fields
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
        { error: 'Missing required fields: name and unit' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (itemError) throw itemError;

    return NextResponse.json(transformItem(itemData), { status: 201 });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item', details: error.message },
      { status: 500 }
    );
  }
}
