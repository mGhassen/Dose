"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X, Trash2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useIngredientById, useUpdateIngredient, useDeleteIngredient } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";

interface IngredientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function IngredientDetailPage({ params }: IngredientDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: ingredient, isLoading } = useIngredientById(resolvedParams?.id || "");
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
    
    if (!confirm("Are you sure you want to delete this ingredient? This action cannot be undone.")) {
      return;
    }

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
      </div>
    </AppLayout>
  );
}

