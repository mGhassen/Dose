"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X, Plus, Trash2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateRecipe, useItems } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateRecipePage() {
  const router = useRouter();
  const createRecipe = useCreateRecipe();
  const { data: itemsResponse } = useItems({ limit: 1000, includeRecipes: true });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    servingSize: "",
    preparationTime: "",
    cookingTime: "",
    instructions: "",
    notes: "",
    isActive: true,
  });
  const [items, setItems] = useState<Array<{ itemId: number; quantity: number; unit: string; notes?: string }>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the recipe name");
      return;
    }

    try {
      await createRecipe.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        servingSize: formData.servingSize ? parseInt(formData.servingSize) : undefined,
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : undefined,
        cookingTime: formData.cookingTime ? parseInt(formData.cookingTime) : undefined,
        instructions: formData.instructions || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
        items: items.length > 0 ? items.map(i => ({ itemId: i.itemId, quantity: i.quantity, unit: i.unit, notes: i.notes })) : undefined,
      });
      toast.success("Recipe created successfully");
      router.push('/recipes');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create recipe");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems([...items, { itemId: 0, quantity: 0, unit: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = updated[index];
    
    // Auto-fill unit when item is selected
    if (field === 'itemId' && value) {
      const selectedItem = itemsResponse?.data?.find(i => i.id === parseInt(value));
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
          <h1 className="text-2xl font-bold">Create Recipe</h1>
          <p className="text-muted-foreground">Add a new recipe</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recipe Information</CardTitle>
            <CardDescription>Enter the details for this recipe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Recipe Information */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Recipe name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="servingSize">Serving Size</Label>
                      <Input
                        id="servingSize"
                        type="number"
                        value={formData.servingSize}
                        onChange={(e) => handleInputChange('servingSize', e.target.value)}
                        placeholder="4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preparationTime">Preparation Time (minutes)</Label>
                      <Input
                        id="preparationTime"
                        type="number"
                        value={formData.preparationTime}
                        onChange={(e) => handleInputChange('preparationTime', e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cookingTime">Cooking Time (minutes)</Label>
                    <Input
                      id="cookingTime"
                      type="number"
                      value={formData.cookingTime}
                      onChange={(e) => handleInputChange('cookingTime', e.target.value)}
                      placeholder="45"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Recipe description"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={formData.instructions}
                      onChange={(e) => handleInputChange('instructions', e.target.value)}
                      placeholder="Cooking instructions"
                      rows={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Additional notes"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive" className="font-normal cursor-pointer">
                      Active
                    </Label>
                  </div>
                </div>

                {/* Right Column: Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        <p>No items added yet</p>
                        <p className="text-sm mt-1">Click "Add Item" to get started</p>
                      </div>
                    ) : (
                      items.map((item, index) => (
                        <div key={index} className="space-y-3 p-4 border rounded-lg bg-card">
                          <div className="space-y-2">
                            <Label>Item</Label>
                            <Select
                              value={item.itemId ? item.itemId.toString() : undefined}
                              onValueChange={(value) => updateItem(index, 'itemId', parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {itemsResponse?.data?.filter(i => i.itemType === 'item').map((it) => (
                                  <SelectItem key={it.id} value={it.id.toString()}>
                                    {it.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.quantity || ""}
                                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Unit</Label>
                              <Input
                                value={item.unit}
                                onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                placeholder="kg, L, etc."
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/recipes')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createRecipe.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createRecipe.isPending ? "Creating..." : "Create Recipe"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

