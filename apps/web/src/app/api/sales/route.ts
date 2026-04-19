// Sales API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Sale, CreateSaleData, CreateTransactionPayload, SaleLineItem, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';
import { parseRequestBody, createSaleTransactionSchema } from '@/shared/zod-schemas';
import { executeCreateSaleTransaction } from '@/lib/sales/execute-create-sale-transaction';
import { timestamptzBoundsForYm, timestamptzBoundsFromYmdRange } from '@kit/lib';

function transformSale(row: any): Sale {
  const subtotal = row.subtotal != null ? parseFloat(row.subtotal) : 0;
  const totalTax = row.total_tax != null ? parseFloat(row.total_tax) : 0;
  const totalDiscount = row.total_discount != null ? parseFloat(row.total_discount) : 0;
  const amount = Math.round((subtotal + totalTax - totalDiscount) * 100) / 100;
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount,
    description: row.description,
    subtotal: row.subtotal != null ? parseFloat(row.subtotal) : undefined,
    totalTax: row.total_tax != null ? parseFloat(row.total_tax) : undefined,
    totalDiscount: row.total_discount != null ? parseFloat(row.total_discount) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformLineItem(row: any): SaleLineItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    parentSaleLineId: row.parent_sale_line_id ?? undefined,
    itemId: row.item_id ?? undefined,
    quantity: parseFloat(row.quantity),
    unitId: row.unit_id ?? undefined,
    unitPrice: parseFloat(row.unit_price),
    unitCost: row.unit_cost != null ? parseFloat(row.unit_cost) : undefined,
    taxRatePercent: row.tax_rate_percent != null ? parseFloat(row.tax_rate_percent) : undefined,
    taxAmount: row.tax_amount != null ? parseFloat(row.tax_amount) : undefined,
    lineTotal: parseFloat(row.line_total),
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateSaleData): Record<string, unknown> {
  const result: Record<string, unknown> = {
    date: data.date,
    type: data.type,
    description: data.description ?? null,
  };
  if (data.subtotal != null) result.subtotal = data.subtotal;
  if (data.totalTax != null) result.total_tax = data.totalTax;
  if (data.totalDiscount != null) result.total_discount = data.totalDiscount;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const type = searchParams.get('type');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = supabaseServer();
    
    let countQuery = supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    let query = supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });

    if (startDateParam && endDateParam) {
      const { gte, lte } = timestamptzBoundsFromYmdRange(startDateParam, endDateParam);
      query = query.gte('date', gte).lte('date', lte);
      countQuery = countQuery.gte('date', gte).lte('date', lte);
    } else {
      if (year) {
        const { gte, lte } = timestamptzBoundsFromYmdRange(`${year}-01-01`, `${year}-12-31`);
        query = query.gte('date', gte).lte('date', lte);
        countQuery = countQuery.gte('date', gte).lte('date', lte);
      }
      if (month) {
        const { gte, lte } = timestamptzBoundsForYm(month);
        query = query.gte('date', gte).lte('date', lte);
        countQuery = countQuery.gte('date', gte).lte('date', lte);
      }
    }

    if (type) {
      query = query.eq('type', type);
      countQuery = countQuery.eq('type', type);
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

    const salesRows = data || [];
    const sales: Sale[] = salesRows.map((row: any) => transformSale(row));
    
    const total = count || 0;
    
    const response: PaginatedResponse<Sale> = createPaginatedResponse(
      sales,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, createSaleTransactionSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const supabase = supabaseServer();
    const sale = await executeCreateSaleTransaction(supabase, body);
    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    const details = error?.message || String(error);
    const hint = error?.hint || error?.details || '';
    const status =
      typeof details === 'string' &&
      (details.includes('Payment slices') || details.includes('must match bank transaction'))
        ? 400
        : 500;
    return NextResponse.json(
      { error: 'Failed to create sale', details: `${details}${hint ? ` (${hint})` : ''}` },
      { status }
    );
  }
}

