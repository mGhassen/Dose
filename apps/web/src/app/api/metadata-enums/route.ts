// Metadata Enums API Route
// Handles listing all metadata enums

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get all metadata enums
    const { data: enums, error: enumsError } = await supabase
      .from('metadata_enums')
      .select('*')
      .order('name', { ascending: true });

    if (enumsError) throw enumsError;

    // Get value counts for each enum
    const enumIds = (enums || []).map(e => e.id);
    const { data: valueCounts } = await supabase
      .from('metadata_enum_values')
      .select('enum_id')
      .in('enum_id', enumIds)
      .eq('is_active', true);

    const countsByEnumId = (valueCounts || []).reduce((acc, val) => {
      acc[val.enum_id] = (acc[val.enum_id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const metadataEnums: MetadataEnum[] = (enums || []).map(e => 
      transformMetadataEnum(e, countsByEnumId[e.id] || 0)
    );

    return NextResponse.json(metadataEnums);
  } catch (error: any) {
    console.error('Error fetching metadata enums:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata enums', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.label) {
      return NextResponse.json(
        { error: 'Missing required fields: name, label' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('metadata_enums')
      .insert({
        name: body.name,
        label: body.label,
        description: body.description || null,
        is_active: body.isActive ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformMetadataEnum(data, 0), { status: 201 });
  } catch (error: any) {
    console.error('Error creating metadata enum:', error);
    return NextResponse.json(
      { error: 'Failed to create metadata enum', details: error.message },
      { status: 500 }
    );
  }
}

