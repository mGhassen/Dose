"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X, Plus, Trash2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateMetadataEnum, useCreateEnumValue } from "@kit/hooks";
import { toast } from "sonner";

interface EnumValue {
  name: string;
  label: string;
  description?: string;
  value?: number;
  displayOrder?: number;
}

export default function CreateMetadataEnumPage() {
  const router = useRouter();
  const createEnum = useCreateMetadataEnum();
  const createValue = useCreateEnumValue();
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    description: "",
    isActive: true,
  });
  const [enumValues, setEnumValues] = useState<EnumValue[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.label) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Create the enum first
      const newEnum = await createEnum.mutateAsync({
        name: formData.name,
        label: formData.label,
        description: formData.description || undefined,
        isActive: formData.isActive,
      });

      // Then create all enum values
      if (enumValues.length > 0) {
        await Promise.all(
          enumValues.map(value =>
            createValue.mutateAsync({
              enumId: newEnum.id,
              data: {
                name: value.name,
                label: value.label,
                description: value.description,
                value: value.value,
                displayOrder: value.displayOrder,
              },
            })
          )
        );
      }

      toast.success("Enum created successfully");
      router.push(`/metadata-enums/${newEnum.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create enum");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addEnumValue = () => {
    setEnumValues([...enumValues, { name: "", label: "" }]);
  };

  const removeEnumValue = (index: number) => {
    setEnumValues(enumValues.filter((_, i) => i !== index));
  };

  const updateEnumValue = (index: number, field: keyof EnumValue, value: any) => {
    const updated = [...enumValues];
    updated[index] = { ...updated[index], [field]: value };
    setEnumValues(updated);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Metadata Enum</h1>
          <p className="text-muted-foreground">Add a new enum definition</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enum Information</CardTitle>
            <CardDescription>Enter the details for this enum</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., ExpenseCategory"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this enum (cannot be changed later)
                  </p>
                </div>

                {/* Label */}
                <div className="space-y-2">
                  <Label htmlFor="label">Label *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => handleInputChange('label', e.target.value)}
                    placeholder="e.g., Expense Category"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name for this enum
                  </p>
                </div>

                {/* Is Active */}
                <div className="space-y-2 flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description of what this enum is used for"
                  rows={3}
                />
              </div>

              {/* Enum Values Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Enum Values</Label>
                    <p className="text-sm text-muted-foreground">
                      Add values for this enum (optional - you can add them later)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEnumValue}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Value
                  </Button>
                </div>

                {enumValues.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No values added yet. Click "Add Value" to add enum values.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {enumValues.map((value, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`value-name-${index}`}>Name *</Label>
                            <Input
                              id={`value-name-${index}`}
                              value={value.name}
                              onChange={(e) => updateEnumValue(index, 'name', e.target.value)}
                              placeholder="e.g., rent"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`value-label-${index}`}>Label *</Label>
                            <Input
                              id={`value-label-${index}`}
                              value={value.label}
                              onChange={(e) => updateEnumValue(index, 'label', e.target.value)}
                              placeholder="e.g., Rent"
                              required
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`value-description-${index}`}>Description</Label>
                            <Textarea
                              id={`value-description-${index}`}
                              value={value.description || ""}
                              onChange={(e) => updateEnumValue(index, 'description', e.target.value)}
                              placeholder="Optional description"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`value-value-${index}`}>Numeric Value</Label>
                            <Input
                              id={`value-value-${index}`}
                              type="number"
                              value={value.value || ""}
                              onChange={(e) => updateEnumValue(index, 'value', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                              placeholder="Optional"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`value-order-${index}`}>Display Order</Label>
                            <Input
                              id={`value-order-${index}`}
                              type="number"
                              value={value.displayOrder || ""}
                              onChange={(e) => updateEnumValue(index, 'displayOrder', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                              placeholder="Optional"
                            />
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEnumValue(index)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/metadata-enums')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createEnum.isPending || createValue.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createEnum.isPending || createValue.isPending ? "Creating..." : "Create Enum"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
