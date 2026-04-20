/**
 * Unified item unit-cost resolver.
 *
 * Order of resolution:
 *  1. If the item is `produced_from_recipe_id`-linked AND that recipe can be fully priced,
 *     return the recipe's per-unit cost (sum of ingredient costs divided by output_quantity,
 *     converted into the requested target unit). Recursion is guarded by `seenRecipeIds`.
 *  2. Otherwise, fall back to recent `supplier_order_items` (last 3 months).
 *  3. Otherwise, fall back to `item_cost_history` via `getItemCostAsOf`.
 *
 * The returned `unitPrice` is expressed in the requested `targetUnitId`. If that unit is
 * null (or no factor available), the returned price is in the item's native unit.
 *
 * If `itemId` belongs to a merged group, pricing uses the group's canonical item.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  convertQuantityWithContext,
  convertUnitPriceWithContext,
  convertUnitPriceWithContextOrFactorFallback,
  logUnitConversionWarning,
  type UnitConversionContext,
} from "@/lib/units/convert";
import { getItemCostAsOf, type ItemCostHistoryQuote } from '@/lib/items/price-resolve';
import { resolveCanonicalItemIdForCost } from '@/lib/items/group-members';

export interface ResolvedItemCost {
  unitPrice: number;
  hasPrice: boolean;
  source: 'recipe' | 'order' | 'history' | 'none';
  /** Unit variable id: `unitPrice` is money per this unit (aligned with conversion target when set). */
  denominatorUnitId: number | null;
  /** How many of `denominatorUnitId` the rate refers to (always 1 after resolution = per one unit). */
  basisQuantity: number | null;
  /** When source is `history`: stored line (e.g. €2.50 for 1 L) before target-unit conversion. */
  costQuote: ItemCostHistoryQuote | null;
}

interface ItemRow {
  id: number;
  name?: string | null;
  unit_id: number | null;
  produced_from_recipe_id: number | null;
}

async function loadItem(
  supabase: SupabaseClient,
  itemId: number
): Promise<ItemRow | null> {
  const { data } = await supabase
    .from('items')
    .select('id, name, unit_id, produced_from_recipe_id')
    .eq('id', itemId)
    .maybeSingle();
  return (data as ItemRow | null) ?? null;
}

/**
 * Compute the per-output-unit cost of a recipe: sum(recipe_items cost) / output_quantity.
 * Returns null if any ingredient is missing a price (recipe is "not fully priced").
 */
async function computeRecipeUnitCost(
  supabase: SupabaseClient,
  recipeId: number,
  conversionContext: UnitConversionContext,
  seenRecipeIds: Set<number>
): Promise<{ unitCostInRecipeUnit: number; recipeUnitId: number | null } | null> {
  if (seenRecipeIds.has(recipeId)) return null;
  const nextSeen = new Set(seenRecipeIds);
  nextSeen.add(recipeId);

  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, output_quantity, serving_size, unit_id, items:recipe_items(*, item:items(*))')
    .eq('id', recipeId)
    .maybeSingle();

  if (!recipe || !recipe.items || recipe.items.length === 0) return null;

  const outputQuantity = Number(recipe.output_quantity ?? recipe.serving_size) || 1;
  let total = 0;

  for (const ri of recipe.items) {
    const itemId = ri.item_id;
    const recipeQty = typeof ri.quantity === 'string' ? parseFloat(ri.quantity) : ri.quantity;
    const resolved = await resolveItemUnitCost(
      supabase,
      itemId,
      ri.unit_id ?? null,
      conversionContext,
      nextSeen
    );
    if (!resolved.hasPrice) return null;
    total += recipeQty * resolved.unitPrice;
  }

  return {
    unitCostInRecipeUnit: total / outputQuantity,
    recipeUnitId: recipe.unit_id ?? null,
  };
}

/**
 * Resolves the unit price of an item, in the requested `targetUnitId`.
 * Prefers the item's own recipe when it is produced from one and fully priceable.
 */
