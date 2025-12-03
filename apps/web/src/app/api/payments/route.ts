// Payments API Route
// Handles CRUD operations for payments linked to entries

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

export interface Payment {
  id: number;
  entryId: number;
  paymentDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentData {
  entryId: number;
  paymentDate: string;
  amount: number;
  isPaid?: boolean;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface UpdatePaymentData extends Partial<CreatePaymentData> {}

function transformPayment(row: any): Payment {
  return {
    id: row.id,
    entryId: row.entry_id,
    paymentDate: row.payment_date,
    amount: parseFloat(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreatePaymentData | UpdatePaymentData): any {
  const result: any = {};
  if ('entryId' in data) result.entry_id = data.entryId;
  if ('paymentDate' in data) result.payment_date = data.paymentDate;
  if ('amount' in data) result.amount = data.amount;
  if ('isPaid' in data) result.is_paid = data.isPaid !== undefined ? data.isPaid : false;
  if ('paidDate' in data) result.paid_date = data.paidDate || null;
  if ('paymentMethod' in data) result.payment_method = data.paymentMethod || null;
  if ('notes' in data) result.notes = data.notes || null;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    const loanId = searchParams.get('loanId');
    const isPaid = searchParams.get('isPaid');
    const month = searchParams.get('month');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // If filtering by loanId, first get all entry IDs for that loan
    let entryIds: number[] | null = null;
    if (loanId) {
      const { data: loanEntries } = await supabase
        .from('entries')
        .select('id')
        .eq('reference_id', parseInt(loanId))
        .in('entry_type', ['loan', 'loan_payment']);
      
      if (loanEntries && loanEntries.length > 0) {
        entryIds = loanEntries.map(e => e.id);
      } else {
        // No entries found for this loan, return empty result
        return NextResponse.json(createPaginatedResponse([], 0, page, limit));
      }
    }
    
    // Build base query for counting
    let countQuery = supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });

    // Build query for data
    let query = supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });

    // Apply filters
    if (entryId) {
      query = query.eq('entry_id', entryId);
      countQuery = countQuery.eq('entry_id', entryId);
    } else if (entryIds && entryIds.length > 0) {
      query = query.in('entry_id', entryIds);
      countQuery = countQuery.in('entry_id', entryIds);
    } else if (loanId) {
      // No entries found, return empty
      return NextResponse.json(createPaginatedResponse([], 0, page, limit));
    }

    if (isPaid !== null && isPaid !== undefined) {
      const paid = isPaid === 'true';
      query = query.eq('is_paid', paid);
      countQuery = countQuery.eq('is_paid', paid);
    }

    if (month) {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(`${month}-01`);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      query = query
        .gte('payment_date', startOfMonth)
        .lte('payment_date', endDate);
      countQuery = countQuery
        .gte('payment_date', startOfMonth)
        .lte('payment_date', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const payments: Payment[] = (data || []).map(transformPayment);
    const total = count || 0;
    
    const response = createPaginatedResponse(
      payments,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentData = await request.json();
    
    // Basic validation
    if (!body.entryId || !body.paymentDate || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: entryId, paymentDate, amount' },
        { status: 400 }
      );
    }

    // Verify entry exists
    const supabase = createServerSupabaseClient();
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id')
      .eq('id', body.entryId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('payments')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformPayment(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', details: error.message },
      { status: 500 }
    );
  }
}

