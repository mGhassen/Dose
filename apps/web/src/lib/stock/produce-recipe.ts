import type { SupabaseClient } from '@supabase/supabase-js';
import { StockMovementType, StockMovementReferenceType } from '@kit/types';
import {
  convertQuantityWithContext,
  logUnitConversionWarning,
} from "@/lib/units/convert";
import { loadUnitConversionContext } from "@/lib/units/context";

function movementInstantFromInput(input?: string): string {
  if (!input?.trim()) return new Date().toISOString();
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export interface ProduceRecipeOptions {
  quantity: number;
  location?: string | null;
  notes?: string;
  /** ISO instant for ingredient OUT / finished IN rows. Defaults to now. */
  movementDate?: string;
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
  const {
    quantity,
    location = null,
    notes,
    movementDate: movementDateOpt,
    producedItemId: requestedItemId,
    producedItemName,
  } = options;
  const movementDate = movementInstantFromInput(movementDateOpt);
  const conversionContext = await loadUnitConversionContext(supabase);

  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .select('*, items:recipe_items(*, item:items(*))')
    .eq('id', recipeId)
    .single();

  if (recipeError) throw recipeError;
  if (!recipeData) {
    throw new Error('Recipe not found');
  }

  const recipeItems = recipeData.items ?? [];

  const outputQuantity = Number(recipeData.output_quantity ?? recipeData.serving_size) || 1;
  const multiplier = quantity / outputQuantity;

  // IMPORTANT: only base ingredients (recipe_items) are deducted here.
  // Per-modifier quantities (recipe_modifier_quantities) are resolved at SALE time,
  // not at production time, because the actual supply item consumed depends on which
  // option the customer picks (e.g. oat milk vs regular milk). See `/api/sales` /
  // sales line-item creation for the sale-time deduction flow.
  for (const recipeItem of recipeItems) {
    const item = recipeItem.item;
    if (!item) continue;

    let quantityToDeduct = recipeItem.quantity * multiplier;
    const recipeUnitId = recipeItem.unit_id;
    const itemUnitId = item.unit_id;
    if (recipeUnitId != null && itemUnitId != null) {
      const quantityResult = convertQuantityWithContext(
        quantityToDeduct,
        recipeUnitId,
        itemUnitId,
        conversionContext
      );
      quantityToDeduct = quantityResult.quantity;
      if (
        quantityResult.warning &&
        quantityResult.warning.reason !== "dimension_mismatch"
      ) {
        logUnitConversionWarning(
          "produce-recipe:ingredient-deduction",
          quantityResult.warning
        );
      }
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
      movement_date: movementDate,
      notes: `Used in recipe: ${recipeData.name} (${quantity} ${recipeData.unit || "units"})${notes ? ` - ${notes}` : ''}`,
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

  if (!producedItem) {
    const legacyId = recipeData.produced_item_id;
    if (legacyId) {
      const { data, error } = await supabase.from('items').select('*').eq('id', legacyId).single();
      if (!error) producedItem = data;
    }
  }
  if (!producedItem) {
    const { data: byRecipe } = await supabase
      .from('items')
      .select('*')
      .eq('produced_from_recipe_id', Number(recipeId))
      .limit(1)
      .maybeSingle();
    if (byRecipe) producedItem = byRecipe;
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
        unit: recipeData.unit || "unit",
        unit_id: recipeData.unit_id,
        produced_from_recipe_id: Number(recipeId),
        item_types: ['product'],
        is_active: true,
      })
      .select()
      .single();
    if (itemCreateError) throw itemCreateError;
    if (!newItem) throw new Error('Failed to create produced item');
    producedItem = newItem;
    await supabase.from('recipe_produced_items').insert({ recipe_id: Number(recipeId), item_id: newItem.id });
  }

  if (!producedItem) throw new Error('Produced item not found');

  let quantityToAdd = quantity;
  if (recipeData.unit_id != null && producedItem.unit_id != null) {
    const quantityResult = convertQuantityWithContext(
      quantity,
      recipeData.unit_id,
      producedItem.unit_id,
      conversionContext
    );
    quantityToAdd = quantityResult.quantity;
    if (quantityResult.warning) {
      logUnitConversionWarning(
        "produce-recipe:produced-item",
        quantityResult.warning
      );
    }
  }

  const { error: inMovementError } = await supabase.from('stock_movements').insert({
    item_id: producedItem.id,
    movement_type: StockMovementType.IN,
    quantity: quantityToAdd,
    unit: producedItem.unit || recipeData.unit || "unit",
    unit_id: producedItem.unit_id ?? recipeData.unit_id,
    reference_type: StockMovementReferenceType.RECIPE,
    reference_id: Number(recipeId),
    location,
    movement_date: movementDate,
    notes: `Produced from recipe: ${recipeData.name}${notes ? ` - ${notes}` : ''}`,
  });

  if (inMovementError) throw inMovementError;

  return { producedItemId: producedItem.id };
}
