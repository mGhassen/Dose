import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, updateItemGroupSchema } from '@/shared/zod-schemas';
import { normalizeItemKinds } from '@kit/types';

function mapCategoryRow(row: any) {
  const c = row?.category;
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    label: c.label,
    description: c.description ?? null,
    displayOrder: c.display_order ?? 0,
    isActive: c.is_active ?? true,
  };
}

function transformItemRow(row: any, canonicalItemId: number, groupName: string) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: '',
    unitId: row.unit_id,
    categoryId: row.category_id ?? null,
    category: mapCategoryRow(row),
    itemTypes: normalizeItemKinds(row.item_types),
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sku: row.sku,
    vendorId: row.vendor_id,
    notes: row.notes,
    producedFromRecipeId: row.produced_from_recipe_id,
    affectsStock: row.affects_stock ?? true,
    isCatalogParent: row.is_catalog_parent ?? false,
    groupId: row.group_id,
    groupName,
    isCanonical: row.id === canonicalItemId,
    canonicalItemId,
  };
}

async function loadGroupWithMembers(supabase: ReturnType<typeof supabaseServer>, id: number) {
  const { data: group, error: gErr } = await supabase
    .from('item_groups')
    .select('*')
    .eq('id', id)
    .single();
  if (gErr) throw gErr;

  const { data: memberRows, error: mErr } = await supabase
    .from('items')
    .select(
      '*, category:item_categories(id, name, label, description, display_order, is_active)'
    )
    .eq('group_id', id);
  if (mErr) throw mErr;

  return {
    id: group.id,
    name: group.name,
    canonicalItemId: group.canonical_item_id,
    members: (memberRows || []).map((r) =>
      transformItemRow(r, group.canonical_item_id, group.name)
    ),
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const result = await loadGroupWithMembers(supabase, Number(id));
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    console.error('Error fetching item group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item group', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await parseRequestBody(request, updateItemGroupSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const supabase = supabaseServer();
    const groupId = Number(id);

    if (body.addMemberIds && body.addMemberIds.length > 0) {
      const { error } = await supabase.rpc('add_items_to_group', {
        p_group_id: groupId,
        p_member_ids: body.addMemberIds,
      });
      if (error) throw error;
    }

    if (body.removeMemberIds && body.removeMemberIds.length > 0) {
      const { error } = await supabase.rpc('remove_items_from_group', {
        p_group_id: groupId,
        p_member_ids: body.removeMemberIds,
      });
      if (error) throw error;
    }

    if (body.canonicalItemId !== undefined) {
      const { error } = await supabase.rpc('set_item_group_canonical', {
        p_group_id: groupId,
        p_new_canonical_id: body.canonicalItemId,
      });
      if (error) throw error;
    }

    if (body.name !== undefined) {
      const { error } = await supabase
        .from('item_groups')
        .update({ name: body.name })
        .eq('id', groupId);
      if (error) throw error;
    }

    const result = await loadGroupWithMembers(supabase, groupId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating item group:', error);
    return NextResponse.json(
      { error: 'Failed to update item group', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { error } = await supabase.rpc('delete_item_group', {
      p_group_id: Number(id),
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting item group:', error);
    return NextResponse.json(
      { error: 'Failed to delete item group', details: error.message },
      { status: 500 }
    );
  }
}
