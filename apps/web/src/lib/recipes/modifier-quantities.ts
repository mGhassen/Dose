import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  RecipeModifierListGroup,
  RecipeModifierQuantity,
  RecipeModifierQuantityInput,
} from '@kit/types';

type ModifierRow = {
  id: number;
  name: string | null;
  price_amount_cents: number | null;
  sort_order: number | null;
  item_id: number | null;
  modifier_list_id: number;
  item?: {
    id: number;
    name: string;
    unit: string | null;
    affects_stock: boolean | null;
  } | null;
  modifier_list?: {
    id: number;
    name: string | null;
    selection_type: string | null;
  } | null;
};

type RecipeModifierRow = {
  id: number;
  recipe_id: number;
  modifier_id: number;
  quantity: string | number;
  unit_id: number | null;
  notes: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  modifier?: ModifierRow | null;
  unit?: { id: number; payload: { symbol?: string } | null } | null;
};

export function transformRecipeModifierQuantity(row: RecipeModifierRow): RecipeModifierQuantity {
  const mod = row.modifier ?? null;
  const unitSymbol =
    (row.unit?.payload as { symbol?: string } | null | undefined)?.symbol ?? undefined;
  return {
    id: row.id,
    recipeId: row.recipe_id,
    modifierId: row.modifier_id,
    quantity: typeof row.quantity === 'string' ? parseFloat(row.quantity) : row.quantity,
    unit: unitSymbol,
    unitId: row.unit_id ?? undefined,
    notes: row.notes ?? undefined,
    sortOrder: row.sort_order,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modifier: mod
      ? {
          id: mod.id,
          name: mod.name,
          priceAmountCents: mod.price_amount_cents,
          supplyItemId: mod.item_id,
          supplyItemName: mod.item?.name ?? null,
          supplyItemUnit: mod.item?.unit ?? null,
          supplyItemAffectsStock: mod.item?.affects_stock ?? undefined,
          modifierList: {
            id: mod.modifier_list?.id ?? mod.modifier_list_id,
            name: mod.modifier_list?.name ?? null,
            selectionType: mod.modifier_list?.selection_type ?? null,
          },
        }
      : undefined,
  };
}

/**
 * Modifier ids that appear on modifier lists linked to these catalog items.
 */
export async function allowedModifierIdsForProducedItemIds(
  supabase: SupabaseClient,
  producedItemIds: number[]
): Promise<Set<number>> {
  const ids = [...new Set(producedItemIds.filter((id) => typeof id === 'number' && id > 0))];
  if (ids.length === 0) return new Set();

  const { data: modListLinks } = await supabase
    .from('item_modifier_list_links')
    .select('modifier_list_id')
    .in('item_id', ids);
  const listIds = Array.from(
    new Set((modListLinks || []).map((r: { modifier_list_id: number }) => r.modifier_list_id))
  );
  if (listIds.length === 0) return new Set();

  const { data: mods } = await supabase
    .from('modifiers')
    .select('id')
    .in('modifier_list_id', listIds);
  return new Set((mods || []).map((m: { id: number }) => m.id));
}

/**
 * Returns the distinct set of modifier ids attached to any modifier_list that is
 * linked to one of the recipe's produced items. Quantities may only target modifiers
 * in this set.
 */
export async function allowedModifierIdsForRecipe(
  supabase: SupabaseClient,
  recipeId: number
): Promise<Set<number>> {
  const { data: links } = await supabase
    .from('recipe_produced_items')
    .select('item_id')
    .eq('recipe_id', recipeId);
  const producedItemIds = (links || []).map((r: { item_id: number }) => r.item_id).filter(Boolean);

  if (producedItemIds.length === 0) {
    const { data: recipe } = await supabase
      .from('recipes')
      .select('produced_item_id')
      .eq('id', recipeId)
      .single();
    if (recipe?.produced_item_id) producedItemIds.push(recipe.produced_item_id);
  }

  return allowedModifierIdsForProducedItemIds(supabase, producedItemIds);
}

/**
 * Validates that every provided modifierId is in the recipe's allowed set.
 * Caller must have synced produced_items BEFORE calling this.
 *
 * `alsoAllowForProducedItemIds` — server-only: union allowed modifiers for these item ids
 * (same ids you just linked). Covers multi-output recipes where reading `recipe_produced_items`
 * back is incomplete and matches POST create with `producedIdsFromCreateBody`.
 */
