"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateItem, useInventorySuppliers, useUnits } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateItemPage() {
  const router = useRouter();
  const createItem = useCreateItem();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    sku: "",
    unitId: null as number | null,
    unitPrice: "",
    vendorId: "",
    notes: "",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the item name");
      return;
    }

    try {
      await createItem.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        sku: formData.sku || undefined,
        unitId: formData.unitId ?? undefined,
        unit: formData.unitId != null ? (unitsData || []).find((u) => u.id === formData.unitId)?.symbol : undefined,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
        vendorId: formData.vendorId ? parseInt(formData.vendorId) : undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
      });
      toast.success("Item created successfully");
      router.push('/items');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create item");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Item</h1>
          <p className="text-muted-foreground">Add a new inventory item</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
            <CardDescription>Enter the details for this item</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Item name"
                    required
                  />
                </div>

                {/* SKU */}
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="SKU-001"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="e.g., Food, Supplies, Equipment"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-2">
                  <UnifiedSelector
                    label="Unit"
                    type="unit"
                    items={unitItems}
                    selectedId={formData.unitId ?? undefined}
                    onSelect={(item) => handleInputChange('unitId', item.id === 0 ? null : (item.id as number))}
                    placeholder="Select unit"
                    manageLink={{ href: '/settings/units', text: 'Manage units' }}
                  />
                </div>

                {/* Unit Price */}
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Vendor */}
                <div className="space-y-2">
                  <UnifiedSelector
                    label="Vendor"
                    type="vendor"
                    items={suppliersResponse?.data ?? []}
                    selectedId={formData.vendorId ? parseInt(formData.vendorId) : undefined}
                    onSelect={(item) => handleInputChange('vendorId', item.id === 0 ? '' : String(item.id))}
                    placeholder="Select vendor"
                  />
                </div>

                {/* Is Active */}
                <div className="space-y-2 flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Item description"
                  rows={3}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this item"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/items')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createItem.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createItem.isPending ? "Creating..." : "Create Item"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

