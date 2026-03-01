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
import { useCreateSubscription, useInventorySuppliers } from "@kit/hooks";
import { toast } from "sonner";
import type { ExpenseCategory, ExpenseRecurrence } from "@kit/types";
import Link from "next/link";
import { dateToYYYYMMDD } from "@kit/lib";

export default function CreateSubscriptionPage() {
  const router = useRouter();
  const createSubscription = useCreateSubscription();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: 'vendor' });
  const suppliers = suppliersResponse?.data || [];
  const [formData, setFormData] = useState({
    name: "",
    category: "" as ExpenseCategory | "",
    amount: "",
    recurrence: "monthly" as ExpenseRecurrence,
    startDate: dateToYYYYMMDD(new Date()),
    endDate: "",
    description: "",
    vendor: "",
    supplierId: "",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.amount || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createSubscription.mutateAsync({
        name: formData.name,
        category: formData.category as ExpenseCategory,
        amount: parseFloat(formData.amount),
        recurrence: formData.recurrence,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        description: formData.description || undefined,
        vendor: formData.vendor || undefined,
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : undefined,
        isActive: formData.isActive,
      });
      toast.success("Subscription created successfully");
      router.push('/subscriptions');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create subscription");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Subscription</h1>
          <p className="text-muted-foreground">Add a new recurring subscription</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Information</CardTitle>
            <CardDescription>Enter the details for this subscription</CardDescription>
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
                    placeholder="e.g., Office Rent"
                    required
                  />
                </div>

                <UnifiedSelector
                  label="Category"
                  required
                  type="category"
                  items={[
                    { id: 'rent', name: 'Rent' },
                    { id: 'utilities', name: 'Utilities' },
                    { id: 'supplies', name: 'Supplies' },
                    { id: 'marketing', name: 'Marketing' },
                    { id: 'insurance', name: 'Insurance' },
                    { id: 'maintenance', name: 'Maintenance' },
                    { id: 'professional_services', name: 'Professional Services' },
                    { id: 'other', name: 'Other' },
                  ]}
                  selectedId={formData.category || undefined}
                  onSelect={(item) => handleInputChange('category', item.id === 0 ? '' : String(item.id))}
                  placeholder="Select category"
                />

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <UnifiedSelector
                  label="Recurrence"
                  required
                  type="recurrence"
                  items={[
                    { id: 'monthly', name: 'Monthly' },
                    { id: 'quarterly', name: 'Quarterly' },
                    { id: 'yearly', name: 'Yearly' },
                    { id: 'custom', name: 'Custom' },
                  ]}
                  selectedId={formData.recurrence || undefined}
                  onSelect={(item) => handleInputChange('recurrence', String(item.id) as ExpenseRecurrence)}
                  placeholder="Select recurrence"
                />

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for ongoing subscriptions
                  </p>
                </div>

                {/* Supplier/Vendor */}
                <div className="space-y-2">
                  <UnifiedSelector
                    label="Vendor"
                    type="vendor"
                    items={suppliers}
                    selectedId={formData.supplierId ? parseInt(formData.supplierId) : undefined}
                    onSelect={(item) => handleInputChange('supplierId', item.id === 0 ? '' : String(item.id))}
                    placeholder="Select vendor"
                    manageLink={formData.supplierId ? { href: `/inventory-suppliers/${formData.supplierId}`, text: "View vendor details →" } : undefined}
                  />
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
                  placeholder="Additional notes about this subscription"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/subscriptions')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createSubscription.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createSubscription.isPending ? "Creating..." : "Create Subscription"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

