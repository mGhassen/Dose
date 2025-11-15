"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Badge } from "@kit/ui/badge";
import { Save, X, Trash2, Calendar } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLoanById, useUpdateLoan, useDeleteLoan, useLoanSchedule } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { LoanStatus } from "@kit/types";

interface LoanDetailsContentProps {
  loanId: string;
}

export default function LoanDetailsContent({ loanId }: LoanDetailsContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const { data: loan, isLoading } = useLoanById(loanId);
  const { data: schedule } = useLoanSchedule(loanId);
  const updateLoan = useUpdateLoan();
  const deleteMutation = useDeleteLoan();
  
  const [formData, setFormData] = useState({
    name: "",
    loanNumber: "",
    principalAmount: "",
    interestRate: "",
    durationMonths: "",
    startDate: "",
    status: "active" as LoanStatus,
    lender: "",
    description: "",
  });

  useEffect(() => {
    if (loan) {
      setFormData({
        name: loan.name,
        loanNumber: loan.loanNumber,
        principalAmount: loan.principalAmount.toString(),
        interestRate: loan.interestRate.toString(),
        durationMonths: loan.durationMonths.toString(),
        startDate: loan.startDate.split('T')[0],
        status: loan.status,
        lender: loan.lender || "",
        description: loan.description || "",
      });
    }
  }, [loan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.loanNumber || !formData.principalAmount || 
        !formData.interestRate || !formData.durationMonths || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateLoan.mutateAsync({
        id: loanId,
        data: {
          name: formData.name,
          loanNumber: formData.loanNumber,
          principalAmount: parseFloat(formData.principalAmount),
          interestRate: parseFloat(formData.interestRate),
          durationMonths: parseInt(formData.durationMonths),
          startDate: formData.startDate,
          status: formData.status,
          lender: formData.lender || undefined,
          description: formData.description || undefined,
        },
      });
      toast.success("Loan updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update loan");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this loan? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(loanId));
      toast.success("Loan deleted successfully");
      router.push('/loans');
    } catch (error) {
      toast.error("Failed to delete loan");
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

  if (!loan) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Loan Not Found</h1>
            <p className="text-muted-foreground">The loan you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/loans')}>Back to Loans</Button>
        </div>
      </AppLayout>
    );
  }

  const statusLabels: Record<LoanStatus, string> = {
    active: "Active",
    paid_off: "Paid Off",
    defaulted: "Defaulted",
  };

  const statusVariants: Record<LoanStatus, "default" | "secondary" | "destructive"> = {
    active: "default",
    paid_off: "secondary",
    defaulted: "destructive",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Loan" : loan.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update loan information" : "Loan details and information"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/loans/${loanId}/schedule`)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          )}
        </div>

        {/* Form/Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Loan" : "Loan Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this loan" : "View and manage loan details"}
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

                  {/* Loan Number */}
                  <div className="space-y-2">
                    <Label htmlFor="loanNumber">Loan Number *</Label>
                    <Input
                      id="loanNumber"
                      value={formData.loanNumber}
                      onChange={(e) => handleInputChange('loanNumber', e.target.value)}
                      required
                    />
                  </div>

                  {/* Principal Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="principalAmount">Principal Amount *</Label>
                    <Input
                      id="principalAmount"
                      type="number"
                      step="0.01"
                      value={formData.principalAmount}
                      onChange={(e) => handleInputChange('principalAmount', e.target.value)}
                      required
                    />
                  </div>

                  {/* Interest Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Interest Rate (%) *</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      value={formData.interestRate}
                      onChange={(e) => handleInputChange('interestRate', e.target.value)}
                      required
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="durationMonths">Duration (Months) *</Label>
                    <Input
                      id="durationMonths"
                      type="number"
                      value={formData.durationMonths}
                      onChange={(e) => handleInputChange('durationMonths', e.target.value)}
                      required
                    />
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

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paid_off">Paid Off</SelectItem>
                        <SelectItem value="defaulted">Defaulted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lender */}
                  <div className="space-y-2">
                    <Label htmlFor="lender">Lender</Label>
                    <Input
                      id="lender"
                      value={formData.lender}
                      onChange={(e) => handleInputChange('lender', e.target.value)}
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
                  <Button type="submit" disabled={updateLoan.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateLoan.isPending ? "Updating..." : "Update Loan"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{loan.name}</p>
                  </div>

                  {/* Loan Number */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Loan Number</label>
                    <p className="text-base font-semibold mt-1">{loan.loanNumber}</p>
                  </div>

                  {/* Principal Amount */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Principal Amount</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(loan.principalAmount)}</p>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Interest Rate</label>
                    <p className="text-base mt-1">{loan.interestRate}%</p>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <p className="text-base mt-1">{loan.durationMonths} months</p>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="text-base mt-1">{formatDate(loan.startDate)}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={statusVariants[loan.status]}>
                        {statusLabels[loan.status] || loan.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Lender */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Lender</label>
                    <p className="text-base mt-1">
                      {loan.lender || <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>
                </div>

                {/* Schedule Summary */}
                {schedule && schedule.length > 0 && (
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-muted-foreground">Payment Schedule</label>
                    <p className="text-sm mt-1 text-muted-foreground">
                      {schedule.length} payment(s) scheduled. 
                      Total remaining: {formatCurrency(schedule[schedule.length - 1]?.remainingBalance || 0)}
                    </p>
                  </div>
                )}

                {/* Description */}
                {loan.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-base mt-1 whitespace-pre-wrap">{loan.description}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(loan.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(loan.updatedAt)}
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

