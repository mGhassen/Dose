import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const itemId = parseInt(id, 10);
    const entryIdNum = parseInt(entryId, 10);
    if (Number.isNaN(itemId) || Number.isNaN(entryIdNum)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const body = await request.json();
    const supabase = supabaseServer();

    const updates: Record<string, unknown> = {};
    if (body.variableId !== undefined) updates.variable_id = body.variableId;
    if (body.conditionType !== undefined) updates.condition_type = body.conditionType;
    if (body.conditionValue !== undefined) updates.condition_value = body.conditionValue ?? null;
    if (body.conditionValues !== undefined) updates.condition_values = body.conditionValues ?? null;
    if (body.calculationType !== undefined) updates.calculation_type = body.calculationType ?? null;
    if (body.priority !== undefined) updates.priority = body.priority ?? 0;
    if (body.effectiveDate !== undefined) updates.effective_date = body.effectiveDate ?? null;
    if (body.endDate !== undefined) updates.end_date = body.endDate ?? null;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('item_taxes')
      .update(updates)
      .eq('id', entryIdNum)
      .eq('item_id', itemId)
      .select('*, variables(id, name, value)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Another tax with this condition already exists for this item.' },
          { status: 409 }
        );
      }
      throw error;
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      id: data.id,
      itemId: data.item_id,
      variableId: data.variable_id,
      conditionType: data.condition_type,
      conditionValue: data.condition_value ?? undefined,
      conditionValues: data.condition_values ?? undefined,
      calculationType: data.calculation_type ?? undefined,
      priority: data.priority ?? 0,
      effectiveDate: data.effective_date ?? undefined,
      endDate: data.end_date ?? undefined,
      variableName: data.variables?.name,
      variableValue: data.variables?.value != null ? parseFloat(data.variables.value) : undefined,
    });
  } catch (err: any) {
    console.error('Error updating item tax:', err);
    return NextResponse.json(
      { error: 'Failed to update item tax', details: err?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const itemId = parseInt(id, 10);
    const entryIdNum = parseInt(entryId, 10);
    if (Number.isNaN(itemId) || Number.isNaN(entryIdNum)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const supabase = supabaseServer();
    const { error } = await supabase.from('item_taxes').delete().eq('id', entryIdNum).eq('item_id', itemId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error('Error deleting item tax:', err);
    return NextResponse.json(
      { error: 'Failed to delete item tax', details: err?.message },
      { status: 500 }
    );
  }
}
