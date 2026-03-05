import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Unit } from '../route';
import { parseRequestBody, updateUnitSchema } from '@/shared/zod-schemas';

function transformUnit(row: any): Unit {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    dimension: row.dimension || 'other',
    baseUnitId: row.base_unit_id,
    factorToBase: parseFloat(row.factor_to_base ?? 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSnakeCase(data: Partial<Unit>): any {
  const result: any = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) result.name = data.name;
  if (data.symbol !== undefined) result.symbol = data.symbol;
  if (data.dimension !== undefined) result.dimension = data.dimension;
  if (data.baseUnitId !== undefined) result.base_unit_id = data.baseUnitId;
  if (data.factorToBase !== undefined) result.factor_to_base = data.factorToBase;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('units').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      throw error;
    }
    return NextResponse.json(transformUnit(data));
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
    const { data, error } = await supabase.from('units').update(toSnakeCase(body)).eq('id', id).select().single();
    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      if (error.code === '23505') return NextResponse.json({ error: 'Unit with this symbol already exists' }, { status: 409 });
      throw error;
    }
    return NextResponse.json(transformUnit(data));
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
    const { error } = await supabase.from('units').delete().eq('id', id);
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
