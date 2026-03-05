"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { dateToYYYYMMDD } from "@kit/lib";
import { DatePicker } from "@kit/ui/date-picker";
import { TimePicker } from "@kit/ui/time-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Checkbox } from "@kit/ui/checkbox";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { InputGroupAttached } from "@/components/input-group";
import { Badge } from "@kit/ui/badge";
import { Separator } from "@kit/ui/separator";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Skeleton } from "@kit/ui/skeleton";
import {
  Save,
  Trash2,
  MoreHorizontal,
  Edit2,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Receipt,
  X,
  Plus,
} from "lucide-react";
import { useSaleById, useUpdateSale, useDeleteSale, useItems, useUnits, useMetadataEnum } from "@kit/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatDateTime } from "@kit/lib/date-format";
import type { SalesType } from "@kit/types";
import { lineTaxAmount, netUnitPriceFromInclusive } from "@/lib/transaction-tax";
import { taxRulesApi } from "@kit/lib";

interface SaleDetailContentProps {
  saleId: string;
  initialEditMode?: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

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

export function SaleDetailContent({ saleId, initialEditMode = false, onClose, onDeleted }: SaleDetailContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const { data: sale, isLoading } = useSaleById(saleId);

  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);
  const { data: itemsResponse } = useItems({ limit: 1000, producedOnly: true });
  const { data: unitsData } = useUnits();
  const updateSale = useUpdateSale();
  const deleteMutation = useDeleteSale();
  const items = itemsResponse?.data ?? [];
  const unitItems = (unitsData || []).map((u: { id: number; symbol?: string; name?: string }) => ({ id: u.id, name: `${u.symbol ?? ""} (${u.name ?? ""})` }));
  const { data: salesTypeValues = [] } = useMetadataEnum("SalesType");
  const typeOptions = salesTypeValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const typeLabels: Record<string, string> = Object.fromEntries(
    salesTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])
  );

  const [formData, setFormData] = useState({
    date: "",
    time: "00:00",
    type: "" as SalesType | "",
    description: "",
    discountType: "amount" as "amount" | "percent",
    discountValue: "",
  });

  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  useEffect(() => {
    if (!formData.type || !formData.date) {
      setDefaultTaxRate(0);
      return;
    }
    taxRulesApi.resolve({ context: 'sale', salesType: formData.type, date: formData.date }).then((r) => setDefaultTaxRate(r.rate)).catch(() => setDefaultTaxRate(0));
  }, [formData.type, formData.date]);

  const [lineItems, setLineItems] = useState<Array<{ itemId: string; quantity: string; unitId: number | null; unitPrice: string; unitCost: string; taxRatePercent: string; taxInclusive: boolean }>>([]);

  const { subtotal, totalTax, discountAmount, total } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    for (const line of lineItems) {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unitPrice) || 0;
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : (formData.type ? defaultTaxRate : 0);
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
  }, [lineItems, defaultTaxRate, formData.type, formData.discountType, formData.discountValue]);

  const detailTotals = useMemo(() => {
    if (!sale) return { subtotal: 0, total: 0 };
    const lines = sale.lineItems?.length ? sale.lineItems : [{ quantity: sale.quantity ?? 1, unitPrice: sale.unitPrice ?? sale.amount }];
    const sub = Math.round(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100;
    const tax = sale.totalTax ?? 0;
    const disc = sale.totalDiscount ?? 0;
    const tot = Math.round((sub + tax - disc) * 100) / 100;
    return { subtotal: sub, total: tot };
  }, [sale]);

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
        const item = items.find((i: { id: number }) => i.id === parseInt(itemId, 10)) as { unitId?: number; unit_price?: number; unitPrice?: number; defaultTaxRatePercent?: number } | undefined;
        line.quantity = "1";
        line.unitId = item?.unitId ?? null;
        const price = item?.unit_price ?? item?.unitPrice;
        line.unitPrice = price != null ? String(price) : "";
        line.taxRatePercent = formData.type ? String(defaultTaxRate) : (item?.defaultTaxRatePercent != null ? String(item.defaultTaxRatePercent) : "");
      }
      next[index] = line;
      return next;
    });
    if (itemId && formData.type && formData.date) {
      taxRulesApi.resolve({ context: 'sale', salesType: formData.type, itemId: parseInt(itemId, 10), date: formData.date })
        .then((r) => setLineItems((prev) => {
          const next = [...prev];
          if (next[index]?.itemId === itemId) next[index] = { ...next[index], taxRatePercent: r.rate.toString() };
          return next;
        }))
        .catch(() => {});
    }
  };

  const hasAnyItem = lineItems.some((l) => l.itemId !== "");

  useEffect(() => {
    if (sale) {
      const hasTime = sale.date.includes("T");
      setFormData({
        date: sale.date.split("T")[0],
        time: hasTime ? sale.date.slice(11, 16) : "00:00",
        type: sale.type,
        description: sale.description || "",
        discountType: "amount",
        discountValue: sale.totalDiscount != null && sale.totalDiscount > 0 ? sale.totalDiscount.toString() : "",
      });
      if (sale.lineItems?.length) {
        setLineItems(
          sale.lineItems.map((l) => ({
            itemId: l.itemId?.toString() ?? "",
            quantity: String(l.quantity),
            unitId: l.unitId ?? null,
            unitPrice: String(l.unitPrice),
            unitCost: l.unitCost != null ? String(l.unitCost) : "",
            taxRatePercent: l.taxRatePercent != null ? String(l.taxRatePercent) : "",
            taxInclusive: (l as { taxInclusive?: boolean }).taxInclusive ?? false,
          }))
        );
      } else {
        setLineItems([{ itemId: sale.itemId?.toString() ?? "", quantity: String(sale.quantity ?? 1), unitId: sale.unitId ?? null, unitPrice: String(sale.unitPrice ?? sale.amount), unitCost: sale.unitCost != null ? String(sale.unitCost) : "", taxRatePercent: "", taxInclusive: false }]);
      }
    }
  }, [sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateTimeIso = new Date(`${formData.date}T${formData.time}`).toISOString();
      const payloadLines = lineItems.map((line) => {
        const price = parseFloat(line.unitPrice) || 0;
        const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : (formData.type ? defaultTaxRate : 0);
        const unitPriceNet = line.taxInclusive ? netUnitPriceFromInclusive(price, lineRate) : price;
        return {
          itemId: line.itemId ? parseInt(line.itemId) : undefined,
          quantity: parseFloat(line.quantity) || 0,
          unitId: line.unitId ?? undefined,
          unitPrice: unitPriceNet,
          unitCost: line.unitCost ? parseFloat(line.unitCost) : undefined,
          taxRatePercent: line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : undefined,
        };
      });
      if (payloadLines.some((l) => l.quantity <= 0 || l.unitPrice < 0)) {
        toast.error("Each line needs positive quantity and non-negative unit price");
        return;
      }
      await updateSale.mutateAsync({
        id: saleId,
        data: {
          date: dateTimeIso,
          type: formData.type as SalesType,
          lineItems: payloadLines,
          description: formData.description || undefined,
          discount:
            formData.discountValue && parseFloat(formData.discountValue) > 0
              ? { type: formData.discountType as "amount" | "percent", value: parseFloat(formData.discountValue) }
              : undefined,
        } as any,
      });
      toast.success("Sale updated successfully");
      router.push(`/sales/${saleId}`);
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sale");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm("Are you sure you want to delete this sale? This action cannot be undone.")
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(String(saleId));
      toast.success("Sale deleted successfully");
      onDeleted();
    } catch (error) {
      toast.error("Failed to delete sale");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    const updates: Record<string, string | number> = { [field]: value };
    if (field === "itemId") {
      if (!value) {
        updates.unitPrice = "";
        updates.unitCost = "";
      }
    }
    setFormData((prev) => ({ ...prev, ...updates }));
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

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Sale not found</h2>
          <p className="text-sm text-muted-foreground">
            This sale may have been deleted or doesn't exist.
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to sales
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
              <h2 className="text-lg font-semibold">Edit transaction</h2>
              <p className="text-sm text-muted-foreground">Update line items and totals</p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker value={formData.date ? new Date(formData.date) : undefined} onChange={(d) => handleInputChange("date", d ? dateToYYYYMMDD(d) : "")} placeholder="Pick a date" />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <TimePicker value={formData.time} onChange={(t) => handleInputChange("time", t)} placeholder="Time" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Dining option</Label>
                <UnifiedSelector
                  type="type"
                  items={typeOptions}
                  selectedId={formData.type || undefined}
                  onSelect={(item) => handleInputChange("type", item.id === 0 ? "" : String(item.id))}
                  placeholder="Select type"
                />
                <p className="text-xs text-muted-foreground pl-3">Tax rate: {defaultTaxRate.toFixed(1)}%</p>
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
                        type="item"
                        items={items}
                        selectedId={line.itemId ? parseInt(line.itemId) : undefined}
                        onSelect={(item) => handleItemSelect(index, item.id === 0 ? "" : String(item.id))}
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
                                value={line.taxRatePercent !== "" ? line.taxRatePercent : (formData.type ? String(defaultTaxRate) : "")}
                                onChange={(e) => updateLine(index, "taxRatePercent", e.target.value)}
                                placeholder={formData.type ? String(defaultTaxRate) : "—"}
                              />
                            }
                            addon={
                              <div className="flex h-full min-h-10 items-center justify-center leading-none" title="Price includes tax">
                                <Checkbox
                                  id={`tax-incl-${index}`}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <div className="flex gap-2">
                    <select className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={formData.discountType} onChange={(e) => setFormData((p) => ({ ...p, discountType: e.target.value as "amount" | "percent" }))}>
                      <option value="amount">Amount</option>
                      <option value="percent">Percent</option>
                    </select>
                    <Input type="number" step="0.01" min="0" value={formData.discountValue} onChange={(e) => setFormData((p) => ({ ...p, discountValue: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm">
              {hasAnyItem ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax ({defaultTaxRate.toFixed(1)}%)</span><span className="tabular-nums">{totalTax.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="tabular-nums">-{discountAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold pt-2 border-t"><span>Total</span><span className="tabular-nums">{total.toFixed(2)}</span></div>
                </>
              ) : (
                <div className="flex justify-between font-semibold items-center">
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
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} placeholder="Notes" rows={2} className="resize-none" />
            </div>
          </div>
        </ScrollArea>
        <div className="mt-auto flex shrink-0 gap-3 border-t bg-background p-4 -mx-6">
          <Button type="button" variant="outline" onClick={() => router.push(`/sales/${saleId}`)} className="flex-1">Cancel</Button>
          <Button
            type="submit"
            disabled={updateSale.isPending || (hasAnyItem ? total <= 0 : (parseFloat(lineItems[0]?.unitPrice ?? "0") || 0) <= 0)}
            className="flex-1"
          >
            {updateSale.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 space-y-0">
        <div className="flex items-start justify-between gap-4 pb-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(sale.date)} · {typeLabels[sale.type] || sale.type}
            </p>
            <h2 className="text-lg font-semibold">Sale details</h2>
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
                <DropdownMenuItem onClick={() => router.push(`/sales/${saleId}/edit`)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit sale
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
                {formatCurrency(detailTotals.total)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(sale.date)}
                </span>
                <Badge variant="secondary" className="font-normal">
                  {typeLabels[sale.type] || sale.type}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-0">
            <DetailRow icon={Calendar} label="Date">
              {formatDateTime(sale.date)}
            </DetailRow>
            <Separator />
            <DetailRow icon={Tag} label="Type">
              <Badge variant="outline">{typeLabels[sale.type] || sale.type}</Badge>
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
                    {(sale.lineItems && sale.lineItems.length > 0
                      ? sale.lineItems
                      : [{ id: 0, item: sale.item, quantity: sale.quantity ?? 1, unitPrice: sale.unitPrice ?? sale.amount, lineTotal: sale.amount }]
                    ).map((line: { id: number; item?: { name?: string }; quantity: number; unitPrice: number; lineTotal: number }) => {
                      const lineTotalDisplay = Math.round(line.quantity * line.unitPrice * 100) / 100;
                      return (
                        <tr key={line.id} className="border-b last:border-0">
                          <td className="p-2">{line.item?.name ?? "—"}</td>
                          <td className="p-2 text-right tabular-nums">{line.quantity}</td>
                          <td className="p-2 text-right tabular-nums">{formatCurrency(line.unitPrice)}</td>
                          <td className="p-2 text-right tabular-nums">{formatCurrency(lineTotalDisplay)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(detailTotals.subtotal)}</span>
                </div>
                {sale.totalTax != null && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      Tax
                      {detailTotals.subtotal > 0 && (
                        <span className="ml-1 font-normal text-muted-foreground/80">
                          ({((sale.totalTax / detailTotals.subtotal) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums">{formatCurrency(sale.totalTax)}</span>
                  </div>
                )}
                {sale.totalDiscount != null && sale.totalDiscount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatCurrency(sale.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t mt-1 pt-2">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(detailTotals.total)}</span>
                </div>
              </div>
            </div>
            {sale.description && (
              <>
                <Separator />
                <DetailRow icon={FileText} label="Description">
                  <p className="whitespace-pre-wrap text-foreground/90">
                    {sale.description}
                  </p>
                </DetailRow>
              </>
            )}
          </div>

          <Separator />

          <div className="flex gap-6 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created</span>{" "}
              {formatDate(sale.createdAt)}
            </div>
            <div>
              <span className="font-medium">Updated</span>{" "}
              {formatDate(sale.updatedAt)}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
