import type { SupabaseClient } from '@supabase/supabase-js';
import { StockMovementType, StockMovementReferenceType } from '@kit/types';
import { convertQuantity, buildFactorMap } from '@/lib/units/convert';

export interface ProduceRecipeOptions {
  quantity: number;
  location?: string | null;
  notes?: string;
  /** Required when recipe has multiple linked produced items. */
  producedItemId?: number;
  /** Required when recipe has 0 linked items (name for the new item to create). */
  producedItemName?: string;
}

export async function produceRecipe(
  supabase: SupabaseClient,
  recipeId: string,
  options: ProduceRecipeOptions
): Promise<{ producedItemId: number }> {
  const { quantity, location = null, notes, producedItemId: requestedItemId, producedItemName } = options;

  const { data: unitVariables } = await supabase.from('variables').select('id, value').eq('type', 'unit');
  const factorMap = buildFactorMap((unitVariables || []).map((u: any) => ({ id: u.id, factorToBase: parseFloat(u.value ?? 1) })));
  const getFactor = (unitId: number) => factorMap.get(unitId);

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

    let quantityToDeduct = recipeItem.quantity * multiplier;
    const recipeUnitId = recipeItem.unit_id;
    const itemUnitId = item.unit_id;
    if (recipeUnitId != null && itemUnitId != null && getFactor(recipeUnitId) != null && getFactor(itemUnitId) != null) {
      quantityToDeduct = convertQuantity(quantityToDeduct, recipeUnitId, itemUnitId, (id) => getFactor(id));
    }

    const movementUnit = item.unit || recipeItem.unit;
    const { error: movementError } = await supabase.from('stock_movements').insert({
      item_id: item.id,
      movement_type: StockMovementType.OUT,
      quantity: quantityToDeduct,
      unit: movementUnit,
      unit_id: item.unit_id ?? recipeItem.unit_id,
      reference_type: StockMovementReferenceType.RECIPE,
      reference_id: Number(recipeId),
      location,
      movement_date: new Date().toISOString(),
      notes: `Used in recipe: ${recipeData.name} (${quantity} servings)${notes ? ` - ${notes}` : ''}`,
    });

    if (movementError) throw movementError;
  }

  const { data: linkRows } = await supabase
    .from('recipe_produced_items')
    .select('item_id')
    .eq('recipe_id', recipeId);
  const linkedItemIds = (linkRows || []).map((r: any) => r.item_id).filter(Boolean);

  let producedItem: any = null;

  if (linkedItemIds.length >= 2) {
    if (requestedItemId == null) throw new Error('Which item to produce is required when the recipe has multiple linked items.');
    if (!linkedItemIds.includes(requestedItemId)) throw new Error('Selected item is not linked to this recipe.');
    const { data, error } = await supabase.from('items').select('*').eq('id', requestedItemId).single();
    if (error) throw error;
    producedItem = data;
  } else if (linkedItemIds.length === 1) {
    const { data, error } = await supabase.from('items').select('*').eq('id', linkedItemIds[0]).single();
    if (!error) producedItem = data;
  }

  if (!producedItem && linkedItemIds.length === 0) {
    const name = (producedItemName ?? recipeData.name ?? '').trim();
    if (!name) throw new Error('Name of the item product is required when the recipe has no linked items.');
    const { data: newItem, error: itemCreateError } = await supabase
      .from('items')
      .insert({
        name,
        description: recipeData.description || `Produced from recipe: ${recipeData.name}`,
        category: recipeData.category,
        unit: recipeData.unit || 'serving',
        unit_id: recipeData.unit_id,
        produced_from_recipe_id: Number(recipeId),
        item_type: 'product',
        is_active: true,
      })
      .select()
      .single();
    if (itemCreateError) throw itemCreateError;
    if (!newItem) throw new Error('Failed to create produced item');
    producedItem = newItem;
    await supabase.from('recipe_produced_items').insert({ recipe_id: Number(recipeId), item_id: newItem.id });
  }

  if (!producedItem) {
    const legacyId = recipeData.produced_item_id;
    if (legacyId) {
      const { data, error } = await supabase.from('items').select('*').eq('id', legacyId).single();
      if (!error) producedItem = data;
    }
    if (!producedItem) {
      const { data: existingItem, error: itemCheckError } = await supabase
        .from('items')
        .select('*')
        .eq('produced_from_recipe_id', Number(recipeId))
        .single();
      if (!itemCheckError && existingItem) producedItem = existingItem;
      else if (itemCheckError?.code === 'PGRST116' && (producedItemName ?? recipeData.name)) {
        const name = (producedItemName ?? recipeData.name ?? '').trim();
        const { data: newItem, error: createErr } = await supabase
          .from('items')
          .insert({
            name,
            description: recipeData.description || `Produced from recipe: ${recipeData.name}`,
            category: recipeData.category,
            unit: recipeData.unit || 'serving',
            unit_id: recipeData.unit_id,
            produced_from_recipe_id: Number(recipeId),
            item_type: 'product',
            is_active: true,
          })
          .select()
          .single();
        if (!createErr && newItem) {
          producedItem = newItem;
          await supabase.from('recipe_produced_items').insert({ recipe_id: Number(recipeId), item_id: newItem.id });
        }
      }
    }
  }

  if (!producedItem) throw new Error('Produced item not found');

  const { error: inMovementError } = await supabase.from('stock_movements').insert({
    item_id: producedItem.id,
    movement_type: StockMovementType.IN,
    quantity,
    unit: recipeData.unit || 'serving',
    unit_id: recipeData.unit_id,
    reference_type: StockMovementReferenceType.RECIPE,
    reference_id: Number(recipeId),
    location,
    movement_date: new Date().toISOString(),
    notes: `Produced from recipe: ${recipeData.name}${notes ? ` - ${notes}` : ''}`,
  });

  if (inMovementError) throw inMovementError;

  return { producedItemId: producedItem.id };
}
