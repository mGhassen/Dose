import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const dimension = searchParams.get('dimension');

    let query = supabase.from('units').select('*').order('dimension', { ascending: true }).order('symbol', { ascending: true });
    if (dimension) query = query.eq('dimension', dimension);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json((data || []).map(transformUnit));
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, symbol, dimension, baseUnitId, factorToBase } = body;
    if (!name || !symbol) {
      return NextResponse.json({ error: 'Missing required fields: name, symbol' }, { status: 400 });
    }
    const supabase = createServerSupabaseClient();
    const insert = {
      name: String(name).trim(),
      symbol: String(symbol).trim(),
      dimension: dimension ? String(dimension).trim() : 'other',
      base_unit_id: baseUnitId != null ? Number(baseUnitId) : null,
      factor_to_base: factorToBase != null ? Number(factorToBase) : 1,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('units').insert(insert).select().single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Unit with this symbol already exists' }, { status: 409 });
      throw error;
    }
    return NextResponse.json(transformUnit(data));
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit', details: error.message }, { status: 500 });
  }
}
