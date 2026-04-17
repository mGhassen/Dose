import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import {
  parseBody,
  bankTransactionAllocatePaymentBodySchema,
  bankTransactionAllocateReceiptsBulkBodySchema,
} from "@/shared/zod-schemas";
import type {
  BankTransactionAllocatePaymentBody,
  BankTransactionAllocateReceiptsBulkBody,
} from "@/shared/zod-schemas";
import { assertBankAllocationWithinCap } from "@/lib/ledger/bank-allocation-cap";

function isBulkPayload(x: unknown): x is { allocations: unknown[] } {
  return !!x && typeof x === "object" && Array.isArray((x as { allocations?: unknown }).allocations);
}

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

    if (isBulkPayload(raw)) {
      return handleBulk(bankTxId, raw);
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

    if (Number(bankTx.amount) <= 0) {
      return NextResponse.json(
        { error: "Only credit transactions (positive amount) can allocate a receipt" },
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
      .select("id, direction, entry_type, amount, reference_id")
      .eq("id", body.entryId)
      .single();

    if (entErr || !entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.direction !== "input") {
      return NextResponse.json(
        { error: "Only input entries can receive a bank credit allocation" },
        { status: 400 }
      );
    }

    if (entry.entry_type !== "sale") {
      return NextResponse.json(
        { error: `Entry type "${entry.entry_type}" cannot receive a bank credit here; only sale input lines are supported` },
        { status: 400 }
      );
    }

    const saleId = entry.reference_id != null ? Number(entry.reference_id) : null;
    if (saleId == null || Number.isNaN(saleId)) {
      return NextResponse.json(
        { error: "Sale entry is missing reference_id (sale id); cannot allocate" },
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
          error: "Receipt exceeds remaining balance on this sale entry",
          details: `Entry ${entryAmount.toFixed(2)}, already received ${paid.toFixed(2)}`,
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
    const capAmt = Number(bankTx.amount);
    const fullyAllocated = Math.abs(allocated - capAmt) < 0.02;

    let updatedTx = bankTx;
    if (fullyAllocated) {
      const { data: patchTx, error: patchErr } = await supabase
        .from("bank_transactions")
        .update({
          reconciled_entity_type: "sale",
          reconciled_entity_id: saleId,
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
    const msg = e instanceof Error ? e.message : "Failed to allocate receipt";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleBulk(bankTxId: string, raw: unknown) {
  const parsed = parseBody(raw, bankTransactionAllocateReceiptsBulkBodySchema);
  if (!parsed.success) return parsed.response;
  const body: BankTransactionAllocateReceiptsBulkBody = parsed.data;

  const supabase = supabaseServer();
  const bankTxIdNum = Number(bankTxId);

  const { data: bankTx, error: txErr } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("id", bankTxId)
    .single();
  if (txErr || !bankTx) return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
  if (Number(bankTx.amount) <= 0) {
    return NextResponse.json(
      { error: "Only credit transactions (positive amount) can allocate a receipt" },
      { status: 400 }
    );
  }
  if (bankTx.reconciled_entity_type && bankTx.reconciled_entity_id != null) {
    return NextResponse.json(
      { error: "Bank transaction is already reconciled; clear reconciliation first" },
      { status: 409 }
    );
  }

  const mergedAllocs = new Map<number, { amount: number; notes?: string }>();
  for (const a of body.allocations) {
    const prev = mergedAllocs.get(a.entryId);
    if (prev) {
      mergedAllocs.set(a.entryId, { amount: prev.amount + a.amount, notes: prev.notes ?? a.notes });
    } else {
      mergedAllocs.set(a.entryId, { amount: a.amount, notes: a.notes });
    }
  }
  const entryIds = Array.from(mergedAllocs.keys());

  const { data: entries, error: entriesErr } = await supabase
    .from("entries")
    .select("id, direction, entry_type, amount, reference_id")
    .in("id", entryIds);
  if (entriesErr) return NextResponse.json({ error: entriesErr.message }, { status: 500 });

  const entriesById = new Map<number, { id: number; direction: string; entry_type: string; amount: string | number; reference_id: number | null }>();
  for (const e of entries || []) entriesById.set(Number(e.id), e as never);

  for (const id of entryIds) {
    const e = entriesById.get(id);
    if (!e) return NextResponse.json({ error: `Entry #${id} not found` }, { status: 404 });
    if (e.direction !== "input") {
      return NextResponse.json({ error: `Entry #${id} is not an input entry` }, { status: 400 });
    }
    if (e.entry_type !== "sale") {
      return NextResponse.json(
        { error: `Entry #${id} type "${e.entry_type}" cannot receive a bank credit here` },
        { status: 400 }
      );
    }
    if (e.reference_id == null) {
      return NextResponse.json({ error: `Entry #${id} missing reference_id (sale id)` }, { status: 400 });
    }
  }

  const { data: existingPay, error: payErr } = await supabase
    .from("payments")
    .select("entry_id, amount")
    .in("entry_id", entryIds);
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });
  const paidByEntry = new Map<number, number>();
  for (const p of existingPay || []) {
    const eid = Number((p as { entry_id: number }).entry_id);
    const amt = parseFloat(String((p as { amount: string | number }).amount));
    paidByEntry.set(eid, (paidByEntry.get(eid) ?? 0) + amt);
  }
  for (const [eid, { amount }] of mergedAllocs) {
    const e = entriesById.get(eid)!;
    const entryAmount = parseFloat(String(e.amount));
    const paid = paidByEntry.get(eid) ?? 0;
    if (paid + amount > entryAmount + 0.02) {
      return NextResponse.json(
        {
          error: `Allocation on entry #${eid} exceeds remaining balance`,
          details: `Entry ${entryAmount.toFixed(2)}, already received ${paid.toFixed(2)}, attempted ${amount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }
  }

  let totalNew = 0;
  for (const [, { amount }] of mergedAllocs) totalNew += amount;
  const cap = await assertBankAllocationWithinCap(supabase, bankTxIdNum, totalNew);
  if (!cap.ok) return NextResponse.json({ error: cap.message }, { status: cap.status });

  const dateStr = body.paymentDate.split("T")[0] || body.paymentDate;
  const rowsToInsert: Array<Record<string, unknown>> = [];
  for (const [eid, { amount, notes }] of mergedAllocs) {
    rowsToInsert.push({
      entry_id: eid,
      payment_date: dateStr,
      amount,
      is_paid: true,
      paid_date: dateStr,
      payment_method: body.paymentMethod ?? null,
      notes: notes ?? null,
      bank_transaction_id: bankTxIdNum,
    });
  }
  const { data: insertedPayments, error: insErr } = await supabase
    .from("payments")
    .insert(rowsToInsert)
    .select("id, entry_id, amount, payment_date, bank_transaction_id");
  if (insErr || !insertedPayments) {
    return NextResponse.json(
      { error: "Failed to create payments", details: insErr?.message },
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
  const capAmt = Number(bankTx.amount);
  const fullyAllocated = Math.abs(allocated - capAmt) < 0.02;

  let updatedTx = bankTx;
  if (fullyAllocated) {
    const [lastEntryId] = Array.from(mergedAllocs.keys()).slice(-1);
    const pointerSaleId = lastEntryId != null ? Number(entriesById.get(lastEntryId)?.reference_id) : null;
    if (pointerSaleId != null && !Number.isNaN(pointerSaleId)) {
      const { data: patchTx, error: patchErr } = await supabase
        .from("bank_transactions")
        .update({
          reconciled_entity_type: "sale",
          reconciled_entity_id: pointerSaleId,
        })
        .eq("id", bankTxId)
        .select()
        .single();
      if (!patchErr && patchTx) updatedTx = patchTx;
    }
  }

  return NextResponse.json(
    {
      payments: (insertedPayments || []).map((p: { id: number; entry_id: number; amount: string | number; payment_date: string; bank_transaction_id: number | null }) => ({
        id: p.id,
        entryId: p.entry_id,
        amount: parseFloat(String(p.amount)),
        paymentDate: p.payment_date,
        bankTransactionId: p.bank_transaction_id ?? undefined,
      })),
      bankTransaction: {
        ...updatedTx,
        allocated_payments_total: Math.round(allocated * 100) / 100,
      },
      fullyAllocated,
    },
    { status: 201 }
  );
}
