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
import { useSubscriptionById, useUpdateSubscription } from "@kit/hooks";
import { toast } from "sonner";
import type { ExpenseCategory, ExpenseRecurrence } from "@kit/types";

interface EditSubscriptionPageProps {
  params: Promise<{ id: string }>;
}

export default function EditSubscriptionPage({ params }: EditSubscriptionPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: subscription, isLoading } = useSubscriptionById(resolvedParams?.id || "");
  const updateSubscription = useUpdateSubscription();
  
  const [formData, setFormData] = useState({
    name: "",
    category: "" as ExpenseCategory | "",
    amount: "",
    recurrence: "monthly" as ExpenseRecurrence,
    startDate: "",
    endDate: "",
    description: "",
    vendor: "",
    isActive: true,
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name,
        category: subscription.category,
        amount: subscription.amount.toString(),
        recurrence: subscription.recurrence,
        startDate: subscription.startDate.split('T')[0],
        endDate: subscription.endDate ? subscription.endDate.split('T')[0] : "",
        description: subscription.description || "",
        vendor: subscription.vendor || "",
        isActive: subscription.isActive,
      });
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.amount || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateSubscription.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          category: formData.category as ExpenseCategory,
          amount: parseFloat(formData.amount),
          recurrence: formData.recurrence,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          description: formData.description || undefined,
          vendor: formData.vendor || undefined,
          isActive: formData.isActive,
        },
      });
      toast.success("Subscription updated successfully");
      router.push(`/subscriptions/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update subscription");
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

  if (!subscription) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Subscription Not Found</h1>
            <p className="text-muted-foreground">The subscription you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/subscriptions')}>Back to Subscriptions</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Subscription</h1>
          <p className="text-muted-foreground">Update subscription information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Information</CardTitle>
            <CardDescription>Update the details for this subscription</CardDescription>
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

                {/* Recurrence */}
                <div className="space-y-2">
                  <Label htmlFor="recurrence">Recurrence *</Label>
                  <Select
                    value={formData.recurrence}
                    onValueChange={(value) => handleInputChange('recurrence', value as ExpenseRecurrence)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  onClick={() => router.push(`/subscriptions/${resolvedParams.id}`)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSubscription.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateSubscription.isPending ? "Updating..." : "Update Subscription"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

