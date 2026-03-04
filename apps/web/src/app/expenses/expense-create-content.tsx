"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Save, X } from "lucide-react";
import { useCreateExpense, useInventorySuppliers } from "@kit/hooks";
import { toast } from "sonner";
import type { ExpenseCategory } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export interface ExpenseCreateContentProps {
  onClose: () => void;
  onCreated?: (expenseId: number) => void;
}

const CATEGORY_ITEMS = [
  { id: 'rent', name: 'Rent' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'supplies', name: 'Supplies' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'insurance', name: 'Insurance' },
  { id: 'maintenance', name: 'Maintenance' },
  { id: 'professional_services', name: 'Professional Services' },
  { id: 'other', name: 'Other' },
];

export function ExpenseCreateContent({ onClose, onCreated }: ExpenseCreateContentProps) {
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
      const expense = await createExpense.mutateAsync({
        name: formData.name,
        category: formData.category as ExpenseCategory,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        description: formData.description || undefined,
        vendor: formData.vendor || undefined,
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : undefined,
      });
      toast.success("Expense created successfully");
      if (onCreated && expense?.id) onCreated(expense.id);
      else onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create expense");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0 pb-4 border-b border-border">
        <h2 className="text-lg font-semibold">Create Expense</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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

          <div className="grid grid-cols-2 gap-3">
            <UnifiedSelector
              label="Category"
              required
              type="category"
              items={CATEGORY_ITEMS}
              selectedId={formData.category || undefined}
              onSelect={(item) => handleInputChange('category', item.id === 0 ? '' : String(item.id))}
              placeholder="Select category"
            />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenseDate">Expense Date *</Label>
            <DatePicker
              id="expenseDate"
              value={formData.expenseDate ? new Date(formData.expenseDate) : undefined}
              onChange={(d) => handleInputChange("expenseDate", d ? dateToYYYYMMDD(d) : "")}
              placeholder="Pick a date"
            />
          </div>

          <div className="space-y-2">
            <UnifiedSelector
              label="Vendor"
              type="vendor"
              items={suppliers}
              selectedId={formData.supplierId ? parseInt(formData.supplierId) : undefined}
              onSelect={(item) => handleInputChange('supplierId', item.id === 0 ? '' : String(item.id))}
              placeholder="Select vendor"
              manageLink={formData.supplierId ? { href: `/inventory-suppliers/${formData.supplierId}`, text: "View vendor →" } : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending} className="flex-1">
              {createExpense.isPending ? "Creating..." : "Create Expense"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </div>
  );
}
