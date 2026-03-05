"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { UnifiedSelector } from "@/components/unified-selector";
import { Save, X, Plus, Trash2, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import AppLayout from "@/components/app-layout";
import { useCreateRecipe, useItems, useUnits } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateRecipePage() {
  const router = useRouter();
  const createRecipe = useCreateRecipe();
  const { data: itemsResponse } = useItems({ limit: 1000, includeRecipes: true });
  const { data: units = [] } = useUnits();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    servingSize: "",
    unitId: null as number | null,
    unit: "",
    producedItemId: null as number | null,
    preparationTime: "",
    cookingTime: "",
    instructions: "",
    notes: "",
    isActive: true,
  });
  const [items, setItems] = useState<Array<{ itemId: number; quantity: number; unit: string; unitId?: number; notes?: string }>>([]);
  const [linkItemDialogOpen, setLinkItemDialogOpen] = useState(false);
  const [linkItemId, setLinkItemId] = useState<number | null>(null);

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
        unitId: formData.unitId ?? undefined,
        unit: formData.unit || undefined,
        producedItemId: formData.producedItemId ?? undefined,
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : undefined,
        cookingTime: formData.cookingTime ? parseInt(formData.cookingTime) : undefined,
        instructions: formData.instructions || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
        items: items.length > 0 ? items.map(i => ({ itemId: i.itemId, quantity: i.quantity, unit: i.unit, unitId: i.unitId, notes: i.notes })) : undefined,
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
    setItems([...items, { itemId: 0, quantity: 0, unit: "", unitId: undefined }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = updated[index];
    
    if (field === 'itemId' && value) {
      const selectedItem = itemsResponse?.data?.find(i => i.id === parseInt(value));
      if (selectedItem) {
        item.unit = selectedItem.unit || '';
        item.unitId = selectedItem.unitId;
      }
    }
    
    updated[index] = { ...item, [field]: value };
    setItems(updated);
  };

  return (
    <AppLayout>
      <div className="min-h-0 flex-1 overflow-auto">
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
                      <div className="flex gap-2">
                        <Input
                          id="servingSize"
                          type="number"
                          min={1}
                          value={formData.servingSize}
                          onChange={(e) => handleInputChange('servingSize', e.target.value)}
                          placeholder="4"
                          className="w-24"
                        />
                        <UnifiedSelector
                          type="unit"
                          items={units.map(u => ({ ...u, name: u.name || u.symbol || String(u.id) }))}
                          selectedId={formData.unitId ?? undefined}
                          onSelect={(sel) => {
                            const u = units.find(x => x.id === sel.id);
                            setFormData(prev => ({ ...prev, unitId: u?.id ?? null, unit: u?.symbol ?? '' }));
                          }}
                          placeholder="Unit"
                          manageLink={{ href: '/variables', text: 'Variables' }}
                          getDisplayName={(item) => (item as any).symbol ?? item.name ?? String(item.id)}
                        />
                      </div>
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
                    <Label>Item produced (optional)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
                        {formData.producedItemId
                          ? itemsResponse?.data?.find(i => i.id === formData.producedItemId)?.name ?? `Item #${formData.producedItemId}`
                          : "No item linked"}
                      </span>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setLinkItemId(formData.producedItemId); setLinkItemDialogOpen(true); }}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Link to existing item
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">If empty, an item will be created automatically when you first produce this recipe.</p>
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
                            <UnifiedSelector
                              label="Item"
                              type="item"
                              items={itemsResponse?.data?.filter(i => i.itemType === 'item') ?? []}
                              selectedId={item.itemId || undefined}
                              onSelect={(sel) => updateItem(index, 'itemId', sel.id === 0 ? 0 : Number(sel.id))}
                              placeholder="Select item"
                            />
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
                              <UnifiedSelector
                                type="unit"
                                items={units.map(u => ({ ...u, name: u.name || u.symbol || String(u.id) }))}
                                selectedId={item.unitId ?? undefined}
                                onSelect={(sel) => {
                                  const u = units.find(x => x.id === sel.id);
                                  const updated = [...items];
                                  updated[index] = { ...updated[index], unitId: u?.id, unit: u?.symbol ?? '' };
                                  setItems(updated);
                                }}
                                placeholder="Unit"
                                manageLink={{ href: '/variables', text: 'Variables' }}
                                getDisplayName={(x) => (x as any).symbol ?? x.name ?? String(x.id)}
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

      <Dialog open={linkItemDialogOpen} onOpenChange={(open) => { setLinkItemDialogOpen(open); if (!open) setLinkItemId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to existing item</DialogTitle>
            <DialogDescription>
              Select an item to use as this recipe&apos;s output. The item will be marked as produced by this recipe when you save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <UnifiedSelector
              label="Item"
              type="item"
              items={itemsResponse?.data?.filter(i => i.itemType === 'item') ?? []}
              selectedId={linkItemId ?? undefined}
              onSelect={(sel) => setLinkItemId(sel.id === 0 ? null : Number(sel.id))}
              placeholder="Select item"
              getDisplayName={(i) => `${(i as { name?: string }).name ?? i.id}${(i as { category?: string }).category ? ` (${(i as { category?: string }).category})` : ''}`}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormData(prev => ({ ...prev, producedItemId: null }));
                  setLinkItemDialogOpen(false);
                  setLinkItemId(null);
                }}
              >
                Clear
              </Button>
              <Button
                disabled={!linkItemId}
                onClick={() => {
                  if (linkItemId) setFormData(prev => ({ ...prev, producedItemId: linkItemId }));
                  setLinkItemDialogOpen(false);
                  setLinkItemId(null);
                }}
              >
                Link
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}

