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
import { ItemCategorySelector } from "@/components/item-category-selector";
import { Save, X, Info } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateIngredient, useUnits } from "@kit/hooks";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@kit/ui/tooltip";

export default function CreateIngredientPage() {
  const router = useRouter();
  const createIngredient = useCreateIngredient();
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    unitId: number | null;
    categoryId: number | null;
    isActive: boolean;
  }>({
    name: "",
    description: "",
    unitId: null,
    categoryId: null,
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.unitId == null) {
      toast.error("Please fill in the name and unit");
      return;
    }
    const unitSymbol = (unitsData || []).find((u) => u.id === formData.unitId)?.symbol;
    try {
      await createIngredient.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        unit: unitSymbol ?? '',
        categoryId: formData.categoryId ?? null,
        isActive: formData.isActive,
      });
      toast.success("Ingredient created successfully");
      router.push('/ingredients');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create ingredient");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Ingredient</h1>
          <p className="text-muted-foreground">Add a new ingredient</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ingredient Information</CardTitle>
            <CardDescription>Enter the details for this ingredient</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ingredient name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select a unit or type a custom one</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <UnifiedSelector
                    label=""
                    type="unit"
                    items={unitItems}
                    selectedId={formData.unitId ?? undefined}
                    onSelect={(item) => handleInputChange('unitId', item.id === 0 ? null : (item.id as number))}
                    placeholder="Select unit"
                    manageLink={{ href: '/variables', text: 'Variables' }}
                  />
                </div>

                <div className="space-y-2">
                  <ItemCategorySelector
                    id="category"
                    label="Category"
                    selectedId={formData.categoryId}
                    onSelect={(cat) => handleInputChange('categoryId', cat?.id ?? null)}
                    placeholder="Select category"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Ingredient description"
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
                  onClick={() => router.push('/ingredients')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createIngredient.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createIngredient.isPending ? "Creating..." : "Create Ingredient"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

