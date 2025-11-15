// Budget Accounts API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { BudgetAccount, CreateBudgetAccountData, UpdateBudgetAccountData } from '@kit/types';

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

function transformToSnakeCase(data: CreateBudgetAccountData): any {
  return {
    budget_id: data.budgetId,
    account_path: data.accountPath,
    account_label: data.accountLabel,
    account_type: data.accountType,
    level: data.level,
    parent_path: data.parentPath || null,
    is_group: data.isGroup ?? false,
    display_order: data.displayOrder ?? 0,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('budget_accounts')
      .select('*')
      .eq('budget_id', id)
      .order('display_order', { ascending: true });

    if (error) throw error;

    const accounts: BudgetAccount[] = (data || []).map(transformBudgetAccount);
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Error fetching budget accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget accounts', details: error.message },
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
    const body: CreateBudgetAccountData = await request.json();

    if (!body.accountPath || !body.accountLabel || !body.accountType) {
      return NextResponse.json(
        { error: 'Missing required fields: accountPath, accountLabel, accountType' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const accountData = {
      ...transformToSnakeCase(body),
      budget_id: parseInt(id),
    };

    const { data, error } = await supabase
      .from('budget_accounts')
      .insert(accountData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformBudgetAccount(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating budget account:', error);
    return NextResponse.json(
      { error: 'Failed to create budget account', details: error.message },
      { status: 500 }
    );
  }
}

