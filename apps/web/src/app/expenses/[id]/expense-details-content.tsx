"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Badge } from "@kit/ui/badge";
import { Separator } from "@kit/ui/separator";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Skeleton } from "@kit/ui/skeleton";
import {
  Edit2,
  Trash2,
  MoreHorizontal,
  X,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Receipt,
  Package,
  ChevronRight,
  Plus,
} from "lucide-react";
import { DatePicker } from "@kit/ui/date-picker";
import { UnifiedSelector } from "@/components/unified-selector";
import { InputGroupAttached } from "@/components/input-group";
import { Checkbox } from "@kit/ui/checkbox";
import {
  useExpenseById,
  useUpdateExpense,
  useDeleteExpense,
  useSubscriptions,
  useInventorySuppliers,
  useItems,
  useUnits,
} from "@kit/hooks";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { dateToYYYYMMDD } from "@kit/lib";
import type { ExpenseCategory } from "@kit/types";

import { lineTaxAmount, netUnitPriceFromInclusive } from "@/lib/transaction-tax";
import { taxRulesApi } from "@kit/lib";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  utilities: "Utilities",
  supplies: "Supplies",
  marketing: "Marketing",
  insurance: "Insurance",
  maintenance: "Maintenance",
  professional_services: "Professional Services",
  other: "Other",
};

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export interface ExpenseDetailContentProps {
  expenseId: string;
  initialEditMode?: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function ExpenseDetailContent({
  expenseId,
  initialEditMode = false,
  onClose,
  onDeleted,
}: ExpenseDetailContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const { data: expense, isLoading } = useExpenseById(expenseId);
  const { data: subscriptionsResponse } = useSubscriptions();
  const subscriptions = subscriptionsResponse?.data || [];
  const { data: suppliersResponse } = useInventorySuppliers({
    limit: 1000,
    supplierType: "vendor",
  });
  const suppliers = suppliersResponse?.data || [];
  const { data: itemsResponse } = useItems({ limit: 1000 });
  const items = itemsResponse?.data ?? [];
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const [formData, setFormData] = useState({
    name: "",
    category: "" as ExpenseCategory | "",
    expenseDate: "",
    description: "",
    supplierId: "",
    discountType: "amount" as "amount" | "percent",
    discountValue: "",
  });
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);

  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);

  useEffect(() => {
    if (!formData.expenseDate) {
      setDefaultTaxRate(0);
      return;
    }
    taxRulesApi.resolve({ context: 'expense', date: formData.expenseDate }).then((r) => setDefaultTaxRate(r.rate)).catch(() => setDefaultTaxRate(0));
  }, [formData.expenseDate]);

  const updateExpense = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const [lineItems, setLineItems] = useState<
    Array<{ itemId: string; quantity: string; unitId: number | null; unitPrice: string; unitCost: string; taxRatePercent: string; taxInclusive: boolean }>
  >([{ itemId: "", quantity: "1", unitId: null, unitPrice: "", unitCost: "", taxRatePercent: "", taxInclusive: false }]);

  const hasAnyItem = lineItems.some((l) => l.itemId !== "");
  const { subtotal, totalTax, discountAmount, total } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    for (const line of lineItems) {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unitPrice) || 0;
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : defaultTaxRate;
      const { lineTotalNet, taxAmount } = lineTaxAmount(q, p, lineRate, line.taxInclusive);
      sub += lineTotalNet;
      tax += taxAmount;
    }
    let disc = 0;
    if (formData.discountValue) {
      const v = parseFloat(formData.discountValue) || 0;
      if (formData.discountType === "percent") disc = Math.round(sub * (v / 100) * 100) / 100;
      else disc = Math.round(v * 100) / 100;
    }
    const tot = Math.round((sub + tax - disc) * 100) / 100;
    return { subtotal: sub, totalTax: tax, discountAmount: disc, total: tot };
  }, [lineItems, defaultTaxRate, formData.discountType, formData.discountValue]);

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        category: expense.category,
        expenseDate: expense.expenseDate.split("T")[0],
        description: expense.description || "",
        supplierId: expense.supplierId?.toString() || "",
        discountType: "amount",
        discountValue: expense.totalDiscount && expense.totalDiscount > 0 ? String(expense.totalDiscount) : "",
      });
      const lines = expense.lineItems?.length
        ? expense.lineItems.map((li: { itemId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; taxRatePercent?: number }) => ({
            itemId: li.itemId?.toString() ?? "",
            quantity: String(li.quantity),
            unitId: li.unitId ?? null,
            unitPrice: String(li.unitPrice),
            unitCost: li.unitCost != null ? String(li.unitCost) : "",
            taxRatePercent: li.taxRatePercent != null ? String(li.taxRatePercent) : "",
            taxInclusive: false,
          }))
        : [{ itemId: "", quantity: "1", unitId: null, unitPrice: String(expense.amount), unitCost: "", taxRatePercent: "", taxInclusive: false }];
      setLineItems(lines);
    }
  }, [expense]);

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
      next[index] = { ...next[index], [field]: value };
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
        const item = items.find((i: { id: number }) => i.id === parseInt(itemId, 10)) as { unitId?: number; unit_cost?: number; unitCost?: number; unit_price?: number; unitPrice?: number; defaultTaxRatePercent?: number } | undefined;
        line.quantity = "1";
        line.unitId = item?.unitId ?? null;
        const price = item?.unit_cost ?? item?.unitCost ?? item?.unit_price ?? item?.unitPrice;
        line.unitPrice = price != null ? String(price) : "";
        line.unitCost = item?.unitCost != null ? String(item.unitCost) : (item?.unit_cost != null ? String(item.unit_cost) : "");
        line.taxRatePercent = item?.defaultTaxRatePercent != null ? String(item.defaultTaxRatePercent) : String(defaultTaxRate);
      }
      next[index] = line;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.expenseDate) {
      toast.error("Name, category and date are required");
      return;
    }
    const payloadLines: Array<{ itemId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; taxRatePercent?: number }> = [];
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        toast.error(`Line ${i + 1}: quantity and unit price required`);
        return;
      }
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : defaultTaxRate;
      const unitPriceNet = line.taxInclusive ? netUnitPriceFromInclusive(price, lineRate) : price;
      payloadLines.push({
        itemId: line.itemId ? parseInt(line.itemId, 10) : undefined,
        quantity: qty,
        unitId: line.unitId ?? undefined,
        unitPrice: unitPriceNet,
        unitCost: line.unitCost ? parseFloat(line.unitCost) : undefined,
        taxRatePercent: line.taxRatePercent !== "" ? lineRate : undefined,
      });
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
    };
    try {
      await updateExpense.mutateAsync({ id: expenseId, data: payload as any });
      toast.success("Expense updated");
      router.push(`/expenses/${expenseId}`);
      setIsEditing(false);
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || "Failed to update expense");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this expense? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(String(expenseId));
      toast.success("Expense deleted successfully");
      onDeleted();
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="space-y-4 px-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Expense not found</h2>
          <p className="text-sm text-muted-foreground">
            This expense may have been deleted or doesn't exist.
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to expenses
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col h-full">
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-6 pb-6 pr-1">
            <div>
              <h2 className="text-lg font-semibold">Edit expense</h2>
              <p className="text-sm text-muted-foreground">Update line items and totals</p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Category *</Label>
                <UnifiedSelector
                  type="category"
                  items={[
                    { id: "rent", name: "Rent" },
                    { id: "utilities", name: "Utilities" },
                    { id: "supplies", name: "Supplies" },
                    { id: "marketing", name: "Marketing" },
                    { id: "insurance", name: "Insurance" },
                    { id: "maintenance", name: "Maintenance" },
                    { id: "professional_services", name: "Professional Services" },
                    { id: "other", name: "Other" },
                  ]}
                  selectedId={formData.category || undefined}
                  onSelect={(item) => setFormData((p) => ({ ...p, category: (item.id === 0 ? "" : String(item.id)) as ExpenseCategory | "" }))}
                  placeholder="Category"
                />
                <p className="text-xs text-muted-foreground pl-3">Tax: {defaultTaxRate.toFixed(1)}% (from tax rules; not tied to category).</p>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <DatePicker
                  value={formData.expenseDate ? new Date(formData.expenseDate) : undefined}
                  onChange={(d) => setFormData((p) => ({ ...p, expenseDate: d ? dateToYYYYMMDD(d) : "" }))}
                  placeholder="Pick a date"
                />
              </div>
            </div>
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
                          <Label className="text-xs text-muted-foreground">{line.taxInclusive ? "Price (incl. tax)" : "Price (excl. tax)"}</Label>
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
                            label="Tax % / Incl. tax"
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
                            addon={
                              <div className="flex h-full min-h-10 items-center justify-center leading-none" title="Price includes tax">
                                <Checkbox
                                  id={`exp-edit-tax-incl-${index}`}
                                  checked={line.taxInclusive}
                                  onCheckedChange={(checked) => updateLine(index, "taxInclusive", checked === true)}
                                  aria-label="Price includes tax"
                                />
                              </div>
                            }
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
            <div className="space-y-2">
              <Label>Vendor</Label>
              <UnifiedSelector
                type="vendor"
                items={suppliers}
                selectedId={formData.supplierId ? parseInt(formData.supplierId, 10) : undefined}
                onSelect={(item) => setFormData((p) => ({ ...p, supplierId: item.id === 0 ? "" : String(item.id) }))}
                placeholder="Select vendor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
          </div>
        </ScrollArea>
        <div className="flex shrink-0 gap-3 border-t bg-background p-4 -mx-6">
          <Button type="button" variant="outline" onClick={() => router.push(`/expenses/${expenseId}`)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={updateExpense.isPending || (hasAnyItem ? total <= 0 : (parseFloat(lineItems[0]?.unitPrice ?? "0") || 0) <= 0)} className="flex-1">
            {updateExpense.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    );
  }

  const subscriptionName =
    expense.subscriptionId && subscriptions.length
      ? subscriptions.find((s: { id: number }) => s.id === expense.subscriptionId)?.name
      : null;
  const effectiveTaxRateView = defaultTaxRate;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 space-y-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDate(expense.expenseDate)} ·{" "}
              {CATEGORY_LABELS[expense.category] || expense.category}
            </p>
            <h2 className="text-lg font-semibold">Expense details</h2>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/expenses/${expenseId}/edit`)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit expense
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
        <Separator />
      </div>
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-6 pb-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {formatCurrency(expense.amount)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDate(expense.expenseDate)}
                </span>
                <Badge variant="secondary" className="font-normal">
                  {CATEGORY_LABELS[expense.category] || expense.category}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-0">
            <DetailRow icon={Receipt} label="Name">
              {expense.name}
            </DetailRow>
            <Separator />
            <DetailRow icon={Tag} label="Category">
              <Badge variant="outline">
                {CATEGORY_LABELS[expense.category] || expense.category}
              </Badge>
            </DetailRow>
            <Separator />
            <DetailRow icon={DollarSign} label="Amount">
              <span className="tabular-nums">{formatCurrency(expense.amount)}</span>
            </DetailRow>
            <Separator />
            <div className="py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Line items</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Item</th>
                      <th className="text-right p-2 font-medium">Qty</th>
                      <th className="text-right p-2 font-medium">Price</th>
                      <th className="text-right p-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expense.lineItems && expense.lineItems.length > 0
                      ? expense.lineItems
                      : [{ id: 0, item: undefined, quantity: 1, unitPrice: expense.amount, lineTotal: expense.amount }]
                    ).map((line: { id: number; item?: { name?: string }; subscription?: { name?: string }; quantity: number; unitPrice: number; lineTotal: number }) => (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="p-2">{line.item?.name ?? line.subscription?.name ?? "—"}</td>
                        <td className="p-2 text-right tabular-nums">{line.quantity}</td>
                        <td className="p-2 text-right tabular-nums">{formatCurrency(line.unitPrice)}</td>
                        <td className="p-2 text-right tabular-nums">{formatCurrency(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(expense.subtotal ?? 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax {effectiveTaxRateView > 0 && `(${effectiveTaxRateView.toFixed(1)}%)`}</span>
                  <span className="tabular-nums">{formatCurrency(expense.totalTax ?? 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(expense.totalDiscount ?? 0)}</span>
                </div>
                <div className="flex justify-between font-medium border-t mt-1 pt-2">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(expense.amount)}</span>
                </div>
              </div>
            </div>
            <Separator />
            <DetailRow icon={Calendar} label="Expense date">
              {formatDate(expense.expenseDate)}
            </DetailRow>
            <Separator />
            <DetailRow icon={Package} label="Subscription">
              {expense.subscriptionId && subscriptionName ? (
                <Link
                  href={`/subscriptions/${expense.subscriptionId}`}
                  className="group inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {subscriptionName}
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            <Separator />
            <DetailRow icon={Package} label="Vendor">
              {expense.supplierId && suppliers.length ? (
                (() => {
                  const supplier = suppliers.find(
                    (s: { id: number }) => s.id === expense.supplierId
                  );
                  return supplier ? (
                    <Link
                      href={`/inventory-suppliers/${expense.supplierId}`}
                      className="group inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {(supplier as { name: string }).name}
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ) : (
                    expense.vendor || <span className="text-muted-foreground">—</span>
                  );
                })()
              ) : (
                expense.vendor || <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            {expense.description && (
              <>
                <Separator />
                <DetailRow icon={FileText} label="Description">
                  <p className="whitespace-pre-wrap text-foreground/90">
                    {expense.description}
                  </p>
                </DetailRow>
              </>
            )}
          </div>

          <Separator />

          <div className="flex gap-6 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created</span>{" "}
              {formatDate(expense.createdAt)}
            </div>
            <div>
              <span className="font-medium">Updated</span>{" "}
              {formatDate(expense.updatedAt)}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
