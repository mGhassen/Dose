import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import { parseBody, bankTransactionAllocatePaymentBodySchema } from "@/shared/zod-schemas";
import type { BankTransactionAllocatePaymentBody } from "@/shared/zod-schemas";
import { assertBankAllocationWithinCap } from "@/lib/ledger/bank-allocation-cap";

const ALLOCATABLE_OUTPUT_ENTRY_TYPES = new Set([
  "loan_payment",
  "expense",
  "subscription_payment",
  "leasing_payment",
  "expense_payment",
]);

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

    const parsed = parseBody(raw, bankTransactionAllocatePaymentBodySchema);
    if (!parsed.success) return parsed.response;
    const body: BankTransactionAllocatePaymentBody = parsed.data;

    const supabase = supabaseServer();
    const bankTxIdNum = Number(bankTxId);

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
        { error: "Only debit transactions (negative amount) can allocate a payment" },
        { status: 400 }
      );
    }

    if (bankTx.reconciled_entity_type && bankTx.reconciled_entity_id != null) {
      return NextResponse.json(
        { error: "Bank transaction is already reconciled; clear reconciliation first" },
        { status: 409 }
      );
    }

    const { data: entry, error: entErr } = await supabase
      .from("entries")
      .select("id, direction, entry_type, amount")
      .eq("id", body.entryId)
      .single();

    if (entErr || !entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.direction !== "output") {
      return NextResponse.json(
        { error: "Only output entries can be paid from a bank debit" },
        { status: 400 }
      );
    }

    if (!ALLOCATABLE_OUTPUT_ENTRY_TYPES.has(entry.entry_type)) {
      return NextResponse.json(
        {
          error: `Entry type "${entry.entry_type}" cannot be allocated from bank here`,
          details: `Allowed: ${[...ALLOCATABLE_OUTPUT_ENTRY_TYPES].join(", ")}`,
        },
        { status: 400 }
      );
    }

    const entryAmount = parseFloat(String(entry.amount));
    const { data: existingPay } = await supabase.from("payments").select("amount").eq("entry_id", entry.id);
    let paid = 0;
    for (const p of existingPay || []) {
      paid += parseFloat(String((p as { amount: string | number }).amount));
    }
    if (paid + body.amount > entryAmount + 0.02) {
      return NextResponse.json(
        {
          error: "Payment exceeds remaining balance on this entry",
          details: `Entry ${entryAmount.toFixed(2)}, already paid ${paid.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const cap = await assertBankAllocationWithinCap(supabase, bankTxIdNum, body.amount);
    if (!cap.ok) {
      return NextResponse.json({ error: cap.message }, { status: cap.status });
    }

    const dateStr = body.paymentDate.split("T")[0] || body.paymentDate;
    const { data: paymentRow, error: payInsErr } = await supabase
      .from("payments")
      .insert({
        entry_id: entry.id,
        payment_date: dateStr,
        amount: body.amount,
        is_paid: true,
        paid_date: dateStr,
        payment_method: body.paymentMethod ?? null,
        notes: body.notes ?? null,
        bank_transaction_id: bankTxIdNum,
      })
      .select()
      .single();

    if (payInsErr || !paymentRow) {
      return NextResponse.json(
        { error: "Failed to create payment", details: payInsErr?.message },
        { status: 500 }
      );
    }

    const { data: allocRows } = await supabase
      .from("payments")
      .select("amount")
      .eq("bank_transaction_id", bankTxIdNum);
    let allocated = 0;
    for (const r of allocRows || []) {
      allocated += parseFloat(String((r as { amount: string | number }).amount));
    }
    const capAmt = Math.abs(Number(bankTx.amount));
    const fullyAllocated = Math.abs(allocated - capAmt) < 0.02;

    let updatedTx = bankTx;
    if (fullyAllocated) {
      const { data: patchTx, error: patchErr } = await supabase
        .from("bank_transactions")
        .update({
          reconciled_entity_type: "entry",
          reconciled_entity_id: entry.id,
        })
        .eq("id", bankTxId)
        .select()
        .single();
      if (!patchErr && patchTx) updatedTx = patchTx;
    }

    return NextResponse.json(
      {
        payment: {
          id: paymentRow.id,
          entryId: paymentRow.entry_id,
          amount: parseFloat(String(paymentRow.amount)),
          paymentDate: paymentRow.payment_date,
          bankTransactionId: paymentRow.bank_transaction_id ?? undefined,
        },
        bankTransaction: {
          ...updatedTx,
          allocated_payments_total: Math.round(allocated * 100) / 100,
        },
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to allocate payment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
