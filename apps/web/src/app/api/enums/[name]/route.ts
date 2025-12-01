// Metadata Enums API Route
// Handles fetching enum values for a specific enum name

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { MetadataEnumValue } from '@kit/hooks';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Enum name is required' },
        { status: 400 }
      );
    }

    // Special case: Role enum is hardcoded since we use is_admin boolean in accounts
    if (name === 'Role') {
      const roleValues: MetadataEnumValue[] = [
        { id: 0, name: 'member', label: 'Member', description: 'Member role', isActive: true },
        { id: 1, name: 'manager', label: 'Manager', description: 'Manager role', isActive: true },
        { id: 2, name: 'administrator', label: 'Administrator', description: 'Administrator role', isActive: true }
      ];
      return NextResponse.json(roleValues);
    }

    const supabase = createServerSupabaseClient();
    
    // First, get the enum definition
    const { data: enumData, error: enumError } = await supabase
      .from('metadata_enums')
      .select('id, name, label')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (enumError || !enumData) {
      return NextResponse.json(
        { error: `Enum '${name}' not found` },
        { status: 404 }
      );
    }

    // Then, get all values for this enum
    const { data: values, error: valuesError } = await supabase
      .from('metadata_enum_values')
      .select('id, name, label, description, value, is_active')
      .eq('enum_id', enumData.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('value', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (valuesError) {
      throw valuesError;
    }

    const enumValues: MetadataEnumValue[] = (values || []).map((row) => ({
      id: row.id,
      name: row.name,
      label: row.label,
      description: row.description || undefined,
      isActive: row.is_active,
      value: row.value || undefined,
    }));

    return NextResponse.json(enumValues);
  } catch (error: any) {
    console.error('Error fetching enum values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enum values', details: error.message },
      { status: 500 }
    );
  }
}