export async function validateModifierQuantities(
  supabase: SupabaseClient,
  recipeId: number,
  quantities: RecipeModifierQuantityInput[],
  options?: { alsoAllowForProducedItemIds?: number[] }
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (quantities.length === 0) return { ok: true };

  const seen = new Set<number>();
  for (const q of quantities) {
    if (seen.has(q.modifierId)) {
      return {
        ok: false,
        status: 400,
        message: `Duplicate modifier ${q.modifierId}`,
      };
    }
    seen.add(q.modifierId);
  }

  let allowed = await allowedModifierIdsForRecipe(supabase, recipeId);
  const extraIds = options?.alsoAllowForProducedItemIds?.filter(
    (id) => typeof id === 'number' && id > 0
  );
  if (extraIds?.length) {
    const fromExplicitItems = await allowedModifierIdsForProducedItemIds(supabase, extraIds);
    allowed = new Set([...allowed, ...fromExplicitItems]);
  }
  for (const q of quantities) {
    if (!allowed.has(q.modifierId)) {
      return {
        ok: false,
        status: 400,
        message: `Modifier ${q.modifierId} does not belong to a modifier list attached to this recipe's produced items`,
      };
    }
  }
  return { ok: true };
}

/** Replace the full set of per-modifier quantities for a recipe. */
export async function replaceRecipeModifierQuantities(
  supabase: SupabaseClient,
  recipeId: number,
  quantities: RecipeModifierQuantityInput[]
): Promise<{ error?: string }> {
  const { error: delErr } = await supabase
    .from('recipe_modifier_quantities')
    .delete()
    .eq('recipe_id', recipeId);
  if (delErr) return { error: delErr.message };

  if (quantities.length === 0) return {};

  const rows = quantities.map((q, idx) => ({
    recipe_id: recipeId,
    modifier_id: q.modifierId,
    quantity: q.quantity,
    unit_id: q.unitId ?? null,
    notes: q.notes ?? null,
    sort_order: q.sortOrder ?? idx,
    enabled: q.enabled ?? true,
  }));

  const { error: insErr } = await supabase.from('recipe_modifier_quantities').insert(rows);
  if (insErr) return { error: insErr.message };
  return {};
}

export async function fetchRecipeModifierQuantities(
  supabase: SupabaseClient,
  recipeId: number
): Promise<RecipeModifierQuantity[]> {
  const { data, error } = await supabase
    .from('recipe_modifier_quantities')
    .select(
      `
      *,
      unit:variables(id, payload),
      modifier:modifiers(
        id, name, price_amount_cents, sort_order, item_id, modifier_list_id,
        item:items(id, name, unit, affects_stock),
        modifier_list:modifier_lists(id, name, selection_type)
      )
    `
    )
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: unknown) => transformRecipeModifierQuantity(row as RecipeModifierRow));
}

/** Groups flat per-modifier rows back by their list for UI rendering. */
export function groupModifierQuantitiesByList(
  rows: RecipeModifierQuantity[]
): RecipeModifierListGroup[] {
  const groups = new Map<number, RecipeModifierListGroup>();
  for (const row of rows) {
    const mod = row.modifier;
    if (!mod) continue;
    const listId = mod.modifierList.id;
    let group = groups.get(listId);
    if (!group) {
      group = {
        modifierListId: listId,
        modifierListName: mod.modifierList.name,
        selectionType: mod.modifierList.selectionType,
        modifiers: [],
      };
      groups.set(listId, group);
    }
    group.modifiers.push({
      modifierId: mod.id,
      modifierName: mod.name,
      supplyItemId: mod.supplyItemId,
      supplyItemName: mod.supplyItemName ?? null,
      priceAmountCents: mod.priceAmountCents,
      quantity: row.quantity,
      unit: row.unit,
      unitId: row.unitId,
      notes: row.notes,
      sortOrder: row.sortOrder ?? 0,
      enabled: row.enabled,
    });
  }
  for (const group of groups.values()) {
    group.modifiers.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return Array.from(groups.values());
}
