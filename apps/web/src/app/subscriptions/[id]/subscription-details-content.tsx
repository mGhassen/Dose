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
import { dateToYYYYMMDD } from "@kit/lib";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { AddVendorDialog } from "@/components/add-vendor-dialog";
import { CategorySelector } from "@/components/category-selector";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { Save, X, Trash2, Calendar, MoreVertical, Edit2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSubscriptionById, useUpdateSubscription, useDeleteSubscription, useSubscriptionProjections, useInventorySupplierById, useInventorySuppliers, useMetadataEnum, useVariablesByType } from "@kit/hooks";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";
import type { ExpenseCategory, ExpenseRecurrence, SubscriptionProjection } from "@kit/types";
import { EditableSubscriptionTimelineRow } from "../../subscriptions/timeline/subscription-timeline-editable";
import { projectSubscription } from "@/lib/calculations/subscription-projections";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface SubscriptionDetailsContentProps {
  subscriptionId: string;
}

export default function SubscriptionDetailsContent({ subscriptionId }: SubscriptionDetailsContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: subscription, isLoading } = useSubscriptionById(subscriptionId);
  const { data: supplier } = useInventorySupplierById(subscription?.supplierId?.toString() || "");
  const updateSubscription = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: "vendor" });
  const suppliers = suppliersResponse?.data || [];
  const { data: categoryValues = [] } = useMetadataEnum("ExpenseCategory");
  const { data: recurrenceValues = [] } = useMetadataEnum("ExpenseRecurrence");
  const { data: transactionTaxVars = [] } = useVariablesByType("transaction_tax");
  const transactionTaxItems = transactionTaxVars.map((v) => ({
    id: v.id,
    name: `${v.name} (${v.value}%)`,
    value: v.value,
  }));
  const recurrenceItems = recurrenceValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const categoryLabels: Record<string, string> = Object.fromEntries(
    categoryValues.map((ev) => [ev.name, ev.label ?? ev.name])
  );
  const recurrenceLabels: Record<string, string> = Object.fromEntries(
    recurrenceValues.map((ev) => [ev.name, ev.label ?? ev.name])
  );
  
  // Fetch stored subscription projection entries (for payment status)
  const { data: storedProjections, refetch: refetchProjections } = useSubscriptionProjections(subscriptionId);
  
  // Calculate projections automatically based on subscription dates and recurrence
  const calculatedProjections = subscription ? (() => {
    const startDate = new Date(subscription.startDate);
    const endDate = subscription.endDate ? new Date(subscription.endDate) : new Date(); // Today if no end date
    
    const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
    
    return projectSubscription(subscription, startMonth, endMonth);
  })() : [];
  
  // Merge calculated projections with stored entries (to get payment status)
  const mergedProjections = calculatedProjections.map(calcProj => {
    const stored = storedProjections?.find((p) => p.month === calcProj.month);
    const amount = stored?.amount != null ? Number(stored.amount) : calcProj.amount;
    const actualAmount = stored?.actualAmount != null ? Number(stored.actualAmount) : null;
    const isPaid = stored
      ? (actualAmount != null && amount > 0 ? actualAmount >= amount : !!stored.isPaid)
      : false;
    return {
      ...calcProj,
      amount,
      id: stored?.id,
      isPaid,
      paidDate: stored?.paidDate,
      actualAmount: stored?.actualAmount,
      notes: stored?.notes,
    };
  });
  
  const handleTimelineUpdate = () => {
    refetchProjections();
  };
  
  const [formData, setFormData] = useState({
    name: "",
    category: "" as ExpenseCategory | "",
    amount: "",
    recurrence: "monthly" as ExpenseRecurrence,
    startDate: "",
    endDate: "",
    description: "",
    vendor: "",
    supplierId: undefined as number | undefined,
    defaultTaxRatePercent: undefined as number | undefined,
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
        supplierId: subscription.supplierId ?? undefined,
        defaultTaxRatePercent: subscription.defaultTaxRatePercent ?? undefined,
        isActive: subscription.isActive,
      });
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasTax = formData.defaultTaxRatePercent != null && formData.defaultTaxRatePercent >= 0;
    if (!formData.name || !formData.category || !formData.amount || !formData.startDate || !hasTax) {
      toast.error("Please fill in all required fields, including transaction tax");
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
          supplierId: formData.supplierId,
          defaultTaxRatePercent: formData.defaultTaxRatePercent,
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
    try {
      await deleteMutation.mutateAsync(subscriptionId);
      toast.success("Subscription deleted successfully");
      setIsDeleteDialogOpen(false);
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 py-2">
          <div>
            <div className="flex items-center gap-2">
              <StatusPin active={subscription.isActive} title={subscription.isActive ? "Active" : "Inactive"} />
              <h1 className="text-2xl font-bold">
                {isEditing ? "Edit Subscription" : subscription.name}
              </h1>
            </div>
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
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
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
        {isEditing ? (
        <div className="flex-1 min-h-0 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Subscription</CardTitle>
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
                      required
                    />
                  </div>

                  <CategorySelector
                    enumName="ExpenseCategory"
                    label="Category"
                    required
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
                      required
                    />
                  </div>

                  <UnifiedSelector
                    label="Recurrence"
                    required
                    type="recurrence"
                    items={recurrenceItems}
                    selectedId={formData.recurrence || undefined}
                    onSelect={(item) => handleInputChange('recurrence', String(item.id) as ExpenseRecurrence)}
                    placeholder="Select recurrence"
                  />

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <DatePicker
                      id="startDate"
                      value={formData.startDate ? new Date(formData.startDate) : undefined}
                      onChange={(d) => handleInputChange("startDate", d ? dateToYYYYMMDD(d) : "")}
                      placeholder="Pick a date"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <DatePicker
                      id="endDate"
                      value={formData.endDate ? new Date(formData.endDate) : undefined}
                      onChange={(d) => handleInputChange("endDate", d ? dateToYYYYMMDD(d) : "")}
                      placeholder="Pick a date"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for ongoing subscriptions
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <UnifiedSelector
                      label="Transaction tax *"
                      required
                      items={transactionTaxItems}
                      selectedId={transactionTaxVars.find((v) => v.value === formData.defaultTaxRatePercent)?.id}
                      onSelect={(item) => handleInputChange("defaultTaxRatePercent", (item as { value: number }).value)}
                      placeholder="Select transaction tax"
                    />
                    <p className="text-xs text-muted-foreground">
                      Applied when this subscription generates expense lines (e.g. when a payment is marked paid).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <UnifiedSelector
                      label="Vendor"
                      type="vendor"
                      items={suppliers}
                      selectedId={formData.supplierId ?? undefined}
                      onSelect={(item) =>
                        handleInputChange("supplierId", item.id === 0 ? undefined : item.id)
                      }
                      onCreateNew={() => setAddVendorOpen(true)}
                      placeholder="Select vendor"
                      manageLink={
                        formData.supplierId
                          ? {
                              href: `/inventory-suppliers/${formData.supplierId}`,
                              text: "View vendor details →",
                            }
                          : undefined
                      }
                    />
                    <AddVendorDialog
                      open={addVendorOpen}
                      onOpenChange={setAddVendorOpen}
                      onCreated={(v) => handleInputChange("supplierId", v.id)}
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
          </CardContent>
        </Card>
        </div>
        ) : (
        <>
        <Card className="shrink-0">
          <CardHeader>
            <CardTitle>Subscription Information</CardTitle>
            <CardDescription>View and manage subscription details</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusPin active={subscription.isActive} title={subscription.isActive ? "Active" : "Inactive"} />
                      <p className="text-base font-semibold">{subscription.name}</p>
                    </div>
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
                    <div className="mt-1">
                      {subscription.supplierId && supplier ? (
                        <Link
                          href={`/inventory-suppliers/${subscription.supplierId}`}
                          className="text-base text-primary hover:underline"
                        >
                          {supplier.name}
                        </Link>
                      ) : subscription.vendor ? (
                        <p className="text-base">{subscription.vendor}</p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
          </CardContent>
        </Card>

        {subscription && (mergedProjections.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-0 py-10 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No payment schedule for this subscription</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0 mb-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Entries</div>
                <div className="text-2xl font-bold mt-1">{mergedProjections.length}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-bold mt-1 text-primary">
                  {formatCurrency(mergedProjections.reduce((sum, p) => sum + ((p as any).actualAmount ?? p.amount), 0))}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Paid Entries</div>
                <div className="text-2xl font-bold mt-1 text-green-600">
                  {mergedProjections.filter((p: any) => p.isPaid).length}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Unpaid Entries</div>
                <div className="text-2xl font-bold mt-1 text-orange-600">
                  {mergedProjections.filter((p: any) => !p.isPaid).length}
                </div>
              </div>
            </div>
            <div className="shrink-0 mb-2">
              <p className="text-sm text-muted-foreground">
                Payment schedule from {formatDate(subscription.startDate)} to {subscription.endDate ? formatDate(subscription.endDate) : "today"} ({recurrenceLabels[subscription.recurrence]})
              </p>
            </div>
            <div className="flex-1 min-h-0 rounded-md border overflow-y-auto overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="sticky top-0 z-20 bg-background [&_tr]:border-b shadow-sm">
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedProjections.map((projection: any, index: number) => {
                    const uniqueKey = `sub-${subscription.id}-month-${projection.month}-${projection.id || "calc"}-idx-${index}`;
                    return (
                      <EditableSubscriptionTimelineRow
                        key={uniqueKey}
                        projection={projection}
                        subscriptionId={subscription.id}
                        onUpdate={handleTimelineUpdate}
                      />
                    );
                  })}
                </TableBody>
                <TableFooter className="sticky bottom-0 z-20 bg-muted [&>tr]:border-t-0">
                  <TableRow className="bg-muted font-semibold hover:bg-muted">
                    <TableCell>Total</TableCell>
                    <TableCell>
                      {formatCurrency(mergedProjections.reduce((sum, p) => sum + ((p as any).actualAmount ?? p.amount), 0))}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              </table>
            </div>
          </div>
        ))}
        </>
        )}
        <ConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Delete subscription"
          description="Are you sure you want to delete this subscription? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isPending={deleteMutation.isPending}
          variant="destructive"
        />
      </div>
    </AppLayout>
  );
}

