"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { AddVendorDialog } from "@/components/add-vendor-dialog";
import { CategorySelector } from "@/components/category-selector";
import { UnifiedSelector } from "@/components/unified-selector";
import { InputGroupAttached } from "@/components/input-group";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { useCreateExpense, useInventorySuppliers, useItems, useUnits } from "@kit/hooks";
import { toast } from "sonner";
import type { CreateExpenseData, ExpenseCategory, ExpenseLineItemInput } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export interface ExpenseCreateContentProps {
  onClose: () => void;
  onCreated?: (expenseId: number) => void;
}

import { lineTaxAmount, to2Decimals } from "@/lib/transaction-tax";
import { taxRulesApi } from "@kit/lib";
import { createExpenseTransactionSchema } from "@/shared/zod-schemas";
import {
  DocumentPaymentSlicesEditor,
  defaultPaymentSliceRows,
  rowsToPaymentSlices,
  type DocumentPaymentSliceRow,
} from "@/components/document-payment-slices-editor";
import { paymentSlicesSumMatchesTotal } from "@/lib/ledger/replace-entry-payments";

export function ExpenseCreateContent({ onClose, onCreated }: ExpenseCreateContentProps) {
  const router = useRouter();
  const createExpense = useCreateExpense();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: "vendor" });
  const suppliers = suppliersResponse?.data || [];
  const { data: itemsResponse } = useItems({ limit: 2500 });
  const items = itemsResponse?.data ?? [];
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "" as ExpenseCategory | "",
    expenseDate: dateToYYYYMMDD(new Date()),
    description: "",
    supplierId: "",
    discountType: "amount" as "amount" | "percent",
    discountValue: "",
  });

  const [lineItems, setLineItems] = useState<
    Array<{ itemId: string; quantity: string; unitId: number | null; unitPrice: string; unitCost: string; taxRatePercent: string; taxInclusive: boolean }>
  >([{ itemId: "", quantity: "1", unitId: null, unitPrice: "", unitCost: "", taxRatePercent: "", taxInclusive: false }]);

  const [paymentRows, setPaymentRows] = useState<DocumentPaymentSliceRow[]>(() =>
    defaultPaymentSliceRows(0, dateToYYYYMMDD(new Date()))
  );

  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [defaultTaxInclusive, setDefaultTaxInclusive] = useState(false);
  useEffect(() => {
    if (!formData.expenseDate) {
      setDefaultTaxRate(0);
      setDefaultTaxInclusive(false);
      return;
    }
    taxRulesApi
      .resolve({ context: 'expense', date: formData.expenseDate, itemCategory: formData.category || undefined })
      .then((r) => {
        setDefaultTaxRate(r.rate);
        setDefaultTaxInclusive(r.taxInclusive ?? false);
      })
      .catch(() => {
        setDefaultTaxRate(0);
        setDefaultTaxInclusive(false);
      });
  }, [formData.expenseDate, formData.category]);

  const hasAnyItem = lineItems.some((l) => l.itemId !== "");
  const { subtotal, totalTax, discountAmount, total } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    for (const line of lineItems) {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unitPrice) || 0;
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : defaultTaxRate;
      const inclusive = line.itemId ? (line.taxInclusive ?? false) : defaultTaxInclusive;
      const { lineTotalNet, taxAmount } = lineTaxAmount(q, p, lineRate, inclusive);
      sub += lineTotalNet;
      tax += taxAmount;
    }
    sub = to2Decimals(sub);
    tax = to2Decimals(tax);
    let disc = 0;
    if (formData.discountValue) {
      const v = parseFloat(formData.discountValue) || 0;
      if (formData.discountType === "percent") disc = to2Decimals(sub * (v / 100));
      else disc = to2Decimals(v);
    }
    const tot = to2Decimals(sub + tax - disc);
    return { subtotal: sub, totalTax: tax, discountAmount: disc, total: tot };
  }, [lineItems, defaultTaxRate, defaultTaxInclusive, formData.discountType, formData.discountValue]);

  const addLine = () => {
    setLineItems((prev) => [...prev, { itemId: "", quantity: "1", unitId: null, unitPrice: "", unitCost: "", taxRatePercent: "", taxInclusive: false }]);
  };

  const removeLine = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: string | number | boolean | null) => {
    setLineItems((prev) => {
      const next = [...prev];
      const line = { ...next[index], [field]: value };
      next[index] = line;
      return next;
    });
  };

  const handleItemSelect = (index: number, itemId: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      const line = { ...next[index] };
      line.itemId = itemId;
      if (!itemId) {
        line.quantity = "1";
        line.unitId = null;
        line.unitPrice = "";
        line.taxRatePercent = "";
      } else {
        const item = items.find((i: { id: number }) => i.id === parseInt(itemId, 10)) as { unitId?: number; category?: string; unitCost?: number; unit_cost?: number; defaultTaxRatePercent?: number } | undefined;
        line.quantity = "1";
        line.unitId = item?.unitId ?? null;
        line.unitPrice = "";
        line.unitCost = "";
        line.taxRatePercent = String(defaultTaxRate);
      }
      next[index] = line;
      return next;
    });
    if (!itemId) return;
    const dateStr = formData.expenseDate || new Date().toISOString().slice(0, 10);
    const item = items.find((i: { id: number }) => i.id === parseInt(itemId, 10)) as { category?: string } | undefined;
    fetch(`/api/items/${itemId}/resolved-price?date=${dateStr}`)
      .then((r) => r.json())
      .then((data: { unitCost?: number | null; costTaxIncluded?: boolean }) => {
        if (data?.unitCost != null) {
          setLineItems((prev) => {
            const next = [...prev];
            if (next[index]?.itemId === itemId)
              next[index] = {
                ...next[index],
                unitPrice: String(data.unitCost),
                unitCost: String(data.unitCost),
                taxInclusive: data.costTaxIncluded ?? false,
              };
            return next;
          });
        }
      })
      .catch(() => {});
    taxRulesApi
      .resolve({ context: 'expense', itemId: parseInt(itemId, 10), date: dateStr, itemCategory: item?.category })
      .then((r) =>
        setLineItems((prev) => {
          const next = [...prev];
          if (next[index]?.itemId === itemId)
            next[index] = { ...next[index], taxRatePercent: r.rate.toString() };
          return next;
        })
      )
      .catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.expenseDate) {
      toast.error("Name, category and date are required");
      return;
    }
    const payloadLines: ExpenseLineItemInput[] = [];
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        toast.error(`Line ${i + 1}: quantity (positive) and unit price are required`);
        return;
      }
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : defaultTaxRate;
      payloadLines.push({
        itemId: line.itemId ? parseInt(line.itemId, 10) : undefined,
        quantity: qty,
        unitId: line.unitId ?? undefined,
        unitPrice: price,
        unitCost: line.unitCost ? parseFloat(line.unitCost) : undefined,
        taxRatePercent: line.taxRatePercent !== "" ? lineRate : undefined,
        taxInclusive: line.taxInclusive,
      });
    }
    const slices = rowsToPaymentSlices(paymentRows);
    if (!slices) {
      toast.error("Each payment needs a positive amount and date");
      return;
    }
    if (!paymentSlicesSumMatchesTotal(slices, total)) {
      toast.error("Payment slices must sum to document total");
      return;
    }
    const payload = {
      name: formData.name,
      category: formData.category as ExpenseCategory,
      expenseDate: formData.expenseDate,
      description: formData.description || undefined,
      supplierId: formData.supplierId ? parseInt(formData.supplierId, 10) : undefined,
      lineItems: payloadLines,
      discount:
        formData.discountValue && parseFloat(formData.discountValue) > 0
          ? { type: formData.discountType as "amount" | "percent", value: parseFloat(formData.discountValue) }
          : undefined,
      paymentSlices: slices,
    };
    const parsed = createExpenseTransactionSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    try {
      const expense = await createExpense.mutateAsync(parsed.data as unknown as CreateExpenseData & { lineItems?: ExpenseLineItemInput[]; discount?: { type: "amount" | "percent"; value: number } });
      toast.success("Expense created");
      if (onCreated && expense?.id) onCreated(expense.id);
      else onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create expense");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0 pb-4 border-b border-border">
        <h2 className="text-lg font-semibold">Create expense</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Office supplies"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CategorySelector
              enumName="ExpenseCategory"
              label="Category *"
              required
              selectedId={formData.category || undefined}
              onSelect={(item) => handleInputChange("category", item.id === 0 ? "" : String(item.id))}
              placeholder="Select category"
            />
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Date *</Label>
              <DatePicker
                id="expenseDate"
                value={formData.expenseDate ? new Date(formData.expenseDate) : undefined}
                onChange={(d) => handleInputChange("expenseDate", d ? dateToYYYYMMDD(d) : "")}
                placeholder="Pick a date"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground pl-3">
            Tax: {defaultTaxRate.toFixed(1)}% (from tax rules{defaultTaxInclusive ? ", inclusive" : ", excl. tax"}).
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Add line
              </Button>
            </div>
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              {lineItems.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <UnifiedSelector
                      label=""
                      type="item"
                      items={items}
                      selectedId={line.itemId ? parseInt(line.itemId, 10) : undefined}
                      onSelect={(item) => handleItemSelect(index, item.id === 0 ? "" : String(item.id))}
                      onCreateNew={() => router.push("/items/create")}
                      placeholder="Item (optional)"
                      getDisplayName={(i) => `${(i as { name?: string }).name ?? i.id}`}
                      className="h-10"
                    />
                  </div>
                  {line.itemId ? (
                    <>
                      <div className="col-span-4">
                        <InputGroupAttached
                          label="Qty / Unit"
                          input={
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              className="text-sm tabular-nums"
                              value={line.quantity}
                              onChange={(e) => updateLine(index, "quantity", e.target.value)}
                            />
                          }
                          addon={
                            <UnifiedSelector
                              type="unit"
                              items={unitItems}
                              selectedId={line.unitId ?? undefined}
                              onSelect={(item) => updateLine(index, "unitId", item.id === 0 ? null : (item.id as number))}
                              placeholder="—"
                              className="!min-w-0 w-20"
                            />
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">
                          {line.itemId && (line.taxInclusive ?? false) && (parseFloat(line.taxRatePercent || String(defaultTaxRate)) || 0) > 0
                            ? "Price (incl. tax)"
                            : "Price (excl. tax)"}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-sm tabular-nums"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <InputGroupAttached
                          label="Tax %"
                          addonStyle="default"
                          input={
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="text-sm tabular-nums"
                              value={line.taxRatePercent !== "" ? line.taxRatePercent : String(defaultTaxRate)}
                              onChange={(e) => updateLine(index, "taxRatePercent", e.target.value)}
                              placeholder={String(defaultTaxRate)}
                            />
                          }
                          addon={<span className="text-muted-foreground text-xs">%</span>}
                        />
                      </div>
                      <div className="col-span-1 flex h-10 items-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lineItems.length <= 1}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-4">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-4 flex h-10 items-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lineItems.length <= 1}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {hasAnyItem && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount</Label>
                <div className="flex gap-2">
                  <select
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={formData.discountType}
                    onChange={(e) => setFormData((p) => ({ ...p, discountType: e.target.value as "amount" | "percent" }))}
                  >
                    <option value="amount">Amount</option>
                    <option value="percent">Percent</option>
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData((p) => ({ ...p, discountValue: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm">
            {hasAnyItem ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax {defaultTaxRate > 0 && `(${defaultTaxRate.toFixed(1)}%)`}</span>
                  <span className="tabular-nums">{totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">-{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span className="tabular-nums">{total.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 w-24 text-right tabular-nums"
                  value={lineItems[0]?.unitPrice ?? ""}
                  onChange={(e) => updateLine(0, "unitPrice", e.target.value)}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <DocumentPaymentSlicesEditor
            total={total}
            defaultDate={formData.expenseDate}
            rows={paymentRows}
            onRowsChange={setPaymentRows}
          />

          <div className="space-y-2">
            <UnifiedSelector
              label="Vendor"
              type="vendor"
              items={suppliers}
              selectedId={formData.supplierId ? parseInt(formData.supplierId, 10) : undefined}
              onSelect={(item) => handleInputChange("supplierId", item.id === 0 ? "" : String(item.id))}
              onCreateNew={() => setAddVendorOpen(true)}
              placeholder="Select vendor"
            />
            <AddVendorDialog
              open={addVendorOpen}
              onOpenChange={setAddVendorOpen}
              onCreated={(v) => handleInputChange("supplierId", String(v.id))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending || (hasAnyItem ? total <= 0 : (parseFloat(lineItems[0]?.unitPrice ?? "0") || 0) <= 0)} className="flex-1">
              {createExpense.isPending ? "Creating…" : "Create expense"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </div>
  );
}
