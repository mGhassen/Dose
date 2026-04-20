// Inventory Valuation API
// Calculates total inventory value based on average ingredient costs

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getItemCostAsOf } from '@/lib/items/price-resolve';
import {
  convertQuantityWithContext,
  convertUnitPriceWithContext,
  logUnitConversionWarning,
} from "@/lib/units/convert";
import { loadUnitConversionContext } from "@/lib/units/context";

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const conversionContext = await loadUnitConversionContext(supabase);
    
    const { data: stockLevels, error: stockError } = await supabase
      .from('stock_levels')
      .select(`
        *,
        item:items(id, name, unit_id)
      `)
      .gt('quantity', 0);

    if (stockError) throw stockError;

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const valuations = await Promise.all(
      (stockLevels || []).map(async (sl) => {
        const itemId = sl.item_id;
        let avgUnitPrice = 0;
        {
          const { data: orderItems } = await supabase
            .from('supplier_order_items')
            .select('unit_price, quantity, unit_id')
            .eq('item_id', itemId)
            .gte('created_at', threeMonthsAgo.toISOString())
            .limit(10);

          if (orderItems && orderItems.length > 0) {
            const stockUnitId = (sl.unit_id as number | null | undefined) ?? (sl.item?.unit_id as number | null | undefined) ?? null;
            let totalValue = 0;
            let totalQuantity = 0;
            for (const item of orderItems) {
              const orderQuantity = parseFloat(item.quantity);
              const orderUnitId = item.unit_id as number | null;
              const quantityResult = convertQuantityWithContext(
                orderQuantity,
                orderUnitId,
                stockUnitId,
                conversionContext
              );
              if (quantityResult.warning) {
                logUnitConversionWarning("inventory-valuation:order-quantity", quantityResult.warning);
              }
              const priceResult = convertUnitPriceWithContext(
                parseFloat(item.unit_price),
                orderUnitId,
                stockUnitId,
                conversionContext
              );
              if (priceResult.warning) {
                logUnitConversionWarning("inventory-valuation:order-price", priceResult.warning);
              }
              totalValue += quantityResult.quantity * priceResult.unitPrice;
              totalQuantity += quantityResult.quantity;
            }
            avgUnitPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
          }
          if (avgUnitPrice === 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const resolved = await getItemCostAsOf(supabase, itemId, todayStr);
            if (resolved.unitCost != null) avgUnitPrice = resolved.unitCost;
          }
        }

        const quantity = parseFloat(String(sl.quantity));
        const totalValue = quantity * avgUnitPrice;

        return {
          stockLevelId: sl.id,
          itemId,
          ingredientId: itemId, // Keep for backward compatibility
          itemName: sl.item?.name || `Item #${itemId}`,
          ingredientName: sl.item?.name || `Item #${itemId}`, // Keep for backward compatibility
          location: sl.location,
          quantity,
          unit: sl.unit,
          averageUnitPrice: avgUnitPrice,
          totalValue,
          hasPrice: avgUnitPrice > 0,
        };
      })
    );

    const totalValue = valuations.reduce((sum, v) => sum + v.totalValue, 0);
    const itemsWithPrice = valuations.filter(v => v.hasPrice).length;
    const itemsWithoutPrice = valuations.length - itemsWithPrice;

    return NextResponse.json({
      totalValue,
      itemCount: valuations.length,
      itemsWithPrice,
      itemsWithoutPrice,
      items: valuations,
    });
  } catch (error: any) {
    console.error('Error calculating inventory valuation:', error);
    return NextResponse.json(
      { error: 'Failed to calculate inventory valuation', details: error.message },
      { status: 500 }
    );
  }
}

