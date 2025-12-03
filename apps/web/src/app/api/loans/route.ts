// Loans API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Loan, CreateLoanData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformLoan(row: any): Loan {
  return {
    id: row.id,
    name: row.name,
    loanNumber: row.loan_number,
    principalAmount: parseFloat(row.principal_amount),
    interestRate: parseFloat(row.interest_rate),
    durationMonths: row.duration_months,
    startDate: row.start_date,
    status: row.status,
    lender: row.lender,
    description: row.description,
    offPaymentMonths: row.off_payment_months || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateLoanData): any {
  const result: any = {
    name: data.name,
    loan_number: data.loanNumber,
    principal_amount: data.principalAmount,
    interest_rate: data.interestRate,
    duration_months: data.durationMonths,
    start_date: data.startDate,
    status: data.status || 'active',
    lender: data.lender,
    description: data.description,
  };
  
  // Only include off_payment_months if it's provided and not empty
  if (data.offPaymentMonths && Array.isArray(data.offPaymentMonths) && data.offPaymentMonths.length > 0) {
    result.off_payment_months = data.offPaymentMonths;
  } else {
    result.off_payment_months = [];
  }
  
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Count query
    const countQuery = supabase
      .from('loans')
      .select('*', { count: 'exact', head: true });

    // Data query
    const query = supabase
      .from('loans')
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

    const loans: Loan[] = (data || []).map(transformLoan);
    const total = count || 0;
    
    const response: PaginatedResponse<Loan> = createPaginatedResponse(
      loans,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateLoanData = await request.json();
    
    if (!body.name || !body.loanNumber || !body.principalAmount || !body.interestRate || !body.durationMonths || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Transform data for database
    const loanData = transformToSnakeCase(body);
    
    // Log for debugging
    console.log('Creating loan with off_payment_months:', loanData.off_payment_months);
    
    // Create the loan
    const { data, error } = await supabase
      .from('loans')
      .insert(loanData)
      .select()
      .single();

    if (error) {
      console.error('Error creating loan:', error);
      throw error;
    }
    
    // Log the created loan to verify off_payment_months was saved
    console.log('Created loan with off_payment_months:', data.off_payment_months);

    // Create an INPUT entry for the loan principal (money received)
    const { error: entryError } = await supabase
      .from('entries')
      .insert({
        direction: 'input',
        entry_type: 'loan',
        name: body.name,
        amount: body.principalAmount,
        description: body.description || `Loan principal received: ${body.loanNumber}`,
        entry_date: body.startDate,
        reference_id: data.id,
        is_active: true,
      });

    if (entryError) {
      console.error('Error creating entry for loan:', entryError);
      // Don't fail the loan creation if entry creation fails, but log it
    }

    return NextResponse.json(transformLoan(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { error: 'Failed to create loan', details: error.message },
      { status: 500 }
    );
  }
}

