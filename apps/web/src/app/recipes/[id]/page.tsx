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
import { ItemCategorySelector } from "@/components/item-category-selector";
import { CreateItemMultiStepDialog } from "@/components/create-item-multistep-dialog";
import { RecipeModifiersSection, type RecipeModifierRowInput } from "@/components/recipe-modifiers-section";
import { RecipeIngredientsEditor } from "@/components/recipe-ingredients-editor";
import { StatusPin } from "@/components/status-pin";
import { Save, X, Trash2, ChefHat, MoreVertical, Edit2, AlertTriangle, CheckCircle, Package, Link2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useRecipeById, useUpdateRecipe, useDeleteRecipe, useCreateProducedItem, useItems, useUnits, useProduceRecipe, useRecipeCost, useStockLevels, useItemCategories } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import { dateToYYYYMMDD } from "@kit/lib";
import { formatCurrency, formatCurrencyPerUnit } from "@kit/lib/config";
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
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { InputGroupAttached } from "@/components/input-group";
import { DatePicker } from "@kit/ui/date-picker";
import {
  buildUnitConversionContext,
  convertQuantityWithContext,
} from "@/lib/units/convert";

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
  const [produceDate, setProduceDate] = useState(() => dateToYYYYMMDD(new Date()));
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
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [createItemTargetIndex, setCreateItemTargetIndex] = useState<number | null>(null);
  const { data: allItemsResponse } = useItems({ limit: 1000 });
  const allItems = allItemsResponse?.data ?? [];
  const { data: itemCategories = [] } = useItemCategories();
  const unitConversionContext = useMemo(
    () =>
      buildUnitConversionContext(
        units.map((u) => ({
          id: u.id,
          factorToBase: u.factorToBase,
          dimension: u.dimension,
          baseUnitId: u.baseUnitId,
          symbol: u.symbol,
        }))
      ),
    [units]
  );
  
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

  const modifierUnitById = useMemo(() => {
    const map = new Map<number, string>();
    const modifierQuantities = recipe?.modifierQuantities ?? [];
    for (const q of modifierQuantities) {
      const unitLabel =
        q.unit?.trim() ||
        (q.unitId != null
          ? (units.find((u) => u.id === q.unitId)?.symbol ??
            units.find((u) => u.id === q.unitId)?.name ??
            "")
          : "");
      if (unitLabel) map.set(q.modifierId, unitLabel);
    }
    return map;
  }, [recipe?.modifierQuantities, units]);

  const recipeOutputUnitLabel = useMemo(() => {
    const u = recipe?.unit?.trim();
    if (u) return u;
    if (recipe?.unitId != null) {
      const row = units.find((x) => x.id === recipe.unitId);
      const fromId = row?.symbol?.trim() || row?.name?.trim();
      if (fromId) return fromId;
    }
    return "unit";
  }, [recipe?.unit, recipe?.unitId, units]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    categoryId: null as number | null,
    unit: "",
    unitId: null as number | null,
    outputQuantity: "",
    preparationTime: "",
    cookingTime: "",
    instructions: "",
    notes: "",
    isActive: true,
  });
  const [items, setItems] = useState<Array<{ itemId: number; quantity: number; unit: string; unitId?: number; notes?: string }>>([]);
  const [modifierRows, setModifierRows] = useState<RecipeModifierRowInput[]>([]);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        description: recipe.description || "",
        category: recipe.category || "",
        categoryId: null,
        unit: recipe.unit || "",
        unitId: recipe.unitId ?? null,
        outputQuantity: (recipe.outputQuantity ?? recipe.servingSize)?.toString() || "",
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
      const modQtys = recipe.modifierQuantities ?? [];
      setModifierRows(
        modQtys.map((q) => ({
          modifierId: q.modifierId,
          quantity: q.quantity,
          unit: q.unit,
          unitId: q.unitId,
          notes: q.notes,
          enabled: q.enabled !== false,
        }))
      );
    }
  }, [recipe]);

  useEffect(() => {
    if (formData.categoryId != null) return;
    const category = formData.category.trim();
    if (!category) return;
    const matched = itemCategories.find(
      (itemCategory) =>
        itemCategory.label.toLowerCase() === category.toLowerCase() ||
        itemCategory.name.toLowerCase() === category.toLowerCase()
    );
    if (!matched) return;
    setFormData((prev) =>
      prev.categoryId != null
        ? prev
        : {
            ...prev,
            categoryId: matched.id,
            category: matched.label,
          }
    );
  }, [formData.category, formData.categoryId, itemCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the recipe name");
      return;
    }
    if (formData.categoryId == null || !formData.category.trim()) {
      toast.error("Please select the item category");
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
          outputQuantity: formData.outputQuantity ? parseFloat(formData.outputQuantity) : undefined,
          preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : undefined,
          cookingTime: formData.cookingTime ? parseInt(formData.cookingTime) : undefined,
          instructions: formData.instructions || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
          items: items.length > 0 ? items.map(i => ({ itemId: i.itemId, quantity: i.quantity, unit: i.unit, unitId: i.unitId, notes: i.notes })) : undefined,
          modifierQuantities: modifierRows
            .filter((r) => r.quantity > 0)
            .map((r) => ({
            modifierId: r.modifierId,
            quantity: r.quantity,
            unit: r.unit,
            unitId: r.unitId,
            notes: r.notes,
            enabled: true,
          })),
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

  // Check if we have enough stock for all ingredients
  const stockAvailability = useMemo(() => {
    if (!recipe || !produceQuantity || parseFloat(produceQuantity) <= 0) {
      return { canProduce: false, issues: [], warnings: [] as string[] };
    }
    
    const multiplier = parseFloat(produceQuantity) / ((recipe.outputQuantity ?? recipe.servingSize) || 1);
    const issues: Array<{ itemId: number; itemName: string; required: number; available: number; unit: string }> = [];
    const warnings: string[] = [];
    
    const recipeItems = recipe.items || (recipe as { ingredients?: unknown[] }).ingredients || [];
    for (const ri of recipeItems) {
      const itemId = ri.itemId || (ri as any).ingredientId;
      if (!itemId) continue;
      
      const sourceUnitId = ri.unitId ?? (ri as any).unit_id ?? null;
      const availableQuantity = stockLevelMap.get(itemId) || 0;
      const item = ri.item || (ri as any).ingredient;
      const targetUnitId = item?.unitId ?? item?.unit_id ?? sourceUnitId;
      const conversionResult = convertQuantityWithContext(
        ri.quantity * multiplier,
        sourceUnitId,
        targetUnitId,
        unitConversionContext
      );
      const requiredQuantity = conversionResult.quantity;
      // Recipe lines can be mass/volume while the catalog item uses a count unit for the
      // finished good; stock is still compared in the recipe line's unit. Dimension mismatch
      // is expected here — only warn on real conversion problems.
      if (
        conversionResult.warning &&
        conversionResult.warning.reason !== "dimension_mismatch"
      ) {
        warnings.push(`${item?.name || `Item ${itemId}`}: ${conversionResult.warning.detail}`);
      }
      const itemName = item?.name || `Item ${itemId}`;
      const comparisonUnit = item?.unit || ri.unit;
      
      if (availableQuantity < requiredQuantity) {
        issues.push({
          itemId,
          itemName,
          required: requiredQuantity,
          available: availableQuantity,
          unit: comparisonUnit,
        });
      }
    }
    
    return {
      canProduce: issues.length === 0,
      issues,
      warnings,
    };
  }, [recipe, produceQuantity, stockLevelMap, unitConversionContext]);

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
                      <ItemCategorySelector
                        id="category"
                        label="Item Category *"
                        required
                        selectedId={formData.categoryId}
                        onSelect={(cat) =>
                          setFormData((prev) => ({
                            ...prev,
                            categoryId: cat?.id ?? null,
                            category: cat?.label ?? "",
                          }))
                        }
                        placeholder="Select item category"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="outputQuantity">Output Quantity</Label>
                        <div className="flex gap-2">
                          <Input
                            id="outputQuantity"
                            type="number"
                            min={0}
                            step="any"
                            value={formData.outputQuantity}
                            onChange={(e) => handleInputChange('outputQuantity', e.target.value)}
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

                  {/* Right Column: Items + Modifiers */}
                  <div className="space-y-6">
                    <RecipeIngredientsEditor
                      rows={items}
                      onChange={setItems}
                      selectorItems={itemsResponse?.data ?? []}
                      units={units}
                      onRequestCreateItem={(rowIndex) => {
                        setCreateItemTargetIndex(rowIndex);
                        setCreateItemDialogOpen(true);
                      }}
                    />

                    <div className="space-y-3">
                      <div>
                        <Label className="text-base font-semibold">Modifiers</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Per-recipe quantities for modifier lists attached to the produced item.
                          Stock is deducted at sale time based on the option chosen.
                        </p>
                      </div>
                      <RecipeModifiersSection
                        producedItemId={
                          (recipe.producedItems && recipe.producedItems[0]?.id) ??
                          (recipe as { producedItemId?: number | null })?.producedItemId ??
                          null
                        }
                        rows={modifierRows}
                        onChange={setModifierRows}
                      />
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
                    <label className="text-sm font-medium text-muted-foreground">Output Quantity</label>
                    <p className="text-base mt-1">
                      {(recipe.outputQuantity ?? recipe.servingSize)
                        ? `${recipe.outputQuantity ?? recipe.servingSize} ${recipe.unit || 'unit'}`
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
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-base font-semibold tracking-tight">Ingredients</h3>
                      {costData && (() => {
                        const hasModRange =
                          Array.isArray(costData.modifierLists) &&
                          costData.modifierLists.length > 0 &&
                          costData.totalCostMax > costData.totalCostMin;
                        return (
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {hasModRange ? "Estimated Cost (starting at)" : "Estimated Cost"}
                            </div>
                            <div className="text-lg font-bold">
                              {costData.hasAllPrices ? (
                                <>
                                  {hasModRange ? (
                                    <>
                                      {formatCurrency(costData.totalCostMin)} – {formatCurrency(costData.totalCostMax)}
                                    </>
                                  ) : (
                                    <>{formatCurrency(costData.totalCost)} total</>
                                  )}
                                  {costData.outputQuantity > 1 && (
                                    <span className="text-sm text-muted-foreground ml-2">
                                      ({formatCurrencyPerUnit(costData.costPerOutputUnit)} per{" "}
                                      {recipe.unit || "unit"})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">Price data incomplete</span>
                              )}
                            </div>
                            {costData.modifierLists && costData.modifierLists.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Base {formatCurrency(costData.baseCost)} + modifiers
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {costData?.modifierLists && costData.modifierLists.length > 0 && (
                      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                        <div className="text-sm font-medium">Modifiers (per option)</div>
                        {costData.modifierLists.map((ml) => (
                          <div key={ml.modifierListId} className="text-sm">
                            <div className="font-medium text-muted-foreground">
                              {ml.modifierListName || `List #${ml.modifierListId}`}
                              {ml.options.length > 0 && (
                                <span className="ml-2 text-xs font-normal">
                                  {ml.minCost === ml.maxCost
                                    ? formatCurrency(ml.minCost)
                                    : `${formatCurrency(ml.minCost)} – ${formatCurrency(ml.maxCost)}`}
                                </span>
                              )}
                            </div>
                            <div className="ml-3 space-y-1">
                              {ml.options.length === 0 ? (
                                <div className="text-xs text-muted-foreground">No modifiers included</div>
                              ) : (
                                ml.options.map((o) => {
                                  const displayUnit =
                                    o.unitLabel?.trim() || modifierUnitById.get(o.modifierId) || "";
                                  return (
                                  <div
                                    key={o.modifierId}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded border bg-background/70 px-2 py-1.5 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate font-medium">
                                        {o.modifierName || `Modifier #${o.modifierId}`}
                                      </div>
                                      <div className="truncate text-muted-foreground">
                                        {o.supplyItemId ? (
                                          <Link
                                            href={`/items/${o.supplyItemId}`}
                                            className="hover:underline"
                                          >
                                            {o.supplyItemName || `Item #${o.supplyItemId}`}
                                          </Link>
                                        ) : (
                                          "No stock item"
                                        )}
                                        {o.quantity > 0 && (
                                          <>
                                            {" · "}
                                            {o.quantity}
                                            {displayUnit ? ` ${displayUnit}` : ""}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={o.hasPrice ? "font-medium" : "text-muted-foreground italic"}>
                                        {o.hasPrice ? formatCurrency(o.totalCost) : "—"}
                                      </div>
                                      {o.hasPrice && (
                                        <div className="text-[10px] text-muted-foreground tabular-nums space-y-0.5">
                                          <div>
                                            {formatCurrencyPerUnit(o.unitPrice)}/{displayUnit || "unit"}
                                          </div>
                                          {o.costQuote != null && (
                                            <div className="opacity-90">
                                              {formatCurrency(o.costQuote.amount)} / {o.costQuote.basisQuantity}{" "}
                                              {o.costQuote.unitLabel}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm caption-bottom">
                        <thead>
                          <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Ingredient</th>
                            <th className="px-2 py-2 text-right font-medium tabular-nums whitespace-nowrap w-[1%]">
                              Qty
                            </th>
                            <th className="hidden sm:table-cell px-2 py-2 text-right font-medium tabular-nums whitespace-nowrap w-[1%]">
                              Rate
                            </th>
                            <th className="px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap w-[1%]">
                              Line
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(recipe.items || (recipe as { ingredients?: unknown[] }).ingredients || []).map((ri: any, index: number) => {
                            const itemId = ri.itemId || ri.ingredientId;
                            const item = ri.item || ri.ingredient;
                            const costItem =
                              costData?.ingredients?.find(
                                (ci: any) => (ci.itemId || ci.ingredientId) === itemId
                              ) ||
                              (costData as { items?: { itemId?: number }[] })?.items?.find(
                                (ci: any) => ci.itemId === itemId
                              );
                            const hasPrice = costItem && (costItem as { hasPrice?: boolean }).hasPrice;
                            const unitPrice = (costItem as { unitPrice?: number })?.unitPrice ?? 0;
                            const totalCost = (costItem as { totalCost?: number })?.totalCost ?? 0;
                            return (
                              <tr key={index} className="border-b border-border/60 last:border-0">
                                <td className="max-w-0 px-3 py-2 align-top">
                                  <div className="min-w-0">
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
                                    {ri.notes ? (
                                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{ri.notes}</p>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums text-muted-foreground whitespace-nowrap align-top">
                                  {ri.quantity}
                                  {ri.unit ? ` ${ri.unit}` : ""}
                                </td>
                                <td className="hidden sm:table-cell px-2 py-2 text-right tabular-nums align-top whitespace-nowrap">
                                  {hasPrice ? (
                                    <span className="text-muted-foreground">
                                      {formatCurrencyPerUnit(unitPrice)}
                                      <span className="text-[11px] opacity-80">/{ri.unit || "unit"}</span>
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right align-top whitespace-nowrap">
                                  {hasPrice ? (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="font-medium tabular-nums">{formatCurrency(totalCost)}</span>
                                      <span className="sm:hidden text-[11px] leading-tight text-muted-foreground tabular-nums">
                                        {formatCurrencyPerUnit(unitPrice)}
                                        <span className="opacity-80">/{ri.unit || "unit"}</span>
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No price</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
            setProduceDate(dateToYYYYMMDD(new Date()));
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
              <Label htmlFor="quantity">Quantity to produce *</Label>
              <InputGroupAttached
                addonStyle="default"
                input={
                  <Input
                    id="quantity"
                    type="number"
                    min="0.000001"
                    step="0.01"
                    value={produceQuantity}
                    onChange={(e) => setProduceQuantity(e.target.value)}
                    placeholder="1"
                    required
                    className="border-0 rounded-none h-full"
                  />
                }
                addon={
                  <span className="text-muted-foreground text-sm tabular-nums px-2">
                    {recipeOutputUnitLabel}
                  </span>
                }
              />
              <p className="text-xs text-muted-foreground">
                Recipe output quantity: {recipe?.outputQuantity ?? recipe?.servingSize ?? 1}{" "}
                {recipeOutputUnitLabel}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="produceDate">Production date</Label>
              <DatePicker
                id="produceDate"
                value={produceDate ? new Date(produceDate) : undefined}
                onChange={(d) => setProduceDate(d ? dateToYYYYMMDD(d) : dateToYYYYMMDD(new Date()))}
                placeholder="Pick date"
              />
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
                    const multiplier =
                      (parseFloat(produceQuantity) || 0) /
                      ((recipe?.outputQuantity ?? recipe?.servingSize) || 1);
                    const item = ri.item || ri.ingredient;
                    const itemId = ri.itemId || ri.ingredientId;
                    const sourceUnitId = ri.unitId ?? ri.unit_id ?? null;
                    const targetUnitId = item?.unitId ?? item?.unit_id ?? sourceUnitId;
                    const quantityResult = convertQuantityWithContext(
                      ri.quantity * multiplier,
                      sourceUnitId,
                      targetUnitId,
                      unitConversionContext
                    );
                    const quantityToDeduct = quantityResult.quantity;
                    const recipeLineUnitLabel =
                      (sourceUnitId != null
                        ? units.find((u) => u.id === sourceUnitId)?.symbol?.trim() ||
                          units.find((u) => u.id === sourceUnitId)?.name?.trim()
                        : null) || ri.unit;
                    const displayUnit = recipeLineUnitLabel || item?.unit || ri.unit;
                    const availableStock = itemId ? (stockLevelMap.get(itemId) || 0) : 0;
                    const hasEnough = availableStock >= quantityToDeduct;
                    const isOutOfStock = availableStock === 0;
                    const showIngredientConversionWarning =
                      quantityResult.warning &&
                      quantityResult.warning.reason !== "dimension_mismatch";

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
                            Required: <span className="font-medium">{quantityToDeduct.toFixed(2)} {displayUnit}</span>
                          </div>
                          <div className={`text-xs ${hasEnough ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>
                            Available: {availableStock.toFixed(2)} {displayUnit}
                            {!hasEnough && (
                              <span className="ml-2">
                                ({isOutOfStock ? 'Out of stock' : `Need ${(quantityToDeduct - availableStock).toFixed(2)} more`})
                              </span>
                            )}
                          </div>
                          {showIngredientConversionWarning && quantityResult.warning && (
                            <div className="text-xs text-amber-700 dark:text-amber-400">
                              Conversion warning: {quantityResult.warning.detail}
                            </div>
                          )}
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
                {stockAvailability.warnings.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-100/70 border border-amber-300 rounded-lg dark:bg-amber-900/30 dark:border-amber-800">
                    <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      {stockAvailability.warnings.map((warning, idx) => (
                        <div key={idx}>- {warning}</div>
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
                      movementDate: produceDate,
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
              Select a product SKU as this recipe&apos;s output. It will be marked as produced by this recipe and used when you produce it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <UnifiedSelector
              label="Item"
              type="item"
              items={allItems.filter(
                (i) => i.itemTypes?.includes("product") && !(i as { isCatalogParent?: boolean }).isCatalogParent
              )}
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

      <CreateItemMultiStepDialog
        open={createItemDialogOpen}
        onOpenChange={(open) => {
          setCreateItemDialogOpen(open);
          if (!open) setCreateItemTargetIndex(null);
        }}
        defaultItemTypes={["ingredient"]}
        onCreated={(created) => {
          setItems((prev) => {
            const next = [...prev];
            if (createItemTargetIndex != null && next[createItemTargetIndex]) {
              next[createItemTargetIndex] = {
                ...next[createItemTargetIndex],
                itemId: created.id,
                unit: created.unit ?? "",
                unitId: created.unitId,
              };
            } else {
              next.push({
                itemId: created.id,
                quantity: 0,
                unit: created.unit ?? "",
                unitId: created.unitId,
                notes: undefined,
              });
            }
            return next;
          });
        }}
      />

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete recipe"
        description="This action cannot be undone. This will permanently delete this recipe and all associated data."
        confirmText="Delete"
        cancelText="Cancel"
        isPending={deleteMutation.isPending}
        variant="destructive"
      />
      </div>
    </AppLayout>
  );
}

