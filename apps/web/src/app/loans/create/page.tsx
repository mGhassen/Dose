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
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateLoan, useInventorySuppliers, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import type { LoanStatus } from "@kit/types";
import { Checkbox } from "@kit/ui/checkbox";
import { dateToYYYYMMDD } from "@kit/lib";
import { AddVendorDialog } from "@/components/add-vendor-dialog";

export default function CreateLoanPage() {
  const router = useRouter();
  const createLoan = useCreateLoan();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: 'lender' });
  const suppliers = suppliersResponse?.data || [];
  const { data: loanStatusValues = [] } = useMetadataEnum("LoanStatus");
  const statusItems = loanStatusValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const [addLenderOpen, setAddLenderOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    loanNumber: "",
    principalAmount: "",
    interestRate: "",
    durationMonths: "",
    startDate: dateToYYYYMMDD(new Date()),
    status: "active" as LoanStatus,
    lender: "",
    supplierId: "",
    description: "",
    offPaymentMonths: [] as number[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.loanNumber || !formData.principalAmount || 
        !formData.interestRate || !formData.durationMonths || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createLoan.mutateAsync({
        name: formData.name,
        loanNumber: formData.loanNumber,
        principalAmount: parseFloat(formData.principalAmount),
        interestRate: parseFloat(formData.interestRate),
        durationMonths: parseInt(formData.durationMonths),
        startDate: formData.startDate,
        status: formData.status,
        lender: formData.lender || undefined,
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : undefined,
        description: formData.description || undefined,
        offPaymentMonths: formData.offPaymentMonths.length > 0 ? formData.offPaymentMonths : undefined,
      });
      toast.success("Loan created successfully");
      router.push('/loans');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create loan");
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
  const monthOptions = Array.from({ length: Math.max(0, durationMonths) }, (_, i) => i + 1);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Loan</h1>
          <p className="text-muted-foreground">Add a new loan or credit facility</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
            <CardDescription>Enter the details for this loan</CardDescription>
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
              <div className="space-y-2">
                <Label>Off-Payment Months (Interest Only)</Label>
                <p className="text-sm text-muted-foreground">
                  Select months where only interest will be paid (no principal payment)
                </p>
                {durationMonths > 0 ? (
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
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Selected: {formData.offPaymentMonths.join(', ')}
                        </p>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Total loan duration: {durationMonths} months (base) + {formData.offPaymentMonths.length} months (extension) = {durationMonths + formData.offPaymentMonths.length} months total
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Please enter the loan duration (in months) above to select off-payment months.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/loans')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoan.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createLoan.isPending ? "Creating..." : "Create Loan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <AddVendorDialog
        open={addLenderOpen}
        onOpenChange={setAddLenderOpen}
        entityLabel="lender"
        supplierTypes={['lender']}
        onCreated={(lender) => handleInputChange('supplierId', String(lender.id))}
      />
    </AppLayout>
  );
}

