"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateExpense, useInventorySuppliers } from "@kit/hooks";
import { toast } from "sonner";
import type { ExpenseCategory } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export default function CreateExpensePage() {
  const router = useRouter();
  const createExpense = useCreateExpense();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: 'vendor' });
  const suppliers = suppliersResponse?.data || [];
  const [formData, setFormData] = useState({
    name: "",
    category: "" as ExpenseCategory | "",
    amount: "",
    expenseDate: dateToYYYYMMDD(new Date()),
    description: "",
    vendor: "",
    supplierId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.amount || !formData.expenseDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createExpense.mutateAsync({
        name: formData.name,
        category: formData.category as ExpenseCategory,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        description: formData.description || undefined,
        vendor: formData.vendor || undefined,
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : undefined,
      });
      toast.success("Expense created successfully");
      router.push('/expenses');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create expense");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Expense</h1>
          <p className="text-muted-foreground">Add a new expense to track</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
            <CardDescription>Enter the details for this expense</CardDescription>
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

                {/* Expense Date */}
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Expense Date *</Label>
                  <DatePicker
                    id="expenseDate"
                    value={formData.expenseDate ? new Date(formData.expenseDate) : undefined}
                    onChange={(d) => handleInputChange("expenseDate", d ? dateToYYYYMMDD(d) : "")}
                    placeholder="Pick a date"
                  />
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

              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Additional notes about this expense"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/expenses')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createExpense.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createExpense.isPending ? "Creating..." : "Create Expense"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

