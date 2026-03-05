import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { TaxRule, UpdateTaxRuleData } from '@kit/types';
import { parseRequestBody, updateTaxRuleSchema } from '@/shared/zod-schemas';

function transformRule(row: any, variable?: any): TaxRule {
  return {
    id: row.id,
    variableId: row.variable_id,
    conditionType: row.condition_type,
    conditionValue: row.condition_value,
    scopeType: row.scope_type || 'all',
    scopeItemIds: row.scope_item_ids,
    scopeCategories: row.scope_categories,
    priority: row.priority ?? 0,
    effectiveDate: row.effective_date ?? null,
    endDate: row.end_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variable,
  };
}

function toSnakeCase(data: UpdateTaxRuleData): any {
  const result: any = {};
  if (data.variableId !== undefined) result.variable_id = data.variableId;
  if (data.conditionType !== undefined) result.condition_type = data.conditionType;
  if (data.conditionValue !== undefined) result.condition_value = data.conditionValue;
  if (data.scopeType !== undefined) result.scope_type = data.scopeType;
  if (data.scopeItemIds !== undefined) result.scope_item_ids = data.scopeItemIds;
  if (data.scopeCategories !== undefined) result.scope_categories = data.scopeCategories;
  if (data.priority !== undefined) result.priority = data.priority;
  if (data.effectiveDate !== undefined) result.effective_date = data.effectiveDate;
  if (data.endDate !== undefined) result.end_date = data.endDate;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data: row, error } = await supabase
      .from('tax_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tax rule not found' }, { status: 404 });
      }
      throw error;
    }

    const { data: variable } = await supabase
      .from('variables')
      .select('*')
      .eq('id', row.variable_id)
      .single();

    return NextResponse.json(transformRule(row, variable));
  } catch (error: any) {
    console.error('Error fetching tax rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rule', details: error.message },
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
    const parsed = await parseRequestBody(request, updateTaxRuleSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdateTaxRuleData;
    const supabase = createServerSupabaseClient();

    const payload = toSnakeCase(body);
    if (Object.keys(payload).length === 0) {
      const { data: row } = await supabase.from('tax_rules').select('*').eq('id', id).single();
      if (!row) return NextResponse.json({ error: 'Tax rule not found' }, { status: 404 });
      const { data: variable } = await supabase.from('variables').select('*').eq('id', row.variable_id).single();
      return NextResponse.json(transformRule(row, variable));
    }

    const { data: row, error } = await supabase
      .from('tax_rules')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!row) return NextResponse.json({ error: 'Tax rule not found' }, { status: 404 });

    const { data: variable } = await supabase.from('variables').select('*').eq('id', row.variable_id).single();
    return NextResponse.json(transformRule(row, variable));
  } catch (error: any) {
    console.error('Error updating tax rule:', error);
    return NextResponse.json(
      { error: 'Failed to update tax rule', details: error.message },
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
    const { error } = await supabase.from('tax_rules').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting tax rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete tax rule', details: error.message },
      { status: 500 }
    );
  }
}
