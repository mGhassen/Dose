import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { applyTaxRulesToItems } from '@/lib/item-taxes-resolve';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { applied, errors } = await applyTaxRulesToItems(supabase);
    return NextResponse.json({ applied, errors });
  } catch (err: any) {
    console.error('Error applying tax rules to items:', err);
    return NextResponse.json(
      { error: 'Failed to apply tax rules to items', details: err?.message },
      { status: 500 }
    );
  }
}
