import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createUnitSchema } from '@/shared/zod-schemas';

export interface Unit {
  id: number;
  name: string;
  symbol: string;
  dimension: string;
  baseUnitId: number | null;
  factorToBase: number;
  createdAt: string;
  updatedAt: string;
}

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

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { searchParams } = new URL(request.url);
    const dimension = searchParams.get('dimension');

    let query = supabase
      .from('variables')
      .select('*')
      .eq('type', 'unit')
      .order('payload->>dimension', { ascending: true })
      .order('payload->>symbol', { ascending: true });
    if (dimension) query = query.eq('payload->>dimension', dimension);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json((data || []).map(variableRowToUnit));
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, createUnitSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const payload = {
      symbol: body.symbol.trim(),
      dimension: body.dimension?.trim() ?? 'other',
      base_unit_id: body.baseUnitId ?? null,
    };
    const insert = {
      name: body.name.trim(),
      type: 'unit',
      value: body.factorToBase ?? 1,
      unit: null,
      effective_date: null,
      end_date: null,
      description: null,
      is_active: true,
      payload,
    };
    const supabase = supabaseServer();
    const { data: existing } = await supabase
      .from('variables')
      .select('id')
      .eq('type', 'unit')
      .eq('payload->>symbol', body.symbol.trim())
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'Unit with this symbol already exists' }, { status: 409 });
    const { data, error } = await supabase.from('variables').insert(insert).select().single();
    if (error) throw error;
    return NextResponse.json(variableRowToUnit(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit', details: error.message }, { status: 500 });
  }
}
