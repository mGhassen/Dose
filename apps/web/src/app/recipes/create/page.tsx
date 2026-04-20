"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateRecipe, useItems, useUnits, useItemById } from "@kit/hooks";
import { toast } from "sonner";

function CreateRecipeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRecipe = useCreateRecipe();
  const { data: itemsResponse } = useItems({ limit: 1000, includeRecipes: true });
  const { data: units = [] } = useUnits();

  const producedParam = searchParams.get("producedItemId");
  const producedIdParsed = producedParam ? parseInt(producedParam, 10) : NaN;
  const producedItemIdFromQuery =
    !Number.isNaN(producedIdParsed) && producedIdParsed > 0 ? producedIdParsed : null;
  const { data: producedItemRow } = useItemById(
    producedItemIdFromQuery != null ? String(producedItemIdFromQuery) : ""
  );

  const prefilledForId = useRef<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    categoryId: null as number | null,
    outputQuantity: "",
    unitId: null as number | null,
    unit: "",
    producedItemId: null as number | null,
    preparationTime: "",
    cookingTime: "",
    instructions: "",
    notes: "",
    isActive: true,
  });
  const [items, setItems] = useState<
    Array<{ itemId: number; quantity: number; unit: string; unitId?: number; notes?: string }>
  >([]);
  const [modifierRows, setModifierRows] = useState<RecipeModifierRowInput[]>([]);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [createItemTargetIndex, setCreateItemTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (producedItemIdFromQuery == null || !producedItemRow) return;
    if (prefilledForId.current === producedItemIdFromQuery) return;
    if (!producedItemRow.itemTypes?.includes("product")) {
      toast.error("Only product items can be linked as recipe output from this link.");
      prefilledForId.current = producedItemIdFromQuery;
      return;
    }
    prefilledForId.current = producedItemIdFromQuery;
    setFormData((prev) => ({
      ...prev,
      producedItemId: producedItemRow.id,
      name: prev.name.trim() ? prev.name : producedItemRow.name,
      description: prev.description.trim() ? prev.description : producedItemRow.description ?? "",
      category: prev.category.trim() ? prev.category : producedItemRow.category?.label ?? producedItemRow.category?.name ?? "",
      categoryId: prev.categoryId ?? producedItemRow.category?.id ?? null,
      unit: prev.unit.trim() ? prev.unit : producedItemRow.unit ?? "",
      unitId: prev.unitId ?? producedItemRow.unitId ?? null,
    }));
  }, [producedItemIdFromQuery, producedItemRow]);

  const producedDisplayName =
    producedItemRow?.name ??
    itemsResponse?.data?.find((i) => i.id === formData.producedItemId)?.name ??
    (formData.producedItemId ? `Item #${formData.producedItemId}` : null);

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

    try {
      await createRecipe.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        outputQuantity: formData.outputQuantity ? parseFloat(formData.outputQuantity) : undefined,
        unitId: formData.unitId ?? undefined,
        unit: formData.unit || undefined,
        producedItemId: formData.producedItemId ?? undefined,
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime, 10) : undefined,
        cookingTime: formData.cookingTime ? parseInt(formData.cookingTime, 10) : undefined,
        instructions: formData.instructions || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
        items:
          items.length > 0
            ? items.map((i) => ({
                itemId: i.itemId,
                quantity: i.quantity,
                unit: i.unit,
                unitId: i.unitId,
                notes: i.notes,
              }))
            : undefined,
        modifierQuantities:
          modifierRows.length > 0
            ? modifierRows
                .filter((r) => r.quantity > 0)
                .map((r) => ({
                  modifierId: r.modifierId,
                  quantity: r.quantity,
                  unit: r.unit,
                  unitId: r.unitId,
                  notes: r.notes,
                  enabled: true,
                }))
            : undefined,
      });
      toast.success("Recipe created successfully");
      router.push("/recipes");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create recipe");
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
                {formData.producedItemId != null && producedDisplayName && (
                  <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    This recipe produces:{" "}
                    <span className="font-medium text-foreground">{producedDisplayName}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Recipe name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <ItemCategorySelector
                        id="category"
                        label="Item Category *"
                        required
                        selectedId={formData.categoryId}
                        onSelect={(cat) => {
                          setFormData((prev) => ({
                            ...prev,
                            categoryId: cat?.id ?? null,
                            category: cat?.label ?? "",
                          }));
                        }}
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
                            onChange={(e) => handleInputChange("outputQuantity", e.target.value)}
                            placeholder="250"
                            className="w-24"
                          />
                          <UnifiedSelector
                            type="unit"
                            items={units.map((u) => ({ ...u, name: u.name || u.symbol || String(u.id) }))}
                            selectedId={formData.unitId ?? undefined}
                            onSelect={(sel) => {
                              const u = units.find((x) => x.id === sel.id);
                              setFormData((prev) => ({
                                ...prev,
                                unitId: u?.id ?? null,
                                unit: u?.symbol ?? "",
                              }));
                            }}
                            placeholder="Unit"
                            manageLink={{ href: "/variables", text: "Variables" }}
                            getDisplayName={(item) => (item as { symbol?: string }).symbol ?? item.name ?? String(item.id)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preparationTime">Preparation Time (minutes)</Label>
                        <Input
                          id="preparationTime"
                          type="number"
                          value={formData.preparationTime}
                          onChange={(e) => handleInputChange("preparationTime", e.target.value)}
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
                        onChange={(e) => handleInputChange("cookingTime", e.target.value)}
                        placeholder="45"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Recipe description"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions">Instructions</Label>
                      <Textarea
                        id="instructions"
                        value={formData.instructions}
                        onChange={(e) => handleInputChange("instructions", e.target.value)}
                        placeholder="Cooking instructions"
                        rows={8}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        placeholder="Additional notes"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                      />
                      <Label htmlFor="isActive" className="font-normal cursor-pointer">
                        Active
                      </Label>
                    </div>
                  </div>

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
                        </p>
                      </div>
                      <RecipeModifiersSection
                        producedItemId={formData.producedItemId ?? null}
                        rows={modifierRows}
                        onChange={setModifierRows}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/recipes")}>
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
      </div>
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
            const row = {
              itemId: created.id,
              quantity: 0,
              unit: created.unit ?? "",
              unitId: created.unitId,
              notes: undefined as string | undefined,
            };
            if (createItemTargetIndex != null && next[createItemTargetIndex]) {
              next[createItemTargetIndex] = {
                ...next[createItemTargetIndex],
                itemId: row.itemId,
                unit: row.unit,
                unitId: row.unitId,
              };
            } else {
              next.push(row);
            }
            return next;
          });
        }}
      />
    </AppLayout>
  );
}

export default function CreateRecipePage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
            Loading…
          </div>
        </AppLayout>
      }
    >
      <CreateRecipeForm />
    </Suspense>
  );
}
