// Produce Recipe API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { ProduceRecipeData } from '@kit/types';
import { produceRecipe } from '@/lib/stock/produce-recipe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.produceRecipeSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as ProduceRecipeData;
    const supabase = supabaseServer();

    const { producedItemId } = await produceRecipe(supabase, id, {
      quantity: body.quantity,
      location: body.location || null,
      notes: body.notes,
      producedItemId: body.producedItemId,
      producedItemName: body.producedItemName,
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

