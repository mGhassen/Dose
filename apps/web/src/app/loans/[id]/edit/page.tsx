"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@kit/ui/alert";
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
import { UnifiedSelector } from "@/components/unified-selector";
import { Info, Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import {
  useLoanById,
  useUpdateLoan,
  useInventorySuppliers,
  useMetadataEnum,
  useLoanSchedule,
  useGenerateLoanSchedule,
} from "@kit/hooks";
import { toast } from "sonner";
import { dateToYYYYMMDD } from "@kit/lib";
import type { LoanStatus } from "@kit/types";
import { DatePicker } from "@kit/ui/date-picker";
import { SupplierFormDialog } from "@/components/supplier-form-dialog";

interface EditLoanPageProps {
  params: Promise<{ id: string }>;
}

export default function EditLoanPage({ params }: EditLoanPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: loan, isLoading } = useLoanById(resolvedParams?.id || "");
  const { data: schedule } = useLoanSchedule(resolvedParams?.id || "");
  const updateLoan = useUpdateLoan();
  const generateSchedule = useGenerateLoanSchedule();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: 'lender' });
  const suppliers = suppliersResponse?.data || [];
  const { data: loanStatusValues = [] } = useMetadataEnum("LoanStatus");
  const statusItems = loanStatusValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const [addLenderOpen, setAddLenderOpen] = useState(false);
  const [isRegeneratePromptOpen, setIsRegeneratePromptOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    loanNumber: "",
    principalAmount: "",
    interestRate: "",
    durationMonths: "",
    startDate: "",
    status: "active" as LoanStatus,
    lender: "",
    supplierId: "",
    description: "",
    offPaymentMonths: [] as number[],
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

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
        supplierId: loan.supplierId?.toString() || "",
        description: loan.description || "",
        offPaymentMonths: loan.offPaymentMonths || [],
      });
    }
  }, [loan]);

  const hasSchedulePayments = Array.isArray(schedule) && schedule.some((s) => s.isPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.loanNumber || !formData.principalAmount ||
        !formData.interestRate || !formData.durationMonths || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

    const nextPrincipal = parseFloat(formData.principalAmount);
    const nextRate = parseFloat(formData.interestRate);
    const nextDuration = parseInt(formData.durationMonths);
    const nextOffMonths = [...formData.offPaymentMonths].sort((a, b) => a - b);
    const prevOffMonths = [...(loan?.offPaymentMonths || [])].sort((a, b) => a - b);

    const scheduleAffectingChanged = !!loan && (
      loan.principalAmount !== nextPrincipal ||
      loan.interestRate !== nextRate ||
      loan.durationMonths !== nextDuration ||
      loan.startDate.split('T')[0] !== formData.startDate ||
      JSON.stringify(prevOffMonths) !== JSON.stringify(nextOffMonths)
    );

    if (scheduleAffectingChanged && hasSchedulePayments) {
      toast.error("Cannot change schedule-related fields while payments exist. Delete the payments first.");
      return;
    }

    try {
      await updateLoan.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          loanNumber: formData.loanNumber,
          principalAmount: nextPrincipal,
          interestRate: nextRate,
          durationMonths: nextDuration,
          startDate: formData.startDate,
          status: formData.status,
          lender: formData.lender || undefined,
          supplierId: formData.supplierId ? parseInt(formData.supplierId) : undefined,
          description: formData.description || undefined,
          offPaymentMonths: nextOffMonths.length > 0 ? nextOffMonths : undefined,
        },
      });
      toast.success("Loan updated successfully");
      if (scheduleAffectingChanged && schedule && schedule.length > 0 && !hasSchedulePayments) {
        setIsRegeneratePromptOpen(true);
      } else {
        router.push(`/loans/${resolvedParams.id}`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update loan");
    }
  };

  const handleRegenerateFromPrompt = async () => {
    if (!resolvedParams?.id) return;
    try {
      await generateSchedule.mutateAsync(resolvedParams.id);
      toast.success("Loan schedule regenerated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to regenerate loan schedule");
    } finally {
      setIsRegeneratePromptOpen(false);
      router.push(`/loans/${resolvedParams.id}`);
    }
  };

  const handleDismissRegeneratePrompt = () => {
    setIsRegeneratePromptOpen(false);
    if (resolvedParams?.id) {
      router.push(`/loans/${resolvedParams.id}`);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOffPaymentMonthToggle = (month: number) => {
    setFormData((prev) => {
      const current = prev.offPaymentMonths || [];
      const isSelected = current.includes(month);
      return {
        ...prev,
        offPaymentMonths: isSelected
          ? current.filter((m) => m !== month)
          : [...current, month].sort((a, b) => a - b),
      };
    });
  };

  const durationMonths = formData.durationMonths ? parseInt(formData.durationMonths) : 0;
  const monthOptions = Array.from({ length: durationMonths }, (_, i) => i + 1);

  if (isLoading || !resolvedParams) {
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Loan</h1>
          <p className="text-muted-foreground">Update loan information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
            <CardDescription>Update the details for this loan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {hasSchedulePayments && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Schedule fields are locked</AlertTitle>
                  <AlertDescription>
                    This loan has recorded payments. Only name, number, lender, description and status can be modified. Delete the payments first to change schedule-related fields.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Business Loan"
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
                    placeholder="e.g., Emprunt 1"
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
                    placeholder="0.00"
                    disabled={hasSchedulePayments}
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
                    placeholder="0.00"
                    disabled={hasSchedulePayments}
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
                    placeholder="e.g., 60"
                    disabled={hasSchedulePayments}
                    required
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <DatePicker
                    id="startDate"
                    value={formData.startDate ? new Date(formData.startDate) : undefined}
                    onChange={(d) => handleInputChange("startDate", d ? dateToYYYYMMDD(d) : "")}
                    placeholder="Pick a date"
                    disabled={hasSchedulePayments}
                  />
                </div>

                <UnifiedSelector
                  label="Status"
                  required
                  type="status"
                  items={statusItems}
                  selectedId={formData.status || undefined}
                  onSelect={(item) => handleInputChange('status', item.id === 0 ? '' : String(item.id))}
                  placeholder="Select status"
                />

                {/* Lender/Supplier */}
                <div className="space-y-2">
                  <UnifiedSelector
                    label="Lender"
                    type="lender"
                    items={suppliers}
                    selectedId={formData.supplierId ? parseInt(formData.supplierId) : undefined}
                    onSelect={(item) => handleInputChange('supplierId', item.id === 0 ? '' : String(item.id))}
                    placeholder="Select lender"
                    onCreateNew={() => setAddLenderOpen(true)}
                    manageLink={formData.supplierId ? { href: `/inventory-suppliers/${formData.supplierId}`, text: "View lender details →" } : undefined}
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
                  placeholder="Additional notes about this loan"
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
                          disabled={hasSchedulePayments}
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
                  onClick={() => router.push(`/loans/${resolvedParams.id}`)}
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
          </CardContent>
        </Card>
      </div>
      <SupplierFormDialog
        open={addLenderOpen}
        onOpenChange={setAddLenderOpen}
        entityLabel="lender"
        defaultSupplierTypes={['lender']}
        onCreated={(lender) => handleInputChange('supplierId', String(lender.id))}
      />

      <AlertDialog open={isRegeneratePromptOpen} onOpenChange={(open) => {
        if (!open) handleDismissRegeneratePrompt();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Loan details affecting the schedule changed. Regenerate now to recalculate all installments. Existing schedule rows and linked loan-payment entries will be replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleDismissRegeneratePrompt}
              disabled={generateSchedule.isPending}
            >
              Later
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRegenerateFromPrompt();
              }}
              disabled={generateSchedule.isPending}
            >
              {generateSchedule.isPending ? "Regenerating..." : "Regenerate now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
