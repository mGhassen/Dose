import type { SupabaseClient } from '@supabase/supabase-js';
import { StockMovementType, StockMovementReferenceType } from '@kit/types';

export interface ProduceRecipeOptions {
  quantity: number;
  location?: string | null;
  notes?: string;
}

export async function produceRecipe(
  supabase: SupabaseClient,
  recipeId: string,
  options: ProduceRecipeOptions
): Promise<{ producedItemId: number }> {
  const { quantity, location = null, notes } = options;

  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .select('*, items:recipe_items(*, item:items(*))')
    .eq('id', recipeId)
    .single();

  if (recipeError) throw recipeError;
  if (!recipeData) {
    throw new Error('Recipe not found');
  }

  if (!recipeData.items || recipeData.items.length === 0) {
    throw new Error('Recipe has no items');
  }

  const servingSize = recipeData.serving_size || 1;
  const multiplier = quantity / servingSize;

  for (const recipeItem of recipeData.items) {
    const item = recipeItem.item;
    if (!item) continue;

    const quantityToDeduct = recipeItem.quantity * multiplier;

    const { error: movementError } = await supabase.from('stock_movements').insert({
      item_id: item.id,
      movement_type: StockMovementType.OUT,
      quantity: quantityToDeduct,
      unit: recipeItem.unit,
      reference_type: StockMovementReferenceType.RECIPE,
      reference_id: Number(recipeId),
      location,
      movement_date: new Date().toISOString(),
      notes: `Used in recipe: ${recipeData.name} (${quantity} servings)${notes ? ` - ${notes}` : ''}`,
    });

    if (movementError) throw movementError;
  }

  let { data: producedItem, error: itemCheckError } = await supabase
    .from('items')
    .select('*')
    .eq('produced_from_recipe_id', Number(recipeId))
    .single();

  if (itemCheckError && itemCheckError.code === 'PGRST116') {
    const { data: newItem, error: itemCreateError } = await supabase
      .from('items')
      .insert({
        name: recipeData.name,
        description: recipeData.description || `Produced from recipe: ${recipeData.name}`,
        category: recipeData.category,
        unit: recipeData.unit || 'serving',
        produced_from_recipe_id: Number(recipeId),
        item_type: 'item',
        is_active: true,
      })
      .select()
      .single();

    if (itemCreateError) throw itemCreateError;
    if (!newItem) throw new Error('Failed to create produced item');
    producedItem = newItem;
  } else if (itemCheckError) {
    throw itemCheckError;
  }

  if (!producedItem) throw new Error('Produced item not found');

  const { error: inMovementError } = await supabase.from('stock_movements').insert({
    item_id: producedItem.id,
    movement_type: StockMovementType.IN,
    quantity,
    unit: recipeData.unit || 'serving',
    reference_type: StockMovementReferenceType.RECIPE,
    reference_id: Number(recipeId),
    location,
    movement_date: new Date().toISOString(),
    notes: `Produced from recipe: ${recipeData.name}${notes ? ` - ${notes}` : ''}`,
  });

  if (inMovementError) throw inMovementError;

  return { producedItemId: producedItem.id };
}
