// Reorder Suggestions API
// Returns ingredients that are below minimum stock levels

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get stock levels that are below minimum
    const { data: stockLevels, error } = await supabase
      .from('stock_levels')
      .select(`
        *,
        item:items(id, name, unit, category)
      `)
      .not('minimum_stock_level', 'is', null)
      .lte('quantity', supabase.raw('minimum_stock_level'))
      .order('quantity', { ascending: true });

    if (error) throw error;

    const suggestions = (stockLevels || []).map(sl => {
      const minLevel = parseFloat(sl.minimum_stock_level);
      const current = parseFloat(sl.quantity);
      const deficit = minLevel - current;
      const reorderQuantity = sl.maximum_stock_level 
        ? Math.max(deficit, parseFloat(sl.maximum_stock_level) - current)
        : deficit * 2; // Suggest ordering 2x the deficit if no max level

      return {
        stockLevelId: sl.id,
        itemId: sl.item_id,
        ingredientId: sl.item_id, // Keep for backward compatibility
        itemName: sl.item?.name || `Item #${sl.item_id}`,
        ingredientName: sl.item?.name || `Item #${sl.item_id}`, // Keep for backward compatibility
        unit: sl.unit,
        location: sl.location,
        currentQuantity: current,
        minimumStockLevel: minLevel,
        maximumStockLevel: sl.maximum_stock_level ? parseFloat(sl.maximum_stock_level) : null,
        deficit: deficit,
        suggestedReorderQuantity: Math.ceil(reorderQuantity),
        urgency: current <= 0 ? 'critical' : current < minLevel * 0.5 ? 'high' : 'medium',
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error fetching reorder suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reorder suggestions', details: error.message },
      { status: 500 }
    );
  }
}

