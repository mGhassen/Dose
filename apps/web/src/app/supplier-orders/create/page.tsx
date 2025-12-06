"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X, Plus, Trash2, Calculator } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateSupplierOrder, useInventorySuppliers, useItems } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { SupplierOrderStatus } from "@kit/types";

interface OrderItem {
  itemId: number;
  quantity: number;
  unit: string;
  unitPrice: number;
  notes?: string;
}

export default function CreateSupplierOrderPage() {
  const router = useRouter();
  const createOrder = useCreateSupplierOrder();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const { data: itemsResponse } = useItems({ limit: 1000 });
  
  const suppliers = suppliersResponse?.data || [];
  const allItems = itemsResponse?.data || [];
  
  const [formData, setFormData] = useState({
    supplierId: "",
    orderNumber: "",
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: "",
    notes: "",
  });
  
  const [items, setItems] = useState<OrderItem[]>([]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.itemId || item.quantity <= 0 || item.unitPrice <= 0) {
        toast.error("Please fill in all item details correctly");
        return;
      }
    }

    try {
      await createOrder.mutateAsync({
        supplierId: parseInt(formData.supplierId),
        orderNumber: formData.orderNumber || undefined,
        orderDate: formData.orderDate,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        status: SupplierOrderStatus.PENDING,
        notes: formData.notes || undefined,
        items: items.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          notes: item.notes,
        })),
      });
      toast.success("Supplier order created successfully");
      router.push('/supplier-orders');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create supplier order");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems([...items, { itemId: 0, quantity: 0, unit: "", unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...items];
    const item = updated[index];
    
    if (field === 'itemId') {
      // Auto-fill unit from item
      const selectedItem = allItems.find(i => i.id === value);
      if (selectedItem) {
        item.unit = selectedItem.unit || '';
      }
    }
    
    updated[index] = { ...item, [field]: value };
    setItems(updated);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Supplier Order</h1>
          <p className="text-muted-foreground">Place a new order with a supplier</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
            <CardDescription>Enter the details for this supplier order</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => handleInputChange('supplierId', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.filter(s => s.isActive).map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    value={formData.orderNumber}
                    onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                    placeholder="PO-2025-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderDate">Order Date *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => handleInputChange('orderDate', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                  <Input
                    id="expectedDeliveryDate"
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about this order"
                    rows={3}
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Order Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {items.map((item, index) => {
                  const selectedItem = allItems.find(i => i.id === item.itemId);
                  const itemTotal = item.quantity * item.unitPrice;
                  
                  return (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                      <div className="col-span-12 md:col-span-4">
                        <Label>Item *</Label>
                        <Select
                          value={item.itemId.toString()}
                          onValueChange={(value) => updateItem(index, 'itemId', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {allItems.filter(i => i.isActive && i.itemType === 'item').map((it) => (
                              <SelectItem key={it.id} value={it.id.toString()}>
                                {it.name} ({it.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity || ""}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          required
                        />
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <Label>Unit *</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          placeholder="kg, L, etc."
                          required
                        />
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice || ""}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <Label>Total</Label>
                        <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
                          {formatCurrency(itemTotal)}
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {items.length > 0 && (
                  <div className="flex justify-end p-4 border rounded-lg bg-muted">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">Total Amount:</div>
                      <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/supplier-orders')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrder.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createOrder.isPending ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

