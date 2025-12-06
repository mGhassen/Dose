// Recipe Cost Calculation API Route
// Calculates the cost of a recipe based on ingredient prices from supplier orders

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
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

    // Get average prices from recent supplier orders for each item
    const itemCosts = await Promise.all(
      recipeData.items.map(async (ri: any) => {
        const itemId = ri.item_id;
        
        // Get average unit price from recent supplier orders (last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const { data: orderItems, error: itemsError } = await supabase
          .from('supplier_order_items')
          .select('unit_price, unit, quantity')
          .eq('item_id', itemId)
          .gte('created_at', threeMonthsAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        let avgPrice = 0;
        if (orderItems && orderItems.length > 0) {
          // Calculate weighted average
          const totalValue = orderItems.reduce((sum, item) => sum + (parseFloat(item.unit_price) * parseFloat(item.quantity)), 0);
          const totalQuantity = orderItems.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
          avgPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
        }

        const itemCost = parseFloat(ri.quantity) * avgPrice;

        return {
          ingredientId: itemId, // Keep for backward compatibility
          itemId,
          ingredientName: ri.item?.name || `Item #${itemId}`, // Keep for backward compatibility
          itemName: ri.item?.name || `Item #${itemId}`,
          quantity: parseFloat(ri.quantity),
          unit: ri.unit,
          unitPrice: avgPrice,
          totalCost: itemCost,
          hasPrice: avgPrice > 0,
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

