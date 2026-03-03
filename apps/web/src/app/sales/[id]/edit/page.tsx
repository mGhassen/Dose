"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSaleById, useUpdateSale, useItems } from "@kit/hooks";
import { toast } from "sonner";
import type { SalesType } from "@kit/types";

const COMMON_UNITS = ['g', 'kg', 'L', 'ml', 'serving', 'piece', 'portion', 'box', 'unit'];

interface EditSalePageProps {
  params: Promise<{ id: string }>;
}

export default function EditSalePage({ params }: EditSalePageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: sale, isLoading } = useSaleById(resolvedParams?.id || "");
  const { data: itemsResponse } = useItems({ limit: 1000, includeRecipes: true });
  const items = (itemsResponse?.data ?? []).filter(i => i.itemType === 'item' || i.itemType === 'recipe');
  const updateSale = useUpdateSale();
  
  const [formData, setFormData] = useState({
    date: "",
    type: "" as SalesType | "",
    amount: "",
    quantity: "",
    unit: "",
    description: "",
    itemId: "",
  });

  const selectedItem = formData.itemId ? items.find(i => i.id === parseInt(formData.itemId)) : undefined;
  const unitItems = useMemo(() => {
    const units = [...COMMON_UNITS];
    const itemUnit = selectedItem?.unit || formData.unit;
    if (itemUnit && !units.includes(itemUnit)) {
      units.unshift(itemUnit);
    }
    return units.map((u) => ({ id: u, name: u }));
  }, [selectedItem?.unit, formData.unit]);

  const hasItemSelected = !!formData.itemId;
  const quantityUnitRequired = hasItemSelected;

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (sale) {
      setFormData({
        date: sale.date.split('T')[0],
        type: sale.type,
        amount: sale.amount.toString(),
        quantity: sale.quantity?.toString() || "",
        unit: sale.unit || "",
        description: sale.description || "",
        itemId: sale.itemId?.toString() || "",
      });
    }
  }, [sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.type || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (quantityUnitRequired && (!formData.quantity || !formData.unit)) {
      toast.error("Quantity and unit are required when an item or recipe is selected");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateSale.mutateAsync({
        id: resolvedParams.id,
        data: {
          date: formData.date,
          type: formData.type as SalesType,
          amount: parseFloat(formData.amount),
          quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
          unit: formData.unit || undefined,
          description: formData.description || undefined,
          itemId: formData.itemId ? parseInt(formData.itemId) : undefined,
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
      updates.unit = item?.unit || '';
      if (!value) {
        updates.quantity = '';
        updates.unit = '';
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
                {/* Item/Recipe - first */}
                <div className="space-y-2 md:col-span-2">
                  <UnifiedSelector
                    label="Item/Recipe"
                    type="item"
                    items={items}
                    selectedId={formData.itemId ? parseInt(formData.itemId) : undefined}
                    onSelect={(item) => handleInputChange('itemId', item.id === 0 ? '' : String(item.id))}
                    placeholder="Select item or recipe (optional)"
                    getDisplayName={(i) => (i as { itemType?: string }).itemType === 'recipe' ? `${i.name} (Recipe)` : `${i.name} ${(i as { category?: string }).category ? `(${(i as { category?: string }).category})` : ''}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    When selected, quantity and unit are required.
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
                        selectedId={formData.unit || undefined}
                        onSelect={(item) => handleInputChange('unit', String(item.id))}
                        placeholder="Select unit"
                      />
                    </div>
                  </>
                )}

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required
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

