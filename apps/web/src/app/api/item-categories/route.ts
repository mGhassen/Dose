import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createItemCategorySchema } from '@/shared/zod-schemas';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === '1';
    const supabase = supabaseServer();
    let query = supabase
      .from('item_categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('label', { ascending: true });
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json((data || []).map(transform));
  } catch (error: any) {
    console.error('Error fetching item categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item categories', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, createItemCategorySchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const name = (body.name && body.name.trim()) || slugify(body.label);
    if (!name) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: existing } = await supabase
      .from('item_categories')
      .select('*')
      .ilike('name', name)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(transform(existing), { status: 200 });
    }

    const { data, error } = await supabase
      .from('item_categories')
      .insert({
        name,
        label: body.label,
        description: body.description ?? null,
        display_order: body.displayOrder ?? 0,
        is_active: body.isActive ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(transform(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating item category:', error);
    return NextResponse.json(
      { error: 'Failed to create item category', details: error.message },
      { status: 500 }
    );
  }
}
