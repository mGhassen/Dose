import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, updateItemCategorySchema } from '@/shared/zod-schemas';

function transform(row: any) {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    description: row.description ?? null,
    displayOrder: row.display_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('item_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(transform(data));
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch item category', details: error.message },
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
    const parsed = await parseRequestBody(request, updateItemCategorySchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) update.name = body.name;
    if (body.label !== undefined) update.label = body.label;
    if (body.description !== undefined) update.description = body.description;
    if (body.displayOrder !== undefined) update.display_order = body.displayOrder;
    if (body.isActive !== undefined) update.is_active = body.isActive;

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('item_categories')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(transform(data));
  } catch (error: any) {
    console.error('Error updating item category:', error);
    return NextResponse.json(
      { error: 'Failed to update item category', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(request, ctx);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();

    const { count } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) {
      const { error } = await supabase
        .from('item_categories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ softDeleted: true, itemsReferencing: count });
    }

    const { error } = await supabase
      .from('item_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting item category:', error);
    return NextResponse.json(
      { error: 'Failed to delete item category', details: error.message },
      { status: 500 }
    );
  }
}
