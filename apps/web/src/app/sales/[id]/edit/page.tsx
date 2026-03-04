"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSaleById, useUpdateSale, useItems, useUnits } from "@kit/hooks";
import { toast } from "sonner";
import { dateToYYYYMMDD } from "@kit/lib";
import type { SalesType } from "@kit/types";
import { DatePicker } from "@kit/ui/date-picker";
import { TimePicker } from "@kit/ui/time-picker";

interface EditSalePageProps {
  params: Promise<{ id: string }>;
}

export default function EditSalePage({ params }: EditSalePageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: sale, isLoading } = useSaleById(resolvedParams?.id || "");
  const { data: itemsResponse } = useItems({ limit: 1000, producedOnly: true });
  const items = itemsResponse?.data ?? [];
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const updateSale = useUpdateSale();
  
  const [formData, setFormData] = useState({
    date: "",
    time: "00:00",
    type: "" as SalesType | "",
    amount: "",
    quantity: "",
    unitId: null as number | null,
    description: "",
    itemId: "",
    unitPrice: "",
    unitCost: "",
  });

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

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (sale) {
      const hasTime = sale.date.includes("T");
      setFormData({
        date: sale.date.split("T")[0],
        time: hasTime ? sale.date.slice(11, 16) : "00:00",
        type: sale.type,
        amount: sale.amount.toString(),
        quantity: sale.quantity?.toString() || "",
        unitId: sale.unitId ?? null,
        description: sale.description || "",
        itemId: sale.itemId?.toString() || "",
        unitPrice: sale.unitPrice != null ? sale.unitPrice.toString() : "",
        unitCost: sale.unitCost != null ? sale.unitCost.toString() : "",
      });
    }
  }, [sale]);

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

    if (!resolvedParams?.id) return;

    try {
      const dateTimeIso = new Date(`${formData.date}T${formData.time}`).toISOString();
      await updateSale.mutateAsync({
        id: resolvedParams.id,
        data: {
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
        },
      });
      toast.success("Sale updated successfully");
      router.push(`/sales/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sale");
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

  if (isLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!sale) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Sale Not Found</h1>
            <p className="text-muted-foreground">The sale you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/sales')}>Back to Sales</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Sale</h1>
          <p className="text-muted-foreground">Update sale information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sale Information</CardTitle>
            <CardDescription>Update the details for this sale</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
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
                    Only produced items are shown. When selected, quantity and unit are required.
                  </p>
                </div>

                {/* Quantity + Unit - when item selected */}
                {hasItemSelected && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                        placeholder="e.g. 2"
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
                        manageLink={{ href: '/settings/units', text: 'Manage units' }}
                        placeholder="Select unit"
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
                        placeholder="Unit selling price"
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
                        placeholder="Unit cost price"
                      />
                    </div>
                    {priceOnDate && (
                      <p className="text-xs text-muted-foreground md:col-span-2">
                        Price on {formData.date}: selling {priceOnDate.unitPrice != null ? ` ${priceOnDate.unitPrice.toFixed(2)}` : '—'}, cost {priceOnDate.unitCost != null ? ` ${priceOnDate.unitCost.toFixed(2)}` : '—'} (from history or default)
                      </p>
                    )}
                  </>
                )}

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

                {/* Amount */}
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
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Additional notes about this sale"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/sales/${resolvedParams.id}`)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSale.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateSale.isPending ? "Updating..." : "Update Sale"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

