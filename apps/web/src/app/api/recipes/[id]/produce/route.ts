// Produce Recipe API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { produceRecipe } from '@/lib/stock/produce-recipe';

interface ProduceRecipeData {
  quantity: number;
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

    const { producedItemId } = await produceRecipe(supabase, id, {
      quantity: body.quantity,
      location: body.location || null,
      notes: body.notes,
    });

    const { data: recipeData } = await supabase
      .from('recipes')
      .select('name, unit')
      .eq('id', id)
      .single();

    const { data: producedItem } = await supabase
      .from('items')
      .select('id, name')
      .eq('id', producedItemId)
      .single();

    return NextResponse.json({
      success: true,
      message: `Recipe produced successfully. ${body.quantity} ${recipeData?.unit || 'serving'}(s) of ${recipeData?.name} added to stock.`,
      producedItem: {
        id: producedItem?.id,
        name: producedItem?.name,
        quantity: body.quantity,
      },
      recipe: {
        id,
        name: recipeData?.name,
        quantityProduced: body.quantity,
      },
    });
  } catch (error: any) {
    console.error('Error producing recipe:', error);
    return NextResponse.json(
      { error: 'Failed to produce recipe', details: error.message },
      { status: 500 }
    );
  }
}

