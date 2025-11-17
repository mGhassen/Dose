"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X, Trash2, Plus } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useRecipeById, useUpdateRecipe, useDeleteRecipe, useIngredients } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: recipe, isLoading } = useRecipeById(resolvedParams?.id || "");
  const { data: ingredientsResponse } = useIngredients({ limit: 1000 });
  const updateRecipe = useUpdateRecipe();
  const deleteMutation = useDeleteRecipe();
  
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
  const [ingredients, setIngredients] = useState<Array<{ ingredientId: number; quantity: number; unit: string; notes?: string }>>([]);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        description: recipe.description || "",
        servingSize: recipe.servingSize?.toString() || "",
        preparationTime: recipe.preparationTime?.toString() || "",
        cookingTime: recipe.cookingTime?.toString() || "",
        instructions: recipe.instructions || "",
        notes: recipe.notes || "",
        isActive: recipe.isActive,
      });
      if (recipe.ingredients) {
        setIngredients(recipe.ingredients.map(ri => ({
          ingredientId: ri.ingredientId,
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
          servingSize: formData.servingSize ? parseInt(formData.servingSize) : undefined,
          preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : undefined,
          cookingTime: formData.cookingTime ? parseInt(formData.cookingTime) : undefined,
          instructions: formData.instructions || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
          ingredients: ingredients.length > 0 ? ingredients : undefined,
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
    
    if (!confirm("Are you sure you want to delete this recipe? This action cannot be undone.")) {
      return;
    }

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

  const addIngredient = () => {
    setIngredients([...ingredients, { ingredientId: 0, quantity: 0, unit: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
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
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

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

                  <div className="space-y-2">
                    <Label htmlFor="cookingTime">Cooking Time (minutes)</Label>
                    <Input
                      id="cookingTime"
                      type="number"
                      value={formData.cookingTime}
                      onChange={(e) => handleInputChange('cookingTime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={formData.instructions}
                      onChange={(e) => handleInputChange('instructions', e.target.value)}
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
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

                {/* Ingredients Section */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Ingredients</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Ingredient
                    </Button>
                  </div>

                  {ingredients.map((ing, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                      <div className="col-span-4">
                        <Label>Ingredient</Label>
                        <Select
                          value={ing.ingredientId.toString()}
                          onValueChange={(value) => updateIngredient(index, 'ingredientId', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ingredient" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredientsResponse?.data?.map((ingredient) => (
                              <SelectItem key={ingredient.id} value={ingredient.id.toString()}>
                                {ingredient.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ing.quantity || ""}
                          onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Unit</Label>
                        <Input
                          value={ing.unit}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeIngredient(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-4">
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{recipe.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Serving Size</label>
                    <p className="text-base mt-1">{recipe.servingSize ? `${recipe.servingSize} servings` : "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Preparation Time</label>
                    <p className="text-base mt-1">{recipe.preparationTime ? `${recipe.preparationTime} minutes` : "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cooking Time</label>
                    <p className="text-base mt-1">{recipe.cookingTime ? `${recipe.cookingTime} minutes` : "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-base mt-1">{recipe.isActive ? "Active" : "Inactive"}</p>
                  </div>
                  {recipe.description && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-base mt-1">{recipe.description}</p>
                    </div>
                  )}
                  {recipe.instructions && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Instructions</label>
                      <p className="text-base mt-1 whitespace-pre-wrap">{recipe.instructions}</p>
                    </div>
                  )}
                </div>

                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
                    <div className="space-y-2">
                      {recipe.ingredients.map((ri, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{ri.ingredient?.name || `Ingredient ${ri.ingredientId}`}</span>
                            <span className="text-muted-foreground ml-2">
                              {ri.quantity} {ri.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(recipe.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(recipe.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

