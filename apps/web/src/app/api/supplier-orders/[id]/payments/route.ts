import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import { parseRequestBody, paymentSliceSchema } from "@/shared/zod-schemas";
import { z } from "zod";

const addSupplierOrderPaymentsSchema = z.object({
  paymentSlices: z.array(paymentSliceSchema).min(1, "At least one payment slice is required"),
});

type ExpenseRow = {
  id: number;
  name: string | null;
  amount: number | string;
  description: string | null;
  category: string | null;
  vendor: string | null;
  supplier_id: number | null;
  expense_date: string | null;
  is_active: boolean | null;
};

async function resolveExpenseForSupplierOrder(orderId: number) {
  const supabase = supabaseServer();
  const { data: expense, error } = await supabase
    .from("expenses")
    .select("id, name, amount, description, category, vendor, supplier_id, expense_date, is_active")
    .eq("supplier_order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  return expense as ExpenseRow | null;
}

async function ensureExpenseEntry(expense: ExpenseRow) {
  const supabase = supabaseServer();
  const { data: existing, error: lookupError } = await supabase
    .from("entries")
    .select("id")
    .eq("entry_type", "expense")
    .eq("reference_id", expense.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) return existing.id as number;

  const { data: inserted, error: insertError } = await supabase
    .from("entries")
    .insert({
      direction: "output",
      entry_type: "expense",
      name: expense.name || `Supplier order expense #${expense.id}`,
      amount: Number(expense.amount || 0),
      description: expense.description ?? null,
      category: expense.category ?? null,
      vendor: expense.vendor ?? null,
      supplier_id: expense.supplier_id ?? null,
      entry_date: expense.expense_date ?? new Date().toISOString().split("T")[0],
      reference_id: expense.id,
      is_active: expense.is_active ?? true,
    })
    .select("id")
    .single();
  if (insertError || !inserted?.id) throw insertError || new Error("Failed to create expense entry");
  return inserted.id as number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid supplier order id" }, { status: 400 });
    }

    const expense = await resolveExpenseForSupplierOrder(orderId);
    if (!expense) {
      return NextResponse.json({ error: "No expense linked to this supplier order" }, { status: 404 });
    }

    const entryId = await ensureExpenseEntry(expense);
    const supabase = supabaseServer();
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("entry_id", entryId)
      .order("payment_date", { ascending: false });
    if (paymentsError) throw paymentsError;

    const slices = (payments || []).map((p: any) => ({
      id: p.id as number,
      amount: Number(p.amount || 0),
      paymentDate: p.payment_date as string,
      paidDate: p.paid_date as string | null,
      notes: (p.notes as string | null) ?? null,
      paymentMethod: (p.payment_method as string | null) ?? null,
      isPaid: p.is_paid !== false,
    }));

    const totalPaid = slices.reduce((sum, s) => sum + s.amount, 0);
    const expenseAmount = Number(expense.amount || 0);

    return NextResponse.json({
      expenseId: expense.id,
      entryId,
      totalAmount: expenseAmount,
      totalPaid,
      remainingAmount: Math.max(0, expenseAmount - totalPaid),
      payments: slices,
    });
  } catch (error: any) {
    console.error("Error fetching supplier order payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier order payments", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid supplier order id" }, { status: 400 });
    }

    const parsed = await parseRequestBody(request, addSupplierOrderPaymentsSchema);
    if (!parsed.success) return parsed.response;
    const { paymentSlices } = parsed.data;

    const expense = await resolveExpenseForSupplierOrder(orderId);
    if (!expense) {
      return NextResponse.json({ error: "No expense linked to this supplier order" }, { status: 404 });
    }

    const entryId = await ensureExpenseEntry(expense);
    const supabase = supabaseServer();

    const rows = paymentSlices.map((slice) => {
      const paymentDate = slice.paymentDate.split("T")[0] || slice.paymentDate;
      return {
        entry_id: entryId,
        payment_date: paymentDate,
        amount: slice.amount,
        is_paid: true,
        paid_date: paymentDate,
        notes: slice.notes ?? null,
      };
    });

    const { error: insertError } = await supabase.from("payments").insert(rows);
    if (insertError) throw insertError;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding supplier order payments:", error);
    return NextResponse.json(
      { error: "Failed to add supplier order payments", details: error.message },
      { status: 500 }
    );
  }
}

