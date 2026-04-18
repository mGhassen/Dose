import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createItemGroupSchema } from '@/shared/zod-schemas';

function transformGroup(row: any) {
  return {
    id: row.id,
    name: row.name,
    canonicalItemId: row.canonical_item_id,
    members: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('item_groups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(transformGroup));
  } catch (error: any) {
    console.error('Error fetching item groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item groups', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, createItemGroupSchema);
    if (!parsed.success) return parsed.response;
    const { name, canonicalItemId, memberItemIds } = parsed.data;

    if (!memberItemIds.includes(canonicalItemId)) {
      return NextResponse.json(
        { error: 'Canonical item must be in memberItemIds' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data: groupId, error } = await supabase.rpc('create_item_group', {
      p_name: name,
      p_canonical_item_id: canonicalItemId,
      p_member_ids: memberItemIds,
    });
    if (error) throw error;

    const { data: group, error: fetchError } = await supabase
      .from('item_groups')
      .select('*')
      .eq('id', groupId)
      .single();
    if (fetchError) throw fetchError;

    return NextResponse.json(transformGroup(group), { status: 201 });
  } catch (error: any) {
    console.error('Error creating item group:', error);
    return NextResponse.json(
      { error: 'Failed to create item group', details: error.message },
      { status: 500 }
    );
  }
}
