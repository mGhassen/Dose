import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import { parseBody, bankTransactionCreateExpenseBodySchema } from "@/shared/zod-schemas";
import type { BankTransactionCreateExpenseBody } from "@/shared/zod-schemas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bankTxId } = await params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(raw, bankTransactionCreateExpenseBodySchema);
    if (!parsed.success) return parsed.response;
    const body: BankTransactionCreateExpenseBody = parsed.data;

    const supabase = supabaseServer();

    const { data: bankTx, error: txErr } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("id", bankTxId)
      .single();

    if (txErr || !bankTx) {
      return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
    }

    if (Number(bankTx.amount) >= 0) {
      return NextResponse.json(
        { error: "Only debit transactions (negative amount) can create an expense" },
        { status: 400 }
      );
    }

    if (bankTx.reconciled_entity_type && bankTx.reconciled_entity_id != null) {
      return NextResponse.json(
        { error: "Bank transaction is already reconciled; clear reconciliation first" },
        { status: 409 }
      );
    }

    let supplierOrderId: number | null = body.supplierOrderId ?? null;
    let resolvedSupplierId: number | null = body.supplierId ?? null;

    if (supplierOrderId != null) {
      const { data: ord, error: ordErr } = await supabase
        .from("supplier_orders")
        .select("id, supplier_id")
        .eq("id", supplierOrderId)
        .maybeSingle();
      if (ordErr || !ord) {
        return NextResponse.json({ error: "Supplier order not found" }, { status: 404 });
      }
      if (resolvedSupplierId == null) {
        resolvedSupplierId = ord.supplier_id;
      } else if (ord.supplier_id !== resolvedSupplierId) {
        return NextResponse.json(
          { error: "supplierOrderId does not belong to the given supplierId" },
          { status: 400 }
        );
      }
      const { data: existingExpense } = await supabase
        .from("expenses")
        .select("id")
        .eq("supplier_order_id", supplierOrderId)
        .maybeSingle();
      if (existingExpense) {
        return NextResponse.json(
          { error: "This supplier order is already linked to an expense" },
          { status: 409 }
        );
      }
    } else if (resolvedSupplierId != null) {
      const orderDate = (body.expenseDate || "").split("T")[0] || body.expenseDate;
      const { data: newOrder, error: orderErr } = await supabase
        .from("supplier_orders")
        .insert({
          supplier_id: resolvedSupplierId,
          order_date: orderDate,
          status: "pending",
          notes: `Draft order from bank transaction #${bankTxId}`,
          total_amount: null,
        })
        .select()
        .single();
      if (orderErr || !newOrder) {
        return NextResponse.json(
          { error: "Failed to create supplier order", details: orderErr?.message },
          { status: 500 }
        );
      }
      supplierOrderId = newOrder.id;
    }

    const { data: expenseRow, error: expErr } = await supabase
      .from("expenses")
      .insert({
        name: body.name,
        category: body.category,
        amount: body.amount,
        expense_type: body.expenseType ?? "expense",
        expense_date: body.expenseDate,
        start_date: body.expenseDate,
        description: body.description ?? null,
        vendor: body.vendor ?? null,
        supplier_id: resolvedSupplierId,
        supplier_order_id: supplierOrderId,
        is_active: true,
      })
      .select()
      .single();

    if (expErr || !expenseRow) {
      if (supplierOrderId && body.supplierOrderId == null) {
        await supabase.from("supplier_orders").delete().eq("id", supplierOrderId);
      }
      return NextResponse.json(
        { error: "Failed to create expense", details: expErr?.message },
        { status: 500 }
      );
    }

    const { error: entryError } = await supabase.from("entries").insert({
      direction: "output",
      entry_type: "expense",
      name: body.name,
      amount: body.amount,
      description: body.description,
      category: body.category,
      vendor: body.vendor,
      supplier_id: resolvedSupplierId,
      entry_date: body.expenseDate,
      reference_id: expenseRow.id,
      is_active: true,
    });
    if (entryError) {
      console.error("Error creating entry for expense:", entryError);
    }

    const { data: updatedTx, error: patchErr } = await supabase
      .from("bank_transactions")
      .update({
        reconciled_entity_type: "expense",
        reconciled_entity_id: expenseRow.id,
      })
      .eq("id", bankTxId)
      .select()
      .single();

    if (patchErr || !updatedTx) {
      await supabase.from("expenses").delete().eq("id", expenseRow.id);
      if (supplierOrderId && body.supplierOrderId == null) {
        await supabase.from("supplier_orders").delete().eq("id", supplierOrderId);
      }
      return NextResponse.json(
        { error: "Expense created but reconciliation failed", details: patchErr?.message },
        { status: 500 }
      );
    }

    let supplierOrderRow: { id: number; supplier_id: number; status: string | null; order_date: string } | null = null;
    if (supplierOrderId != null) {
      const { data: so } = await supabase
        .from("supplier_orders")
        .select("id, supplier_id, status, order_date")
        .eq("id", supplierOrderId)
        .maybeSingle();
      supplierOrderRow = so;
    }

    return NextResponse.json(
      {
        bankTransaction: updatedTx,
        expense: {
          id: expenseRow.id,
          name: expenseRow.name,
          category: expenseRow.category,
          amount: parseFloat(String(expenseRow.amount)),
          expenseDate: expenseRow.expense_date,
          supplierId: expenseRow.supplier_id ?? undefined,
          supplierOrderId: expenseRow.supplier_order_id ?? undefined,
        },
        supplierOrder: supplierOrderRow,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create expense from bank transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
