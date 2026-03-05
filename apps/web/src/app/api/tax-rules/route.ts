import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { TaxRule, CreateTaxRuleData } from '@kit/types';
import { parseRequestBody, createTaxRuleSchema } from '@/shared/zod-schemas';

function transformRule(row: any, variable?: any): TaxRule {
  return {
    id: row.id,
    variableId: row.variable_id,
    conditionType: row.condition_type,
    conditionValue: row.condition_value ?? null,
    conditionValues: row.condition_values ?? null,
    scopeType: row.scope_type || 'all',
    scopeItemIds: row.scope_item_ids,
    scopeCategories: row.scope_categories,
    priority: row.priority ?? 0,
    effectiveDate: row.effective_date ?? null,
    endDate: row.end_date ?? null,
    name: row.name ?? null,
    description: row.description ?? null,
    applyToCustomAmounts: row.apply_to_custom_amounts ?? true,
    applyToFutureItems: row.apply_to_future_items ?? true,
    ruleType: row.rule_type || 'exemption',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variable,
  };
}

function toSnakeCase(data: CreateTaxRuleData): any {
  const result: any = {
    variable_id: data.variableId,
    scope_type: data.scopeType ?? 'all',
    priority: data.priority ?? 0,
  };
  if (data.conditionType !== undefined) result.condition_type = data.conditionType;
  if (data.conditionValue !== undefined) result.condition_value = data.conditionValue;
  if (data.conditionValues !== undefined) result.condition_values = data.conditionValues;
  if (data.scopeItemIds !== undefined) result.scope_item_ids = data.scopeItemIds;
  if (data.scopeCategories !== undefined) result.scope_categories = data.scopeCategories;
  if (data.effectiveDate !== undefined) result.effective_date = data.effectiveDate;
  if (data.endDate !== undefined) result.end_date = data.endDate;
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.applyToCustomAmounts !== undefined) result.apply_to_custom_amounts = data.applyToCustomAmounts;
  if (data.applyToFutureItems !== undefined) result.apply_to_future_items = data.applyToFutureItems;
  if (data.ruleType !== undefined) result.rule_type = data.ruleType;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { searchParams } = new URL(request.url);
    const variableId = searchParams.get('variableId');
    let query = supabase.from('tax_rules').select('*').order('priority', { ascending: true });
    if (variableId) {
      const id = parseInt(variableId, 10);
      if (!isNaN(id)) query = query.eq('variable_id', id);
    }
    const { data: rows, error } = await query;

    if (error) throw error;

    const variableIds = [...new Set((rows || []).map((r: any) => r.variable_id))];
    const { data: variables } = variableIds.length
      ? await supabase.from('variables').select('*').in('id', variableIds)
      : { data: [] };
    const varMap = new Map((variables || []).map((v: any) => [v.id, v]));

    const rules: TaxRule[] = (rows || []).map((r: any) =>
      transformRule(r, varMap.get(r.variable_id))
    );
    return NextResponse.json(rules);
  } catch (error: any) {
    console.error('Error fetching tax rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rules', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, createTaxRuleSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data as CreateTaxRuleData;

    const supabase = supabaseServer();
    const { data: row, error } = await supabase
      .from('tax_rules')
      .insert(toSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    const { data: variable } = await supabase
      .from('variables')
      .select('*')
      .eq('id', row.variable_id)
      .single();

    return NextResponse.json(transformRule(row, variable));
  } catch (error: any) {
    console.error('Error creating tax rule:', error);
    return NextResponse.json(
      { error: 'Failed to create tax rule', details: error.message },
      { status: 500 }
    );
  }
}
