"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X, Trash2, Plus, ChefHat, MoreVertical, Edit2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useRecipeById, useUpdateRecipe, useDeleteRecipe, useItems, useProduceRecipe, useRecipeCost } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import { formatCurrency } from "@kit/lib/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kit/ui/alert-dialog";

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [produceDialogOpen, setProduceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [produceQuantity, setProduceQuantity] = useState("1");
  const [produceLocation, setProduceLocation] = useState("");
  const [produceNotes, setProduceNotes] = useState("");
  const { data: recipe, isLoading } = useRecipeById(resolvedParams?.id || "");
  const { data: itemsResponse } = useItems({ limit: 1000 });
  const { data: costData } = useRecipeCost(resolvedParams?.id || "");
  const updateRecipe = useUpdateRecipe();
  const deleteMutation = useDeleteRecipe();
  const produceRecipe = useProduceRecipe();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    unit: "",
    servingSize: "",
    preparationTime: "",
    cookingTime: "",
    instructions: "",
    notes: "",
    isActive: true,
  });
  const [items, setItems] = useState<Array<{ itemId: number; quantity: number; unit: string; notes?: string }>>([]);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        description: recipe.description || "",
        category: recipe.category || "",
        unit: recipe.unit || "",
        servingSize: recipe.servingSize?.toString() || "",
        preparationTime: recipe.preparationTime?.toString() || "",
        cookingTime: recipe.cookingTime?.toString() || "",
        instructions: recipe.instructions || "",
        notes: recipe.notes || "",
        isActive: recipe.isActive,
      });
      if (recipe.items || recipe.ingredients) {
        const recipeItems = recipe.items || recipe.ingredients || [];
        setItems(recipeItems.map((ri: any) => ({
          itemId: ri.itemId || ri.ingredientId,
          quantity: ri.quantity,
          unit: ri.unit,
          notes: ri.notes,
        })));
      }
    }
  }, [recipe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the recipe name");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateRecipe.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category || undefined,
          unit: formData.unit || undefined,
          servingSize: formData.servingSize ? parseInt(formData.servingSize) : undefined,
          preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : undefined,
          cookingTime: formData.cookingTime ? parseInt(formData.cookingTime) : undefined,
          instructions: formData.instructions || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
          items: items.length > 0 ? items.map(i => ({ itemId: i.itemId, quantity: i.quantity, unit: i.unit, notes: i.notes })) : undefined,
        },
      });
      toast.success("Recipe updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update recipe");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Recipe deleted successfully");
      router.push('/recipes');
    } catch (error) {
      toast.error("Failed to delete recipe");
      console.error(error);
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

  if (isLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!recipe) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Recipe Not Found</h1>
            <p className="text-muted-foreground">The recipe you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/recipes')}>Back to Recipes</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Recipe" : recipe.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update recipe information" : "Recipe details and information"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <Button
                onClick={() => setProduceDialogOpen(true)}
                disabled={!recipe?.isActive || (!recipe?.items && !recipe?.ingredients) || ((recipe.items?.length || recipe.ingredients?.length || 0) === 0)}
              >
                <ChefHat className="mr-2 h-4 w-4" />
                Produce Recipe
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Recipe" : "Recipe Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this recipe" : "View and manage recipe details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
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
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          placeholder="e.g., Beverages, Food"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit">Unit</Label>
                        <Input
                          id="unit"
                          value={formData.unit}
                          onChange={(e) => handleInputChange('unit', e.target.value)}
                          placeholder="e.g., serving, piece"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="servingSize">Serving Size</Label>
                        <Input
                          id="servingSize"
                          type="number"
                          value={formData.servingSize}
                          onChange={(e) => handleInputChange('servingSize', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preparationTime">Preparation Time (minutes)</Label>
                        <Input
                          id="preparationTime"
                          type="number"
                          value={formData.preparationTime}
                          onChange={(e) => handleInputChange('preparationTime', e.target.value)}
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
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions">Instructions</Label>
                      <Textarea
                        id="instructions"
                        value={formData.instructions}
                        onChange={(e) => handleInputChange('instructions', e.target.value)}
                        rows={8}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
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
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Unit</Label>
                                <Input
                                  value={item.unit}
                                  onChange={(e) => updateItem(index, 'unit', e.target.value)}
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

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateRecipe.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateRecipe.isPending ? "Updating..." : "Update Recipe"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Recipe Information */}
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{recipe.name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Serving Size</label>
                      <p className="text-base mt-1">{recipe.servingSize ? `${recipe.servingSize} servings` : "—"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <p className="text-base mt-1">{recipe.isActive ? "Active" : "Inactive"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Preparation Time</label>
                      <p className="text-base mt-1">{recipe.preparationTime ? `${recipe.preparationTime} minutes` : "—"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cooking Time</label>
                      <p className="text-base mt-1">{recipe.cookingTime ? `${recipe.cookingTime} minutes` : "—"}</p>
                    </div>
                  </div>

                  {recipe.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-base mt-1">{recipe.description}</p>
                    </div>
                  )}

                  {recipe.instructions && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Instructions</label>
                      <p className="text-base mt-1 whitespace-pre-wrap">{recipe.instructions}</p>
                    </div>
                  )}

                  {/* Item Information (produced item) */}
                  <div className="pt-4 border-t">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Produced Item Information</label>
                        {(recipe as any).producedItem ? (
                          <Link href={`/items/${(recipe as any).producedItem.id}`}>
                            <Button variant="outline" size="sm">
                              View Item
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Item will be created when recipe is produced</span>
                        )}
                      </div>
                      {(recipe as any).producedItem ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Category</label>
                              <p className="text-base mt-1">{(recipe as any).producedItem.category || recipe.category || "—"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Unit</label>
                              <p className="text-base mt-1">{(recipe as any).producedItem.unit || recipe.unit || "—"}</p>
                            </div>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">
                              This recipe produces an item that can be:
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                              <li>Sold in sales transactions</li>
                              <li>Used as an ingredient in other recipes</li>
                              <li>Tracked in inventory and stock levels</li>
                            </ul>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            This recipe will create an item when produced. The item will use the recipe's category ({recipe.category || "—"}) and unit ({recipe.unit || "—"}).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(recipe.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Last Updated:</span> {formatDate(recipe.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Items Section */}
                {((recipe.items || recipe.ingredients) && (recipe.items?.length || recipe.ingredients?.length || 0) > 0) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Items</h3>
                      {costData && (
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Estimated Cost</div>
                          <div className="text-lg font-bold">
                            {costData.hasAllPrices ? (
                              <>
                                {formatCurrency(costData.totalCost)} total
                                {costData.servingSize > 1 && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({formatCurrency(costData.costPerServing)} per serving)
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Price data incomplete</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {(recipe.items || recipe.ingredients || []).map((ri: any, index: number) => {
                        const itemId = ri.itemId || ri.ingredientId;
                        const item = ri.item || ri.ingredient;
                        const costItem = costData?.ingredients?.find((ci: any) => (ci.itemId || ci.ingredientId) === itemId) || 
                                        costData?.items?.find((ci: any) => ci.itemId === itemId);
                        return (
                          <div key={index} className="p-4 border rounded-lg bg-card">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">{item?.name || `Item ${itemId}`}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">
                                  {ri.quantity} {ri.unit}
                                </div>
                                {costItem && costItem.hasPrice && (
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency(costItem.unitPrice)}/{ri.unit} • {formatCurrency(costItem.totalCost)} total
                                  </div>
                                )}
                                {costItem && !costItem.hasPrice && (
                                  <div className="text-xs text-muted-foreground">
                                    No price data available
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Produce Recipe Dialog */}
      <Dialog open={produceDialogOpen} onOpenChange={setProduceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produce Recipe</DialogTitle>
            <DialogDescription>
              Record production of {recipe?.name}. This will automatically deduct items from stock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (servings) *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={produceQuantity}
                onChange={(e) => setProduceQuantity(e.target.value)}
                placeholder="1"
                required
              />
              <p className="text-xs text-muted-foreground">
                Recipe serving size: {recipe?.servingSize || 1}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={produceLocation}
                onChange={(e) => setProduceLocation(e.target.value)}
                placeholder="Storage location (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={produceNotes}
                onChange={(e) => setProduceNotes(e.target.value)}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>
            {((recipe?.items || recipe?.ingredients) && (recipe.items?.length || recipe.ingredients?.length || 0) > 0) && (
              <div className="border rounded-lg p-4 bg-muted">
                <Label className="text-sm font-semibold">Items to be deducted:</Label>
                <div className="mt-2 space-y-1">
                  {(recipe.items || recipe.ingredients || []).map((ri: any, idx: number) => {
                    const multiplier = parseFloat(produceQuantity) / (recipe.servingSize || 1);
                    const quantityToDeduct = ri.quantity * multiplier;
                    const item = ri.item || ri.ingredient;
                    const itemId = ri.itemId || ri.ingredientId;
                    return (
                      <div key={idx} className="text-sm">
                        • {item?.name || `Item ${itemId}`}: {quantityToDeduct.toFixed(2)} {ri.unit}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProduceDialogOpen(false)}
              disabled={produceRecipe.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!resolvedParams?.id || !produceQuantity || parseFloat(produceQuantity) <= 0) {
                  toast.error("Please enter a valid quantity");
                  return;
                }
                try {
                  await produceRecipe.mutateAsync({
                    id: resolvedParams.id,
                    data: {
                      quantity: parseFloat(produceQuantity),
                      location: produceLocation || undefined,
                      notes: produceNotes || undefined,
                    },
                  });
                  toast.success("Recipe produced successfully! Items deducted from stock.");
                  setProduceDialogOpen(false);
                  setProduceQuantity("1");
                  setProduceLocation("");
                  setProduceNotes("");
                } catch (error: any) {
                  toast.error(error?.message || "Failed to produce recipe");
                }
              }}
              disabled={produceRecipe.isPending}
            >
              <ChefHat className="mr-2 h-4 w-4" />
              {produceRecipe.isPending ? "Producing..." : "Produce Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this recipe
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

