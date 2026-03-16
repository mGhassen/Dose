import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

function transformRow(row: any) {
  return {
    id: row.id,
    itemId: row.item_id,
    variableId: row.variable_id,
    conditionType: row.condition_type,
    conditionValue: row.condition_value ?? undefined,
    conditionValues: row.condition_values ?? undefined,
    calculationType: row.calculation_type ?? undefined,
    priority: row.priority ?? 0,
    effectiveDate: row.effective_date ?? undefined,
    endDate: row.end_date ?? undefined,
    variableName: row.variables?.name,
    variableValue: row.variables?.value != null ? parseFloat(row.variables.value) : undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('item_taxes')
      .select('*, variables(id, name, value)')
      .eq('item_id', itemId)
      .order('priority', { ascending: true });

    if (error) throw error;
    const list = (data || []).map(transformRow);
    return NextResponse.json(list);
  } catch (err: any) {
    console.error('Error listing item taxes:', err);
    return NextResponse.json(
      { error: 'Failed to list item taxes', details: err?.message },
      { status: 500 }
    );
  }
}

const createItemTaxSchema = {
  variableId: (v: unknown) => typeof v === 'number' && Number.isInteger(v),
  conditionType: (v: unknown) => typeof v === 'string' && v.length > 0,
  conditionValue: (v: unknown) => v == null || typeof v === 'string',
  calculationType: (v: unknown) => v == null || (v === 'inclusive' || v === 'additive'),
  priority: (v: unknown) => v == null || (typeof v === 'number' && Number.isInteger(v)),
  effectiveDate: (v: unknown) => v == null || typeof v === 'string',
  endDate: (v: unknown) => v == null || typeof v === 'string',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }
    const body = await request.json();
    if (!createItemTaxSchema.variableId(body.variableId) || !createItemTaxSchema.conditionType(body.conditionType)) {
      return NextResponse.json({ error: 'variableId and conditionType required' }, { status: 400 });
    }
    const supabase = supabaseServer();

    const row = {
      item_id: itemId,
      variable_id: body.variableId,
      condition_type: body.conditionType,
      condition_value: body.conditionValue ?? null,
      condition_values: body.conditionValues ?? null,
      calculation_type: body.calculationType ?? null,
      priority: body.priority ?? 0,
      effective_date: body.effectiveDate ?? null,
      end_date: body.endDate ?? null,
    };

    const { data, error } = await supabase.from('item_taxes').insert(row).select('*, variables(id, name, value)').single();
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This tax condition already exists for this item (same condition type and value).' },
          { status: 409 }
        );
      }
      throw error;
    }
    return NextResponse.json(transformRow(data), { status: 201 });
  } catch (err: any) {
    console.error('Error creating item tax:', err);
    return NextResponse.json(
      { error: 'Failed to create item tax', details: err?.message },
      { status: 500 }
    );
  }
}
