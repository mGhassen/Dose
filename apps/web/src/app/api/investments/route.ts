// Investments API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Investment, CreateInvestmentData } from '@kit/types';

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

function transformToSnakeCase(data: CreateInvestmentData): any {
  return {
    name: data.name,
    type: data.type,
    amount: data.amount,
    purchase_date: data.purchaseDate,
    useful_life_months: data.usefulLifeMonths,
    depreciation_method: data.depreciationMethod,
    residual_value: data.residualValue,
    description: data.description,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const investments: Investment[] = (data || []).map(transformInvestment);
    
    return NextResponse.json(investments);
  } catch (error: any) {
    console.error('Error fetching investments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateInvestmentData = await request.json();
    
    if (!body.name || !body.type || !body.amount || !body.purchaseDate || !body.usefulLifeMonths || !body.depreciationMethod || body.residualValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('investments')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformInvestment(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating investment:', error);
    return NextResponse.json(
      { error: 'Failed to create investment', details: error.message },
      { status: 500 }
    );
  }
}

