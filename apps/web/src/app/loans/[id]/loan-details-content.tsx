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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kit/ui/alert-dialog";
import { Badge } from "@kit/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X, Trash2, Calendar, MoreVertical, Edit2, Plus, Download } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLoanById, useUpdateLoan, useDeleteLoan, useLoanSchedule, useEntries, usePaymentsByEntry, useCreatePayment, useDeletePayment, useGenerateLoanSchedule } from "@kit/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { LoanStatus } from "@kit/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { EditableScheduleRow } from "./schedule/loan-schedule-editable";

interface LoanDetailsContentProps {
  loanId: string;
}

export default function LoanDetailsContent({ loanId }: LoanDetailsContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  const [isDeletePaymentDialogOpen, setIsDeletePaymentDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const { data: loan, isLoading } = useLoanById(loanId);
  const { data: schedule } = useLoanSchedule(loanId);
  const updateLoan = useUpdateLoan();
  const deleteMutation = useDeleteLoan();
  const generateSchedule = useGenerateLoanSchedule();
  
  // Fetch the loan's input entry
  const { data: entriesData } = useEntries({
    direction: 'input',
    entryType: 'loan',
    referenceId: parseInt(loanId),
    includePayments: true,
  });
  const loanEntry = entriesData?.data?.[0];
  
  // Fetch payments for the loan entry
  const { data: payments = [], refetch: refetchPayments } = usePaymentsByEntry(
    loanEntry?.id?.toString() || ''
  );
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  
  // Fetch all entries for schedule
  const { data: allEntriesData } = useEntries({
    direction: 'output',
    entryType: 'loan_payment',
    referenceId: parseInt(loanId),
    includePayments: true,
    limit: 1000,
  });
  
  const handleScheduleUpdate = () => {
    // Hooks handle invalidation automatically
  };
  
  const handleGenerateSchedule = async () => {
    try {
      await generateSchedule.mutateAsync(loanId);
      toast.success("Loan schedule generated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate loan schedule");
    }
  };
  
  const handleExportSchedule = () => {
    if (!schedule || schedule.length === 0) {
      toast.error("No schedule data to export");
      return;
    }

    const csv = [
      ['Month', 'Payment Date', 'Principal Payment', 'Interest Payment', 'Total Payment', 'Remaining Balance', 'Status'].join(','),
      ...schedule.map(entry => [
        entry.month,
        entry.paymentDate,
        entry.principalPayment,
        entry.interestPayment,
        entry.totalPayment,
        entry.remainingBalance,
        entry.isPaid ? 'Paid' : 'Pending',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-schedule-${loan?.loanNumber || 'loan'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Schedule exported successfully");
  };
  
  
  // Calculate payment totals
  const totalPaid = loanEntry ? (payments.reduce((sum, p) => sum + p.amount, 0)) : 0;
  const remainingToPay = loanEntry ? Math.max(0, loanEntry.amount - totalPaid) : 0;
  
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
    offPaymentMonths: [] as number[],
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
        offPaymentMonths: loan.offPaymentMonths || [],
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
          offPaymentMonths: formData.offPaymentMonths.length > 0 ? formData.offPaymentMonths : undefined,
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

  const durationMonths = formData.durationMonths ? parseInt(formData.durationMonths) : 0;
  const monthOptions = Array.from({ length: durationMonths }, (_, i) => i + 1);

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

                {/* Off-Payment Months */}
                {durationMonths > 0 && (
                  <div className="space-y-2">
                    <Label>Off-Payment Months (Interest Only)</Label>
                    <p className="text-sm text-muted-foreground">
                      Select months where only interest will be paid (no principal payment)
                    </p>
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
                  </div>
                )}

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

                  {/* Off-Payment Months */}
                  {loan.offPaymentMonths && loan.offPaymentMonths.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Off-Payment Months (Interest Only)</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {loan.offPaymentMonths.map((month) => (
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
                        These months will only require interest payments (no principal)
                      </p>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-1">
                        Total loan duration: {loan.durationMonths} months (base) + {loan.offPaymentMonths.length} months (extension) = {loan.durationMonths + loan.offPaymentMonths.length} months total
                      </p>
                    </div>
                  )}
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

        {/* Input Payments Card */}
        {!isEditing && loanEntry && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Loan Principal Payments</CardTitle>
                  <CardDescription>
                    Total due: {formatCurrency(loanEntry.amount)} | 
                    Already paid: {formatCurrency(totalPaid)} | 
                    Remaining: {formatCurrency(remainingToPay)}
                  </CardDescription>
                </div>
                <Button onClick={() => setIsPaymentDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Manage Payments
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payments.length > 0 ? (
                  <>
                    <Label>Recent Payments</Label>
                    <div className="border rounded-md divide-y">
                      {payments.slice(0, 3).map((payment) => (
                        <div key={payment.id} className="p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                            <span className="text-sm text-muted-foreground">
                              on {formatDate(payment.paymentDate)}
                            </span>
                            {payment.paymentMethod && (
                              <span className="text-sm text-muted-foreground">
                                ({payment.paymentMethod.replace('_', ' ')})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {payments.length > 3 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        + {payments.length - 3} more payment(s). Click "Manage Payments" to see all.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No payments recorded yet.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setIsPaymentDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Payment
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amortization Schedule Card */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Amortization Schedule</CardTitle>
                  <CardDescription>
                    {schedule && schedule.length > 0 ? (
                      <>
                        {schedule.length} payment(s) scheduled
                        {loan.offPaymentMonths && loan.offPaymentMonths.length > 0 && (
                          <span className="ml-2">
                            • {loan.offPaymentMonths.length} interest-only month{loan.offPaymentMonths.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </>
                    ) : (
                      "No schedule generated yet"
                    )}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  {(!schedule || schedule.length === 0) && (
                    <Button
                      onClick={handleGenerateSchedule}
                      disabled={generateSchedule.isPending}
                    >
                      {generateSchedule.isPending ? "Generating..." : "Generate Schedule"}
                    </Button>
                  )}
                  {schedule && schedule.length > 0 && (
                    <Button variant="outline" onClick={handleExportSchedule}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {schedule && schedule.length > 0 ? (
                <div className="rounded-md border overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Total Payment</TableHead>
                        <TableHead className="text-right">Remaining Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((entry, index) => (
                        <EditableScheduleRow
                          key={entry.id || index}
                          entry={entry}
                          loanId={loanId}
                          onUpdate={handleScheduleUpdate}
                          allEntries={allEntriesData?.data || []}
                          offPaymentMonths={loan.offPaymentMonths || []}
                        />
                      ))}
                      <TableRow className="font-semibold bg-muted sticky bottom-0">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(schedule.reduce((sum, e) => sum + e.principalPayment, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(schedule.reduce((sum, e) => sum + e.interestPayment, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(schedule.reduce((sum, e) => sum + e.totalPayment, 0))}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No schedule generated yet.</p>
                  <Button onClick={handleGenerateSchedule} disabled={generateSchedule.isPending}>
                    {generateSchedule.isPending ? "Generating..." : "Generate Amortization Schedule"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Management Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Payments</DialogTitle>
              <DialogDescription>
                Add payments for this loan. Total due: {loanEntry ? formatCurrency(loanEntry.amount) : '0'} | 
                Already paid: {formatCurrency(totalPaid)} | 
                Remaining: {formatCurrency(remainingToPay)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Existing Payments List */}
              {payments.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Payments</Label>
                  <div className="border rounded-md divide-y">
                    {payments.map((payment) => (
                      <div key={payment.id} className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                            <span className="text-sm text-muted-foreground">
                              on {formatDate(payment.paymentDate)}
                            </span>
                            {payment.paymentMethod && (
                              <span className="text-sm text-muted-foreground">
                                ({payment.paymentMethod.replace('_', ' ')})
                              </span>
                            )}
                            {payment.notes && (
                              <span className="text-sm text-muted-foreground">- {payment.notes}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPaymentToDelete(payment.id);
                            setDeleteConfirmText("");
                            setIsDeletePaymentDialogOpen(true);
                          }}
                          disabled={deletePayment.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add New Payment Form */}
              {remainingToPay > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-semibold">Add New Payment</Label>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-paidDate">Payment Date</Label>
                    <Input
                      id="dialog-paidDate"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-paymentAmount">Payment Amount</Label>
                    <Input
                      id="dialog-paymentAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remainingToPay}
                      defaultValue={remainingToPay.toString()}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum: {formatCurrency(remainingToPay)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="dialog-paymentMethod">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-paymentNotes">Notes (optional)</Label>
                    <Input
                      id="dialog-paymentNotes"
                      type="text"
                      placeholder="Payment reference, check number, etc."
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Close
              </Button>
              {remainingToPay > 0 && (
                <Button
                  onClick={() => {
                    const dateInput = document.getElementById('dialog-paidDate') as HTMLInputElement;
                    const amountInput = document.getElementById('dialog-paymentAmount') as HTMLInputElement;
                    const notesInput = document.getElementById('dialog-paymentNotes') as HTMLInputElement;
                    const amount = parseFloat(amountInput?.value || '0');
                    
                    if (amount <= 0) {
                      toast.error("Payment amount must be greater than 0");
                      return;
                    }
                    
                    if (amount > remainingToPay) {
                      toast.error(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingToPay)}`);
                      return;
                    }
                    
                    if (!loanEntry?.id) {
                      toast.error("Loan entry not found");
                      return;
                    }
                    
                    createPayment.mutateAsync({
                      entryId: loanEntry.id,
                      paymentDate: dateInput?.value || new Date().toISOString().split('T')[0],
                      amount: amount,
                      isPaid: true,
                      paidDate: dateInput?.value || new Date().toISOString().split('T')[0],
                      paymentMethod: paymentMethod || undefined,
                      notes: notesInput?.value || undefined,
                    }).then(() => {
                      refetchPayments();
                      queryClient.invalidateQueries({ queryKey: ['entries'] });
                      toast.success("Payment recorded successfully");
                      // Reset form
                      if (amountInput) amountInput.value = Math.min(remainingToPay - amount, remainingToPay).toString();
                      if (notesInput) notesInput.value = '';
                    }).catch((error: any) => {
                      toast.error(error?.message || "Failed to record payment");
                    });
                  }}
                  disabled={createPayment.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Payment Confirmation Dialog */}
        <AlertDialog open={isDeletePaymentDialogOpen} onOpenChange={setIsDeletePaymentDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payment? This action cannot be undone.
                <br />
                <br />
                Type <strong>DELETE</strong> to confirm:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setIsDeletePaymentDialogOpen(false);
                setPaymentToDelete(null);
                setDeleteConfirmText("");
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!paymentToDelete) return;
                  
                  if (deleteConfirmText !== "DELETE") {
                    toast.error("Please type DELETE to confirm");
                    return;
                  }

                  try {
                    await deletePayment.mutateAsync(paymentToDelete.toString());
                    
                    setIsDeletePaymentDialogOpen(false);
                    setPaymentToDelete(null);
                    setDeleteConfirmText("");
                    refetchPayments();
                    queryClient.invalidateQueries({ queryKey: ['entries'] });
                    toast.success("Payment deleted successfully");
                  } catch (error: any) {
                    toast.error(error?.message || "Failed to delete payment");
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteConfirmText !== "DELETE" || deletePayment.isPending}
              >
                Delete Payment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

