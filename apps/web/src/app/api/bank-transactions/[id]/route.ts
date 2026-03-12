import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to get bank transaction' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reconciled_entity_type, reconciled_entity_id } = body;
    const updates: Record<string, unknown> = {};
    if (reconciled_entity_type !== undefined) updates.reconciled_entity_type = reconciled_entity_type ?? null;
    if (reconciled_entity_id !== undefined) updates.reconciled_entity_id = reconciled_entity_id ?? null;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('bank_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to update bank transaction' }, { status: 500 });
  }
}
