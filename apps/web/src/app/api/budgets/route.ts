// Budgets API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Budget, CreateBudgetData, BudgetAccount, BudgetEntry } from '@kit/types';

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

function transformToSnakeCase(data: CreateBudgetData): any {
  return {
    name: data.name,
    fiscal_year_start: data.fiscalYearStart,
    budget_period: data.budgetPeriod || 'monthly',
    reporting_tag_id: data.reportingTagId || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get('fiscalYear');
    const includeAccounts = searchParams.get('includeAccounts') === 'true';
    const includeEntries = searchParams.get('includeEntries') === 'true';

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false });

    if (fiscalYear) {
      query = query.eq('fiscal_year_start', fiscalYear);
    }

    const { data, error } = await query;

    if (error) throw error;

    const budgets: Budget[] = (data || []).map(transformBudget);

    // If includeAccounts or includeEntries, fetch related data
    if (includeAccounts || includeEntries) {
      for (const budget of budgets) {
        if (includeAccounts) {
          const { data: accountsData, error: accountsError } = await supabase
            .from('budget_accounts')
            .select('*')
            .eq('budget_id', budget.id)
            .order('display_order', { ascending: true });

          if (!accountsError && accountsData) {
            (budget as any).accounts = accountsData.map(transformBudgetAccount);
          }
        }

        if (includeEntries) {
          const { data: entriesData, error: entriesError } = await supabase
            .from('budget_entries')
            .select('*')
            .eq('budget_id', budget.id)
            .order('month', { ascending: true });

          if (!entriesError && entriesData) {
            (budget as any).entries = entriesData.map(transformBudgetEntry);
          }
        }
      }
    }

    return NextResponse.json(budgets);
  } catch (error: any) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBudgetData = await request.json();

    if (!body.name || !body.fiscalYearStart) {
      return NextResponse.json(
        { error: 'Missing required fields: name, fiscalYearStart' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('budgets')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformBudget(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating budget:', error);
    return NextResponse.json(
      { error: 'Failed to create budget', details: error.message },
      { status: 500 }
    );
  }
}

