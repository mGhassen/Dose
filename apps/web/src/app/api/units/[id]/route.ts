import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Unit } from '../route';
import { parseRequestBody, updateUnitSchema } from '@/shared/zod-schemas';

function variableRowToUnit(row: any): Unit {
  const payload = row.payload || {};
  return {
    id: row.id,
    name: row.name,
    symbol: (payload.symbol as string) ?? '',
    dimension: (payload.dimension as string) ?? 'other',
    baseUnitId: (payload.base_unit_id as number) ?? null,
    factorToBase: parseFloat(row.value ?? 1),
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
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('variables')
      .select('*')
      .eq('id', id)
      .eq('type', 'unit')
      .single();
    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      throw error;
    }
    return NextResponse.json(variableRowToUnit(data));
  } catch (error: any) {
    console.error('Error fetching unit:', error);
    return NextResponse.json({ error: 'Failed to fetch unit', details: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await parseRequestBody(request, updateUnitSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const supabase = createServerSupabaseClient();

    const { data: existing, error: fetchError } = await supabase
      .from('variables')
      .select('payload')
      .eq('id', id)
      .eq('type', 'unit')
      .single();
    if (fetchError || !existing) {
      if (fetchError?.code === 'PGRST116') return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      throw fetchError;
    }
    const payload = { ...(existing.payload as Record<string, unknown> || {}) };
    if (body.symbol !== undefined) payload.symbol = body.symbol;
    if (body.dimension !== undefined) payload.dimension = body.dimension;
    if (body.baseUnitId !== undefined) payload.base_unit_id = body.baseUnitId;

    const updates: any = { updated_at: new Date().toISOString(), payload };
    if (body.name !== undefined) updates.name = body.name;
    if (body.factorToBase !== undefined) updates.value = body.factorToBase;

    if (body.symbol !== undefined) {
      const { data: dup } = await supabase
        .from('variables')
        .select('id')
        .eq('type', 'unit')
        .eq('payload->>symbol', body.symbol)
        .neq('id', id)
        .maybeSingle();
      if (dup) return NextResponse.json({ error: 'Unit with this symbol already exists' }, { status: 409 });
    }
    const { data, error } = await supabase
      .from('variables')
      .update(updates)
      .eq('id', id)
      .eq('type', 'unit')
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      throw error;
    }
    return NextResponse.json(variableRowToUnit(data));
  } catch (error: any) {
    console.error('Error updating unit:', error);
    return NextResponse.json({ error: 'Failed to update unit', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('variables').delete().eq('id', id).eq('type', 'unit');
    if (error) {
      if (error.code === '23503') return NextResponse.json({ error: 'Unit is in use and cannot be deleted' }, { status: 409 });
      throw error;
    }
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    return NextResponse.json({ error: 'Failed to delete unit', details: error.message }, { status: 500 });
  }
}
