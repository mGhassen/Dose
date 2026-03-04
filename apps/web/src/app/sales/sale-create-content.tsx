"use client";

import { useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import { DatePicker } from "@kit/ui/date-picker";
import { TimePicker } from "@kit/ui/time-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Save, X } from "lucide-react";
import { useCreateSale, useItems, useUnits } from "@kit/hooks";
import { toast } from "sonner";
import type { SalesType } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export interface SaleCreateContentProps {
  onClose: () => void;
  onCreated?: (saleId: number) => void;
}

export function SaleCreateContent({ onClose, onCreated }: SaleCreateContentProps) {
  const createSale = useCreateSale();
  const { data: itemsResponse } = useItems({ limit: 1000, producedOnly: true });
  const items = itemsResponse?.data ?? [];
  const now = new Date();
  const [formData, setFormData] = useState({
    date: dateToYYYYMMDD(now),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    type: "" as SalesType | "",
    amount: "",
    quantity: "",
    unitId: null as number | null,
    description: "",
    itemId: "",
    unitPrice: "",
    unitCost: "",
  });

  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const hasItemSelected = !!formData.itemId;
  const quantityUnitRequired = hasItemSelected;

  const [priceOnDate, setPriceOnDate] = useState<{ unitPrice: number | null; unitCost: number | null } | null>(null);
  useEffect(() => {
    if (!formData.itemId || !formData.date) {
      setPriceOnDate(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/items/${formData.itemId}/resolved-price?date=${formData.date}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!cancelled && d) setPriceOnDate({ unitPrice: d.unitPrice ?? null, unitCost: d.unitCost ?? null });
        else if (!cancelled) setPriceOnDate(null);
      })
      .catch(() => { if (!cancelled) setPriceOnDate(null); });
    return () => { cancelled = true; };
  }, [formData.itemId, formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.type || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (quantityUnitRequired && (!formData.quantity || formData.unitId == null)) {
      toast.error("Quantity and unit are required when an item or recipe is selected");
      return;
    }
    try {
      const dateTimeIso = new Date(`${formData.date}T${formData.time}`).toISOString();
      const sale = await createSale.mutateAsync({
        date: dateTimeIso,
        type: formData.type as SalesType,
        amount: parseFloat(formData.amount),
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unitId: formData.unitId ?? undefined,
        unit: formData.unitId != null ? (unitsData || []).find((u) => u.id === formData.unitId)?.symbol : undefined,
        description: formData.description || undefined,
        itemId: formData.itemId ? parseInt(formData.itemId) : undefined,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
        unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
      });
      toast.success("Sale created successfully");
      if (onCreated && sale?.id) onCreated(sale.id);
      else onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create sale");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    const updates: Record<string, any> = { [field]: value };
    if (field === 'itemId') {
      const item = value ? items.find(i => i.id === parseInt(value)) : undefined;
      updates.unitId = item?.unitId ?? null;
      updates.unitPrice = item?.unitPrice != null ? String(item.unitPrice) : '';
      updates.unitCost = item?.unitCost != null ? String(item.unitCost) : '';
      if (!value) {
        updates.quantity = '';
        updates.unitId = null;
        updates.unitPrice = '';
        updates.unitCost = '';
      }
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0 pb-4 border-b border-border">
        <h2 className="text-lg font-semibold">Create Sale</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <UnifiedSelector
              label="Item"
              type="item"
              items={items}
              selectedId={formData.itemId ? parseInt(formData.itemId) : undefined}
              onSelect={(item) => handleInputChange('itemId', item.id === 0 ? '' : String(item.id))}
              placeholder="Select produced item (optional)"
              getDisplayName={(i) => `${(i as { name?: string }).name ?? i.id}${(i as { category?: string }).category ? ` (${(i as { category?: string }).category})` : ''}`}
            />
            <p className="text-xs text-muted-foreground">
              When selected, quantity and unit are required.
            </p>
          </div>

          {hasItemSelected && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    required={quantityUnitRequired}
                  />
                </div>
                <div className="space-y-2">
                  <UnifiedSelector
                    label="Unit"
                    required={quantityUnitRequired}
                    type="unit"
                    items={unitItems}
                    selectedId={formData.unitId ?? undefined}
                    onSelect={(item) => handleInputChange('unitId', item.id === 0 ? null : (item.id as number))}
                    placeholder="Select unit"
                    manageLink={{ href: '/settings/units', text: 'Manage units' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Sell price</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Cost price</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => handleInputChange('unitCost', e.target.value)}
                  />
                </div>
              </div>
              {priceOnDate && (
                <p className="text-xs text-muted-foreground">
                  Price on {formData.date}: selling {priceOnDate.unitPrice != null ? priceOnDate.unitPrice.toFixed(2) : '—'}, cost {priceOnDate.unitCost != null ? priceOnDate.unitCost.toFixed(2) : '—'}
                </p>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                id="date"
                value={formData.date ? new Date(formData.date) : undefined}
                onChange={(d) => handleInputChange("date", d ? dateToYYYYMMDD(d) : "")}
                placeholder="Pick a date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <TimePicker
                id="time"
                value={formData.time}
                onChange={(t) => handleInputChange("time", t)}
                placeholder="Pick a time"
              />
            </div>
            <UnifiedSelector
              label="Type"
              required
              type="type"
              items={[
                { id: 'on_site', name: 'On Site' },
                { id: 'delivery', name: 'Delivery' },
                { id: 'takeaway', name: 'Takeaway' },
                { id: 'catering', name: 'Catering' },
                { id: 'other', name: 'Other' },
              ]}
              selectedId={formData.type || undefined}
              onSelect={(item) => handleInputChange('type', item.id === 0 ? '' : String(item.id))}
              placeholder="Select type"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createSale.isPending} className="flex-1">
              {createSale.isPending ? "Creating..." : "Create Sale"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </div>
  );
}
