// Variables API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Variable, CreateVariableData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';
import { parseRequestBody, createVariableSchema } from '@/shared/zod-schemas';
import { isConvertibleDimension } from '@/lib/units/dimensions';

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

async function resolveUnitLabels(supabase: ReturnType<typeof supabaseServer>, rows: any[]): Promise<Map<number, string>> {
  const unitIds = [...new Set((rows || []).map((r) => r.unit_id).filter(Boolean))] as number[];
  if (unitIds.length === 0) return new Map();
  const { data } = await supabase.from('variables').select('id, name, payload').in('id', unitIds);
  const map = new Map<number, string>();
  for (const u of data || []) {
    const payload = u.payload as { symbol?: string } | null;
    map.set(u.id, payload?.symbol ?? u.name ?? String(u.id));
  }
  return map;
}

function transformToSnakeCase(data: CreateVariableData): any {
  const out: any = {
    name: data.name,
    type: data.type,
    value: data.value,
    unit_id: data.unitId ?? null,
    effective_date: data.effectiveDate ?? null,
    end_date: data.endDate ?? null,
    description: data.description,
    is_active: data.isActive ?? true,
  };
  if (data.payload !== undefined) out.payload = data.payload;
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = supabaseServer();
    
    // Build count query
    let countQuery = supabase
      .from('variables')
      .select('*', { count: 'exact', head: true });

    // Build data query
    let query = supabase
      .from('variables')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
      countQuery = countQuery.eq('type', type);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const unitLabels = await resolveUnitLabels(supabase, data || []);
    const variables: Variable[] = (data || []).map((row) =>
      transformVariable(row, row.unit_id ? unitLabels.get(row.unit_id) : null)
    );
    const total = count || 0;
    
    const response: PaginatedResponse<Variable> = createPaginatedResponse(
      variables,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching variables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variables', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, createVariableSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data as CreateVariableData;

    if (body.type === 'unit' && body.value === undefined) {
      const payload = body.payload as { dimension?: string } | undefined;
      const dimension = typeof payload?.dimension === 'string' ? payload.dimension : undefined;
      if (!isConvertibleDimension(dimension)) {
        body.value = 1;
      }
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('variables')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    const unitLabels = data.unit_id ? await resolveUnitLabels(supabase, [data]) : new Map();
    const unitLabel = data.unit_id ? unitLabels.get(data.unit_id) : null;
    return NextResponse.json(transformVariable(data, unitLabel), { status: 201 });
  } catch (error: any) {
    console.error('Error creating variable:', error);
    return NextResponse.json(
      { error: 'Failed to create variable', details: error.message },
      { status: 500 }
    );
  }
}

