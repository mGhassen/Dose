import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const supabase = supabaseServer();

    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (recipeError || !recipeData) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from('items')
      .select('id')
      .eq('produced_from_recipe_id', recipeId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Produced item already exists', itemId: existing.id },
        { status: 409 }
      );
    }

    const { data: newItem, error: insertError } = await supabase
      .from('items')
      .insert({
        name: recipeData.name,
        description: recipeData.description || `Produced from recipe: ${recipeData.name}`,
        category: recipeData.category,
        unit: recipeData.unit || 'serving',
        unit_id: recipeData.unit_id,
        produced_from_recipe_id: Number(recipeId),
        item_types: ['product'],
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    if (!newItem) return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });

    await supabase.from('recipe_produced_items').insert({ recipe_id: Number(recipeId), item_id: newItem.id });

    return NextResponse.json({
      id: newItem.id,
      name: newItem.name,
      description: newItem.description,
      unit: newItem.unit,
      unitId: newItem.unit_id,
      category: newItem.category,
      itemTypes: ['product'],
      isActive: newItem.is_active,
      createdAt: newItem.created_at,
      updatedAt: newItem.updated_at,
      producedFromRecipeId: newItem.produced_from_recipe_id,
    });
  } catch (error: any) {
    console.error('[create-produced-item]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create produced item' },
      { status: 500 }
    );
  }
}
