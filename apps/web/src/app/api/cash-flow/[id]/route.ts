// Cash Flow Entry by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { CashFlowEntry, UpdateCashFlowEntryData } from '@kit/types';

function transformCashFlow(row: any): CashFlowEntry {
  return {
    id: row.id,
    month: row.month,
    openingBalance: parseFloat(row.opening_balance),
    cashInflows: parseFloat(row.cash_inflows),
    cashOutflows: parseFloat(row.cash_outflows),
    netCashFlow: parseFloat(row.net_cash_flow),
    closingBalance: parseFloat(row.closing_balance),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateCashFlowEntryData): any {
  const result: any = {};
  if (data.month !== undefined) result.month = data.month;
  if (data.openingBalance !== undefined) result.opening_balance = data.openingBalance;
  if (data.cashInflows !== undefined) result.cash_inflows = data.cashInflows;
  if (data.cashOutflows !== undefined) result.cash_outflows = data.cashOutflows;
  if (data.notes !== undefined) result.notes = data.notes;
  
  // Recalculate if any flow values changed
  if (data.openingBalance !== undefined || data.cashInflows !== undefined || data.cashOutflows !== undefined) {
    const opening = data.openingBalance !== undefined ? data.openingBalance : parseFloat(result.opening_balance || '0');
    const inflows = data.cashInflows !== undefined ? data.cashInflows : parseFloat(result.cash_inflows || '0');
    const outflows = data.cashOutflows !== undefined ? data.cashOutflows : parseFloat(result.cash_outflows || '0');
    result.net_cash_flow = inflows - outflows;
    result.closing_balance = opening + result.net_cash_flow;
  }
  
  result.updated_at = new Date().toISOString();
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('cash_flow')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cash flow entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformCashFlow(data));
  } catch (error: any) {
    console.error('Error fetching cash flow entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow entry', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateCashFlowEntryData = await request.json();

    const supabase = createServerSupabaseClient();
    
    // Get current entry to calculate if needed
    const { data: currentData } = await supabase
      .from('cash_flow')
      .select('*')
      .eq('id', id)
      .single();
    
    const updateData = transformToSnakeCase(body);
    
    const { data, error } = await supabase
      .from('cash_flow')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cash flow entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformCashFlow(data));
  } catch (error: any) {
    console.error('Error updating cash flow entry:', error);
    return NextResponse.json(
      { error: 'Failed to update cash flow entry', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('cash_flow')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting cash flow entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete cash flow entry', details: error.message },
      { status: 500 }
    );
  }
}

