// Budget Account API Route (single account)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { BudgetAccount, UpdateBudgetAccountData } from '@kit/types';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const { id, accountId } = await params;
    const body: UpdateBudgetAccountData = await request.json();

    const supabase = createServerSupabaseClient();
    const updateData: any = {};

    if (body.accountPath !== undefined) updateData.account_path = body.accountPath;
    if (body.accountLabel !== undefined) updateData.account_label = body.accountLabel;
    if (body.accountType !== undefined) updateData.account_type = body.accountType;
    if (body.level !== undefined) updateData.level = body.level;
    if (body.parentPath !== undefined) updateData.parent_path = body.parentPath;
    if (body.isGroup !== undefined) updateData.is_group = body.isGroup;
    if (body.displayOrder !== undefined) updateData.display_order = body.displayOrder;

    const { data, error } = await supabase
      .from('budget_accounts')
      .update(updateData)
      .eq('id', accountId)
      .eq('budget_id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformBudgetAccount(data));
  } catch (error: any) {
    console.error('Error updating budget account:', error);
    return NextResponse.json(
      { error: 'Failed to update budget account', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const { id, accountId } = await params;

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('budget_accounts')
      .delete()
      .eq('id', accountId)
      .eq('budget_id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting budget account:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget account', details: error.message },
      { status: 500 }
    );
  }
}

