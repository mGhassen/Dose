"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Checkbox } from "@kit/ui/checkbox";
import { Badge } from "@kit/ui/badge";
import { Save, X, Trash2, Calendar, MoreVertical, Edit2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSubscriptionById, useUpdateSubscription, useDeleteSubscription } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { ExpenseCategory, ExpenseRecurrence } from "@kit/types";

interface SubscriptionDetailsContentProps {
  subscriptionId: string;
}

export default function SubscriptionDetailsContent({ subscriptionId }: SubscriptionDetailsContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const { data: subscription, isLoading } = useSubscriptionById(subscriptionId);
  const updateSubscription = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();
  
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

    try {
      await updateSubscription.mutateAsync({
        id: subscriptionId,
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
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update subscription");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this subscription? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(subscriptionId);
      toast.success("Subscription deleted successfully");
      router.push('/subscriptions');
    } catch (error) {
      toast.error("Failed to delete subscription");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
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

  const categoryLabels: Record<ExpenseCategory, string> = {
    rent: "Rent",
    utilities: "Utilities",
    supplies: "Supplies",
    marketing: "Marketing",
    insurance: "Insurance",
    maintenance: "Maintenance",
    professional_services: "Professional Services",
    other: "Other",
  };

  const recurrenceLabels: Record<ExpenseRecurrence, string> = {
    one_time: "One Time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    custom: "Custom",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Subscription" : subscription.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update subscription information" : "Subscription details and information"}
            </p>
          </div>
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/subscriptions/timeline`)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View Timeline
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Form/Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Subscription" : "Subscription Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this subscription" : "View and manage subscription details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
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
                    onClick={() => setIsEditing(false)}
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
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{subscription.name}</p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {categoryLabels[subscription.category] || subscription.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(subscription.amount)}</p>
                  </div>

                  {/* Recurrence */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Recurrence</label>
                    <p className="text-base mt-1">{recurrenceLabels[subscription.recurrence] || subscription.recurrence}</p>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="text-base mt-1">{formatDate(subscription.startDate)}</p>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">End Date</label>
                    <p className="text-base mt-1">
                      {subscription.endDate ? formatDate(subscription.endDate) : <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                    <p className="text-base mt-1">
                      {subscription.vendor || <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={subscription.isActive ? "default" : "secondary"}>
                        {subscription.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {subscription.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-base mt-1 whitespace-pre-wrap">{subscription.description}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(subscription.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(subscription.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

