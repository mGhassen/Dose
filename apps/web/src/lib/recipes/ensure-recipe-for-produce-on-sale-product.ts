import type { SupabaseClient } from "@supabase/supabase-js";
import {
  insertRecipeProducedLinks,
  syncRecipeProducedItemIdColumn,
  validateProducedOutputItems,
} from "@/lib/recipes/produced-item-output-links";

/**
 * For catalog / produce-on-sale products: create a production recipe and link this sellable SKU
 * so sales use `produceRecipe` (ingredient OUT + finished IN) instead of ad-hoc movements.
 * Idempotent if `produced_from_recipe_id` is already set.
 */
export async function ensureRecipeForProduceOnSaleProduct(
  supabase: SupabaseClient,
  itemId: number
): Promise<{ ok: true; recipeId: number; created: boolean } | { ok: false; message: string }> {
  const { data: item, error: itemErr } = await supabase
    .from("items")
    .select("id, name, description, unit_id, produce_on_sale, produced_from_recipe_id, item_types, is_catalog_parent")
    .eq("id", itemId)
    .single();

  if (itemErr || !item) {
    return { ok: false, message: itemErr?.message ?? "Item not found" };
  }

  if (item.is_catalog_parent) {
    return { ok: false, message: "Catalog parent rows are not sellable SKUs" };
  }

  if (item.produced_from_recipe_id != null) {
    return { ok: true, recipeId: item.produced_from_recipe_id as number, created: false };
  }

  if (item.produce_on_sale !== true) {
    return { ok: false, message: "Item is not marked produce-on-sale" };
  }

  const { data: recipeRow, error: recipeInsErr } = await supabase
    .from("recipes")
    .insert({
      name: `${item.name} — production`,
      description:
        (item.description as string | null) ??
        `Auto-created production recipe for ${item.name}. Add ingredients to recipe_items.`,
      unit: "serving",
      unit_id: item.unit_id ?? null,
      serving_size: 1,
      is_active: true,
      item_type: "recipe",
    })
    .select("id")
    .single();

  if (recipeInsErr || !recipeRow?.id) {
    return { ok: false, message: recipeInsErr?.message ?? "Failed to create recipe" };
  }

  const recipeId = recipeRow.id as number;

  const val2 = await validateProducedOutputItems(supabase, [itemId], recipeId);
  if (!val2.ok) {
    await supabase.from("recipes").delete().eq("id", recipeId);
    return { ok: false, message: val2.message };
  }

  const linkErr = await insertRecipeProducedLinks(supabase, recipeId, [itemId]);
  if (linkErr.error) {
    await supabase.from("recipes").delete().eq("id", recipeId);
    return { ok: false, message: linkErr.error };
  }

  await syncRecipeProducedItemIdColumn(supabase, recipeId, [itemId]);

  return { ok: true, recipeId, created: true };
}
