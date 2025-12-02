// Metadata Enum by ID API Route
// Handles GET, PUT, DELETE operations for a single metadata enum

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export interface MetadataEnum {
  id: number;
  name: string;
  label: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  valueCount?: number;
}

function transformMetadataEnum(row: any, valueCount?: number): MetadataEnum {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    valueCount,
  };
}

function transformToSnakeCase(data: Partial<MetadataEnum>): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.label !== undefined) result.label = data.label;
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
    const authHeader = request.headers.get('authorization');
    const supabase = createServerSupabaseClient(authHeader);

    // First try to get the enum (including inactive ones)
    const { data, error } = await supabase
      .from('metadata_enums')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Metadata enum not found' }, { status: 404 });
      }
      throw error;
    }

    // Get value count
    const { count } = await supabase
      .from('metadata_enum_values')
      .select('*', { count: 'exact', head: true })
      .eq('enum_id', id)
      .eq('is_active', true);

    return NextResponse.json(transformMetadataEnum(data, count || 0));
  } catch (error: any) {
    console.error('Error fetching metadata enum:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata enum', details: error.message },
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
    const body = await request.json();

    const authHeader = request.headers.get('authorization');
    const supabase = createServerSupabaseClient(authHeader);
    const { data, error } = await supabase
      .from('metadata_enums')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Metadata enum not found' }, { status: 404 });
      }
      throw error;
    }

    // Get value count
    const { count } = await supabase
      .from('metadata_enum_values')
      .select('*', { count: 'exact', head: true })
      .eq('enum_id', id)
      .eq('is_active', true);

    return NextResponse.json(transformMetadataEnum(data, count || 0));
  } catch (error: any) {
    console.error('Error updating metadata enum:', error);
    return NextResponse.json(
      { error: 'Failed to update metadata enum', details: error.message },
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
    const authHeader = request.headers.get('authorization');
    const supabase = createServerSupabaseClient(authHeader);
    
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('metadata_enums')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting metadata enum:', error);
    return NextResponse.json(
      { error: 'Failed to delete metadata enum', details: error.message },
      { status: 500 }
    );
  }
}
