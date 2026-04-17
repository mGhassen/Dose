import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@kit/lib/supabase";
import { StockMovementReferenceType } from "@kit/types";
import { parseBody, bankTransactionCreateSaleBodySchema } from "@/shared/zod-schemas";
import type { BankTransactionCreateSaleBody } from "@/shared/zod-schemas";
import { executeCreateSaleTransaction } from "@/lib/sales/execute-create-sale-transaction";

async function rollbackCreatedSale(supabase: SupabaseClient, saleId: number) {
  const { data: entries } = await supabase
    .from("entries")
    .select("id")
    .eq("reference_id", saleId)
    .eq("entry_type", "sale");
  for (const e of entries ?? []) {
    await supabase.from("payments").delete().eq("entry_id", e.id);
    await supabase.from("entries").delete().eq("id", e.id);
  }
  await supabase
    .from("stock_movements")
    .delete()
    .eq("reference_type", StockMovementReferenceType.SALE)
    .eq("reference_id", saleId);
  await supabase.from("sales").delete().eq("id", saleId);
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

    const parsed = parseBody(raw, bankTransactionCreateSaleBodySchema);
    if (!parsed.success) return parsed.response;
    const body: BankTransactionCreateSaleBody = parsed.data;

    const supabase = supabaseServer();
    const { data: bankTx, error: txErr } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("id", bankTxId)
      .single();

    if (txErr || !bankTx) {
      return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
    }

    const bankAmount = Number(bankTx.amount);
    if (bankAmount <= 0) {
      return NextResponse.json(
        { error: "Only credit transactions (positive amount) can create a sale (input)" },
        { status: 400 }
      );
    }

    if (bankTx.reconciled_entity_type && bankTx.reconciled_entity_id != null) {
      return NextResponse.json(
        { error: "Bank transaction is already reconciled; clear reconciliation first" },
        { status: 409 }
      );
    }

    const bankTxIdNum = Number(bankTxId);
    const { data: existingSlices } = await supabase
      .from("payments")
      .select("amount")
      .eq("bank_transaction_id", bankTxIdNum);
    let allocatedPrior = 0;
    for (const r of existingSlices || []) {
      allocatedPrior += parseFloat(String((r as { amount: string | number }).amount));
    }
    if (allocatedPrior > 0.02) {
      return NextResponse.json(
        {
          error:
            "This bank line already has payment allocations; remove them or finish linking before creating a new sale",
        },
        { status: 409 }
      );
    }

    const dateStr = body.date.split("T")[0] || body.date;

    let saleId: number | null = null;
    try {
      const sale = await executeCreateSaleTransaction(supabase, body, {
        buildPaymentSlices: ({ total }) => {
          if (Math.abs(total - bankAmount) > 0.02) {
            throw new Error(
              `Sale total (${total}) must match bank transaction amount (${bankAmount.toFixed(2)})`
            );
          }
          return [
            {
              amount: total,
              paymentDate: dateStr,
              bankTransactionId: bankTxIdNum,
            },
          ];
        },
      });
      saleId = sale.id;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create sale";
      const isMatch = msg.includes("must match bank transaction") || msg.includes("Payment slices");
      return NextResponse.json({ error: msg }, { status: isMatch ? 400 : 500 });
    }

    const { data: updatedTx, error: patchErr } = await supabase
      .from("bank_transactions")
      .update({
        reconciled_entity_type: "sale",
        reconciled_entity_id: saleId,
      })
      .eq("id", bankTxId)
      .select()
      .single();

    if (patchErr || !updatedTx) {
      if (saleId != null) await rollbackCreatedSale(supabase, saleId);
      return NextResponse.json(
        { error: "Sale created but reconciliation failed", details: patchErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        bankTransaction: updatedTx,
        saleId,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create sale from bank transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
