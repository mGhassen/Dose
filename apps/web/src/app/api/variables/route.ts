// Variables API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Variable, CreateVariableData } from '@kit/types';

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

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('variables')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    const variables: Variable[] = (data || []).map(transformVariable);
    
    return NextResponse.json(variables);
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

