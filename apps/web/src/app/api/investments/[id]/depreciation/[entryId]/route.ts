// Update Depreciation Entry API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { DepreciationEntry } from '@kit/types';

function transformDepreciationEntry(row: any): DepreciationEntry {
  return {
    id: row.id,
    investmentId: row.investment_id,
    month: row.month,
    depreciationAmount: parseFloat(row.depreciation_amount),
    accumulatedDepreciation: parseFloat(row.accumulated_depreciation),
    bookValue: parseFloat(row.book_value),
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const body = await request.json();
    
    const supabase = createServerSupabaseClient();
    
    // Build update object
    const updateData: any = {};
    if (body.month !== undefined) updateData.month = body.month;
    if (body.depreciationAmount !== undefined) updateData.depreciation_amount = body.depreciationAmount;
    if (body.accumulatedDepreciation !== undefined) updateData.accumulated_depreciation = body.accumulatedDepreciation;
    if (body.bookValue !== undefined) updateData.book_value = body.bookValue;
    
    const { data, error } = await supabase
      .from('depreciation_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('investment_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Depreciation entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformDepreciationEntry(data));
  } catch (error: any) {
    console.error('Error updating depreciation entry:', error);
    return NextResponse.json(
      { error: 'Failed to update depreciation entry', details: error.message },
      { status: 500 }
    );
  }
}

