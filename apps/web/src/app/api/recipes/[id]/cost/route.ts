// Recipe Cost Calculation API Route
// Calculates the cost of a recipe based on ingredient prices from supplier orders

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { buildFactorMap, convertQuantity } from '@/lib/units/convert';
import { getItemCostAsOf } from '@/lib/items/price-resolve';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: unitsRows } = await supabase.from('units').select('id, factor_to_base');
    const factorMap = buildFactorMap((unitsRows || []).map((u: any) => ({ id: u.id, factorToBase: parseFloat(u.factor_to_base ?? 1) })));
    const getFactor = (unitId: number) => factorMap.get(unitId);
    
    // Get recipe with items from recipes table
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('*, items:recipe_items(*, item:items(*))')
      .eq('id', id)
      .single();

    if (recipeError) throw recipeError;
    if (!recipeData) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    if (!recipeData.items || recipeData.items.length === 0) {
      return NextResponse.json({
        recipeId: Number(id),
        recipeName: recipeData.name,
        totalCost: 0,
        costPerServing: 0,
        servingSize: recipeData.serving_size || 1,
        ingredients: [],
        message: 'Recipe has no items',
      });
    }

    const itemCosts = await Promise.all(
      recipeData.items.map(async (ri: any) => {
        const itemId = ri.item_id;
        const recipeQty = parseFloat(ri.quantity);
        const recipeUnitId = ri.unit_id;
        const itemUnitCost =
          ri.item?.unit_cost != null ? parseFloat(String(ri.item.unit_cost)) : 0;

        let avgPricePerRecipeUnit = 0;
        let priceSource: 'order' | 'item' = 'order';

        if (itemUnitCost > 0 && ri.item) {
          const itemUnitId = ri.item.unit_id;
          if (
            recipeUnitId != null &&
            itemUnitId != null &&
            getFactor(recipeUnitId) != null &&
            getFactor(itemUnitId) != null
          ) {
            avgPricePerRecipeUnit =
              itemUnitCost * (getFactor(itemUnitId)! / getFactor(recipeUnitId)!);
          } else {
            avgPricePerRecipeUnit = itemUnitCost;
          }
          priceSource = 'item';
        }

        if (avgPricePerRecipeUnit === 0) {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          const { data: orderItems } = await supabase
            .from('supplier_order_items')
            .select('unit_price, unit, quantity, unit_id')
            .eq('item_id', itemId)
            .gte('created_at', threeMonthsAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(10);

          if (orderItems && orderItems.length > 0 && recipeUnitId != null && getFactor(recipeUnitId) != null) {
            let totalValueInRecipeUnit = 0;
            let totalQtyInRecipeUnit = 0;
            for (const oi of orderItems) {
              const orderQty = parseFloat(oi.quantity);
              const orderUnitId = oi.unit_id;
              const qtyInRecipeUnit =
                orderUnitId != null && getFactor(orderUnitId) != null
                  ? convertQuantity(orderQty, orderUnitId, recipeUnitId, getFactor)
                  : orderQty;
              const pricePerRecipeUnit =
                orderUnitId != null && getFactor(orderUnitId) != null
                  ? parseFloat(oi.unit_price) * (getFactor(orderUnitId)! / getFactor(recipeUnitId)!)
                  : parseFloat(oi.unit_price);
              totalValueInRecipeUnit += qtyInRecipeUnit * pricePerRecipeUnit;
              totalQtyInRecipeUnit += qtyInRecipeUnit;
            }
            avgPricePerRecipeUnit =
              totalQtyInRecipeUnit > 0 ? totalValueInRecipeUnit / totalQtyInRecipeUnit : 0;
          } else if (orderItems && orderItems.length > 0) {
            const totalValue = orderItems.reduce(
              (sum, item) => sum + parseFloat(item.unit_price) * parseFloat(item.quantity),
              0
            );
            const totalQuantity = orderItems.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
            avgPricePerRecipeUnit = totalQuantity > 0 ? totalValue / totalQuantity : 0;
          }
        }

        if (avgPricePerRecipeUnit === 0 && ri.item) {
          const todayStr = new Date().toISOString().split('T')[0];
          const resolved = await getItemCostAsOf(supabase, itemId, todayStr);
          const fallbackCost = resolved ?? (ri.item.unit_cost != null ? parseFloat(ri.item.unit_cost) : 0);
          if (fallbackCost > 0) {
            const itemUnitId = ri.item.unit_id;
            if (
              recipeUnitId != null &&
              itemUnitId != null &&
              getFactor(recipeUnitId) != null &&
              getFactor(itemUnitId) != null
            ) {
              avgPricePerRecipeUnit = fallbackCost * (getFactor(itemUnitId)! / getFactor(recipeUnitId)!);
            } else {
              avgPricePerRecipeUnit = fallbackCost;
            }
            priceSource = 'item';
          }
        }

        const itemCost = recipeQty * avgPricePerRecipeUnit;

        return {
          ingredientId: itemId,
          itemId,
          ingredientName: ri.item?.name || `Item #${itemId}`,
          itemName: ri.item?.name || `Item #${itemId}`,
          quantity: recipeQty,
          unit: ri.unit,
          unitPrice: avgPricePerRecipeUnit,
          totalCost: itemCost,
          hasPrice: avgPricePerRecipeUnit > 0,
          priceSource,
        };
      })
    );

    const totalCost = itemCosts.reduce((sum, item) => sum + item.totalCost, 0);
    const servingSize = recipeData.serving_size || 1;
    const costPerServing = servingSize > 0 ? totalCost / servingSize : totalCost;

    return NextResponse.json({
      recipeId: Number(id),
      recipeName: recipeData.name,
      totalCost,
      costPerServing,
      servingSize,
      ingredients: itemCosts, // Keep for backward compatibility
      items: itemCosts,
      hasAllPrices: itemCosts.every(item => item.hasPrice),
    });
  } catch (error: any) {
    console.error('Error calculating recipe cost:', error);
    return NextResponse.json(
      { error: 'Failed to calculate recipe cost', details: error.message },
      { status: 500 }
    );
  }
}

