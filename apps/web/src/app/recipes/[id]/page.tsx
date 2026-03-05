"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { UnifiedSelector } from "@/components/unified-selector";
import { StatusPin } from "@/components/status-pin";
import { Save, X, Trash2, Plus, ChefHat, MoreVertical, Edit2, AlertTriangle, CheckCircle, Package, Link2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useRecipeById, useUpdateRecipe, useDeleteRecipe, useCreateProducedItem, useItems, useUnits, useProduceRecipe, useRecipeCost, useStockLevels } from "@kit/hooks";
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
  const [produceItemName, setProduceItemName] = useState("");
  const [produceSelectedItemId, setProduceSelectedItemId] = useState<number | null>(null);
  const { data: recipe, isLoading, refetch: refetchRecipe } = useRecipeById(resolvedParams?.id || "");
  const { data: itemsResponse } = useItems({ limit: 1000 });
  const { data: units = [] } = useUnits();
  const { data: costData } = useRecipeCost(resolvedParams?.id || "");
  const updateRecipe = useUpdateRecipe();
  const deleteMutation = useDeleteRecipe();
  const createProducedItem = useCreateProducedItem();
  const produceRecipe = useProduceRecipe();
  const [linkItemDialogOpen, setLinkItemDialogOpen] = useState(false);
  const [linkItemId, setLinkItemId] = useState<number | null>(null);
  const { data: allItemsResponse } = useItems({ limit: 1000 });
  const allItems = allItemsResponse?.data ?? [];
  
  // Fetch stock levels for all recipe items when dialog is open
  const recipeItemIds = recipe?.items?.map(ri => ri.itemId?.toString()).filter(Boolean) ||
                        (recipe as { ingredients?: { itemId?: number; ingredientId?: number }[] })?.ingredients?.map((ri) => ri.itemId?.toString() || ri.ingredientId?.toString()).filter(Boolean) || [];
  const { data: allStockLevelsResponse } = useStockLevels({ 
    limit: 1000 
  });
  
  // Create a map of itemId -> stock level (sum across all locations)
  const stockLevelMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!allStockLevelsResponse?.data) return map;
    
    allStockLevelsResponse.data.forEach(level => {
      const itemId = level.itemId;
      if (itemId) {
        const current = map.get(itemId) || 0;
        map.set(itemId, current + level.quantity);
      }
    });
    
    return map;
  }, [allStockLevelsResponse?.data]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    unit: "",
    unitId: null as number | null,
    servingSize: "",
    preparationTime: "",
    cookingTime: "",
    instructions: "",
    notes: "",
    isActive: true,
  });
  const [items, setItems] = useState<Array<{ itemId: number; quantity: number; unit: string; unitId?: number; notes?: string }>>([]);

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
        unitId: recipe.unitId ?? null,
        servingSize: recipe.servingSize?.toString() || "",
        preparationTime: recipe.preparationTime?.toString() || "",
        cookingTime: recipe.cookingTime?.toString() || "",
        instructions: recipe.instructions || "",
        notes: recipe.notes || "",
        isActive: recipe.isActive,
      });
      const legacyIngredients = (recipe as { ingredients?: unknown[] }).ingredients;
      if (recipe.items || legacyIngredients) {
        const recipeItems = recipe.items || legacyIngredients || [];
        setItems(recipeItems.map((ri: any) => ({
          itemId: ri.itemId || ri.ingredientId,
          quantity: ri.quantity,
          unit: ri.unit,
          unitId: ri.unitId,
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
          unitId: formData.unitId ?? undefined,
          servingSize: formData.servingSize ? parseInt(formData.servingSize) : undefined,
          preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : undefined,
          cookingTime: formData.cookingTime ? parseInt(formData.cookingTime) : undefined,
          instructions: formData.instructions || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
          items: items.length > 0 ? items.map(i => ({ itemId: i.itemId, quantity: i.quantity, unit: i.unit, unitId: i.unitId, notes: i.notes })) : undefined,
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
    setItems([...items, { itemId: 0, quantity: 0, unit: "", unitId: undefined }]);
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
        item.unitId = selectedItem.unitId;
      }
    }
    
    updated[index] = { ...item, [field]: value };
    setItems(updated);
  };

  // Check if we have enough stock for all ingredients
  const stockAvailability = useMemo(() => {
    if (!recipe || !produceQuantity || parseFloat(produceQuantity) <= 0) {
      return { canProduce: false, issues: [] };
    }
    
    const multiplier = parseFloat(produceQuantity) / (recipe.servingSize || 1);
    const issues: Array<{ itemId: number; itemName: string; required: number; available: number; unit: string }> = [];
    
    const recipeItems = recipe.items || (recipe as { ingredients?: unknown[] }).ingredients || [];
    for (const ri of recipeItems) {
      const itemId = ri.itemId || (ri as any).ingredientId;
      if (!itemId) continue;
      
      const requiredQuantity = ri.quantity * multiplier;
      const availableQuantity = stockLevelMap.get(itemId) || 0;
      const item = ri.item || (ri as any).ingredient;
      const itemName = item?.name || `Item ${itemId}`;
      
      if (availableQuantity < requiredQuantity) {
        issues.push({
          itemId,
          itemName,
          required: requiredQuantity,
          available: availableQuantity,
          unit: ri.unit,
        });
      }
    }
    
    return {
      canProduce: issues.length === 0,
      issues,
    };
  }, [recipe, produceQuantity, stockLevelMap]);

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
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <StatusPin active={recipe.isActive} title={recipe.isActive ? "Active" : "Inactive"} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">
                {isEditing ? "Edit Recipe" : recipe.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditing ? "Update recipe information" : "Recipe details and information"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setProduceDialogOpen(true)}
                  disabled={!recipe?.isActive || (!recipe?.items && !(recipe as { ingredients?: unknown[] })?.ingredients) || ((recipe.items?.length || (recipe as { ingredients?: unknown[] }).ingredients?.length || 0) === 0)}
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
                    <DropdownMenuItem
                      onClick={() => {
                        setLinkItemId(null);
                        setLinkItemDialogOpen(true);
                      }}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Link to existing item
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
              </>
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto mt-6">
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

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        placeholder="e.g., Beverages, Food"
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
                    <div className="flex items-center gap-2 mt-1">
                      <StatusPin active={recipe.isActive} title={recipe.isActive ? "Active" : "Inactive"} />
                      <p className="text-base font-semibold">{recipe.name}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Serving Size</label>
                    <p className="text-base mt-1">
                      {recipe.servingSize
                        ? `${recipe.servingSize} ${recipe.unit || 'serving'}${recipe.servingSize !== 1 ? 's' : ''}`
                        : "—"}
                    </p>
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

                  <div className="pt-4 border-t">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium">Produced Items</label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setLinkItemId(null); setLinkItemDialogOpen(true); }}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            Link to existing item
                          </Button>
                        </div>
                      </div>
                      {((recipe as any).producedItems?.length ?? 0) === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Link items above or enter a name when you produce. If empty, you will be asked for the item name on first produce.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {((recipe as any).producedItems ?? []).map((pi: { id: number; name: string }) => (
                            <li key={pi.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                              <Link href={`/items/${pi.id}`} className="font-medium text-primary hover:underline">
                                {pi.name || `Item #${pi.id}`}
                              </Link>
                              <div className="flex items-center gap-1">
                                <Link href={`/items/${pi.id}`}>
                                  <Button variant="outline" size="sm">View Item</Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  disabled={updateRecipe.isPending}
                                  onClick={async () => {
                                    const currentIds = (recipe as any).producedItems?.map((p: { id: number }) => p.id) ?? [];
                                    const nextIds = currentIds.filter((id: number) => id !== pi.id);
                                    try {
                                      await updateRecipe.mutateAsync({
                                        id: resolvedParams?.id!,
                                        data: { producedItemIds: nextIds },
                                      });
                                      await refetchRecipe();
                                      toast.success("Item unlinked");
                                    } catch (e: any) {
                                      toast.error(e?.message || "Failed to unlink");
                                    }
                                  }}
                                >
                                  Unlink
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
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
                {((recipe.items || (recipe as { ingredients?: unknown[] }).ingredients) && (recipe.items?.length || (recipe as { ingredients?: unknown[] }).ingredients?.length || 0) > 0) && (
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
                      {(recipe.items || (recipe as { ingredients?: unknown[] }).ingredients || []).map((ri: any, index: number) => {
                        const itemId = ri.itemId || ri.ingredientId;
                        const item = ri.item || ri.ingredient;
const costItem = costData?.ingredients?.find((ci: any) => (ci.itemId || ci.ingredientId) === itemId) ||
                                        (costData as { items?: { itemId?: number }[] })?.items?.find((ci: any) => ci.itemId === itemId);
                        return (
                          <div key={index} className="p-4 border rounded-lg bg-card">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {itemId ? (
                                    <Link
                                      href={`/items/${itemId}`}
                                      className="font-medium text-primary hover:underline"
                                    >
                                      {item?.name || `Item ${itemId}`}
                                    </Link>
                                  ) : (
                                    <span className="font-medium">{item?.name || `Item ${itemId}`}</span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">
                                  {ri.quantity} {ri.unit}
                                </div>
                                {costItem && (costItem as { hasPrice?: boolean }).hasPrice && (
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency((costItem as { unitPrice?: number }).unitPrice ?? 0)}/{ri.unit} • {formatCurrency((costItem as { totalCost?: number }).totalCost ?? 0)} total
                                  </div>
                                )}
                                {costItem && !(costItem as { hasPrice?: boolean }).hasPrice && (
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
      <Dialog
        open={produceDialogOpen}
        onOpenChange={(open) => {
          setProduceDialogOpen(open);
          if (open) {
            setProduceItemName("");
            setProduceSelectedItemId(null);
          }
        }}
      >
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
            {(recipe as any).producedItems?.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor="produceItemName">Name of the item product *</Label>
                <Input
                  id="produceItemName"
                  value={produceItemName}
                  onChange={(e) => setProduceItemName(e.target.value)}
                  placeholder="e.g. Single Espresso"
                  required
                />
              </div>
            )}
            {(recipe as any).producedItems?.length >= 2 && (
              <div className="space-y-2">
                <Label>Which item to produce? *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={produceSelectedItemId ?? ""}
                  onChange={(e) => setProduceSelectedItemId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select item</option>
                  {((recipe as any).producedItems ?? []).map((item: { id: number; name: string }) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
            )}
            {((recipe?.items || (recipe as { ingredients?: unknown[] })?.ingredients) && (recipe.items?.length || (recipe as { ingredients?: unknown[] }).ingredients?.length || 0) > 0) && (
              <div className="border rounded-lg p-4 bg-muted space-y-3">
                <Label className="text-sm font-semibold">Items to be deducted:</Label>
                <div className="mt-2 space-y-2">
                  {(recipe.items || (recipe as { ingredients?: unknown[] }).ingredients || []).map((ri: any, idx: number) => {
                    const multiplier = (parseFloat(produceQuantity) || 0) / (recipe?.servingSize || 1);
                    const quantityToDeduct = ri.quantity * multiplier;
                    const item = ri.item || ri.ingredient;
                    const itemId = ri.itemId || ri.ingredientId;
                    const availableStock = itemId ? (stockLevelMap.get(itemId) || 0) : 0;
                    const hasEnough = availableStock >= quantityToDeduct;
                    const isOutOfStock = availableStock === 0;
                    
                    return (
                      <div key={idx} className={`text-sm p-2 rounded border ${hasEnough ? 'bg-background' : 'bg-destructive/10 border-destructive'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {hasEnough ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            {itemId ? (
                              <Link
                                href={`/items/${itemId}`}
                                className="font-medium text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item?.name || `Item ${itemId}`}
                              </Link>
                            ) : (
                              <span className="font-medium">{item?.name || `Item ${itemId}`}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 ml-6 space-y-1">
                          <div className="text-xs">
                            Required: <span className="font-medium">{quantityToDeduct.toFixed(2)} {ri.unit}</span>
                          </div>
                          <div className={`text-xs ${hasEnough ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>
                            Available: {availableStock.toFixed(2)} {ri.unit}
                            {!hasEnough && (
                              <span className="ml-2">
                                ({isOutOfStock ? 'Out of stock' : `Need ${(quantityToDeduct - availableStock).toFixed(2)} more`})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {stockAvailability.issues.length > 0 && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive rounded-lg">
                    <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Insufficient Stock
                    </div>
                    <div className="text-xs text-destructive space-y-1">
                      {stockAvailability.issues.map((issue, idx) => (
                        <div key={idx}>
                          • {issue.itemName}: Need {issue.required.toFixed(2)} {issue.unit}, but only {issue.available.toFixed(2)} {issue.unit} available
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                const producedItems = (recipe as any).producedItems ?? [];
                if (producedItems.length === 0 && !produceItemName.trim()) {
                  toast.error("Please enter the name of the item product");
                  return;
                }
                if (producedItems.length >= 2 && !produceSelectedItemId) {
                  toast.error("Please select which item to produce");
                  return;
                }
                if (!stockAvailability.canProduce) {
                  toast.error("Cannot produce recipe: insufficient stock for one or more ingredients");
                  return;
                }
                try {
                  await produceRecipe.mutateAsync({
                    id: resolvedParams.id,
                    data: {
                      quantity: parseFloat(produceQuantity),
                      location: produceLocation || undefined,
                      notes: produceNotes || undefined,
                      ...(producedItems.length === 0 && produceItemName.trim() ? { producedItemName: produceItemName.trim() } : {}),
                      ...(producedItems.length >= 2 && produceSelectedItemId ? { producedItemId: produceSelectedItemId } : {}),
                    },
                  });
                  toast.success("Recipe produced successfully! Items deducted from stock.");
                  setProduceDialogOpen(false);
                  setProduceQuantity("1");
                  setProduceLocation("");
                  setProduceNotes("");
                  setProduceItemName("");
                  setProduceSelectedItemId(null);
                  refetchRecipe();
                } catch (error: any) {
                  toast.error(error?.message || "Failed to produce recipe");
                }
              }}
              disabled={produceRecipe.isPending || !stockAvailability.canProduce}
            >
              <ChefHat className="mr-2 h-4 w-4" />
              {produceRecipe.isPending ? "Producing..." : "Produce Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkItemDialogOpen} onOpenChange={(open) => { setLinkItemDialogOpen(open); if (!open) setLinkItemId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to existing item</DialogTitle>
            <DialogDescription>
              Select an item to use as this recipe&apos;s output. The item will be marked as produced by this recipe and used when you produce it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <UnifiedSelector
              label="Item"
              type="item"
              items={allItems.filter(i => i.itemType === 'item')}
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
                disabled={!linkItemId || updateRecipe.isPending}
                onClick={async () => {
                  if (!resolvedParams?.id || !linkItemId) return;
                  const currentIds = (recipe as any).producedItems?.map((p: { id: number }) => p.id) ?? [];
                  if (currentIds.includes(linkItemId)) {
                    toast.error("Item already linked");
                    return;
                  }
                  try {
                    await updateRecipe.mutateAsync({
                      id: resolvedParams.id,
                      data: { producedItemIds: [...currentIds, linkItemId] },
                    });
                    await refetchRecipe();
                    setLinkItemDialogOpen(false);
                    setLinkItemId(null);
                    toast.success("Item linked as produced item");
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to link item");
                  }
                }}
              >
                Link
              </Button>
            </DialogFooter>
          </div>
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
      </div>
    </AppLayout>
  );
}

