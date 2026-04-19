// Stock Movements API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  appDefaultTimeZone,
  endUtcIsoForCalendarYmd,
  inclusiveUtcRangeFromYmdStrings,
  startUtcIsoForCalendarYmd,
} from '@kit/lib/date-format';
import type { StockMovement, CreateStockMovementData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformStockMovement(row: any): StockMovement {
  return {
    id: row.id,
    itemId: row.item_id,
    movementType: row.movement_type,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    unitId: row.unit_id,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    location: row.location,
    notes: row.notes,
    movementDate: row.movement_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function transformToSnakeCase(data: CreateStockMovementData): any {
  const result: any = {
    item_id: data.itemId,
    movement_type: data.movementType,
    quantity: data.quantity,
    unit: data.unit,
    reference_type: data.referenceType,
    reference_id: data.referenceId,
    location: data.location,
    notes: data.notes,
    movement_date: data.movementDate || new Date().toISOString(),
  };
  if (data.unitId != null) result.unit_id = data.unitId;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams, { maxLimit: 5000 });
    const itemId = searchParams.get('itemId') || searchParams.get('ingredientId'); // Support both for backward compat
    const movementType = searchParams.get('movementType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = supabaseServer();

    const types = movementType
      ? movementType.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    let itemIds: number[] | null = null;
    if (itemId) {
      const { getGroupMemberIds } = await import('@/lib/items/group-members');
      itemIds = await getGroupMemberIds(supabase, Number(itemId));
    }

    const tz = appDefaultTimeZone();

    const applyFilters = <T extends { eq: any; in: any; gte: any; lte: any }>(q: T): T => {
      let out: any = q;
      if (itemIds && itemIds.length > 1) out = out.in('item_id', itemIds);
      else if (itemIds && itemIds.length === 1) out = out.eq('item_id', itemIds[0]);
      if (types.length === 1) out = out.eq('movement_type', types[0]);
      else if (types.length > 1) out = out.in('movement_type', types);
      // Full local calendar days in app TZ — not UTC 00:00–23:59Z (off-by-one vs Paris).
      if (startDate && endDate) {
        const { startUtc, endUtc } = inclusiveUtcRangeFromYmdStrings(startDate, endDate, tz);
        out = out.gte('movement_date', startUtc.toISOString());
        out = out.lte('movement_date', endUtc.toISOString());
      } else if (startDate) {
        out = out.gte('movement_date', startUtcIsoForCalendarYmd(startDate, tz));
      } else if (endDate) {
        out = out.lte('movement_date', endUtcIsoForCalendarYmd(endDate, tz));
      }
      return out as T;
    };

    const PG_CHUNK = 1000;

    const fetchAllInRange = async (start: number, end: number) => {
      const all: any[] = [];
      let cursor = start;
      while (cursor <= end) {
        const upper = Math.min(cursor + PG_CHUNK - 1, end);
        const { data, error } = await applyFilters(
          supabase
            .from('stock_movements')
            .select('*, item:items(*)')
            .order('movement_date', { ascending: false })
        ).range(cursor, upper);
        if (error) throw error;
        const rows = data ?? [];
        all.push(...rows);
        if (rows.length < upper - cursor + 1) break;
        cursor = upper + 1;
      }
      return all;
    };

    const countQuery = applyFilters(
      supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
    );

    const [data, { count, error: countError }] = await Promise.all([
      fetchAllInRange(offset, offset + limit - 1),
      countQuery,
    ]);

    if (countError) throw countError;

    const movements: StockMovement[] = (data || []).map(transformStockMovement);
    const total = count || 0;

    return NextResponse.json(createPaginatedResponse(movements, total, page, limit));
  } catch (error: any) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movements', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.createStockMovementSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as CreateStockMovementData;

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('stock_movements')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    // Stock level will be automatically updated by trigger

    return NextResponse.json(transformStockMovement(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to create stock movement', details: error.message },
      { status: 500 }
    );
  }
}

