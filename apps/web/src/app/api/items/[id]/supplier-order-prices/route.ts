import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getGroupMemberIds } from '@/lib/items/group-members';

export async function GET(
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
    const memberIds = await getGroupMemberIds(supabase, itemId);

    const { data: rows, error } = await supabase
      .from('supplier_order_items')
      .select(`
        id,
        unit_price,
        quantity,
        unit,
        created_at,
        supplier_orders(
          id,
          order_date,
          order_number,
          suppliers(name)
        )
      `)
      .in('item_id', memberIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const list = (rows || []).map((r: any) => {
      const raw = r.supplier_orders;
      const order = Array.isArray(raw) ? raw[0] : raw;
      const orderId =
        order && typeof order === 'object' && order.id != null
          ? Number(order.id)
          : null;
      const supRaw = order?.suppliers;
      const sup = Array.isArray(supRaw) ? supRaw[0] : supRaw;
      const supplierName =
        sup && typeof sup === 'object' && sup.name != null
          ? String(sup.name).trim() || null
          : null;
      return {
        id: r.id,
        unitPrice: r.unit_price != null ? parseFloat(r.unit_price) : null,
        quantity: r.quantity != null ? parseFloat(r.quantity) : null,
        unit: r.unit ?? '',
        orderId,
        orderDate: order?.order_date ?? null,
        orderNumber: order?.order_number ?? null,
        supplierName,
        createdAt: r.created_at,
      };
    });
    return NextResponse.json(list);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error fetching supplier order prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier order prices', details: err?.message || String(error) },
      { status: 500 }
    );
  }
}
