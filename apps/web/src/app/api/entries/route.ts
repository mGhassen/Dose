// Entries API Route
// Handles CRUD operations for entries (inputs/outputs)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

export interface Entry {
  id: number;
  direction: 'input' | 'output';
  entryType: string;
  name: string;
  amount: number;
  description?: string;
  category?: string;
  vendor?: string;
  entryDate: string;
  dueDate?: string;
  isRecurring: boolean;
  recurrenceType?: string;
  referenceId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
}

// Payment interface - defined here to avoid circular dependency
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

export interface CreateEntryData {
  direction: 'input' | 'output';
  entryType: string;
  name: string;
  amount: number;
  description?: string;
  category?: string;
  vendor?: string;
  entryDate: string;
  dueDate?: string;
  isRecurring?: boolean;
  recurrenceType?: string;
  referenceId?: number;
}

export interface UpdateEntryData extends Partial<CreateEntryData> {
  isActive?: boolean;
}

function transformEntry(row: any, payments?: any[]): Entry {
  return {
    id: row.id,
    direction: row.direction,
    entryType: row.entry_type,
    name: row.name,
    amount: parseFloat(row.amount),
    description: row.description,
    category: row.category,
    vendor: row.vendor,
    entryDate: row.entry_date,
    dueDate: row.due_date,
    isRecurring: row.is_recurring || false,
    recurrenceType: row.recurrence_type,
    referenceId: row.reference_id,
    isActive: row.is_active !== undefined ? row.is_active : true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payments: payments?.map(transformPayment),
  };
}

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

function transformToSnakeCase(data: CreateEntryData | UpdateEntryData): any {
  const result: any = {};
  if ('direction' in data) result.direction = data.direction;
  if ('entryType' in data) result.entry_type = data.entryType;
  if ('name' in data) result.name = data.name;
  if ('amount' in data) result.amount = data.amount;
  if ('description' in data) result.description = data.description || null;
  if ('category' in data) result.category = data.category || null;
  if ('vendor' in data) result.vendor = data.vendor || null;
  if ('entryDate' in data) result.entry_date = data.entryDate;
  if ('dueDate' in data) result.due_date = data.dueDate || null;
  if ('isRecurring' in data) result.is_recurring = data.isRecurring || false;
  if ('recurrenceType' in data) result.recurrence_type = data.recurrenceType || null;
  if ('referenceId' in data) result.reference_id = data.referenceId || null;
  if ('isActive' in data) result.is_active = data.isActive !== undefined ? data.isActive : true;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction');
    const entryType = searchParams.get('entryType');
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    const includePayments = searchParams.get('includePayments') === 'true';
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Build base query for counting
    let countQuery = supabase
      .from('entries')
      .select('*', { count: 'exact', head: true });

    // Build query for data
    let query = supabase
      .from('entries')
      .select('*')
      .order('entry_date', { ascending: false });

    // Apply filters
    if (direction) {
      query = query.eq('direction', direction);
      countQuery = countQuery.eq('direction', direction);
    }

    if (entryType) {
      query = query.eq('entry_type', entryType);
      countQuery = countQuery.eq('entry_type', entryType);
    }

    if (category) {
      query = query.eq('category', category);
      countQuery = countQuery.eq('category', category);
    }

    if (month) {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(`${month}-01`);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      query = query
        .gte('entry_date', startOfMonth)
        .lte('entry_date', endDate);
      countQuery = countQuery
        .gte('entry_date', startOfMonth)
        .lte('entry_date', endDate);
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

    // Fetch payments if requested
    let paymentsMap: Map<number, any[]> = new Map();
    if (includePayments && data && data.length > 0) {
      const entryIds = data.map((e: any) => e.id);
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('entry_id', entryIds)
        .order('payment_date', { ascending: false });

      if (!paymentsError && payments) {
        payments.forEach((payment: any) => {
          const entryId = payment.entry_id;
          if (!paymentsMap.has(entryId)) {
            paymentsMap.set(entryId, []);
          }
          paymentsMap.get(entryId)!.push(payment);
        });
      }
    }

    const entries: Entry[] = (data || []).map((row: any) => 
      transformEntry(row, paymentsMap.get(row.id))
    );
    const total = count || 0;
    
    const response = createPaginatedResponse(
      entries,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateEntryData = await request.json();
    
    // Basic validation
    if (!body.direction || !body.entryType || !body.name || !body.amount || !body.entryDate) {
      return NextResponse.json(
        { error: 'Missing required fields: direction, entryType, name, amount, entryDate' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('entries')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformEntry(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating entry:', error);
    return NextResponse.json(
      { error: 'Failed to create entry', details: error.message },
      { status: 500 }
    );
  }
}

