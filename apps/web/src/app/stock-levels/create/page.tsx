"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { UnifiedSelector } from "@/components/unified-selector";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateStockLevel, useItems, useUnits } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateStockLevelPage() {
  const router = useRouter();
  const createStockLevel = useCreateStockLevel();
  const { data: itemsResponse } = useItems({ limit: 1000 });
  
  const items = itemsResponse?.data || [];
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const [formData, setFormData] = useState({
    itemId: "",
    quantity: "",
    unitId: null as number | null,
    location: "",
    minimumStockLevel: "",
    maximumStockLevel: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemId || !formData.quantity || formData.unitId == null) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(formData.quantity) < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }

    try {
      await createStockLevel.mutateAsync({
        itemId: parseInt(formData.itemId),
        quantity: parseFloat(formData.quantity),
        unitId: formData.unitId,
        unit: (unitsData || []).find((u) => u.id === formData.unitId)?.symbol,
        location: formData.location || undefined,
        minimumStockLevel: formData.minimumStockLevel ? parseFloat(formData.minimumStockLevel) : undefined,
        maximumStockLevel: formData.maximumStockLevel ? parseFloat(formData.maximumStockLevel) : undefined,
      });
      toast.success("Stock level created successfully");
      router.push('/stock-levels');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create stock level");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill unit when item is selected
    if (field === 'itemId' && value) {
      const selectedItem = items.find(i => i.id === parseInt(value));
      if (selectedItem?.unitId != null) {
        setFormData(prev => ({ ...prev, unitId: selectedItem.unitId }));
      }
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Stock Level</h1>
          <p className="text-muted-foreground">Set up stock tracking for an item</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stock Level Information</CardTitle>
            <CardDescription>Enter the details for this stock level</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <UnifiedSelector
                    label="Item"
                    required
                    type="item"
                    items={items.filter(i => i.isActive && i.itemType === 'item').map((item) => ({
                      ...item,
                      id: item.id,
                      name: `${item.name} (${item.unit})`,
                    }))}
                    selectedId={formData.itemId ? parseInt(formData.itemId) : undefined}
                    onSelect={(item) => handleInputChange('itemId', item.id === 0 ? '' : String(item.id))}
                    placeholder="Select item"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Main Storage, Freezer A, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Current Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <UnifiedSelector
                    label="Unit *"
                    type="unit"
                    items={unitItems}
                    selectedId={formData.unitId ?? undefined}
                    onSelect={(item) => handleInputChange('unitId', item.id === 0 ? null : (item.id as number))}
                    placeholder="Select unit"
                    manageLink={{ href: '/settings/units', text: 'Manage units' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumStockLevel">Minimum Stock Level</Label>
                  <Input
                    id="minimumStockLevel"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimumStockLevel}
                    onChange={(e) => handleInputChange('minimumStockLevel', e.target.value)}
                    placeholder="Reorder point"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when stock falls below this level
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maximumStockLevel">Maximum Stock Level</Label>
                  <Input
                    id="maximumStockLevel"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maximumStockLevel}
                    onChange={(e) => handleInputChange('maximumStockLevel', e.target.value)}
                    placeholder="Max capacity"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum stock to hold
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/stock-levels')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createStockLevel.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createStockLevel.isPending ? "Creating..." : "Create Stock Level"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

