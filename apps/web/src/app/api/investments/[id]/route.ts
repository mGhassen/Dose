// Investment by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Investment, UpdateInvestmentData } from '@kit/types';

function transformInvestment(row: any): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    purchaseDate: row.purchase_date,
    usefulLifeMonths: row.useful_life_months,
    depreciationMethod: row.depreciation_method,
    residualValue: parseFloat(row.residual_value),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateInvestmentData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.type !== undefined) result.type = data.type;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.purchaseDate !== undefined) result.purchase_date = data.purchaseDate;
  if (data.usefulLifeMonths !== undefined) result.useful_life_months = data.usefulLifeMonths;
  if (data.depreciationMethod !== undefined) result.depreciation_method = data.depreciationMethod;
  if (data.residualValue !== undefined) result.residual_value = data.residualValue;
  if (data.description !== undefined) result.description = data.description;
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
      .from('investments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformInvestment(data));
  } catch (error: any) {
    console.error('Error fetching investment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investment', details: error.message },
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
    const body: UpdateInvestmentData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('investments')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformInvestment(data));
  } catch (error: any) {
    console.error('Error updating investment:', error);
    return NextResponse.json(
      { error: 'Failed to update investment', details: error.message },
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
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting investment:', error);
    return NextResponse.json(
      { error: 'Failed to delete investment', details: error.message },
      { status: 500 }
    );
  }
}

