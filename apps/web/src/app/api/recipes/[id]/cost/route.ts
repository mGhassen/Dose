// Recipe Cost Calculation API Route
// Calculates the cost of a recipe based on ingredient prices, plus per-modifier
// option cost range (min / max / default). Cost resolution prefers an item's own
// recipe when produced_from_recipe_id is set.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { resolveItemUnitCost } from "@/lib/items/resolve-cost";
import { loadUnitConversionContext } from "@/lib/units/context";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const conversionContext = await loadUnitConversionContext(supabase);

    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('*, items:recipe_items(*, item:items(*))')
      .eq('id', id)
      .single();

    if (recipeError) throw recipeError;
    if (!recipeData) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const outputQuantity = Number(recipeData.output_quantity ?? recipeData.serving_size) || 1;

    // Recipes may reference their own produced item via a modifier. Guard recursion
    // by seeding the "seen" set with the current recipe id.
    const seen = new Set<number>([Number(id)]);

    const itemCosts = await Promise.all(
      (recipeData.items || []).map(async (ri: {
        item_id: number;
        quantity: string | number;
        unit: string | null;
        unit_id: number | null;
        item?: { name?: string } | null;
      }) => {
        const itemId = ri.item_id;
        const recipeQty =
          typeof ri.quantity === 'string' ? parseFloat(ri.quantity) : ri.quantity;
        const resolved = await resolveItemUnitCost(
          supabase,
          itemId,
          ri.unit_id ?? null,
          conversionContext,
          seen
        );
        return {
          ingredientId: itemId,
          itemId,
          ingredientName: ri.item?.name || `Item #${itemId}`,
          itemName: ri.item?.name || `Item #${itemId}`,
          quantity: recipeQty,
          unit: ri.unit,
          unitPrice: resolved.unitPrice,
          totalCost: recipeQty * resolved.unitPrice,
          hasPrice: resolved.hasPrice,
          priceSource: resolved.source,
        };
      })
    );

    const baseCost = itemCosts.reduce((sum, item) => sum + item.totalCost, 0);

    const { data: modifierRows } = await supabase
      .from('recipe_modifier_quantities')
      .select(
        `
        id, modifier_id, quantity, unit_id, enabled, sort_order,
        modifier:modifiers(
          id, name, price_amount_cents, sort_order, item_id, modifier_list_id,
          item:items(id, name, unit_id),
          modifier_list:modifier_lists(id, name, selection_type)
        )
      `
      )
      .eq('recipe_id', id)
      .eq('enabled', true);

    type ModRow = {
      id: number;
      modifier_id: number;
      quantity: string | number;
      unit_id: number | null;
      modifier: {
        id: number;
        name: string | null;
        price_amount_cents: number | null;
        sort_order: number | null;
        item_id: number | null;
        modifier_list_id: number;
        item: { id: number; name: string; unit_id: number | null } | null;
        modifier_list: { id: number; name: string | null; selection_type: string | null } | null;
      } | null;
    };

    type ResolvedOption = {
      modifierId: number;
      modifierName: string | null;
      supplyItemId: number | null;
      supplyItemName: string | null;
      quantity: number;
      unitPrice: number;
      totalCost: number;
      hasPrice: boolean;
      priceSource: 'recipe' | 'order' | 'history' | 'none';
      enabled: boolean;
    };

    const rowsByList = new Map<
      number,
      {
        modifierListId: number;
        modifierListName: string | null;
        selectionType: string | null;
        options: ResolvedOption[];
      }
    >();

    for (const row of (modifierRows || []) as unknown as ModRow[]) {
      const mod = row.modifier;
      if (!mod) continue;
      const listId = mod.modifier_list_id;
      const listMeta = mod.modifier_list;
      if (!rowsByList.has(listId)) {
        rowsByList.set(listId, {
          modifierListId: listId,
          modifierListName: listMeta?.name ?? null,
          selectionType: listMeta?.selection_type ?? null,
          options: [],
        });
      }
      const group = rowsByList.get(listId)!;

      const recipeQty = typeof row.quantity === 'string' ? parseFloat(row.quantity) : row.quantity;
      const recipeUnitId = row.unit_id ?? null;

      let unitPrice = 0;
      let hasPrice = false;
      let source: ResolvedOption['priceSource'] = 'none';
      if (mod.item_id != null) {
        const resolved = await resolveItemUnitCost(
          supabase,
          mod.item_id,
          recipeUnitId,
          conversionContext,
          seen
        );
        unitPrice = resolved.unitPrice;
        hasPrice = resolved.hasPrice;
        source = resolved.source;
      }

      group.options.push({
        modifierId: mod.id,
        modifierName: mod.name,
        supplyItemId: mod.item_id,
        supplyItemName: mod.item?.name ?? null,
        quantity: recipeQty,
        unitPrice,
        totalCost: recipeQty * unitPrice,
        hasPrice,
        priceSource: source,
        enabled: true,
      });
    }

    const modifierLists = Array.from(rowsByList.values()).map((group) => {
      const priced = group.options.filter((o) => o.hasPrice);
      const minCost = priced.length > 0 ? Math.min(...priced.map((o) => o.totalCost)) : 0;
      const maxCost = priced.length > 0 ? Math.max(...priced.map((o) => o.totalCost)) : 0;
      const defaultCost = minCost;
      return {
        modifierListId: group.modifierListId,
        modifierListName: group.modifierListName,
        selectionType: group.selectionType,
        options: group.options,
        minCost,
        maxCost,
        defaultCost,
        hasAllPrices: group.options.length > 0 && group.options.every((o) => o.hasPrice),
      };
    });

    const modifiersMin = modifierLists.reduce((s, m) => s + m.minCost, 0);
    const modifiersMax = modifierLists.reduce((s, m) => s + m.maxCost, 0);
    const modifiersDefault = modifierLists.reduce((s, m) => s + m.defaultCost, 0);

    const totalCostMin = baseCost + modifiersMin;
    const totalCostMax = baseCost + modifiersMax;
    const totalCostDefault = baseCost + modifiersDefault;

    return NextResponse.json({
      recipeId: Number(id),
      recipeName: recipeData.name,
      totalCost: totalCostDefault,
      totalCostMin,
      totalCostMax,
      costPerOutputUnit: outputQuantity > 0 ? totalCostDefault / outputQuantity : totalCostDefault,
      outputQuantity,
      costPerServing: outputQuantity > 0 ? totalCostDefault / outputQuantity : totalCostDefault,
      servingSize: outputQuantity,
      baseCost,
      ingredients: itemCosts,
      items: itemCosts,
      modifierLists,
      hasAllPrices:
        itemCosts.every((item) => item.hasPrice) &&
        modifierLists.every((m) => m.hasAllPrices || m.options.length === 0),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate recipe cost';
    console.error('Error calculating recipe cost:', error);
    return NextResponse.json({ error: 'Failed to calculate recipe cost', details: message }, { status: 500 });
  }
}
