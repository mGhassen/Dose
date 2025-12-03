// Working Capital by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { WorkingCapital, UpdateWorkingCapitalData } from '@kit/types';

function transformWorkingCapital(row: any): WorkingCapital {
  return {
    id: row.id,
    month: row.month,
    accountsReceivable: parseFloat(row.accounts_receivable),
    inventory: parseFloat(row.inventory),
    accountsPayable: parseFloat(row.accounts_payable),
    otherCurrentAssets: parseFloat(row.other_current_assets),
    otherCurrentLiabilities: parseFloat(row.other_current_liabilities),
    workingCapitalNeed: parseFloat(row.working_capital_need),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateWorkingCapitalData, currentData?: any): any {
  const result: any = {};
  
  const accountsReceivable = data.accountsReceivable !== undefined ? data.accountsReceivable : parseFloat(currentData?.accounts_receivable || '0');
  const inventory = data.inventory !== undefined ? data.inventory : parseFloat(currentData?.inventory || '0');
  const accountsPayable = data.accountsPayable !== undefined ? data.accountsPayable : parseFloat(currentData?.accounts_payable || '0');
  const otherCurrentAssets = data.otherCurrentAssets !== undefined ? data.otherCurrentAssets : parseFloat(currentData?.other_current_assets || '0');
  const otherCurrentLiabilities = data.otherCurrentLiabilities !== undefined ? data.otherCurrentLiabilities : parseFloat(currentData?.other_current_liabilities || '0');

  if (data.month !== undefined) result.month = data.month;
  if (data.accountsReceivable !== undefined) result.accounts_receivable = data.accountsReceivable;
  if (data.inventory !== undefined) result.inventory = data.inventory;
  if (data.accountsPayable !== undefined) result.accounts_payable = data.accountsPayable;
  if (data.otherCurrentAssets !== undefined) result.other_current_assets = data.otherCurrentAssets;
  if (data.otherCurrentLiabilities !== undefined) result.other_current_liabilities = data.otherCurrentLiabilities;

  // Recalculate BFR
  const currentAssets = accountsReceivable + inventory + otherCurrentAssets;
  const currentLiabilities = accountsPayable + otherCurrentLiabilities;
  result.working_capital_need = currentAssets - currentLiabilities;
  
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
      .from('working_capital')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Working capital entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformWorkingCapital(data));
  } catch (error: any) {
    console.error('Error fetching working capital:', error);
    return NextResponse.json(
      { error: 'Failed to fetch working capital', details: error.message },
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
    const body: UpdateWorkingCapitalData = await request.json();

    const supabase = createServerSupabaseClient();
    
    const { data: currentData } = await supabase
      .from('working_capital')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('working_capital')
      .update(transformToSnakeCase(body, currentData))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Working capital entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformWorkingCapital(data));
  } catch (error: any) {
    console.error('Error updating working capital:', error);
    return NextResponse.json(
      { error: 'Failed to update working capital', details: error.message },
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
      .from('working_capital')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting working capital:', error);
    return NextResponse.json(
      { error: 'Failed to delete working capital', details: error.message },
      { status: 500 }
    );
  }
}

