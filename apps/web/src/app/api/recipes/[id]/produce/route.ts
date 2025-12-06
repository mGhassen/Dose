// Produce Recipe API Route
// Records recipe production and automatically deducts ingredients from stock

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { StockMovementType, StockMovementReferenceType } from '@kit/types';

interface ProduceRecipeData {
  quantity: number; // Number of servings/units produced
  location?: string;
  notes?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ProduceRecipeData = await request.json();
    const supabase = createServerSupabaseClient();
    
    if (!body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Get recipe with items from recipes table
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('*, items:recipe_items(*, item:items(*))')
      .eq('id', id)
      .single();

    if (recipeError) throw recipeError;
    if (!recipeData) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    if (!recipeData.items || recipeData.items.length === 0) {
      return NextResponse.json(
        { error: 'Recipe has no items' },
        { status: 400 }
      );
    }

    // Calculate multiplier based on serving size
    const servingSize = recipeData.serving_size || 1;
    const multiplier = body.quantity / servingSize;

    // Step 1: Deduct ingredients from stock (OUT movements)
    const movements = [];
    for (const recipeItem of recipeData.items) {
      const item = recipeItem.item;
      if (!item) continue;

      const quantityToDeduct = recipeItem.quantity * multiplier;

      // Check if we have enough stock (optional - could be a warning instead of error)
      const { data: stockLevel } = await supabase
        .from('stock_levels')
        .select('quantity')
        .eq('item_id', item.id)
        .eq('location', body.location || null)
        .single();

      if (stockLevel && stockLevel.quantity < quantityToDeduct) {
        // Log warning but continue - could be adjusted later
        console.warn(`Low stock for item ${item.name}: ${stockLevel.quantity} available, ${quantityToDeduct} needed`);
      }

      // Create stock movement (OUT)
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          item_id: item.id,
          movement_type: StockMovementType.OUT,
          quantity: quantityToDeduct,
          unit: recipeItem.unit,
          reference_type: StockMovementReferenceType.RECIPE,
          reference_id: Number(id),
          location: body.location || null,
          movement_date: new Date().toISOString(),
          notes: `Used in recipe: ${recipeData.name} (${body.quantity} servings)${body.notes ? ` - ${body.notes}` : ''}`,
        });

      if (movementError) throw movementError;
      movements.push({ itemId: item.id, quantity: quantityToDeduct, type: 'OUT' });
    }

    // Step 2: Get or create the produced item for this recipe
    // Check if an item with this produced_from_recipe_id already exists
    let { data: producedItem, error: itemCheckError } = await supabase
      .from('items')
      .select('*')
      .eq('produced_from_recipe_id', Number(id))
      .single();

    // If item doesn't exist, create it
    if (itemCheckError && itemCheckError.code === 'PGRST116') {
      const { data: newItem, error: itemCreateError } = await supabase
        .from('items')
        .insert({
          name: recipeData.name,
          description: recipeData.description || `Produced from recipe: ${recipeData.name}`,
          category: recipeData.category,
          unit: recipeData.unit || 'serving',
          produced_from_recipe_id: Number(id),
          item_type: 'item',
          is_active: true,
        })
        .select()
        .single();

      if (itemCreateError) throw itemCreateError;
      if (!newItem) {
        throw new Error('Failed to create produced item');
      }
      producedItem = newItem;
    } else if (itemCheckError) {
      throw itemCheckError;
    }

    if (!producedItem) {
      throw new Error('Produced item not found and could not be created');
    }

    // Step 3: Add the produced item to stock (IN movement)
    const { error: inMovementError } = await supabase
      .from('stock_movements')
      .insert({
        item_id: producedItem.id,
        movement_type: StockMovementType.IN,
        quantity: body.quantity,
        unit: recipeData.unit || 'serving',
        reference_type: StockMovementReferenceType.RECIPE,
        reference_id: Number(id),
        location: body.location || null,
        movement_date: new Date().toISOString(),
        notes: `Produced from recipe: ${recipeData.name}${body.notes ? ` - ${body.notes}` : ''}`,
      });

    if (inMovementError) throw inMovementError;

    return NextResponse.json({ 
      success: true, 
      message: `Recipe produced successfully. ${movements.length} ingredient(s) deducted, ${body.quantity} ${recipeData.unit || 'serving'}(s) of ${recipeData.name} added to stock.`,
      movements,
      producedItem: {
        id: producedItem.id,
        name: producedItem.name,
        quantity: body.quantity,
      },
      recipe: {
        id: recipeData.id,
        name: recipeData.name,
        quantityProduced: body.quantity,
      }
    });
  } catch (error: any) {
    console.error('Error producing recipe:', error);
    return NextResponse.json(
      { error: 'Failed to produce recipe', details: error.message },
      { status: 500 }
    );
  }
}

