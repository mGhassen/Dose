// Variables API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Variable, CreateVariableData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformVariable(row: any): Variable {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    value: parseFloat(row.value),
    unit: row.unit,
    effectiveDate: row.effective_date,
    endDate: row.end_date,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateVariableData): any {
  return {
    name: data.name,
    type: data.type,
    value: data.value,
    unit: data.unit,
    effective_date: data.effectiveDate,
    end_date: data.endDate,
    description: data.description,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
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

    const variables: Variable[] = (data || []).map(transformVariable);
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
    const body: CreateVariableData = await request.json();
    
    if (!body.name || !body.type || body.value === undefined || !body.effectiveDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, value, effectiveDate' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('variables')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformVariable(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating variable:', error);
    return NextResponse.json(
      { error: 'Failed to create variable', details: error.message },
      { status: 500 }
    );
  }
}

