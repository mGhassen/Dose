"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Save, X, Trash2, Calculator } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useFinancialPlanById, useUpdateFinancialPlan, useDeleteFinancialPlan, useCalculateFinancialPlan } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";

interface FinancialPlanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function FinancialPlanDetailPage({ params }: FinancialPlanDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: financialPlan, isLoading, refetch } = useFinancialPlanById(resolvedParams?.id || "");
  const updateFinancialPlan = useUpdateFinancialPlan();
  const deleteMutation = useDeleteFinancialPlan();
  const calculateFinancialPlan = useCalculateFinancialPlan();
  
  const [formData, setFormData] = useState({
    month: "",
    equity: "",
    loans: "",
    otherSources: "",
    investments: "",
    workingCapital: "",
    loanRepayments: "",
    otherUses: "",
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (financialPlan) {
      setFormData({
        month: financialPlan.month,
        equity: financialPlan.equity.toString(),
        loans: financialPlan.loans.toString(),
        otherSources: financialPlan.otherSources.toString(),
        investments: financialPlan.investments.toString(),
        workingCapital: financialPlan.workingCapital.toString(),
        loanRepayments: financialPlan.loanRepayments.toString(),
        otherUses: financialPlan.otherUses.toString(),
      });
    }
  }, [financialPlan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.month) {
      toast.error("Please select a month");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateFinancialPlan.mutateAsync({
        id: resolvedParams.id,
        data: {
          month: formData.month,
          equity: parseFloat(formData.equity),
          loans: parseFloat(formData.loans),
          otherSources: parseFloat(formData.otherSources),
          investments: parseFloat(formData.investments),
          workingCapital: parseFloat(formData.workingCapital),
          loanRepayments: parseFloat(formData.loanRepayments),
          otherUses: parseFloat(formData.otherUses),
        },
      });
      toast.success("Financial plan updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update financial plan");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this financial plan? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(resolvedParams.id));
      toast.success("Financial plan deleted successfully");
      router.push('/financial-plan');
    } catch (error) {
      toast.error("Failed to delete financial plan");
      console.error(error);
    }
  };

  const handleCalculate = async () => {
    if (!formData.month) {
      toast.error("Please select a month first");
      return;
    }

    try {
      const result = await calculateFinancialPlan.mutateAsync(formData.month);
      if (result) {
        setFormData({
          month: formData.month,
          equity: result.equity.toString(),
          loans: result.loans.toString(),
          otherSources: result.otherSources.toString(),
          investments: result.investments.toString(),
          workingCapital: result.workingCapital.toString(),
          loanRepayments: result.loanRepayments.toString(),
          otherUses: result.otherUses.toString(),
        });
        toast.success("Financial plan recalculated successfully");
        refetch();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to calculate financial plan");
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

  if (!financialPlan) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Financial Plan Not Found</h1>
            <p className="text-muted-foreground">The financial plan you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/financial-plan')}>Back to Financial Plans</Button>
        </div>
      </AppLayout>
    );
  }

  const monthDisplay = (() => {
    const [year, monthNum] = financialPlan.month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return formatMonthYear(date);
  })();

  const totalSources = parseFloat(formData.equity || '0') + 
                      parseFloat(formData.loans || '0') + 
                      parseFloat(formData.otherSources || '0');
  const totalUses = parseFloat(formData.investments || '0') + 
                   parseFloat(formData.workingCapital || '0') + 
                   parseFloat(formData.loanRepayments || '0') + 
                   parseFloat(formData.otherUses || '0');
  const netFinancing = totalSources - totalUses;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Financial Plan" : `Financial Plan - ${monthDisplay}`}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update financial plan information" : "Financial plan details and information"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleCalculate}
                disabled={calculateFinancialPlan.isPending}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {calculateFinancialPlan.isPending ? "Calculating..." : "Recalculate"}
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
            <CardTitle>{isEditing ? "Edit Financial Plan" : "Financial Plan Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this financial plan" : "View and manage financial plan details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Month */}
                  <div className="space-y-2">
                    <Label htmlFor="month">Month *</Label>
                    <Input
                      id="month"
                      type="month"
                      value={formData.month}
                      onChange={(e) => handleInputChange('month', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Sources Section */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Sources of Funds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="equity">Equity</Label>
                      <Input
                        id="equity"
                        type="number"
                        step="0.01"
                        value={formData.equity}
                        onChange={(e) => handleInputChange('equity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loans">Loans</Label>
                      <Input
                        id="loans"
                        type="number"
                        step="0.01"
                        value={formData.loans}
                        onChange={(e) => handleInputChange('loans', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otherSources">Other Sources</Label>
                      <Input
                        id="otherSources"
                        type="number"
                        step="0.01"
                        value={formData.otherSources}
                        onChange={(e) => handleInputChange('otherSources', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Sources</Label>
                      <div className="p-2 bg-muted rounded-md">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(totalSources)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Uses Section */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Uses of Funds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="investments">Investments</Label>
                      <Input
                        id="investments"
                        type="number"
                        step="0.01"
                        value={formData.investments}
                        onChange={(e) => handleInputChange('investments', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workingCapital">Working Capital</Label>
                      <Input
                        id="workingCapital"
                        type="number"
                        step="0.01"
                        value={formData.workingCapital}
                        onChange={(e) => handleInputChange('workingCapital', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loanRepayments">Loan Repayments</Label>
                      <Input
                        id="loanRepayments"
                        type="number"
                        step="0.01"
                        value={formData.loanRepayments}
                        onChange={(e) => handleInputChange('loanRepayments', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otherUses">Other Uses</Label>
                      <Input
                        id="otherUses"
                        type="number"
                        step="0.01"
                        value={formData.otherUses}
                        onChange={(e) => handleInputChange('otherUses', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Total Uses</Label>
                      <div className="p-2 bg-muted rounded-md">
                        <span className="font-semibold text-red-600">
                          {formatCurrency(totalUses)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Financing */}
                <div className="border-t pt-6">
                  <div className="space-y-2">
                    <Label>Net Financing</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <span className={`text-2xl font-bold ${netFinancing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netFinancing)}
                      </span>
                    </div>
                  </div>
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
                  <Button type="submit" disabled={updateFinancialPlan.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateFinancialPlan.isPending ? "Updating..." : "Update Financial Plan"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Sources Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Sources of Funds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Equity</label>
                      <p className="text-base font-semibold mt-1">{formatCurrency(financialPlan.equity)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Loans</label>
                      <p className="text-base font-semibold mt-1">{formatCurrency(financialPlan.loans)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Other Sources</label>
                      <p className="text-base mt-1">{formatCurrency(financialPlan.otherSources)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Sources</label>
                      <p className="text-base font-semibold mt-1 text-green-600">{formatCurrency(financialPlan.totalSources)}</p>
                    </div>
                  </div>
                </div>

                {/* Uses Section */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Uses of Funds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Investments</label>
                      <p className="text-base font-semibold mt-1">{formatCurrency(financialPlan.investments)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Working Capital</label>
                      <p className="text-base font-semibold mt-1">{formatCurrency(financialPlan.workingCapital)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Loan Repayments</label>
                      <p className="text-base font-semibold mt-1">{formatCurrency(financialPlan.loanRepayments)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Other Uses</label>
                      <p className="text-base mt-1">{formatCurrency(financialPlan.otherUses)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Total Uses</label>
                      <p className="text-base font-semibold mt-1 text-red-600">{formatCurrency(financialPlan.totalUses)}</p>
                    </div>
                  </div>
                </div>

                {/* Net Financing */}
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Net Financing</span>
                    <span className={`text-2xl font-bold ${financialPlan.netFinancing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(financialPlan.netFinancing)}
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(financialPlan.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(financialPlan.updatedAt)}
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

