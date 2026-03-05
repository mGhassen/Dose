// Variable by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Variable, UpdateVariableData } from '@kit/types';
import { parseRequestBody, updateVariableSchema } from '@/shared/zod-schemas';

function transformVariable(row: any, unitLabel?: string | null): Variable {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    value: parseFloat(row.value),
    unitId: row.unit_id ?? undefined,
    unit: unitLabel ?? row.unit ?? undefined,
    effectiveDate: row.effective_date ?? undefined,
    endDate: row.end_date ?? undefined,
    description: row.description,
    isActive: row.is_active,
    payload: row.payload ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function resolveUnitLabel(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, unitId: number): Promise<string> {
  const { data } = await supabase.from('variables').select('id, name, payload').eq('id', unitId).single();
  if (!data) return String(unitId);
  const payload = data.payload as { symbol?: string } | null;
  return payload?.symbol ?? data.name ?? String(unitId);
}

function transformToSnakeCase(data: UpdateVariableData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.type !== undefined) result.type = data.type;
  if (data.value !== undefined) result.value = data.value;
  if (data.unitId !== undefined) result.unit_id = data.unitId;
  if (data.effectiveDate !== undefined) result.effective_date = data.effectiveDate;
  if (data.endDate !== undefined) result.end_date = data.endDate;
  if (data.description !== undefined) result.description = data.description;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.payload !== undefined) result.payload = data.payload;
  result.updated_at = new Date().toISOString();
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('variables')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Variable not found' }, { status: 404 });
      }
      throw error;
    }

    const unitLabel = data.unit_id ? await resolveUnitLabel(supabase, data.unit_id) : null;
    return NextResponse.json(transformVariable(data, unitLabel));
  } catch (error: any) {
    console.error('Error fetching variable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variable', details: error.message },
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
    const parsed = await parseRequestBody(request, updateVariableSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdateVariableData;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('variables')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Variable not found' }, { status: 404 });
      }
      throw error;
    }

    const unitLabel = data.unit_id ? await resolveUnitLabel(supabase, data.unit_id) : null;
    return NextResponse.json(transformVariable(data, unitLabel));
  } catch (error: any) {
    console.error('Error updating variable:', error);
    return NextResponse.json(
      { error: 'Failed to update variable', details: error.message },
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
      .from('variables')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting variable:', error);
    return NextResponse.json(
      { error: 'Failed to delete variable', details: error.message },
      { status: 500 }
    );
  }
}

