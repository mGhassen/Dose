/**
 * csv_bulk: staged sync_pennylane_data rows (data_type bulk_row) → domain tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeItemKinds } from "@kit/types";
import {
  createExpenseSchema,
  createItemSchema,
  createLoanSchema,
  createPersonnelSchema,
  createRecipeSchema,
  createSaleTransactionSchema,
  createStockMovementSchema,
  createSubscriptionSchema,
  createSupplierOrderSchema,
  createSupplierSchema,
  createLeasingSchema,
  type CreateRecipeInput,
} from "@/shared/zod-schemas";
import { executeCreateSaleTransaction } from "@/lib/sales/execute-create-sale-transaction";
import { lineTaxAmount } from "@/lib/transaction-tax";
import { applyTaxRulesToItem } from "@/lib/item-taxes-resolve";
import {
  producedIdsFromCreateBody,
  validateProducedOutputItems,
  insertRecipeProducedLinks,
} from "@/lib/recipes/produced-item-output-links";
import { replacePaymentsForEntry } from "@/lib/ledger/replace-entry-payments";
import { expenseCategoryNameIsActive } from "@/lib/metadata-expense-category";
import type { BulkImportEntity } from "@/lib/bulk-import/constants";
import { applyBulkReviewToRow, normalizeBulkReviewPayload } from "@/lib/bulk-import/apply-review-payload";
import {
  loadItemCatalogLookups,
  resolveItemPayloadWithCatalog,
} from "@/lib/bulk-import/resolve-item-catalog-ids";
import { parseString, parseNumber, parseIntMaybe, parseBool } from "@/lib/bulk-import/normalize";

type StagingRow = { data_type: string; source_id: string; payload: Record<string, unknown> };

async function recordImportError(
  supabase: SupabaseClient,
  jobId: number,
  dataType: string,
  sourceId: string,
  errorMessage: string
): Promise<void> {
  await supabase.from("sync_import_errors").insert({
    job_id: jobId,
    data_type: dataType,
    source_id: sourceId,
    error_message: errorMessage,
  });
}

async function ensureLoanPaymentExpense(
  supabase: SupabaseClient,
  entryId: number,
  _paymentDate: string
): Promise<void> {
  try {
    const { data: entry } = await supabase
      .from("entries")
      .select("id, entry_type, reference_id, schedule_entry_id, name, description")
      .eq("id", entryId)
      .single();

    if (!entry || entry.entry_type !== "loan_payment") return;
    const loanId = entry.reference_id;
    const scheduleId = entry.schedule_entry_id;
    if (loanId == null || scheduleId == null) return;

    const { data: schedule } = await supabase
      .from("loan_schedules")
      .select("id, month, payment_date, total_payment")
      .eq("id", scheduleId)
      .single();
    if (!schedule) return;

    const expenseDate = schedule.payment_date;

    const { data: existing } = await supabase
      .from("expenses")
      .select("id")
      .eq("loan_id", loanId)
      .eq("expense_type", "loan")
      .eq("expense_date", expenseDate)
      .maybeSingle();
    if (existing) return;

    const { data: loan } = await supabase.from("loans").select("name").eq("id", loanId).single();

    const amount = parseFloat(String(schedule.total_payment));
    await supabase.from("expenses").insert({
      name: `${loan?.name ?? "Loan"} - Payment Month ${schedule.month}`,
      category: "loan_repayment",
      expense_type: "loan",
      amount,
      subtotal: amount,
      total_tax: 0,
      total_discount: 0,
      loan_id: loanId,
      expense_date: expenseDate,
      start_date: expenseDate,
      description: entry.description ?? null,
      is_active: true,
    });
  } catch (err) {
    console.error("Failed to ensure loan payment expense:", err);
  }
}

function transformRecipeInsert(data: CreateRecipeInput): Record<string, unknown> {
  const producedIds = producedIdsFromCreateBody({
    producedItemId: data.producedItemId,
    producedItemIds: data.producedItemIds ?? undefined,
  });
  const outputQuantity = data.outputQuantity ?? data.servingSize;
  const row: Record<string, unknown> = {
    name: data.name,
    description: data.description,
    unit: data.unit || "unit",
    category: data.category,
    item_type: "recipe",
    output_quantity: outputQuantity,
    serving_size: outputQuantity,
    preparation_time: data.preparationTime,
    cooking_time: data.cookingTime,
    instructions: data.instructions,
    notes: data.notes,
    is_active: data.isActive ?? true,
  };
  if (data.unitId != null) row.unit_id = data.unitId;
  row.produced_item_id = producedIds.length === 1 ? producedIds[0] : null;
  return row;
}

function convertPersonnelToSnake(data: import("@/shared/zod-schemas").CreatePersonnelInput): Record<string, unknown> {
  const freq = data.salaryFrequency;
  let storedRate = data.baseSalary;
  switch (freq) {
    case "yearly":
      storedRate = data.baseSalary / 12;
      break;
    case "weekly":
      storedRate = (data.baseSalary * 52) / 12;
      break;
    case "hourly":
    case "monthly":
    default:
      storedRate = data.baseSalary;
  }
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    position: data.position,
    type: data.type,
    base_salary: storedRate,
    salary_frequency: data.salaryFrequency,
    employer_charges: data.employerCharges,
    employer_charges_type: data.employerChargesType,
    start_date: data.startDate,
    end_date: data.endDate,
    is_active: data.isActive ?? true,
    notes: data.notes,
  };
}

export async function processBulkImportJob(
  supabase: SupabaseClient,
  job: { id: number; integration_id: number; sync_type: string; bulk_review_payload?: unknown },
  integration: { id: number; account_id: string },
  stagingRows: StagingRow[]
): Promise<{ status: "completed" | "failed"; error_message?: string; stats: Record<string, number> }> {
  const entity = job.sync_type as BulkImportEntity;
  const jobId = job.id;
  const rows = stagingRows.filter(
    (r) => r.data_type === "bulk_row" || r.data_type === "bulk_semantic_row"
  );

  const review = normalizeBulkReviewPayload(job.bulk_review_payload);

  const itemCatalogLookups =
    entity === "items" ? await loadItemCatalogLookups(supabase) : null;

  const stats: Record<string, number> = {
    imported: 0,
    failed: 0,
  };

  for (const row of rows) {
    const sourceId = row.source_id || "unknown";
    try {
      let p = applyBulkReviewToRow(
        entity,
        sourceId,
        (row.payload || {}) as Record<string, unknown>,
        review
      );
      if (entity === "items" && itemCatalogLookups) {
        p = resolveItemPayloadWithCatalog(p, itemCatalogLookups);
      }
      switch (entity) {
        case "suppliers": {
          const supplierTypeRaw = parseString((p as { supplierType?: unknown }).supplierType);
          const supplierType = supplierTypeRaw
            ? supplierTypeRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined;
          const parsed = createSupplierSchema.safeParse({
            name: parseString(p.name),
            email: parseString(p.email),
            phone: parseString(p.phone),
            address: parseString(p.address),
            contactPerson: parseString((p as { contactPerson?: unknown }).contactPerson),
            paymentTerms: parseString((p as { paymentTerms?: unknown }).paymentTerms),
            notes: parseString(p.notes),
            supplierType,
            isActive: parseBool((p as { isActive?: unknown }).isActive) ?? true,
          });
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier");
          const body = parsed.data;
          const { error } = await supabase.from("suppliers").insert({
            name: body.name,
            email: body.email ?? null,
            phone: body.phone ?? null,
            address: body.address ?? null,
            contact_person: body.contactPerson ?? null,
            payment_terms: body.paymentTerms ?? null,
            notes: body.notes ?? null,
            supplier_type: body.supplierType ?? ["supplier"],
            is_active: body.isActive ?? true,
          });
          if (error) throw new Error(error.message);
          break;
        }
        case "items": {
          const typesStr = parseString((p as { itemTypes?: unknown }).itemTypes);
          const kinds = typesStr
            ? typesStr
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : ["item"];
          const parsed = createItemSchema.safeParse({
            name: parseString(p.name),
            description: parseString(p.description),
            unitId: parseIntMaybe(p.unitId),
            categoryId: parseIntMaybe(p.categoryId),
            sku: parseString(p.sku),
            unitPrice: parseNumber(p.unitPrice),
            unitCost: parseNumber(p.unitCost),
            vendorId: parseIntMaybe(p.vendorId),
            notes: parseString(p.notes),
            isActive: parseBool(p.isActive) ?? true,
            affectsStock: parseBool((p as { affectsStock?: unknown }).affectsStock),
            itemTypes: normalizeItemKinds(kinds as ("item" | "product" | "modifier" | "ingredient")[]),
          });
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid item");
          const body = parsed.data;
          const insertRow: Record<string, unknown> = {
            name: body.name,
            description: body.description,
            item_types: normalizeItemKinds(body.itemTypes ?? ["item"]),
            sku: body.sku,
            vendor_id: body.vendorId,
            notes: body.notes,
            is_active: body.isActive ?? true,
          };
          if (body.categoryId !== undefined) insertRow.category_id = body.categoryId;
          if (body.unitId != null) insertRow.unit_id = body.unitId;
          if (body.affectsStock !== undefined) insertRow.affects_stock = body.affectsStock;

          const { data: itemData, error } = await supabase.from("items").insert(insertRow).select("id").single();
          if (error) throw new Error(error.message);
          if (itemData?.id != null) {
            try {
              await applyTaxRulesToItem(supabase as any, itemData.id, null);
            } catch (taxErr) {
              console.error("bulk import item tax rules:", taxErr);
            }
          }
          break;
        }
        case "recipe": {
          const parsed = createRecipeSchema.safeParse({
            ...p,
            items: Array.isArray((p as { items?: unknown }).items) ? (p as { items: unknown[] }).items : undefined,
          });
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid recipe");
          const body = { ...parsed.data, producedItemIds: parsed.data.producedItemIds ?? undefined };
          const { data: recipeData, error: recipeError } = await supabase
            .from("recipes")
            .insert(transformRecipeInsert(body))
            .select()
            .single();
          if (recipeError) throw new Error(recipeError.message);
          if (body.items && body.items.length > 0) {
            const recipeItems = body.items.map((item) => ({
              recipe_id: recipeData.id,
              item_id: item.itemId,
              quantity: item.quantity,
              unit: item.unit,
              unit_id: item.unitId,
              notes: item.notes,
            }));
            const { error: itemsError } = await supabase.from("recipe_items").insert(recipeItems);
            if (itemsError) {
              await supabase.from("recipes").delete().eq("id", recipeData.id);
              throw new Error(itemsError.message);
            }
          }
          const producedIds = producedIdsFromCreateBody({
            producedItemId: body.producedItemId,
            producedItemIds: body.producedItemIds ?? undefined,
          });
          if (producedIds.length > 0) {
            const v = await validateProducedOutputItems(supabase, producedIds, Number(recipeData.id));
            if (!v.ok) {
              await supabase.from("recipes").delete().eq("id", recipeData.id);
              throw new Error(v.message);
            }
            const linkErr = await insertRecipeProducedLinks(supabase, Number(recipeData.id), producedIds);
            if (linkErr.error) {
              await supabase.from("recipes").delete().eq("id", recipeData.id);
              throw new Error(linkErr.error);
            }
          }
          break;
        }
        case "supplier_orders": {
          const parsed = createSupplierOrderSchema.safeParse(p);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier order");
          const body = parsed.data;
          const totalAmount = body.items.reduce((sum, item) => {
            const rate = item.taxRatePercent ?? 0;
            const inclusive = item.taxInclusive ?? false;
            const { lineTotalNet, taxAmount } = lineTaxAmount(item.quantity, item.unitPrice, rate, inclusive);
            return sum + lineTotalNet + taxAmount;
          }, 0);
          const { data: orderData, error: orderError } = await supabase
            .from("supplier_orders")
            .insert({
              supplier_id: body.supplierId,
              order_number: body.orderNumber ?? null,
              order_date: body.orderDate ?? new Date().toISOString().slice(0, 10),
              expected_delivery_date: body.expectedDeliveryDate ?? null,
              status: body.status || "pending",
              notes: body.notes ?? null,
              total_amount: totalAmount,
            })
            .select()
            .single();
          if (orderError) throw new Error(orderError.message);
          const orderItems = body.items.map((item) => {
            const rate = item.taxRatePercent ?? 0;
            const inclusive = item.taxInclusive ?? false;
            const { lineTotalNet, taxAmount } = lineTaxAmount(item.quantity, item.unitPrice, rate, inclusive);
            return {
              order_id: orderData.id,
              item_id: item.itemId,
              quantity: item.quantity,
              unit: item.unit,
              unit_id: item.unitId ?? null,
              unit_price: item.unitPrice,
              total_price: lineTotalNet,
              tax_rate_percent: rate || null,
              tax_amount: taxAmount || null,
              notes: item.notes ?? null,
            };
          });
          const { error: itemsError } = await supabase.from("supplier_order_items").insert(orderItems);
          if (itemsError) {
            await supabase.from("supplier_orders").delete().eq("id", orderData.id);
            throw new Error(itemsError.message);
          }
          break;
        }
        case "sales": {
          const parsed = createSaleTransactionSchema.safeParse({
            ...p,
            lineItems: Array.isArray((p as { lineItems?: unknown }).lineItems)
              ? (p as { lineItems: unknown[] }).lineItems
              : [],
          });
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid sale");
          await executeCreateSaleTransaction(supabase, parsed.data);
          break;
        }
        case "expenses": {
          const parsed = createExpenseSchema.safeParse(p);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid expense");
          const body = parsed.data;
          if (!(await expenseCategoryNameIsActive(supabase, body.category))) {
            throw new Error("Invalid expense category (not in active ExpenseCategory metadata)");
          }
          const { data, error } = await supabase
            .from("expenses")
            .insert({
              name: body.name,
              category: body.category,
              amount: body.amount,
              expense_type: body.expenseType ?? "expense",
              expense_date: body.expenseDate,
              description: body.description ?? null,
              vendor: body.vendor ?? null,
              supplier_id: body.supplierId ?? null,
              start_date: body.expenseDate,
              is_active: true,
            })
            .select()
            .single();
          if (error) throw new Error(error.message);
          const { data: legacyEntry, error: entryError } = await supabase
            .from("entries")
            .insert({
              direction: "output",
              entry_type: "expense",
              name: body.name,
              amount: body.amount,
              description: body.description,
              category: body.category,
              vendor: body.vendor,
              supplier_id: body.supplierId || null,
              entry_date: body.expenseDate,
              reference_id: data.id,
              is_active: true,
            })
            .select("id")
            .single();
          if (!entryError && legacyEntry?.id) {
            await replacePaymentsForEntry(supabase, legacyEntry.id, [{ amount: body.amount, paymentDate: body.expenseDate }]);
          }
          break;
        }
        case "subscriptions": {
          const parsed = createSubscriptionSchema.safeParse(p);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid subscription");
          const body = parsed.data;
          if (!(await expenseCategoryNameIsActive(supabase, body.category))) {
            throw new Error("Invalid subscription category (not in active ExpenseCategory metadata)");
          }
          const { data: itemRow, error: itemError } = await supabase
            .from("items")
            .insert({
              name: body.name,
              description: body.description ?? null,
              item_types: ["item"],
              is_active: body.isActive ?? true,
            })
            .select("id")
            .single();
          if (itemError) throw new Error(itemError.message);
          const { error } = await supabase.from("subscriptions").insert({
            name: body.name,
            category: body.category,
            amount: body.amount,
            recurrence: body.recurrence,
            start_date: body.startDate,
            end_date: body.endDate ?? null,
            description: body.description ?? null,
            vendor: body.vendor ?? null,
            supplier_id: body.supplierId ?? null,
            default_tax_rate_percent: body.defaultTaxRatePercent ?? null,
            is_active: body.isActive ?? true,
            item_id: itemRow.id,
          });
          if (error) {
            await supabase.from("items").delete().eq("id", itemRow.id);
            throw new Error(error.message);
          }
          break;
        }
        case "loans": {
          const parsed = createLoanSchema.safeParse(p);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid loan");
          const body = parsed.data;
          const loanData: Record<string, unknown> = {
            name: body.name,
            loan_number: body.loanNumber,
            principal_amount: body.principalAmount,
            interest_rate: body.interestRate,
            duration_months: body.durationMonths,
            start_date: body.startDate,
            status: body.status || "active",
            lender: body.lender ?? null,
            supplier_id: body.supplierId ?? null,
            description: body.description ?? null,
            off_payment_months: body.offPaymentMonths?.length ? body.offPaymentMonths : [],
          };
          const { error } = await supabase.from("loans").insert(loanData);
          if (error) throw new Error(error.message);
          break;
        }
        case "loan_payments": {
          const loanId = parseIntMaybe((p as { loanId?: unknown }).loanId) ?? parseIntMaybe((p as { loan_id?: unknown }).loan_id);
          const scheduleEntryId =
            parseIntMaybe((p as { scheduleEntryId?: unknown }).scheduleEntryId) ??
            parseIntMaybe((p as { schedule_entry_id?: unknown }).schedule_entry_id);
          const paymentDate = parseString((p as { paymentDate?: unknown }).paymentDate) ?? parseString((p as { payment_date?: unknown }).payment_date);
          const amount = parseNumber((p as { amount?: unknown }).amount);
          const notes = parseString((p as { notes?: unknown }).notes);
          if (loanId == null || scheduleEntryId == null || !paymentDate || amount == null) {
            throw new Error("loan_id, schedule_entry_id, payment_date, amount are required");
          }
          const { data: sched, error: se } = await supabase
            .from("loan_schedules")
            .select("id, loan_id, month, payment_date, total_payment, principal_payment, interest_payment")
            .eq("id", scheduleEntryId)
            .eq("loan_id", loanId)
            .single();
          if (se || !sched) throw new Error("Schedule row not found for loan");

          let entryId: number | null = null;
          const { data: existingEntry } = await supabase
            .from("entries")
            .select("id")
            .eq("entry_type", "loan_payment")
            .eq("reference_id", loanId)
            .eq("schedule_entry_id", scheduleEntryId)
            .maybeSingle();
          if (existingEntry?.id) entryId = existingEntry.id;
          else {
            const { data: loan } = await supabase.from("loans").select("name").eq("id", loanId).single();
            const { data: ins, error: entErr } = await supabase
              .from("entries")
              .insert({
                direction: "output",
                entry_type: "loan_payment",
                name: `Loan Payment - Month ${sched.month}`,
                amount: parseFloat(String(sched.total_payment)),
                description: `Principal: ${sched.principal_payment}, Interest: ${sched.interest_payment}`,
                entry_date: sched.payment_date,
                due_date: sched.payment_date,
                reference_id: loanId,
                schedule_entry_id: scheduleEntryId,
                is_active: true,
              })
              .select("id")
              .single();
            if (entErr) throw new Error(entErr.message);
            entryId = ins!.id;
          }
          const { error: payErr } = await supabase.from("payments").insert({
            entry_id: entryId,
            payment_date: paymentDate,
            amount,
            is_paid: true,
            paid_date: paymentDate,
            notes: notes ?? null,
          });
          if (payErr) throw new Error(payErr.message);
          await ensureLoanPaymentExpense(supabase, entryId!, paymentDate);
          break;
        }
        case "personnel": {
          const parsed = createPersonnelSchema.safeParse(p);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid personnel");
          const { error } = await supabase.from("personnel").insert(convertPersonnelToSnake(parsed.data));
          if (error) throw new Error(error.message);
          break;
        }
        case "leasing": {
          const parsed = createLeasingSchema.safeParse(p);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid leasing");
          const body = parsed.data;
          const insertRow: Record<string, unknown> = {
            name: body.name,
            type: body.type,
            amount: body.amount,
            start_date: body.startDate,
            end_date: body.endDate,
            frequency: body.frequency,
            description: body.description ?? null,
            lessor: body.lessor ?? null,
            supplier_id: body.supplierId ?? null,
            is_active: body.isActive ?? true,
            off_payment_months: body.offPaymentMonths?.length ? body.offPaymentMonths : [],
          };
          if (body.firstPaymentAmount !== undefined) insertRow.first_payment_amount = body.firstPaymentAmount;
          if (body.totalAmount !== undefined) insertRow.total_amount = body.totalAmount;
          const { data: lp, error } = await supabase.from("leasing_payments").insert(insertRow).select("id").single();
          if (error) throw new Error(error.message);
          await supabase.from("entries").insert({
            direction: "output",
            entry_type: "leasing",
            name: body.name,
            amount: body.amount ?? body.totalAmount ?? 0,
            description: body.description,
            entry_date: body.startDate,
            reference_id: lp.id,
            is_active: body.isActive ?? true,
          });
          break;
        }
        case "stock_movements": {
          const parsed = createStockMovementSchema.safeParse(p);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid stock movement");
          const body = parsed.data;
          const row: Record<string, unknown> = {
            item_id: body.itemId,
            movement_type: body.movementType,
            quantity: body.quantity,
            unit: body.unit,
            reference_type: body.referenceType ?? null,
            reference_id: body.referenceId ?? null,
            location: body.location ?? null,
            notes: body.notes ?? null,
            movement_date: body.movementDate || new Date().toISOString(),
          };
          if (body.unitId != null) row.unit_id = body.unitId;
          const { error } = await supabase.from("stock_movements").insert(row);
          if (error) throw new Error(error.message);
          break;
        }
        default:
          throw new Error(`Unsupported entity: ${entity}`);
      }
      stats.imported += 1;
    } catch (e: any) {
      stats.failed += 1;
      await recordImportError(supabase, jobId, entity, sourceId, e?.message || String(e));
    }
  }

  return {
    status: "completed",
    stats,
  };
}
