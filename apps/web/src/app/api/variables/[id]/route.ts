// Variable by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Variable, UpdateVariableData } from '@kit/types';

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

function transformToSnakeCase(data: UpdateVariableData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.type !== undefined) result.type = data.type;
  if (data.value !== undefined) result.value = data.value;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.effectiveDate !== undefined) result.effective_date = data.effectiveDate;
  if (data.endDate !== undefined) result.end_date = data.endDate;
  if (data.description !== undefined) result.description = data.description;
  if (data.isActive !== undefined) result.is_active = data.isActive;
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

    return NextResponse.json(transformVariable(data));
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
    const body: UpdateVariableData = await request.json();

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

    return NextResponse.json(transformVariable(data));
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

