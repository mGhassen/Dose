// Budget API Route (single budget)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Budget, UpdateBudgetData, BudgetAccount, BudgetEntry } from '@kit/types';

function transformBudget(row: any): Budget {
  return {
    id: row.id,
    name: row.name,
    fiscalYearStart: row.fiscal_year_start,
    budgetPeriod: row.budget_period,
    reportingTagId: row.reporting_tag_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformBudgetAccount(row: any): BudgetAccount {
  return {
    id: row.id,
    budgetId: row.budget_id,
    accountPath: row.account_path,
    accountLabel: row.account_label,
    accountType: row.account_type,
    level: row.level,
    parentPath: row.parent_path,
    isGroup: row.is_group,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeAccounts = searchParams.get('includeAccounts') !== 'false';
    const includeEntries = searchParams.get('includeEntries') !== 'false';

    const supabase = createServerSupabaseClient();
    
    // Get budget
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', id)
      .single();

    if (budgetError) throw budgetError;
    if (!budgetData) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    const budget = transformBudget(budgetData);

    // Get accounts
    if (includeAccounts) {
      const { data: accountsData, error: accountsError } = await supabase
        .from('budget_accounts')
        .select('*')
        .eq('budget_id', id)
        .order('display_order', { ascending: true });

      if (!accountsError && accountsData) {
        (budget as any).accounts = accountsData.map(transformBudgetAccount);
      }
    }

    // Get entries
    if (includeEntries) {
      const { data: entriesData, error: entriesError } = await supabase
        .from('budget_entries')
        .select('*')
        .eq('budget_id', id)
        .order('month', { ascending: true });

      if (!entriesError && entriesData) {
        (budget as any).entries = entriesData.map(transformBudgetEntry);
      }
    }

    return NextResponse.json(budget);
  } catch (error: any) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget', details: error.message },
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
    const body: UpdateBudgetData = await request.json();

    const supabase = createServerSupabaseClient();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.fiscalYearStart !== undefined) updateData.fiscal_year_start = body.fiscalYearStart;
    if (body.budgetPeriod !== undefined) updateData.budget_period = body.budgetPeriod;
    if (body.reportingTagId !== undefined) updateData.reporting_tag_id = body.reportingTagId;

    const { data, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformBudget(data));
  } catch (error: any) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget', details: error.message },
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
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting budget:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget', details: error.message },
      { status: 500 }
    );
  }
}

