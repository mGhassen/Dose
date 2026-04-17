import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sale, SaleLineItem } from "@kit/types";
import { StockMovementType, StockMovementReferenceType } from "@kit/types";
import { getItemStock } from "@/lib/stock/get-item-stock";
import { produceRecipe } from "@/lib/stock/produce-recipe";
import { getItemSellingPriceAsOf, getItemCostAsOf } from "@/lib/items/price-resolve";
import { upsertSellingPrice, upsertCost } from "@/lib/items/price-history-upsert";
import { getTaxRateAndRuleForSaleLineWithItemTaxes, getTaxRateAndRuleForExpenseLineWithItemTaxes } from "@/lib/item-taxes-resolve";
import { lineTaxAmount, netUnitPriceFromInclusive, unitPriceExclToIncl } from "@/lib/transaction-tax";
import type { CreateSaleTransactionInput, PaymentSliceInput } from "@/shared/zod-schemas";
import { paymentSlicesSumMatchesTotal, replacePaymentsForEntry } from "@/lib/ledger/replace-entry-payments";

function transformSale(row: Record<string, unknown>): Sale {
  const subtotal = row.subtotal != null ? parseFloat(String(row.subtotal)) : 0;
  const totalTax = row.total_tax != null ? parseFloat(String(row.total_tax)) : 0;
  const totalDiscount = row.total_discount != null ? parseFloat(String(row.total_discount)) : 0;
  const amount = Math.round((subtotal + totalTax - totalDiscount) * 100) / 100;
  return {
    id: row.id as number,
    date: row.date as string,
    type: row.type as Sale["type"],
    amount,
    description: row.description as string | undefined,
    subtotal: row.subtotal != null ? parseFloat(String(row.subtotal)) : undefined,
    totalTax: row.total_tax != null ? parseFloat(String(row.total_tax)) : undefined,
    totalDiscount: row.total_discount != null ? parseFloat(String(row.total_discount)) : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformLineItem(row: Record<string, unknown>): SaleLineItem {
  return {
    id: row.id as number,
    saleId: row.sale_id as number,
    parentSaleLineId: row.parent_sale_line_id != null ? (row.parent_sale_line_id as number) : undefined,
    itemId: row.item_id != null ? (row.item_id as number) : undefined,
    quantity: parseFloat(String(row.quantity)),
    unitId: row.unit_id != null ? (row.unit_id as number) : undefined,
    unitPrice: parseFloat(String(row.unit_price)),
    unitCost: row.unit_cost != null ? parseFloat(String(row.unit_cost)) : undefined,
    taxRatePercent: row.tax_rate_percent != null ? parseFloat(String(row.tax_rate_percent)) : undefined,
    taxAmount: row.tax_amount != null ? parseFloat(String(row.tax_amount)) : undefined,
    lineTotal: parseFloat(String(row.line_total)),
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export type ExecuteCreateSaleTransactionOptions = {
  /** Build payment rows after totals are known (e.g. link a bank transaction). */
  buildPaymentSlices?: (ctx: { total: number; dateStr: string }) => PaymentSliceInput[];
};

/**
 * Core path for POST /api/sales and bank-transaction → sale orchestration.
 * @throws Error with user-facing message on validation / payment failures
 */
export async function executeCreateSaleTransaction(
  supabase: SupabaseClient,
  body: CreateSaleTransactionInput,
  options?: ExecuteCreateSaleTransactionOptions
): Promise<Sale> {
  const dateStr = body.date.split("T")[0] || body.date;
  const lines: Array<{
    itemId?: number;
    quantity: number;
    unitId?: number;
    unitPrice: number;
    unitCost?: number;
    lineTotal: number;
    taxRatePercent: number;
    taxAmount: number;
    parentLineIndex?: number;
  }> = [];

  for (let i = 0; i < body.lineItems.length; i++) {
    const line = body.lineItems[i];
    let unitPrice = line.unitPrice;
    let unitCost = line.unitCost;
    let priceLookupItemId: number | null = null;
    let itemCategory: string | null = null;
    let itemCreatedAt: string | null = null;
    let resolvedPriceFromHistory: number | null = null;
    let resolvedTaxIncludedFromHistory: boolean | null = null;
    if (line.itemId && dateStr) {
      const { data: itemRow } = await supabase
        .from("items")
        .select("id, category, created_at")
        .eq("id", line.itemId)
        .single();
      if (itemRow) {
        priceLookupItemId = itemRow.id;
        itemCategory = itemRow.category ?? null;
        itemCreatedAt = itemRow.created_at ?? null;
      } else {
        const { data: produced } = await supabase
          .from("items")
          .select("id, category, created_at")
          .eq("produced_from_recipe_id", line.itemId)
          .single();
        if (produced) {
          priceLookupItemId = produced.id;
          itemCategory = produced.category ?? null;
          itemCreatedAt = produced.created_at ?? null;
        }
      }
      if (priceLookupItemId) {
        if (unitPrice == null) {
          const resolved = await getItemSellingPriceAsOf(supabase, priceLookupItemId, dateStr);
            if (resolved.unitPrice != null) {
                unitPrice = resolved.unitPrice;
                resolvedPriceFromHistory = resolved.unitPrice;
                resolvedTaxIncludedFromHistory = resolved.taxIncluded;
              }
        }
        if (unitCost == null) {
          const resolved = await getItemCostAsOf(supabase, priceLookupItemId, dateStr);
          if (resolved.unitCost != null) unitCost = resolved.unitCost;
        }
        if (unitCost != null) {
          const expenseTaxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(
            supabase,
            priceLookupItemId,
            itemCategory,
            dateStr,
            itemCreatedAt
          );
          await upsertCost(
            supabase,
            priceLookupItemId,
            dateStr,
            unitCost,
            expenseTaxRule.taxInclusive === true
          );
        }
      }
    }
    const taxRule = await getTaxRateAndRuleForSaleLineWithItemTaxes(
      supabase,
      priceLookupItemId ?? line.itemId ?? null,
      itemCategory,
      body.type,
      dateStr,
      itemCreatedAt
    );
    const lineTaxRate = line.taxRatePercent != null ? line.taxRatePercent : taxRule.rate;
    const taxInclusive = taxRule.taxInclusive ?? false;
    let netUnit = unitPrice ?? 0;
    if (resolvedPriceFromHistory != null && resolvedTaxIncludedFromHistory === true && lineTaxRate > 0) {
      netUnit = netUnitPriceFromInclusive(resolvedPriceFromHistory, lineTaxRate);
    }
    const qty = typeof line.quantity === "number" ? line.quantity : parseFloat(String(line.quantity));
    const { lineTotalNet, taxAmount } = lineTaxAmount(qty, netUnit, lineTaxRate, taxInclusive);
    const lineTotal = lineTotalNet;
    const priceToSave =
      priceLookupItemId != null && netUnit != null && netUnit > 0
        ? taxInclusive && lineTaxRate > 0
          ? unitPriceExclToIncl(netUnit, lineTaxRate)
          : netUnit
        : null;
    if (priceLookupItemId != null && priceToSave != null) {
      await upsertSellingPrice(supabase, priceLookupItemId, dateStr, priceToSave, taxInclusive);
    }
    lines.push({
      itemId: line.itemId,
      quantity: qty,
      unitId: line.unitId,
      unitPrice: netUnit,
      unitCost,
      lineTotal,
      taxRatePercent: lineTaxRate,
      taxAmount,
      parentLineIndex: line.parentLineIndex,
    });
  }

  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const totalTax = Math.round(lines.reduce((s, l) => s + l.taxAmount, 0) * 100) / 100;
  let discountAmount = 0;
  if (body.discount?.value != null && body.discount.value > 0) {
    if (body.discount.type === "percent") {
      discountAmount = Math.round(subtotal * (body.discount.value / 100) * 100) / 100;
    } else {
      discountAmount = Math.round(body.discount.value * 100) / 100;
    }
  }
  const total = Math.round((subtotal + totalTax - discountAmount) * 100) / 100;

  const paySlicesFromBody = body.paymentSlices;
  const toPersist: PaymentSliceInput[] = options?.buildPaymentSlices
    ? options.buildPaymentSlices({ total, dateStr })
    : paySlicesFromBody != null && paySlicesFromBody.length > 0
      ? paySlicesFromBody
      : [{ amount: total, paymentDate: body.date }];

  if (!paymentSlicesSumMatchesTotal(toPersist, total)) {
    throw new Error("Payment slices must sum to sale total");
  }

  const { data: saleRow, error: saleError } = await supabase
    .from("sales")
    .insert({
      date: body.date,
      type: body.type,
      subtotal,
      total_tax: totalTax,
      total_discount: discountAmount,
      description: body.description ?? null,
    })
    .select()
    .single();
  if (saleError) throw saleError;

  const insertedLineIds: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const pIdx = l.parentLineIndex;
    const parentSaleLineId =
      pIdx != null && pIdx >= 0 && pIdx < insertedLineIds.length ? insertedLineIds[pIdx] ?? null : null;
    const { data: insRow, error: insErr } = await supabase
      .from("sale_line_items")
      .insert({
        sale_id: saleRow.id,
        item_id: l.itemId ?? null,
        quantity: l.quantity,
        unit_id: l.unitId ?? null,
        unit_price: l.unitPrice,
        unit_cost: l.unitCost ?? null,
        tax_rate_percent: l.taxRatePercent,
        tax_amount: l.taxAmount,
        line_total: l.lineTotal,
        parent_sale_line_id: parentSaleLineId,
        sort_order: i,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    insertedLineIds[i] = insRow.id as number;
  }

  const { data: saleEntry, error: saleEntryErr } = await supabase
    .from("entries")
    .insert({
      direction: "input",
      entry_type: "sale",
      name: body.description || `Sale - ${body.type}`,
      amount: total,
      description: body.description,
      entry_date: dateStr,
      reference_id: saleRow.id,
      is_active: true,
    })
    .select("id")
    .single();
  if (saleEntryErr) console.error("Error creating entry for sale:", saleEntryErr);
  else if (saleEntry?.id) {
    const { error: payErr } = await replacePaymentsForEntry(supabase, saleEntry.id, toPersist);
    if (payErr) {
      console.error("Error creating payments for sale entry:", payErr);
      await supabase.from("payments").delete().eq("entry_id", saleEntry.id);
      await supabase.from("entries").delete().eq("id", saleEntry.id);
      await supabase.from("sales").delete().eq("id", saleRow.id);
      throw new Error(payErr);
    }
  }

  for (const l of lines) {
    if (!l.itemId || l.quantity <= 0) continue;
    const [itemResult, recipeResult] = await Promise.all([
      supabase.from("items").select("id, unit, produced_from_recipe_id").eq("id", l.itemId).single(),
      supabase.from("recipes").select("id, unit").eq("id", l.itemId).single(),
    ]);
    if (itemResult.data) {
      const targetItemId = itemResult.data.id;
      const unit = itemResult.data.unit || "unit";
      const { error: outError } = await supabase.from("stock_movements").insert({
        item_id: targetItemId,
        movement_type: StockMovementType.OUT,
        quantity: l.quantity,
        unit,
        reference_type: StockMovementReferenceType.SALE,
        reference_id: saleRow.id,
        movement_date: body.date,
        notes: `Sale #${saleRow.id}`,
      });
      if (outError) console.error("Stock movement error:", outError);
    } else if (recipeResult.data) {
      const { data: producedItem } = await supabase
        .from("items")
        .select("id, unit")
        .eq("produced_from_recipe_id", l.itemId)
        .single();
      let producedItemId: number;
      let producedItemUnit: string;
      if (!producedItem) {
        const result = await produceRecipe(supabase, String(l.itemId), {
          quantity: l.quantity,
          location: null,
          notes: `Sale #${saleRow.id}`,
        });
        producedItemId = result.producedItemId;
        producedItemUnit = recipeResult.data.unit || "unit";
      } else {
        producedItemId = producedItem.id;
        producedItemUnit = producedItem.unit || "unit";
        const stock = await getItemStock(supabase, producedItem.id, null);
        if (stock < l.quantity) {
          await produceRecipe(supabase, String(l.itemId), {
            quantity: l.quantity - stock,
            location: null,
            notes: `Sale #${saleRow.id}`,
          });
        }
      }
      await supabase.from("stock_movements").insert({
        item_id: producedItemId,
        movement_type: StockMovementType.OUT,
        quantity: l.quantity,
        unit: producedItemUnit,
        reference_type: StockMovementReferenceType.SALE,
        reference_id: saleRow.id,
        movement_date: body.date,
        notes: `Sale #${saleRow.id}`,
      });
    }
  }

  const { data: lineItemsData } = await supabase
    .from("sale_line_items")
    .select("*")
    .eq("sale_id", saleRow.id)
    .order("sort_order");
  const sale = transformSale(saleRow as Record<string, unknown>);
  sale.lineItems = (lineItemsData || []).map((row) => transformLineItem(row as Record<string, unknown>));
  return sale;
}
