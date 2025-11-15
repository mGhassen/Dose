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
import { useExpenseById, useUpdateExpense, useSubscriptions } from "@kit/hooks";
import { toast } from "sonner";
import type { ExpenseCategory } from "@kit/types";

interface EditExpensePageProps {
  params: Promise<{ id: string }>;
}

export default function EditExpensePage({ params }: EditExpensePageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: expense, isLoading } = useExpenseById(resolvedParams?.id || "");
  const updateExpense = useUpdateExpense();
  const { data: subscriptionsResponse } = useSubscriptions();
  const subscriptions = subscriptionsResponse?.data || [];
  
  const [formData, setFormData] = useState({
    name: "",
    category: "" as ExpenseCategory | "",
    amount: "",
    subscriptionId: "",
    expenseDate: new Date().toISOString().split('T')[0],
    description: "",
    vendor: "",
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        category: expense.category,
        amount: expense.amount.toString(),
        subscriptionId: expense.subscriptionId?.toString() || "",
        expenseDate: expense.expenseDate.split('T')[0],
        description: expense.description || "",
        vendor: expense.vendor || "",
      });
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.amount || !formData.expenseDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateExpense.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          category: formData.category as ExpenseCategory,
          amount: parseFloat(formData.amount),
          subscriptionId: formData.subscriptionId ? parseInt(formData.subscriptionId) : undefined,
          expenseDate: formData.expenseDate,
          description: formData.description || undefined,
          vendor: formData.vendor || undefined,
        },
      });
      toast.success("Expense updated successfully");
      router.push(`/expenses/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update expense");
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

  if (!expense) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Expense Not Found</h1>
            <p className="text-muted-foreground">The expense you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/expenses')}>Back to Expenses</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Expense</h1>
          <p className="text-muted-foreground">Update expense information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
            <CardDescription>Update the details for this expense</CardDescription>
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

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="professional_services">Professional Services</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {/* Subscription (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="subscriptionId">Subscription (Optional)</Label>
                  <Select
                    value={formData.subscriptionId}
                    onValueChange={(value) => handleInputChange('subscriptionId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (One-time expense)</SelectItem>
                      {subscriptions?.map(sub => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this expense to a subscription payment
                  </p>
                </div>

                {/* Expense Date */}
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Expense Date *</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                    required
                  />
                </div>

                {/* Vendor */}
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => handleInputChange('vendor', e.target.value)}
                    placeholder="Vendor name"
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
                  onClick={() => router.push(`/expenses/${resolvedParams.id}`)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updateExpense.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateExpense.isPending ? "Updating..." : "Update Expense"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

