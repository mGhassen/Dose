"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useVariableById, useUpdateVariable } from "@kit/hooks";
import { toast } from "sonner";
import type { VariableType } from "@kit/types";

interface EditVariablePageProps {
  params: Promise<{ id: string }>;
}

export default function EditVariablePage({ params }: EditVariablePageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: variable, isLoading } = useVariableById(resolvedParams?.id || "");
  const updateVariable = useUpdateVariable();
  
  const [formData, setFormData] = useState({
    name: "",
    type: "" as VariableType | "",
    value: "",
    unit: "",
    effectiveDate: "",
    endDate: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (variable) {
      setFormData({
        name: variable.name,
        type: variable.type,
        value: variable.value.toString(),
        unit: variable.unit || "",
        effectiveDate: variable.effectiveDate.split('T')[0],
        endDate: variable.endDate ? variable.endDate.split('T')[0] : "",
        description: variable.description || "",
        isActive: variable.isActive,
      });
    }
  }, [variable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.type) {
      toast.error("Type is required");
      return;
    }
    if (formData.value === "" || formData.value === null || formData.value === undefined) {
      toast.error("Value is required");
      return;
    }
    const numValue = parseFloat(formData.value);
    if (isNaN(numValue)) {
      toast.error("Value must be a valid number");
      return;
    }
    if (!formData.effectiveDate) {
      toast.error("Effective date is required");
      return;
    }

    if (!resolvedParams?.id) {
      toast.error("Variable ID is missing");
      return;
    }

    try {
      await updateVariable.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name.trim(),
          type: formData.type as VariableType,
          value: numValue,
          unit: formData.unit?.trim() || undefined,
          effectiveDate: formData.effectiveDate,
          endDate: formData.endDate?.trim() || undefined,
          description: formData.description?.trim() || undefined,
          isActive: formData.isActive,
        },
      });
      toast.success("Variable updated successfully");
      router.push(`/variables/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update variable");
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

  if (!variable) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Variable Not Found</h1>
            <p className="text-muted-foreground">The variable you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/variables')}>Back to Variables</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Variable</h1>
          <p className="text-muted-foreground">Update variable information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Variable Information</CardTitle>
            <CardDescription>Update the details for this variable</CardDescription>
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
                    placeholder="e.g., VAT Rate"
                    required
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cost">Cost</SelectItem>
                      <SelectItem value="tax">Tax</SelectItem>
                      <SelectItem value="inflation">Inflation</SelectItem>
                      <SelectItem value="exchange_rate">Exchange Rate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Value */}
                <div className="space-y-2">
                  <Label htmlFor="value">Value *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Unit */}
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    placeholder="e.g., %, TND, USD"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional unit (e.g., %, TND, USD)
                  </p>
                </div>

                {/* Effective Date */}
                <div className="space-y-2">
                  <Label htmlFor="effectiveDate">Effective Date *</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                    required
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for ongoing variables
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
                  placeholder="Additional notes about this variable"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/variables/${resolvedParams.id}`)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateVariable.isPending || isLoading || !resolvedParams?.id}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateVariable.isPending ? "Updating..." : "Update Variable"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

