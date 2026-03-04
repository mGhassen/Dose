"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { DatePicker } from "@kit/ui/date-picker";
import { TimePicker } from "@kit/ui/time-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { useCreateSale, useItems, useUnits, useVariablesByType } from "@kit/hooks";
import { toast } from "sonner";
import type { SalesType } from "@kit/types";
import type { SaleLineItemInput } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export interface SaleCreateContentProps {
  onClose: () => void;
  onCreated?: (saleId: number) => void;
}

const TYPE_OPTIONS = [
  { id: "on_site", name: "On site" },
  { id: "delivery", name: "Delivery" },
  { id: "takeaway", name: "Takeaway" },
  { id: "catering", name: "Catering" },
  { id: "other", name: "Other" },
];

import { getEffectiveTransactionTaxRate, lineTaxAmount, netUnitPriceFromInclusive } from "@/lib/transaction-tax";

export function SaleCreateContent({ onClose, onCreated }: SaleCreateContentProps) {
  const router = useRouter();
  const createSale = useCreateSale();
  const { data: itemsResponse } = useItems({ limit: 1000, producedOnly: true });
  const items = itemsResponse?.data ?? [];
  const { data: unitsData } = useUnits();
  const { data: taxVariables } = useVariablesByType('transaction_tax');
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));

  const now = new Date();
  const [formData, setFormData] = useState({
    date: dateToYYYYMMDD(now),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    type: "" as SalesType | "",
    description: "",
    discountType: "amount" as "amount" | "percent",
    discountValue: "",
  });

  const [lineItems, setLineItems] = useState<Array<{ itemId: string; quantity: string; unitId: number | null; unitPrice: string; unitCost: string; taxRatePercent: string; taxInclusive: boolean }>>([
    { itemId: "", quantity: "1", unitId: null, unitPrice: "", unitCost: "", taxRatePercent: "", taxInclusive: false },
  ]);

  const typeTaxRate = useMemo(
    () => getEffectiveTransactionTaxRate(taxVariables, formData.type, formData.date),
    [taxVariables, formData.type, formData.date]
  );

  const { subtotal, totalTax, discountAmount, total } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    for (const line of lineItems) {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unitPrice) || 0;
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : typeTaxRate;
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
  }, [lineItems, typeTaxRate, formData.discountType, formData.discountValue]);

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
    updateLine(index, "itemId", itemId);
    if (!itemId) {
      updateLine(index, "taxRatePercent", "");
      return;
    }
    const item = items.find((i: { id: number }) => i.id === parseInt(itemId, 10));
    if (item && (item as { defaultTaxRatePercent?: number }).defaultTaxRatePercent != null) {
      updateLine(index, "taxRatePercent", String((item as { defaultTaxRatePercent: number }).defaultTaxRatePercent));
    } else {
      updateLine(index, "taxRatePercent", "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.type) {
      toast.error("Date and dining option are required");
      return;
    }
    const payloadLines: SaleLineItemInput[] = [];
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        toast.error(`Line ${i + 1}: quantity (positive) and unit price are required`);
        return;
      }
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : typeTaxRate;
      const unitPriceNet = line.taxInclusive ? netUnitPriceFromInclusive(price, lineRate) : price;
      payloadLines.push({
        itemId: line.itemId ? parseInt(line.itemId) : undefined,
        quantity: qty,
        unitId: line.unitId ?? undefined,
        unitPrice: unitPriceNet,
        unitCost: line.unitCost ? parseFloat(line.unitCost) : undefined,
        taxRatePercent: line.taxRatePercent !== "" ? lineRate : undefined,
      });
    }
    const dateTimeIso = new Date(`${formData.date}T${formData.time}`).toISOString();
    const payload = {
      date: dateTimeIso,
      type: formData.type as SalesType,
      lineItems: payloadLines,
      description: formData.description || undefined,
      discount:
        formData.discountValue && parseFloat(formData.discountValue) > 0
          ? { type: formData.discountType as "amount" | "percent", value: parseFloat(formData.discountValue) }
          : undefined,
    };
    try {
      const sale = await createSale.mutateAsync(payload as any);
      toast.success("Transaction created");
      if (onCreated && sale?.id) onCreated(sale.id);
      else onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create transaction");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0 pb-4 border-b border-border">
        <h2 className="text-lg font-semibold">Create transaction</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                id="date"
                value={formData.date ? new Date(formData.date) : undefined}
                onChange={(d) => setFormData((p) => ({ ...p, date: d ? dateToYYYYMMDD(d) : "" }))}
                placeholder="Pick a date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <TimePicker
                id="time"
                value={formData.time}
                onChange={(t) => setFormData((p) => ({ ...p, time: t }))}
                placeholder="Pick a time"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Dining option *</Label>
              <UnifiedSelector
                type="type"
                items={TYPE_OPTIONS}
                selectedId={formData.type || undefined}
                onSelect={(item) => setFormData((p) => ({ ...p, type: (item.id === 0 ? "" : String(item.id)) as SalesType }))}
                placeholder="Select type"
              />
              {formData.type && (
                <p className="text-xs text-muted-foreground">Default tax: {typeTaxRate.toFixed(1)}% (from Settings). Item default tax is used when set.</p>
              )}
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
                  <div className="col-span-4">
                    <UnifiedSelector
                      label=""
                      type="item"
                      items={items}
                      selectedId={line.itemId ? parseInt(line.itemId) : undefined}
                      onSelect={(item) => handleItemSelect(index, item.id === 0 ? "" : String(item.id))}
                      onCreateNew={() => router.push("/items/create")}
                      placeholder="Item (optional)"
                      getDisplayName={(i) => `${(i as { name?: string }).name ?? i.id}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <UnifiedSelector
                      label=""
                      type="unit"
                      items={unitItems}
                      selectedId={line.unitId ?? undefined}
                      onSelect={(item) => updateLine(index, "unitId", item.id === 0 ? null : (item.id as number))}
                      placeholder="Unit"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">{line.taxInclusive ? "Price (incl. tax)" : "Price (excl. tax)"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1 items-end justify-end pb-2">
                    <Label className="text-xs opacity-0 pointer-events-none">Tax</Label>
                    <select
                      className="flex h-9 rounded-md border border-input bg-transparent px-2 py-1 text-xs w-full min-w-0"
                      value={line.taxInclusive ? "incl" : "excl"}
                      onChange={(e) => updateLine(index, "taxInclusive", e.target.value === "incl")}
                      title="Tax"
                    >
                      <option value="excl">Excl.</option>
                      <option value="incl">Incl.</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex items-end pb-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lineItems.length <= 1}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{totalTax.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createSale.isPending || total <= 0} className="flex-1">
              {createSale.isPending ? "Creating…" : "Create transaction"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </div>
  );
}
