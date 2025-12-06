"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X, Trash2, Package, ChefHat, MoreVertical, Edit2 } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { useIngredientById, useUpdateIngredient, useDeleteIngredient, useStockLevels } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
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

interface IngredientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function IngredientDetailPage({ params }: IngredientDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: ingredient, isLoading } = useIngredientById(resolvedParams?.id || "");
  const { data: stockLevelsResponse } = useStockLevels({ itemId: resolvedParams?.id, limit: 10 });
  const [recipes, setRecipes] = useState<Array<{ recipeId: number; recipe: { id: number; name: string; isActive: boolean }; quantity: number; unit: string }>>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const updateIngredient = useUpdateIngredient();
  const deleteMutation = useDeleteIngredient();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit: "",
    category: "",
    isActive: true,
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name,
        description: ingredient.description || "",
        unit: ingredient.unit,
        category: ingredient.category || "",
        isActive: ingredient.isActive,
      });
    }
  }, [ingredient]);

  useEffect(() => {
    if (resolvedParams?.id) {
      setLoadingRecipes(true);
      fetch(`/api/items/${resolvedParams.id}/recipes`)
        .then(res => res.json())
        .then(data => {
          setRecipes(data.recipes || []);
          setLoadingRecipes(false);
        })
        .catch(err => {
          console.error('Error fetching recipes:', err);
          setLoadingRecipes(false);
        });
    }
  }, [resolvedParams?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.unit) {
      toast.error("Please fill in the name and unit");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateIngredient.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          unit: formData.unit,
          category: formData.category || undefined,
          isActive: formData.isActive,
        },
      });
      toast.success("Ingredient updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update ingredient");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Ingredient deleted successfully");
      router.push('/ingredients');
    } catch (error) {
      toast.error("Failed to delete ingredient");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  if (!ingredient) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Ingredient Not Found</h1>
            <p className="text-muted-foreground">The ingredient you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/ingredients')}>Back to Ingredients</Button>
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
              {isEditing ? "Edit Ingredient" : ingredient.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update ingredient information" : "Ingredient details and information"}
            </p>
          </div>
          {!isEditing && (
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
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Ingredient" : "Ingredient Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this ingredient" : "View and manage ingredient details"}
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
                    <Label htmlFor="unit">Unit *</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
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

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateIngredient.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateIngredient.isPending ? "Updating..." : "Update Ingredient"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{ingredient.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Unit</label>
                    <p className="text-base font-semibold mt-1">{ingredient.unit}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="text-base mt-1">{ingredient.category || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-base mt-1">{ingredient.isActive ? "Active" : "Inactive"}</p>
                  </div>
                  {ingredient.description && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-base mt-1">{ingredient.description}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(ingredient.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(ingredient.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Stock Levels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Stock Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockLevelsResponse?.data && stockLevelsResponse.data.length > 0 ? (
                <div className="space-y-2">
                  {stockLevelsResponse.data.map((stock) => (
                    <Link key={stock.id} href={`/stock-levels/${stock.id}`}>
                      <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{stock.location || "Default Location"}</div>
                            <div className="text-sm text-muted-foreground">
                              {stock.quantity} {stock.unit}
                            </div>
                          </div>
                          {stock.minimumStockLevel && stock.quantity <= stock.minimumStockLevel && (
                            <span className="text-xs text-orange-600 font-medium">Low Stock</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Link href={`/stock-levels?ingredientId=${ingredient.id}`}>
                    <Button variant="outline" className="w-full mt-2">
                      View All Stock Levels
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No stock levels recorded
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipes Using This Ingredient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Used in Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRecipes ? (
                <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
              ) : recipes.length > 0 ? (
                <div className="space-y-2">
                  {recipes.map((item) => (
                    <Link key={item.recipeId} href={`/recipes/${item.recipeId}`}>
                      <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{item.recipe.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.quantity} {item.unit}
                            </div>
                          </div>
                          {!item.recipe.isActive && (
                            <span className="text-xs text-muted-foreground">Inactive</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Not used in any recipes
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this ingredient
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

