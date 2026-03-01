"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateVariable } from "@kit/hooks";
import { toast } from "sonner";
import type { VariableType } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export default function CreateVariablePage() {
  const router = useRouter();
  const createVariable = useCreateVariable();
  const [formData, setFormData] = useState({
    name: "",
    type: "" as VariableType | "",
    value: "",
    unit: "",
    effectiveDate: dateToYYYYMMDD(new Date()),
    endDate: "",
    description: "",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type || formData.value === "" || !formData.effectiveDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createVariable.mutateAsync({
        name: formData.name,
        type: formData.type as VariableType,
        value: parseFloat(formData.value),
        unit: formData.unit || undefined,
        effectiveDate: formData.effectiveDate,
        endDate: formData.endDate || undefined,
        description: formData.description || undefined,
        isActive: formData.isActive,
      });
      toast.success("Variable created successfully");
      router.push('/variables');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create variable");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Variable</h1>
          <p className="text-muted-foreground">Add a new financial variable</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Variable Information</CardTitle>
            <CardDescription>Enter the details for this variable</CardDescription>
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

                <UnifiedSelector
                  label="Type"
                  required
                  type="type"
                  items={[
                    { id: 'cost', name: 'Cost' },
                    { id: 'tax', name: 'Tax' },
                    { id: 'inflation', name: 'Inflation' },
                    { id: 'exchange_rate', name: 'Exchange Rate' },
                    { id: 'other', name: 'Other' },
                  ]}
                  selectedId={formData.type || undefined}
                  onSelect={(item) => handleInputChange('type', item.id === 0 ? '' : String(item.id))}
                  placeholder="Select type"
                />

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
                  onClick={() => router.push('/variables')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createVariable.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createVariable.isPending ? "Creating..." : "Create Variable"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

