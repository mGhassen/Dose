import type { SupabaseClient } from "@supabase/supabase-js";
import { convertQuantity, buildFactorMap } from "@/lib/units/convert";
import { getItemTotalStock } from "@/lib/stock/get-item-stock";

/**
 * Theoretical max units of output from a recipe given current ingredient stock (bottleneck).
 * Does not reserve ingredients shared with other recipes.
 */
export async function estimateProducibleFromRecipeForItem(
  supabase: SupabaseClient,
  itemId: number
): Promise<number | null> {
  const { data: itemRow, error: itemErr } = await supabase
    .from("items")
    .select("id, produced_from_recipe_id")
    .eq("id", itemId)
    .maybeSingle();
  if (itemErr || !itemRow) return null;

  let recipeId: number | null = itemRow.produced_from_recipe_id ?? null;
  if (recipeId == null) {
    const { data: link } = await supabase
      .from("recipe_produced_items")
      .select("recipe_id")
      .eq("item_id", itemId)
      .limit(1)
      .maybeSingle();
    recipeId = link?.recipe_id ?? null;
  }
  if (recipeId == null) return null;

  const { data: unitVariables } = await supabase.from("variables").select("id, value").eq("type", "unit");
  const factorMap = buildFactorMap(
    (unitVariables || []).map((u: { id: number; value?: string | null }) => ({
      id: u.id,
      factorToBase: parseFloat(u.value ?? "1"),
    }))
  );
  const getFactor = (id: number) => factorMap.get(id);

  const { data: recipeData, error: recipeError } = await supabase
    .from("recipes")
    .select("*, items:recipe_items(*, item:items(*))")
    .eq("id", recipeId)
    .single();

  if (recipeError || !recipeData?.items?.length) return null;

  const servingSize = recipeData.serving_size || 1;
  let minPossible = Number.POSITIVE_INFINITY;

  for (const recipeItem of recipeData.items as Array<{
    quantity: number;
    unit_id?: number | null;
    item?: { id: number; unit_id?: number | null } | null;
  }>) {
    const ing = recipeItem.item;
    if (!ing?.id) continue;

    let needPerOutputUnit = recipeItem.quantity / servingSize;
    const recipeUnitId = recipeItem.unit_id;
    const itemUnitId = ing.unit_id;
    if (
      recipeUnitId != null &&
      itemUnitId != null &&
      getFactor(recipeUnitId) != null &&
      getFactor(itemUnitId) != null
    ) {
      needPerOutputUnit = convertQuantity(needPerOutputUnit, recipeUnitId, itemUnitId, (id) => getFactor(id));
    }

    if (needPerOutputUnit <= 0) continue;

    const stock = await getItemTotalStock(supabase, ing.id);
    const lineMax = Math.floor(stock / needPerOutputUnit);
    minPossible = Math.min(minPossible, lineMax);
  }

  if (!Number.isFinite(minPossible) || minPossible === Number.POSITIVE_INFINITY) return null;
  return Math.max(0, minPossible);
}
