"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateMetadataEnumPage() {
  const router = useRouter();
  const createEnum = useCreateMetadataEnum();
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    description: "",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.label) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createEnum.mutateAsync({
        name: formData.name,
        label: formData.label,
        description: formData.description || undefined,
        isActive: formData.isActive,
      });
      toast.success("Enum created successfully");
      router.push('/metadata-enums');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create enum");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
                <Button type="submit" disabled={createEnum.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createEnum.isPending ? "Creating..." : "Create Enum"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

