// Metadata Enum Values API Route
// Handles CRUD operations for enum values

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { MetadataEnumValue } from '@kit/hooks';

function transformEnumValue(row: any): MetadataEnumValue {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    description: row.description || undefined,
    isActive: row.is_active,
    value: row.value || undefined,
  };
}

function transformToSnakeCase(data: Partial<MetadataEnumValue>): any {
  return {
    name: data.name,
    label: data.label,
    description: data.description,
    value: data.value,
    is_active: data.isActive ?? true,
    display_order: (data as any).displayOrder ?? 0,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ enumId: string }> }
) {
  try {
    const { enumId } = await params;
    const enumIdNum = parseInt(enumId, 10);

    if (isNaN(enumIdNum)) {
      return NextResponse.json(
        { error: 'Invalid enum ID' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('metadata_enum_values')
      .select('*')
      .eq('enum_id', enumIdNum)
      .order('display_order', { ascending: true })
      .order('value', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (error) throw error;

    const values: MetadataEnumValue[] = (data || []).map(transformEnumValue);
    return NextResponse.json(values);
  } catch (error: any) {
    console.error('Error fetching enum values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enum values', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ enumId: string }> }
) {
  try {
    const { enumId } = await params;
    const enumIdNum = parseInt(enumId, 10);

    if (isNaN(enumIdNum)) {
      return NextResponse.json(
        { error: 'Invalid enum ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    if (!body.name || !body.label) {
      return NextResponse.json(
        { error: 'Missing required fields: name, label' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('metadata_enum_values')
      .insert({
        ...transformToSnakeCase(body),
        enum_id: enumIdNum,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformEnumValue(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating enum value:', error);
    return NextResponse.json(
      { error: 'Failed to create enum value', details: error.message },
      { status: 500 }
    );
  }
}

