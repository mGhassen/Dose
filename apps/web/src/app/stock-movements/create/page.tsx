"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateStockMovement, useItems, useUnits } from "@kit/hooks";
import { toast } from "sonner";
import { StockMovementType } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export default function CreateStockMovementPage() {
  const router = useRouter();
  const createMovement = useCreateStockMovement();
  const { data: itemsResponse } = useItems({ limit: 1000 });
  
  const items = itemsResponse?.data || [];
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const [formData, setFormData] = useState({
    itemId: "",
    movementType: StockMovementType.IN,
    quantity: "",
    unitId: null as number | null,
    location: "",
    notes: "",
    movementDate: dateToYYYYMMDD(new Date()),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemId || !formData.quantity || formData.unitId == null) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(formData.quantity) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    try {
      await createMovement.mutateAsync({
        itemId: parseInt(formData.itemId),
        movementType: formData.movementType,
        quantity: parseFloat(formData.quantity),
        unitId: formData.unitId,
        unit: (unitsData || []).find((u) => u.id === formData.unitId)?.symbol ?? '',
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        movementDate: formData.movementDate,
      });
      toast.success("Stock movement created successfully");
      router.push('/stock-movements');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create stock movement");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill unit when item is selected
    if (field === 'itemId' && value) {
      const selectedItem = items.find(i => i.id === parseInt(value));
      if (selectedItem?.unitId != null) {
        setFormData(prev => ({ ...prev, unitId: selectedItem.unitId ?? null }));
      }
    }
  };

  const movementTypeOptions = [
    { value: StockMovementType.IN, label: 'In - Stock Received' },
    { value: StockMovementType.OUT, label: 'Out - Stock Used' },
    { value: StockMovementType.ADJUSTMENT, label: 'Adjustment - Stock Correction' },
    { value: StockMovementType.TRANSFER, label: 'Transfer - Location Transfer' },
    { value: StockMovementType.WASTE, label: 'Waste - Stock Wasted' },
    { value: StockMovementType.EXPIRED, label: 'Expired - Stock Expired' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Stock Movement</h1>
          <p className="text-muted-foreground">Record a stock movement (in, out, adjustment, etc.)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Movement Information</CardTitle>
            <CardDescription>Enter the details for this stock movement</CardDescription>
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
                    getDisplayName={(item) => item.name ?? `Item ${item.id}`}
                  />
                </div>

                <UnifiedSelector
                  label="Movement Type"
                  required
                  type="type"
                  items={movementTypeOptions.map((o) => ({ id: o.value, name: o.label }))}
                  selectedId={formData.movementType || undefined}
                  onSelect={(item) => handleInputChange('movementType', String(item.id) as StockMovementType)}
                  placeholder="Select type"
                />

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
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
                    manageLink={{ href: '/variables', text: 'Variables' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Storage location (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="movementDate">Movement Date *</Label>
                  <DatePicker
                    id="movementDate"
                    value={formData.movementDate ? new Date(formData.movementDate) : undefined}
                    onChange={(d) => handleInputChange("movementDate", d ? dateToYYYYMMDD(d) : "")}
                    placeholder="Pick a date"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about this movement"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/stock-movements')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createMovement.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createMovement.isPending ? "Creating..." : "Create Movement"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

