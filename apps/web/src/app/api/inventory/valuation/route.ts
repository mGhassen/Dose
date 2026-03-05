// Inventory Valuation API
// Calculates total inventory value based on average ingredient costs

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getItemCostAsOf } from '@/lib/items/price-resolve';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    
    const { data: stockLevels, error: stockError } = await supabase
      .from('stock_levels')
      .select(`
        *,
        item:items(id, name, unit, unit_cost)
      `)
      .gt('quantity', 0);

    if (stockError) throw stockError;

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const valuations = await Promise.all(
      (stockLevels || []).map(async (sl) => {
        const itemId = sl.item_id;
        const storedCost = sl.item?.unit_cost != null ? parseFloat(String(sl.item.unit_cost)) : 0;

        let avgUnitPrice = storedCost;
        if (avgUnitPrice === 0) {
          const { data: orderItems } = await supabase
            .from('supplier_order_items')
            .select('unit_price, quantity')
            .eq('item_id', itemId)
            .gte('created_at', threeMonthsAgo.toISOString())
            .limit(10);

          if (orderItems && orderItems.length > 0) {
            const totalValue = orderItems.reduce(
              (sum, item) => sum + parseFloat(item.unit_price) * parseFloat(item.quantity),
              0
            );
            const totalQuantity = orderItems.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
            avgUnitPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
          }
          if (avgUnitPrice === 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const resolved = await getItemCostAsOf(supabase, itemId, todayStr);
            if (resolved != null) avgUnitPrice = resolved;
          }
        }

        const quantity = parseFloat(sl.quantity);
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

