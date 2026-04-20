// Get recipes that use a specific item

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    
    // Get recipes that use this item
    const { data: recipeItems, error } = await supabase
      .from('recipe_items')
      .select('recipe_id, quantity, unit, notes, recipe:recipes(id, name, description, output_quantity, serving_size, is_active)')
      .eq('item_id', id)
      .order('recipe_id', { ascending: true });

    if (error) throw error;

    const recipes = recipeItems?.map(ri => ({
      recipeId: ri.recipe_id,
      recipe: ri.recipe,
      quantity: parseFloat(ri.quantity),
      unit: ri.unit,
      notes: ri.notes,
    })) || [];

    return NextResponse.json({ recipes });
  } catch (error: any) {
    console.error('Error fetching recipes for item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes', details: error.message },
      { status: 500 }
    );
  }
}




