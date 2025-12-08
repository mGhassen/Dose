"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLoanById, useUpdateLoan, useInventorySuppliers } from "@kit/hooks";
import { toast } from "sonner";
import type { LoanStatus } from "@kit/types";
import Link from "next/link";

interface EditLoanPageProps {
  params: Promise<{ id: string }>;
}

export default function EditLoanPage({ params }: EditLoanPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: loan, isLoading } = useLoanById(resolvedParams?.id || "");
  const updateLoan = useUpdateLoan();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: 'vendor' });
  const suppliers = suppliersResponse?.data || [];
  
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

    if (!resolvedParams?.id) return;

    try {
      await updateLoan.mutateAsync({
        id: resolvedParams.id,
        data: {
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
        },
      });
      toast.success("Loan updated successfully");
      router.push(`/loans/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update loan");
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

                {/* Lender/Supplier */}
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Lender</Label>
                  <Select
                    value={formData.supplierId || "none"}
                    onValueChange={(value) => handleInputChange('supplierId', value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.supplierId && (
                    <Link href={`/inventory-suppliers/${formData.supplierId}`} className="text-xs text-blue-600 hover:underline">
                      View lender details →
                    </Link>
                  )}
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
    </AppLayout>
  );
}

