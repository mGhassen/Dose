"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateStockMovement, useItems } from "@kit/hooks";
import { toast } from "sonner";
import { StockMovementType } from "@kit/types";

export default function CreateStockMovementPage() {
  const router = useRouter();
  const createMovement = useCreateStockMovement();
  const { data: itemsResponse } = useItems({ limit: 1000 });
  
  const items = itemsResponse?.data || [];
  
  const [formData, setFormData] = useState({
    itemId: "",
    movementType: StockMovementType.IN,
    quantity: "",
    unit: "",
    location: "",
    notes: "",
    movementDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemId || !formData.quantity || !formData.unit) {
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
        unit: formData.unit,
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
      if (selectedItem) {
        setFormData(prev => ({ ...prev, unit: selectedItem.unit || '' }));
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
                  <Label htmlFor="itemId">Item *</Label>
                  <Select
                    value={formData.itemId}
                    onValueChange={(value) => handleInputChange('itemId', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.filter(i => i.isActive && i.itemType === 'item').map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} ({item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="movementType">Movement Type *</Label>
                  <Select
                    value={formData.movementType}
                    onValueChange={(value) => handleInputChange('movementType', value as StockMovementType)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {movementTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    placeholder="kg, L, piece, etc."
                    required
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
                  <Input
                    id="movementDate"
                    type="date"
                    value={formData.movementDate}
                    onChange={(e) => handleInputChange('movementDate', e.target.value)}
                    required
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

