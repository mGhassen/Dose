"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Alert, AlertDescription } from "@kit/ui/alert";
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
  Link2,
  Link2Off,
  ShoppingCart,
  ExternalLink,
  Landmark,
  Building2,
  Users,
} from "lucide-react";
import { DatePicker } from "@kit/ui/date-picker";
import { SupplierFormDialog } from "@/components/supplier-form-dialog";
import { CategorySelector } from "@/components/category-selector";
import { UnifiedSelector } from "@/components/unified-selector";
import { InputGroupAttached } from "@/components/input-group";
import {
  useExpenseById,
  useUpdateExpense,
  useDeleteExpense,
  useSubscriptions,
  useInventorySuppliers,
  useItems,
  useUnits,
  useMetadataEnum,
  usePayments,
  useCreatePayment,
  useDeletePayment,
  useSupplierOrders,
  useSupplierOrderById,
  useCreateSupplierOrderFromExpense,
  useLoanById,
  useLeasingById,
  usePersonnelById,
} from "@kit/hooks";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { dateToYYYYMMDD } from "@kit/lib";
import type { ExpenseCategory, ExpenseLineItem, Item } from "@kit/types";
import { mergeSelectorItemsWithLineEmbeds } from "@/lib/merge-selector-items";

import { lineTaxAmount, to2Decimals } from "@/lib/transaction-tax";
import { taxRulesApi } from "@kit/lib";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  DocumentPaymentSlicesEditor,
  defaultPaymentSliceRows,
  paymentRowFromApi,
  rowsToPaymentSlices,
  type DocumentPaymentSliceRow,
} from "@/components/document-payment-slices-editor";
import { paymentSlicesSumMatchesTotal } from "@/lib/ledger/replace-entry-payments";
import { expenseFormSubmitBlockReason } from "@/lib/expense-form-submit-block-reason";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";

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

type ExpenseReconciliationStatus = "reconciled" | "partial" | "unreconciled";

function getExpenseReconciliationStatus(
  paymentCount: number,
  reconciledPaymentCount: number
): ExpenseReconciliationStatus {
  if (paymentCount > 0 && reconciledPaymentCount === paymentCount) return "reconciled";
  if (reconciledPaymentCount > 0) return "partial";
  return "unreconciled";
}

const reconciliationStatusDotClass: Record<ExpenseReconciliationStatus, string> = {
  reconciled: "bg-green-500",
  partial: "bg-yellow-500",
  unreconciled: "bg-red-500",
};

