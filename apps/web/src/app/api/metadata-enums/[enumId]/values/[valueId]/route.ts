// Metadata Enum Value API Route
// Handles update and delete operations for a single enum value

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
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.label !== undefined) result.label = data.label;
  if (data.description !== undefined) result.description = data.description;
  if (data.value !== undefined) result.value = data.value;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if ((data as any).displayOrder !== undefined) result.display_order = (data as any).displayOrder;
  return result;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ enumId: string; valueId: string }> }
) {
  try {
    const { valueId } = await params;
    const valueIdNum = parseInt(valueId, 10);

    if (isNaN(valueIdNum)) {
      return NextResponse.json(
        { error: 'Invalid value ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('metadata_enum_values')
      .update(transformToSnakeCase(body))
      .eq('id', valueIdNum)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformEnumValue(data));
  } catch (error: any) {
    console.error('Error updating enum value:', error);
    return NextResponse.json(
      { error: 'Failed to update enum value', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ enumId: string; valueId: string }> }
) {
  try {
    const { valueId } = await params;
    const valueIdNum = parseInt(valueId, 10);

    if (isNaN(valueIdNum)) {
      return NextResponse.json(
        { error: 'Invalid value ID' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('metadata_enum_values')
      .update({ is_active: false })
      .eq('id', valueIdNum);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting enum value:', error);
    return NextResponse.json(
      { error: 'Failed to delete enum value', details: error.message },
      { status: 500 }
    );
  }
}