export async function resolveItemUnitCost(
  supabase: SupabaseClient,
  itemId: number,
  targetUnitId: number | null,
  conversionContext: UnitConversionContext,
  seenRecipeIds: Set<number> = new Set()
): Promise<ResolvedItemCost> {
  const effectiveItemId = await resolveCanonicalItemIdForCost(supabase, itemId);
  const item = await loadItem(supabase, effectiveItemId);
  if (!item)
    return {
      unitPrice: 0,
      hasPrice: false,
      source: 'none',
      denominatorUnitId: null,
      basisQuantity: null,
      costQuote: null,
    };

  const requesterItem = itemId === effectiveItemId ? item : await loadItem(supabase, itemId);
  const effectiveTargetUnitId =
    targetUnitId ?? requesterItem?.unit_id ?? null;

  if (item.produced_from_recipe_id && !seenRecipeIds.has(item.produced_from_recipe_id)) {
    const recipeCost = await computeRecipeUnitCost(
      supabase,
      item.produced_from_recipe_id,
      conversionContext,
      seenRecipeIds
    );
    if (recipeCost) {
      const { unitCostInRecipeUnit, recipeUnitId } = recipeCost;
      let unitPrice = unitCostInRecipeUnit;
      const sourceUnitId = recipeUnitId ?? item.unit_id ?? null;
      if (effectiveTargetUnitId != null && sourceUnitId != null) {
        const priceResult = convertUnitPriceWithContextOrFactorFallback(
          unitCostInRecipeUnit,
          sourceUnitId,
          effectiveTargetUnitId,
          conversionContext
        );
        unitPrice = priceResult.unitPrice;
        if (priceResult.warning) {
          logUnitConversionWarning("resolve-item-cost:recipe", priceResult.warning);
        }
      }
      return {
        unitPrice,
        hasPrice: unitPrice > 0,
        source: 'recipe',
        denominatorUnitId: effectiveTargetUnitId ?? sourceUnitId ?? null,
        basisQuantity: 1,
        costQuote: null,
      };
    }
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const { data: orderItems } = await supabase
    .from('supplier_order_items')
    .select('unit_price, unit, quantity, unit_id')
    .eq('item_id', effectiveItemId)
    .gte('created_at', threeMonthsAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (orderItems && orderItems.length > 0) {
    if (effectiveTargetUnitId != null) {
      let totalValueInTargetUnit = 0;
      let totalQtyInTargetUnit = 0;
      for (const oi of orderItems) {
        const orderQty = parseFloat(oi.quantity);
        const orderUnitId = (oi.unit_id as number | null) ?? item.unit_id ?? null;
        const qtyResult = convertQuantityWithContext(
          orderQty,
          orderUnitId,
          effectiveTargetUnitId,
          conversionContext
        );
        const qtyInTargetUnit = qtyResult.quantity;
        if (qtyResult.warning) {
          logUnitConversionWarning("resolve-item-cost:order-quantity", qtyResult.warning);
        }
        const priceResult = convertUnitPriceWithContextOrFactorFallback(
          parseFloat(oi.unit_price),
          orderUnitId,
          effectiveTargetUnitId,
          conversionContext
        );
        const pricePerTargetUnit = priceResult.unitPrice;
        if (priceResult.warning) {
          logUnitConversionWarning("resolve-item-cost:order-price", priceResult.warning);
        }
        totalValueInTargetUnit += qtyInTargetUnit * pricePerTargetUnit;
        totalQtyInTargetUnit += qtyInTargetUnit;
      }
      if (totalQtyInTargetUnit > 0) {
        return {
          unitPrice: totalValueInTargetUnit / totalQtyInTargetUnit,
          hasPrice: true,
          source: 'order',
          denominatorUnitId: effectiveTargetUnitId,
          basisQuantity: 1,
          costQuote: null,
        };
      }
      // Do not use unmixed order-line average when a target unit was required — it would
      // stay in supplier/order units (e.g. €/L) while callers label the recipe line in mL.
    } else {
      const totalValue = orderItems.reduce(
        (sum: number, r: { unit_price: string; quantity: string }) =>
          sum + parseFloat(r.unit_price) * parseFloat(r.quantity),
        0
      );
      const totalQty = orderItems.reduce(
        (sum: number, r: { quantity: string }) => sum + parseFloat(r.quantity),
        0
      );
      if (totalQty > 0) {
        return {
          unitPrice: totalValue / totalQty,
          hasPrice: true,
          source: 'order',
          denominatorUnitId: item.unit_id ?? null,
          basisQuantity: 1,
          costQuote: null,
        };
      }
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const hist = await getItemCostAsOf(supabase, itemId, todayStr);
  if (hist.unitCost != null && hist.unitCost > 0) {
    let unitPrice = hist.unitCost;
    const costDenomUnitId = hist.unitId ?? item.unit_id ?? null;
    let denomOut: number | null = costDenomUnitId;
    if (effectiveTargetUnitId != null && costDenomUnitId != null) {
      const priceResult = convertUnitPriceWithContextOrFactorFallback(
        hist.unitCost,
        costDenomUnitId,
        effectiveTargetUnitId,
        conversionContext
      );
      unitPrice = priceResult.unitPrice;
      denomOut = effectiveTargetUnitId;
      if (priceResult.warning) {
        logUnitConversionWarning("resolve-item-cost:history", priceResult.warning);
      }
    }
    return {
      unitPrice,
      hasPrice: unitPrice > 0,
      source: 'history',
      denominatorUnitId: denomOut,
      basisQuantity: 1,
      costQuote: hist.historyQuote,
    };
  }

  return {
    unitPrice: 0,
    hasPrice: false,
    source: 'none',
    denominatorUnitId: null,
    basisQuantity: null,
    costQuote: null,
  };
}
