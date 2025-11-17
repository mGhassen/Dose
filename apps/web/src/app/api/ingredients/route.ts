// Ingredients API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Ingredient, CreateIngredientData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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

function transformToSnakeCase(data: CreateIngredientData): any {
  return {
    name: data.name,
    description: data.description,
    unit: data.unit,
    category: data.category,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Count query
    const countQuery = supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true });

    // Data query
    const query = supabase
      .from('ingredients')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const ingredients: Ingredient[] = (data || []).map(transformIngredient);
    const total = count || 0;
    
    const response: PaginatedResponse<Ingredient> = createPaginatedResponse(
      ingredients,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredients', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateIngredientData = await request.json();
    
    if (!body.name || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: name and unit are required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('ingredients')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformIngredient(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to create ingredient', details: error.message },
      { status: 500 }
    );
  }
}

