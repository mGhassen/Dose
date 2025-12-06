"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateStockLevel, useIngredients } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateStockLevelPage() {
  const router = useRouter();
  const createStockLevel = useCreateStockLevel();
  const { data: ingredientsResponse } = useIngredients({ limit: 1000 });
  
  const ingredients = ingredientsResponse?.data || [];
  
  const [formData, setFormData] = useState({
    ingredientId: "",
    quantity: "",
    unit: "",
    location: "",
    minimumStockLevel: "",
    maximumStockLevel: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ingredientId || !formData.quantity || !formData.unit) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(formData.quantity) < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }

    try {
      await createStockLevel.mutateAsync({
        ingredientId: parseInt(formData.ingredientId),
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
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
    
    // Auto-fill unit when ingredient is selected
    if (field === 'ingredientId' && value) {
      const ingredient = ingredients.find(i => i.id === parseInt(value));
      if (ingredient) {
        setFormData(prev => ({ ...prev, unit: ingredient.unit }));
      }
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Stock Level</h1>
          <p className="text-muted-foreground">Set up stock tracking for an ingredient</p>
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
                  <Label htmlFor="ingredientId">Ingredient *</Label>
                  <Select
                    value={formData.ingredientId}
                    onValueChange={(value) => handleInputChange('ingredientId', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.filter(i => i.isActive).map((ingredient) => (
                        <SelectItem key={ingredient.id} value={ingredient.id.toString()}>
                          {ingredient.name} ({ingredient.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