const reconciliationStatusLabel: Record<ExpenseReconciliationStatus, string> = {
  reconciled: "Fully reconciled",
  partial: "Partially reconciled",
  unreconciled: "Not reconciled",
};

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  const [paymentDialogDate, setPaymentDialogDate] = useState<Date>(() => new Date());
  const [linkOrderDialogOpen, setLinkOrderDialogOpen] = useState(false);
  const [pickedOrderId, setPickedOrderId] = useState<number | undefined>(undefined);
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const { data: expense, isLoading, isError, error } = useExpenseById(expenseId);
  const loanIdStr = expense?.loanId != null ? String(expense.loanId) : "";
  const leasingIdStr = expense?.leasingId != null ? String(expense.leasingId) : "";
  const personnelIdStr = expense?.personnelId != null ? String(expense.personnelId) : "";
  const { data: relatedLoan } = useLoanById(loanIdStr);
  const { data: relatedLeasing } = useLeasingById(leasingIdStr);
  const { data: relatedPersonnel } = usePersonnelById(personnelIdStr);
  const { data: paymentsPage, isLoading: paymentsLoading } = usePayments({
    entryType: "expense",
    referenceId: expenseId,
    limit: 500,
    page: 1,
  });
  const expensePayments = paymentsPage?.data ?? [];
  const totalPaidTowardExpense = useMemo(
    () => expensePayments.reduce((s, p) => s + p.amount, 0),
    [expensePayments]
  );
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const { data: subscriptionsResponse } = useSubscriptions();
  const subscriptions = subscriptionsResponse?.data || [];
  const { data: suppliersResponse } = useInventorySuppliers({
    limit: 1000,
    supplierType: "vendor",
  });
  const suppliers = suppliersResponse?.data || [];
  const { data: linkedOrder } = useSupplierOrderById(
    expense?.supplierOrderId != null ? String(expense.supplierOrderId) : ""
  );
  const { data: availableOrdersResponse } = useSupplierOrders({
    limit: 200,
    supplierId:
      expense?.supplierId != null ? String(expense.supplierId) : undefined,
  });
  const availableOrders = availableOrdersResponse?.data ?? [];
  const availableOrderItems = useMemo(
    () =>
      availableOrders.map((o) => ({
        id: o.id,
        name: `Order #${o.orderNumber || o.id} · ${o.orderDate ?? "—"} · ${o.status ?? "—"}`,
      })),
    [availableOrders]
  );
  const createOrderFromExpense = useCreateSupplierOrderFromExpense();
  const { data: itemsResponse } = useItems({ limit: 2500 });
  const itemsBase = itemsResponse?.data ?? [];
  const selectorItems = useMemo(
    () => mergeSelectorItemsWithLineEmbeds<Item>(itemsBase, expense?.lineItems),
    [itemsBase, expense?.lineItems]
  );
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const { data: categoryValues = [] } = useMetadataEnum("ExpenseCategory");
  const categoryLabels: Record<string, string> = Object.fromEntries(
    categoryValues.map((ev) => [ev.name, ev.label ?? ev.name])
  );
  const [addVendorOpen, setAddVendorOpen] = useState(false);
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
  const [defaultTaxInclusive, setDefaultTaxInclusive] = useState(false);

  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);

  useEffect(() => {
    if (isError && error && (error as { status?: number }).status === 404) {
      router.replace("/expenses");
    }
  }, [isError, error, router]);

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

  const updateExpense = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const [lineItems, setLineItems] = useState<
    Array<{ itemId: string; quantity: string; unitId: number | null; unitPrice: string; unitCost: string; taxRatePercent: string; taxInclusive: boolean }>
  >([{ itemId: "", quantity: "1", unitId: null, unitPrice: "", unitCost: "", taxRatePercent: "", taxInclusive: false }]);

  const [paymentRows, setPaymentRows] = useState<DocumentPaymentSliceRow[]>([]);

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

  const submitBlockReason = useMemo(
    () =>
      expenseFormSubmitBlockReason({
        name: formData.name,
        category: formData.category,
        expenseDate: formData.expenseDate,
        lineItems,
        total,
        paymentRows,
      }),
    [formData.name, formData.category, formData.expenseDate, lineItems, total, paymentRows]
  );

  useEffect(() => {
    if (!expense) return;
    setFormData({
      name: expense.name,
      category: expense.category,
      expenseDate: expense.expenseDate.split("T")[0],
      description: expense.description || "",
      supplierId: expense.supplierId?.toString() || "",
      discountType: "amount",
      discountValue: expense.totalDiscount && expense.totalDiscount > 0 ? String(expense.totalDiscount) : "",
    });
    const dateStr = expense.expenseDate.split("T")[0];
    const lines = expense.lineItems?.length
      ? expense.lineItems.map((li) => {
          const r = li as ExpenseLineItem & {
            item_id?: number;
            unit_id?: number;
            tax_rate_percent?: number;
            unit_cost?: number;
          };
          const rawItem = r.item;
          const emb = Array.isArray(rawItem) ? rawItem[0] : rawItem;
          const fromEmb = emb && typeof emb === "object" && "id" in emb ? (emb as { id?: number }).id : undefined;
          const idNum =
            typeof r.itemId === "number"
              ? r.itemId
              : typeof r.item_id === "number"
                ? r.item_id
                : typeof r.item_id === "string" && r.item_id !== ""
                  ? Number(r.item_id)
                  : fromEmb;
          const itemIdStr =
            idNum != null && !Number.isNaN(Number(idNum)) && Number(idNum) > 0 ? String(idNum) : "";
          return {
            itemId: itemIdStr,
            quantity: String(r.quantity),
            unitId: r.unitId ?? r.unit_id ?? null,
            unitPrice: String(r.unitPrice),
            unitCost: r.unitCost != null ? String(r.unitCost) : r.unit_cost != null ? String(r.unit_cost) : "",
            taxRatePercent:
              r.taxRatePercent != null ? String(r.taxRatePercent) : r.tax_rate_percent != null ? String(r.tax_rate_percent) : "",
            taxInclusive: false,
          };
        })
      : [{ itemId: "", quantity: "1", unitId: null, unitPrice: String(expense.amount), unitCost: "", taxRatePercent: "", taxInclusive: false }];
    setLineItems(lines);
    const withItemIds = lines.map((l, i) => (l.itemId ? { index: i, itemId: l.itemId } : null)).filter(Boolean) as { index: number; itemId: string }[];
    if (withItemIds.length === 0) return;
    Promise.all(
      withItemIds.map(({ index, itemId }) =>
        taxRulesApi.resolve({ context: 'expense', itemId: parseInt(itemId, 10), date: dateStr }).then((r) => ({ index, taxInclusive: r.taxInclusive ?? false }))
      )
    ).then((results) => {
      setLineItems((prev) => {
        const next = [...prev];
        for (const { index, taxInclusive } of results) next[index] = { ...next[index], taxInclusive };
        return next;
      });
    }).catch(() => {});
  }, [expense]);

  useEffect(() => {
    if (!isEditing || !expense || paymentsLoading) return;
    setPaymentRows((prev) => {
      if (expensePayments.length > 0) {
        const next = expensePayments.map(paymentRowFromApi);
        const prevSig = prev.map((r) => `${r.id ?? ""}:${r.amount}:${r.paymentDate}`).join("|");
        const nextSig = next.map((r) => `${r.id ?? ""}:${r.amount}:${r.paymentDate}`).join("|");
        return prevSig === nextSig ? prev : next;
      }
      if (prev.length > 1) return prev;
      return defaultPaymentSliceRows(expense.amount, expense.expenseDate.split("T")[0]);
    });
  }, [isEditing, expense, paymentsLoading, expensePayments]);

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
        const item = selectorItems.find((i: { id: number }) => i.id === parseInt(itemId, 10)) as { unitId?: number; category?: string; defaultTaxRatePercent?: number } | undefined;
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
    const item = selectorItems.find((i: { id: number }) => i.id === parseInt(itemId, 10)) as { category?: string } | undefined;
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
    const payloadLines: Array<{ itemId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; taxRatePercent?: number; taxInclusive?: boolean }> = [];
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        toast.error(`Line ${i + 1}: quantity and unit price required`);
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
    try {
      await deleteMutation.mutateAsync(String(expenseId));
      toast.success("Expense deleted successfully");
      setIsDeleteDialogOpen(false);
      router.replace("/expenses");
      onDeleted();
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error(error);
    }
  };

  const handleLinkSupplierOrder = async () => {
    if (pickedOrderId == null) {
      toast.error("Pick a supplier order");
      return;
    }
    try {
      await updateExpense.mutateAsync({
        id: expenseId,
        data: { supplierOrderId: pickedOrderId } as any,
      });
      toast.success("Supplier order linked");
      setLinkOrderDialogOpen(false);
      setPickedOrderId(undefined);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to link supplier order");
    }
  };

  const handleUnlinkSupplierOrder = async () => {
    try {
      await updateExpense.mutateAsync({
        id: expenseId,
        data: { supplierOrderId: null } as any,
      });
      toast.success("Supplier order unlinked");
      setIsUnlinkDialogOpen(false);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to unlink supplier order");
    }
  };

  const handleCreateSupplierOrder = async () => {
    try {
      const order = await createOrderFromExpense.mutateAsync(expenseId);
      toast.success("Supplier order created");
      setIsCreateOrderDialogOpen(false);
      router.push(`/supplier-orders/${order.id}`);
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Failed to create supplier order"
      );
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
    router.replace("/expenses");
    return null;
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
                <CategorySelector
                  enumName="ExpenseCategory"
                  selectedId={formData.category || undefined}
                  onSelect={(item) => setFormData((p) => ({ ...p, category: (item.id === 0 ? "" : String(item.id)) as ExpenseCategory | "" }))}
                  placeholder="Category"
                />
                <p className="text-xs text-muted-foreground pl-3">Tax: {defaultTaxRate.toFixed(1)}% (from tax rules{defaultTaxInclusive ? ", inclusive" : ", excl. tax"}).</p>
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
                        items={selectorItems}
                        selectedId={line.itemId ? parseInt(line.itemId, 10) : undefined}
                        selectedDisplayName={(() => {
                          if (!line.itemId) return undefined;
                          const hit = selectorItems.find((i) => String(i.id) === line.itemId) as { name?: string } | undefined;
                          if (hit?.name?.trim()) return hit.name;
                          const li = expense.lineItems?.[index] as { item?: unknown } | undefined;
                          const raw = li?.item;
                          const rowEmb = Array.isArray(raw) ? raw[0] : raw;
                          return (rowEmb as { name?: string } | undefined)?.name;
                        })()}
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
              <Label>Vendor</Label>
              <UnifiedSelector
                type="vendor"
                items={suppliers}
                selectedId={formData.supplierId ? parseInt(formData.supplierId, 10) : undefined}
                onSelect={(item) => setFormData((p) => ({ ...p, supplierId: item.id === 0 ? "" : String(item.id) }))}
                onCreateNew={() => setAddVendorOpen(true)}
                placeholder="Select vendor"
              />
              <SupplierFormDialog
                open={addVendorOpen}
                onOpenChange={setAddVendorOpen}
                onCreated={(v) => setFormData((p) => ({ ...p, supplierId: String(v.id) }))}
                entityLabel="vendor"
                defaultSupplierTypes={["vendor"]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
          </div>
        </ScrollArea>
        <div className="flex shrink-0 flex-col gap-3 border-t bg-background p-4 -mx-6">
          {submitBlockReason && !updateExpense.isPending && (
            <Alert variant="destructive">
              <AlertDescription>{submitBlockReason}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/expenses/${expenseId}`)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={updateExpense.isPending || submitBlockReason != null} className="flex-1">
              {updateExpense.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  const subscriptionName =
    expense.subscriptionId && subscriptions.length
      ? subscriptions.find((s: { id: number }) => s.id === expense.subscriptionId)?.name
      : null;
  const effectiveTaxRateView = defaultTaxRate;
  const reconciliationStatus = getExpenseReconciliationStatus(
    expense.paymentCount ?? 0,
    expense.reconciledPaymentCount ?? 0
  );
  const hasLinkedOrder = expense.supplierOrderId != null;
  const hasUsableLinesForOrder =
    (expense.lineItems || []).some(
      (li) =>
        (li.itemId != null || (li as { item_id?: number }).item_id != null) &&
        li.subscriptionId == null &&
        (li.quantity ?? 0) > 0
    );
  const canCreateOrder = !hasLinkedOrder && expense.supplierId != null;
  const createOrderBlockedReason = hasLinkedOrder
    ? "Already linked to a supplier order"
    : expense.supplierId == null
      ? "Pick a vendor first"
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 space-y-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDate(expense.expenseDate)} ·{" "}
              {categoryLabels[expense.category] || expense.category}
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
                <DropdownMenuItem onClick={() => setAddPaymentOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add payment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {hasLinkedOrder ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push(`/supplier-orders/${expense.supplierOrderId}`)}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View supplier order
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsUnlinkDialogOpen(true)}
                      disabled={updateExpense.isPending}
                    >
                      <Link2Off className="mr-2 h-4 w-4" />
                      Unlink supplier order
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        if (expense.supplierId == null) {
                          toast.error("Pick a vendor first");
                          return;
                        }
                        setPickedOrderId(undefined);
                        setLinkOrderDialogOpen(true);
                      }}
                      disabled={expense.supplierId == null}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Link to supplier order…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (!canCreateOrder) {
                          toast.error(createOrderBlockedReason ?? "Cannot create supplier order");
                          return;
                        }
                        setIsCreateOrderDialogOpen(true);
                      }}
                      disabled={!canCreateOrder}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create supplier order from this expense
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
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
                  {categoryLabels[expense.category] || expense.category}
                </Badge>
                {totalPaidTowardExpense >= expense.amount ? (
                  <Badge variant="default" className="font-normal">
                    Paid
                  </Badge>
                ) : totalPaidTowardExpense > 0 ? (
                  <Badge variant="outline" className="font-normal tabular-nums">
                    Partial · {formatCurrency(totalPaidTowardExpense)} / {formatCurrency(expense.amount)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-normal">
                    Unpaid
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-0">
            <DetailRow icon={Receipt} label="Name">
              <span className="inline-flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${reconciliationStatusDotClass[reconciliationStatus]}`}
                  title={reconciliationStatusLabel[reconciliationStatus]}
                  aria-label={reconciliationStatusLabel[reconciliationStatus]}
                />
                <span>{expense.name}</span>
              </span>
            </DetailRow>
            <Separator />
            <DetailRow icon={Tag} label="Category">
              <Badge variant="outline">
                {categoryLabels[expense.category] || expense.category}
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
                    ).map(
                      (
                        line: {
                          id: number;
                          itemId?: number;
                          item_id?: number;
                          subscriptionId?: number;
                          subscription_id?: number;
                          item?: { id?: number; name?: string } | { id?: number; name?: string }[];
                          subscription?: { id?: number; name?: string };
                          quantity: number;
                          unitPrice: number;
                          lineTotal: number;
                        }
                      ) => {
                        const rawItem = line.item;
                        const emb = Array.isArray(rawItem) ? rawItem[0] : rawItem;
                        const itemId = line.itemId ?? line.item_id ?? emb?.id;
                        const subscriptionLineId =
                          line.subscriptionId ??
                          line.subscription_id ??
                          line.subscription?.id ??
                          undefined;
                        const itemLabel =
                          emb?.name?.trim() ??
                          line.subscription?.name?.trim() ??
                          (itemId != null ? `Item #${itemId}` : "—");
                        const isItemLink = itemId != null && subscriptionLineId == null;
                        const isSubscriptionLink = subscriptionLineId != null;

                        return (
                          <tr key={line.id} className="border-b last:border-0">
                            <td className="p-2">
                              {isItemLink ? (
                                <Link
                                  href={`/items/${itemId}`}
                                  className="group inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  {itemLabel}
                                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                </Link>
                              ) : isSubscriptionLink ? (
                                <Link
                                  href={`/subscriptions/${subscriptionLineId}`}
                                  className="group inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  {itemLabel || `Subscription #${subscriptionLineId}`}
                                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                </Link>
                              ) : (
                                itemLabel
                              )}
                            </td>
                            <td className="p-2 text-right tabular-nums">{line.quantity}</td>
                            <td className="p-2 text-right tabular-nums">{formatCurrency(line.unitPrice)}</td>
                            <td className="p-2 text-right tabular-nums">{formatCurrency(line.lineTotal)}</td>
                          </tr>
                        );
                      }
                    )}
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
            {expense.subscriptionId != null && (
              <>
                <Separator />
                <DetailRow icon={Package} label="Subscription">
                  <Link
                    href={`/subscriptions/${expense.subscriptionId}`}
                    className="group inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {subscriptionName ?? `Subscription #${expense.subscriptionId}`}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </DetailRow>
              </>
            )}
            <Separator />
            {expense.loanId != null && (
              <>
                <DetailRow icon={Landmark} label="Loan">
                  <Link
                    href={`/loans/${expense.loanId}`}
                    className="group inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {relatedLoan?.name?.trim() ||
                      relatedLoan?.loanNumber?.trim() ||
                      `Loan #${expense.loanId}`}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </DetailRow>
                <Separator />
              </>
            )}
            {expense.leasingId != null && (
              <>
                <DetailRow icon={Building2} label="Leasing">
                  <Link
                    href={`/leasing/${expense.leasingId}/timeline`}
                    className="group inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {relatedLeasing?.name?.trim() || `Lease #${expense.leasingId}`}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </DetailRow>
                <Separator />
              </>
            )}
            {expense.personnelId != null && (
              <>
                <DetailRow icon={Users} label="Personnel">
                  <Link
                    href={`/personnel/${expense.personnelId}`}
                    className="group inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {relatedPersonnel
                      ? `${relatedPersonnel.firstName ?? ""} ${relatedPersonnel.lastName ?? ""}`.trim() ||
                        `Person #${expense.personnelId}`
                      : `Person #${expense.personnelId}`}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </DetailRow>
                <Separator />
              </>
            )}
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
            <Separator />
            <DetailRow icon={ShoppingCart} label="Supplier order">
              {expense.supplierOrderId ? (
                <Link
                  href={`/supplier-orders/${expense.supplierOrderId}`}
                  className="group inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {linkedOrder
                    ? `Order #${linkedOrder.orderNumber || linkedOrder.id} · ${linkedOrder.orderDate ?? "—"} · ${linkedOrder.status ?? "—"}`
                    : `Order #${expense.supplierOrderId}`}
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
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
            <Separator />
            <div className="py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Payments</p>
              {expensePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {expensePayments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
                      <div className="min-w-0">
                        <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                        <span className="text-muted-foreground"> · {formatDate(p.paymentDate)}</span>
                        {p.notes ? <p className="text-xs text-muted-foreground truncate">{p.notes}</p> : null}
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setPaymentToDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                Total paid {formatCurrency(totalPaidTowardExpense)}
                {totalPaidTowardExpense < expense.amount && ` · Remaining ${formatCurrency(Math.max(0, expense.amount - totalPaidTowardExpense))}`}
              </p>
            </div>
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
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isPending={deleteMutation.isPending}
        variant="destructive"
      />

      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payment</DialogTitle>
            <DialogDescription>
              Record a cash allocation against this expense (ledger entry). Remaining:{" "}
              {formatCurrency(Math.max(0, expense.amount - totalPaidTowardExpense))}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payment date</Label>
              <DatePicker value={paymentDialogDate} onChange={(d) => setPaymentDialogDate(d ?? new Date())} placeholder="Pick a date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expPayAmount">Amount</Label>
              <Input
                id="expPayAmount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={String(Math.max(0.01, expense.amount - totalPaidTowardExpense))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expPayNotes">Notes (optional)</Label>
              <Input id="expPayNotes" type="text" placeholder="Reference, memo…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createPayment.isPending}
              onClick={async () => {
                const amtEl = document.getElementById("expPayAmount") as HTMLInputElement;
                const notesEl = document.getElementById("expPayNotes") as HTMLInputElement;
                const amt = parseFloat(amtEl?.value || "0");
                if (!(amt > 0)) {
                  toast.error("Amount must be positive");
                  return;
                }
                try {
                  await createPayment.mutateAsync({
                    entryType: "expense",
                    referenceId: Number(expenseId),
                    paymentDate: dateToYYYYMMDD(paymentDialogDate),
                    amount: amt,
                    isPaid: true,
                    paidDate: dateToYYYYMMDD(paymentDialogDate),
                    notes: notesEl?.value?.trim() || undefined,
                  });
                  toast.success("Payment added");
                  setAddPaymentOpen(false);
                } catch (e: unknown) {
                  toast.error((e as { message?: string })?.message || "Failed to add payment");
                }
              }}
            >
              {createPayment.isPending ? "Saving…" : "Add payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={paymentToDelete != null}
        onOpenChange={(o) => !o && setPaymentToDelete(null)}
        onConfirm={async () => {
          if (paymentToDelete == null) return;
          try {
            await deletePayment.mutateAsync(String(paymentToDelete));
            toast.success("Payment removed");
            setPaymentToDelete(null);
          } catch (e: unknown) {
            toast.error((e as { message?: string })?.message || "Failed to delete payment");
          }
        }}
        title="Delete payment"
        description="Remove this payment slice from the expense?"
        confirmText="Delete"
        cancelText="Cancel"
        isPending={deletePayment.isPending}
        variant="destructive"
      />

      <Dialog open={linkOrderDialogOpen} onOpenChange={setLinkOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to supplier order</DialogTitle>
            <DialogDescription>
              Pick an existing supplier order from this vendor. Stock movements will re-anchor to the order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Supplier order</Label>
              <UnifiedSelector
                mode="single"
                type="item"
                items={availableOrderItems}
                selectedId={pickedOrderId}
                onSelect={(item) => {
                  const oid = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
                  setPickedOrderId(Number.isNaN(oid) || oid === 0 ? undefined : (oid as number));
                }}
                placeholder="Select supplier order…"
                searchPlaceholder="Search orders…"
              />
              {availableOrderItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No orders for this vendor. Try creating one from this expense instead.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLinkOrderDialogOpen(false);
                setPickedOrderId(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pickedOrderId == null || updateExpense.isPending}
              onClick={handleLinkSupplierOrder}
            >
              {updateExpense.isPending ? "Linking…" : "Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={isUnlinkDialogOpen}
        onOpenChange={setIsUnlinkDialogOpen}
        onConfirm={handleUnlinkSupplierOrder}
        title="Unlink supplier order"
        description="Stock movements will move back under this expense. The supplier order itself is not deleted."
        confirmText="Unlink"
        cancelText="Cancel"
        isPending={updateExpense.isPending}
      />

      <ConfirmationDialog
        open={isCreateOrderDialogOpen}
        onOpenChange={setIsCreateOrderDialogOpen}
        onConfirm={handleCreateSupplierOrder}
        title="Create supplier order"
        description={
          hasUsableLinesForOrder
            ? "A delivered supplier order will be created from this expense's line items. Stock movements will re-anchor to the new order."
            : "No inventory lines on this expense will be copied. A pending supplier order is created for this vendor—open it to add lines and receive stock there."
        }
        confirmText="Create"
        cancelText="Cancel"
        isPending={createOrderFromExpense.isPending}
      />
    </div>
  );
}
