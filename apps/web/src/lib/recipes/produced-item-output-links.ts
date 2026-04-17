import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeItemKinds } from '@kit/types';

export function producedIdsFromCreateBody(body: {
  producedItemId?: number | null;
  producedItemIds?: number[];
}): number[] {
  if (body.producedItemIds && body.producedItemIds.length > 0) {
    return [
      ...new Set(
        body.producedItemIds.filter((n) => typeof n === 'number' && !Number.isNaN(n))
      ),
    ];
  }
  if (body.producedItemId != null) return [body.producedItemId];
  return [];
}

export async function validateProducedOutputItems(
  supabase: SupabaseClient,
  itemIds: number[],
  recipeId: number
): Promise<
  | { ok: true }
  | { ok: false; status: number; message: string }
> {
  if (itemIds.length === 0) return { ok: true };
  const { data: rows, error } = await supabase
    .from('items')
    .select('id, item_types, produced_from_recipe_id, is_catalog_parent')
    .in('id', itemIds);
  if (error) return { ok: false, status: 500, message: error.message };
  const byId = new Map((rows || []).map((r: { id: number }) => [r.id, r]));
  for (const id of itemIds) {
    const row = byId.get(id) as
      | {
          id: number;
          item_types: unknown;
          produced_from_recipe_id: number | null;
          is_catalog_parent?: boolean | null;
        }
      | undefined;
    if (!row) return { ok: false, status: 400, message: `Item ${id} not found` };
    const kinds = normalizeItemKinds(row.item_types);
    if (!kinds.includes('product')) {
      return {
        ok: false,
        status: 400,
        message: `Item ${id} must include product type to be a recipe output`,
      };
    }
    if (row.is_catalog_parent) {
      return {
        ok: false,
        status: 400,
        message: `Item ${id} is a catalog parent; use a variant SKU as output`,
      };
    }
    const pfr = row.produced_from_recipe_id;
    if (pfr != null && Number(pfr) !== Number(recipeId)) {
      return {
        ok: false,
        status: 409,
        message: `Item ${id} is already linked to another recipe`,
      };
    }
  }
  return { ok: true };
}

export async function updateItemsProducedFromRecipe(
  supabase: SupabaseClient,
  recipeId: number,
  itemIds: number[]
): Promise<{ error?: string }> {
  for (const itemId of itemIds) {
    const { error: up } = await supabase
      .from('items')
      .update({ produced_from_recipe_id: recipeId })
      .eq('id', itemId);
    if (up) return { error: up.message };
  }
  return {};
}

export async function clearProducedFromRecipeOnItems(
  supabase: SupabaseClient,
  recipeId: number,
  itemIds: number[]
): Promise<{ error?: string }> {
  if (itemIds.length === 0) return {};
  for (const itemId of itemIds) {
    const { error } = await supabase
      .from('items')
      .update({ produced_from_recipe_id: null })
      .eq('id', itemId)
      .eq('produced_from_recipe_id', recipeId);
    if (error) return { error: error.message };
  }
  return {};
}

export async function insertRecipeProducedLinks(
  supabase: SupabaseClient,
  recipeId: number,
  itemIds: number[]
): Promise<{ error?: string }> {
  if (itemIds.length === 0) return {};
  const { error } = await supabase.from('recipe_produced_items').insert(
    itemIds.map((item_id) => ({ recipe_id: recipeId, item_id }))
  );
  if (error) return { error: error.message };
  return updateItemsProducedFromRecipe(supabase, recipeId, itemIds);
}

export async function syncRecipeProducedItemIdColumn(
  supabase: SupabaseClient,
  recipeId: number,
  itemIds: number[]
): Promise<{ error?: string }> {
  const produced_item_id = itemIds.length === 1 ? itemIds[0] : null;
  const { error } = await supabase
    .from('recipes')
    .update({ produced_item_id })
    .eq('id', recipeId);
  if (error) return { error: error.message };
  return {};
}
