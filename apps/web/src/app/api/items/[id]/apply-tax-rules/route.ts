import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { applyTaxRulesToItem } from '@/lib/item-taxes-resolve';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }
    const supabase = supabaseServer();
    const { data: item } = await supabase.from('items').select('category').eq('id', itemId).maybeSingle();
    const itemCategory = (item as { category?: string } | null)?.category ?? null;
    const { applied, errors } = await applyTaxRulesToItem(supabase, itemId, itemCategory);
    return NextResponse.json({ applied, errors });
  } catch (err: any) {
    console.error('Error applying tax rules to item:', err);
    return NextResponse.json(
      { error: 'Failed to apply tax rules', details: err?.message },
      { status: 500 }
    );
  }
}
