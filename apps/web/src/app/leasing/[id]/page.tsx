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
import { Badge } from "@kit/ui/badge";
import { Checkbox } from "@kit/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { Save, X, Trash2, Calendar, MoreVertical, Edit2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLeasingById, useUpdateLeasing, useDeleteLeasing } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { LeasingType, ExpenseRecurrence } from "@kit/types";

interface LeasingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function LeasingDetailPage({ params }: LeasingDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: leasing, isLoading } = useLeasingById(resolvedParams?.id || "");
  const updateLeasing = useUpdateLeasing();
  const deleteMutation = useDeleteLeasing();
  const [amountMode, setAmountMode] = useState<"periodic" | "total">("periodic");
  
  const [formData, setFormData] = useState({
    name: "",
    type: "operating" as LeasingType,
    amount: "",
    totalAmount: "",
    startDate: "",
    endDate: "",
    frequency: "monthly" as ExpenseRecurrence,
    description: "",
    lessor: "",
    isActive: true,
    offPaymentMonths: [] as number[],
    firstPaymentAmount: "",
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (leasing) {
      const hasTotalAmount = leasing.totalAmount !== undefined && leasing.totalAmount !== null;
      setAmountMode(hasTotalAmount ? "total" : "periodic");
      setFormData({
        name: leasing.name,
        type: leasing.type,
        amount: hasTotalAmount ? "" : leasing.amount.toString(),
        totalAmount: hasTotalAmount ? (leasing.totalAmount?.toString() || "") : "",
        startDate: leasing.startDate.split('T')[0],
        endDate: leasing.endDate ? leasing.endDate.split('T')[0] : "",
        frequency: leasing.frequency,
        description: leasing.description || "",
        lessor: leasing.lessor || "",
        isActive: leasing.isActive,
        offPaymentMonths: leasing.offPaymentMonths || [],
        firstPaymentAmount: leasing.firstPaymentAmount?.toString() || "",
      });
    }
  }, [leasing]);

  // Calculate periodic amount from total amount
  const calculatePeriodicAmount = () => {
    if (amountMode !== "total" || !formData.totalAmount || !formData.startDate || !formData.endDate) {
      return null;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const totalAmount = parseFloat(formData.totalAmount);

    if (isNaN(totalAmount) || start >= end) {
      return null;
    }

    // Calculate number of payment periods based on frequency
    let paymentCount = 0;
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

    switch (formData.frequency) {
      case "one_time":
        return totalAmount;
      case "monthly":
        paymentCount = monthsDiff;
        break;
      case "quarterly":
        paymentCount = Math.floor(monthsDiff / 3);
        break;
      case "yearly":
        paymentCount = Math.floor(monthsDiff / 12);
        break;
      case "custom":
        // For custom, assume monthly for calculation
        paymentCount = monthsDiff;
        break;
    }

    // Account for off-payment months
    const effectivePaymentCount = paymentCount - (formData.offPaymentMonths?.length || 0);
    
    if (effectivePaymentCount <= 0) {
      return null;
    }

    return totalAmount / effectivePaymentCount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (amountMode === "periodic" && formData.amount === "") {
      toast.error("Please enter the periodic amount");
      return;
    }

    if (amountMode === "total") {
      if (formData.totalAmount === "") {
        toast.error("Please enter the total amount");
        return;
      }
      if (!formData.endDate) {
        toast.error("End date is required when using total amount mode");
        return;
      }
    }

    if (!resolvedParams?.id) return;

    try {
      const calculatedAmount = amountMode === "total" ? calculatePeriodicAmount() : parseFloat(formData.amount);
      
      if (calculatedAmount === null || isNaN(calculatedAmount)) {
        toast.error("Unable to calculate periodic amount. Please check your inputs.");
        return;
      }

      await updateLeasing.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          type: formData.type,
          amount: calculatedAmount,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          frequency: formData.frequency,
          description: formData.description || undefined,
          lessor: formData.lessor || undefined,
          isActive: formData.isActive,
          offPaymentMonths: formData.offPaymentMonths.length > 0 ? formData.offPaymentMonths : undefined,
          firstPaymentAmount: formData.firstPaymentAmount ? parseFloat(formData.firstPaymentAmount) : undefined,
          totalAmount: amountMode === "total" ? parseFloat(formData.totalAmount) : undefined,
        },
      });
      toast.success("Leasing payment updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update leasing payment");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this leasing payment? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(resolvedParams.id));
      toast.success("Leasing payment deleted successfully");
      router.push('/leasing');
    } catch (error) {
      toast.error("Failed to delete leasing payment");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOffPaymentMonthToggle = (month: number) => {
    setFormData(prev => {
      const currentMonths = prev.offPaymentMonths || [];
      const isSelected = currentMonths.includes(month);
      return {
        ...prev,
        offPaymentMonths: isSelected
          ? currentMonths.filter(m => m !== month)
          : [...currentMonths, month].sort((a, b) => a - b),
      };
    });
  };

  // Calculate how many months to show for off-payment selection
  const calculateMaxMonths = () => {
    if (formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        return Math.min(monthsDiff, 60); // Cap at 60 months
      }
    }
    return 60; // Default to 60 months if no end date
  };

  const maxMonths = formData.startDate ? calculateMaxMonths() : 0;
  const monthOptions = Array.from({ length: Math.max(0, maxMonths) }, (_, i) => i + 1);

  if (isLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!leasing) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Leasing Payment Not Found</h1>
            <p className="text-muted-foreground">The leasing payment you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/leasing')}>Back to Leasing</Button>
        </div>
      </AppLayout>
    );
  }

  const typeLabels: Record<LeasingType, string> = {
    operating: "Operating",
    finance: "Finance",
  };

  const frequencyLabels: Record<ExpenseRecurrence, string> = {
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
              {isEditing ? "Edit Leasing Payment" : leasing.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update leasing payment information" : "Leasing payment details and information"}
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
                <DropdownMenuItem onClick={() => router.push(`/leasing/${resolvedParams.id}/timeline`)}>
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
            <CardTitle>{isEditing ? "Edit Leasing Payment" : "Leasing Payment Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this leasing payment" : "View and manage leasing payment details"}
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

                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleInputChange('type', value as LeasingType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operating">Operating</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Mode */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Amount Declaration Mode *</Label>
                    <RadioGroup
                      value={amountMode}
                      onValueChange={(value) => setAmountMode(value as "periodic" | "total")}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="periodic" id="periodic" />
                        <Label htmlFor="periodic" className="cursor-pointer">
                          Periodic Amount (per payment)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="total" id="total" />
                        <Label htmlFor="total" className="cursor-pointer">
                          Total Amount (over lease period)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Amount or Total Amount */}
                  {amountMode === "periodic" ? (
                    <div className="space-y-2">
                      <Label htmlFor="amount">Periodic Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Amount to pay per payment period
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">Total Amount *</Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        value={formData.totalAmount}
                        onChange={(e) => handleInputChange('totalAmount', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Total amount to pay over the entire lease period
                        {calculatePeriodicAmount() !== null && (
                          <span className="block mt-1 font-medium">
                            Calculated periodic amount: {calculatePeriodicAmount()?.toFixed(2)}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Frequency */}
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency *</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(value) => handleInputChange('frequency', value as ExpenseRecurrence)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One Time</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {amountMode === "total" && (
                    <p className="text-xs text-muted-foreground">
                      Used to calculate payment schedule from total amount
                    </p>
                  )}
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
                    <Label htmlFor="endDate">End Date {amountMode === "total" && "*"}</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      required={amountMode === "total"}
                    />
                    {amountMode === "total" && (
                      <p className="text-xs text-muted-foreground">
                        Required to calculate periodic amount from total
                      </p>
                    )}
                  </div>

                  {/* Lessor */}
                  <div className="space-y-2">
                    <Label htmlFor="lessor">Lessor</Label>
                    <Input
                      id="lessor"
                      value={formData.lessor}
                      onChange={(e) => handleInputChange('lessor', e.target.value)}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="isActive">Status</Label>
                    <Select
                      value={formData.isActive ? "true" : "false"}
                      onValueChange={(value) => handleInputChange('isActive', value === "true")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* First Payment Amount */}
                <div className="space-y-2">
                  <Label htmlFor="firstPaymentAmount">First Payment Amount (Optional)</Label>
                  <Input
                    id="firstPaymentAmount"
                    type="number"
                    step="0.01"
                    value={formData.firstPaymentAmount}
                    onChange={(e) => handleInputChange('firstPaymentAmount', e.target.value)}
                    placeholder="Leave empty to use regular amount"
                  />
                  <p className="text-sm text-muted-foreground">
                    If specified, this amount will be used for the first payment instead of the regular amount
                  </p>
                </div>

                {/* Off-Payment Months */}
                <div className="space-y-2">
                  <Label>Off-Payment Months (No Payment)</Label>
                  <p className="text-sm text-muted-foreground">
                    Select months (from start date) where no payment will be made
                  </p>
                  {formData.startDate ? (
                    <>
                      <div className="grid grid-cols-6 md:grid-cols-12 gap-2 p-4 border rounded-md max-h-60 overflow-y-auto">
                        {monthOptions.map((month) => (
                          <div key={month} className="flex items-center space-x-2">
                            <Checkbox
                              id={`off-payment-${month}`}
                              checked={formData.offPaymentMonths.includes(month)}
                              onCheckedChange={() => handleOffPaymentMonthToggle(month)}
                            />
                            <Label
                              htmlFor={`off-payment-${month}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {month}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {formData.offPaymentMonths.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {formData.offPaymentMonths.join(', ')}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="p-4 border rounded-md bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Please enter the start date above to select off-payment months.
                      </p>
                    </div>
                  )}
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
                  <Button type="submit" disabled={updateLeasing.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateLeasing.isPending ? "Updating..." : "Update Leasing Payment"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{leasing.name}</p>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {typeLabels[leasing.type] || leasing.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Amount Declaration Mode */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount Declaration Mode</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {leasing.totalAmount ? "Total Amount" : "Periodic Amount"}
                      </Badge>
                    </div>
                  </div>

                  {/* Amount or Total Amount */}
                  {leasing.totalAmount ? (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                      <p className="text-base font-semibold mt-1">{formatCurrency(leasing.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        (Periodic amount: {formatCurrency(leasing.amount)})
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Periodic Amount</label>
                      <p className="text-base font-semibold mt-1">{formatCurrency(leasing.amount)}</p>
                    </div>
                  )}

                  {/* Frequency */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                    <p className="text-base mt-1">{frequencyLabels[leasing.frequency] || leasing.frequency}</p>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="text-base mt-1">{formatDate(leasing.startDate)}</p>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">End Date</label>
                    <p className="text-base mt-1">
                      {leasing.endDate ? formatDate(leasing.endDate) : <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {/* Lessor */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Lessor</label>
                    <p className="text-base mt-1">
                      {leasing.lessor || <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={leasing.isActive ? "default" : "secondary"}>
                        {leasing.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* First Payment Amount */}
                  {leasing.firstPaymentAmount && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">First Payment Amount</label>
                      <p className="text-base font-semibold mt-1">{formatCurrency(leasing.firstPaymentAmount)}</p>
                      <p className="text-sm text-muted-foreground mt-1">(Regular amount: {formatCurrency(leasing.amount)})</p>
                    </div>
                  )}

                  {/* Off-Payment Months */}
                  {leasing.offPaymentMonths && leasing.offPaymentMonths.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Off-Payment Months (No Payment)</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {leasing.offPaymentMonths.map((month) => (
                          <Badge 
                            key={month} 
                            variant="outline" 
                            className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                          >
                            Month {month}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        No payment will be made during these months
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {leasing.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-base mt-1 whitespace-pre-wrap">{leasing.description}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(leasing.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(leasing.updatedAt)}
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

