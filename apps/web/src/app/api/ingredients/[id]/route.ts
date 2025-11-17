// Ingredient by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Ingredient, UpdateIngredientData } from '@kit/types';

function transformIngredient(row: any): Ingredient {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    category: row.category,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateIngredientData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.category !== undefined) result.category = data.category;
  if (data.isActive !== undefined) result.is_active = data.isActive;
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
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformIngredient(data));
  } catch (error: any) {
    console.error('Error fetching ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredient', details: error.message },
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
    const body: UpdateIngredientData = await request.json();
    
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('ingredients')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformIngredient(data));
  } catch (error: any) {
    console.error('Error updating ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to update ingredient', details: error.message },
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
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to delete ingredient', details: error.message },
      { status: 500 }
    );
  }
}

