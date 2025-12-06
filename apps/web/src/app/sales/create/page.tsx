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
import { useCreateSale, useItems } from "@kit/hooks";
import { toast } from "sonner";
import type { SalesType } from "@kit/types";

export default function CreateSalePage() {
  const router = useRouter();
  const createSale = useCreateSale();
  const { data: itemsResponse } = useItems({ limit: 1000 });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: "" as SalesType | "",
    amount: "",
    quantity: "",
    description: "",
    itemId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.type || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createSale.mutateAsync({
        date: formData.date,
        type: formData.type as SalesType,
        amount: parseFloat(formData.amount),
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        description: formData.description || undefined,
        itemId: formData.itemId ? parseInt(formData.itemId) : undefined,
      });
      toast.success("Sale created successfully");
      router.push('/sales');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create sale");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Sale</h1>
          <p className="text-muted-foreground">Record a new sale</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sale Information</CardTitle>
            <CardDescription>Enter the details for this sale</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_site">On Site</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="takeaway">Takeaway</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                {/* Item/Recipe */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="itemId">Item/Recipe</Label>
                  <Select
                    value={formData.itemId || "none"}
                    onValueChange={(value) => handleInputChange('itemId', value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item or recipe (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {itemsResponse?.data?.filter(i => i.itemType === 'item').map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} {item.category ? `(${item.category})` : ''}
                        </SelectItem>
                      ))}
                      {itemsResponse?.data?.filter(i => i.itemType === 'recipe').map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id.toString()}>
                          {recipe.name} (Recipe)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this sale to a specific item or recipe
                  </p>
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
                  onClick={() => router.push('/sales')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createSale.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createSale.isPending ? "Creating..." : "Create Sale"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

