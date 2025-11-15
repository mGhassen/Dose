// Budgets API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Budget, CreateBudgetData, BudgetAccount, BudgetEntry, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Build count query
    let countQuery = supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true });

    // Build data query
    let query = supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false });

    if (fiscalYear) {
      query = query.eq('fiscal_year_start', fiscalYear);
      countQuery = countQuery.eq('fiscal_year_start', fiscalYear);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

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

    const total = count || 0;
    const response: PaginatedResponse<Budget> = createPaginatedResponse(
      budgets,
      total,
      page,
      limit
    );

    return NextResponse.json(response);
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

