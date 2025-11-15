// Budget Entries API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { BudgetEntry, CreateBudgetEntryData, UpdateBudgetEntryData } from '@kit/types';

function transformBudgetEntry(row: any): BudgetEntry {
  return {
    id: row.id,
    budgetId: row.budget_id,
    accountPath: row.account_path,
    month: row.month,
    amount: parseFloat(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateBudgetEntryData | UpdateBudgetEntryData): any {
  const result: any = {};
  if ('budgetId' in data) result.budget_id = data.budgetId;
  if ('accountPath' in data) result.account_path = data.accountPath;
  if ('month' in data) result.month = data.month;
  if ('amount' in data) result.amount = data.amount;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const accountPath = searchParams.get('accountPath');
    const month = searchParams.get('month');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('budget_entries')
      .select('*')
      .eq('budget_id', id);

    if (accountPath) {
      query = query.eq('account_path', accountPath);
    }

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query.order('month', { ascending: true });

    if (error) throw error;

    const entries: BudgetEntry[] = (data || []).map(transformBudgetEntry);
    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching budget entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget entries', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: CreateBudgetEntryData | CreateBudgetEntryData[] = await request.json();

    const supabase = createServerSupabaseClient();

    // Handle both single entry and bulk insert
    const entries = Array.isArray(body) ? body : [body];
    const entriesData = entries.map(entry => ({
      ...transformToSnakeCase(entry),
      budget_id: parseInt(id),
    }));

    const { data, error } = await supabase
      .from('budget_entries')
      .upsert(entriesData, {
        onConflict: 'budget_id,account_path,month',
        ignoreDuplicates: false,
      })
      .select();

    if (error) throw error;

    const result = (data || []).map(transformBudgetEntry);
    return NextResponse.json(Array.isArray(body) ? result : result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating budget entries:', error);
    return NextResponse.json(
      { error: 'Failed to create budget entries', details: error.message },
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
    const body: UpdateBudgetEntryData & { accountPath: string; month: string } = await request.json();

    if (!body.accountPath || !body.month) {
      return NextResponse.json(
        { error: 'Missing required fields: accountPath, month' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const updateData: any = {};

    if (body.amount !== undefined) updateData.amount = body.amount;

    const { data, error } = await supabase
      .from('budget_entries')
      .update(updateData)
      .eq('budget_id', id)
      .eq('account_path', body.accountPath)
      .eq('month', body.month)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformBudgetEntry(data));
  } catch (error: any) {
    console.error('Error updating budget entry:', error);
    return NextResponse.json(
      { error: 'Failed to update budget entry', details: error.message },
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
    const { searchParams } = new URL(request.url);
    const accountPath = searchParams.get('accountPath');
    const month = searchParams.get('month');

    if (!accountPath || !month) {
      return NextResponse.json(
        { error: 'Missing required parameters: accountPath, month' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('budget_entries')
      .delete()
      .eq('budget_id', id)
      .eq('account_path', accountPath)
      .eq('month', month);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting budget entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget entry', details: error.message },
      { status: 500 }
    );
  }
}

