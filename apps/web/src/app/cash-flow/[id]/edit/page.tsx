"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCashFlowById, useUpdateCashFlow } from "@kit/hooks";
import { toast } from "sonner";

interface EditCashFlowPageProps {
  params: Promise<{ id: string }>;
}

export default function EditCashFlowPage({ params }: EditCashFlowPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: cashFlow, isLoading } = useCashFlowById(resolvedParams?.id || "");
  const updateCashFlow = useUpdateCashFlow();
  
  const [formData, setFormData] = useState({
    month: "",
    openingBalance: "",
    cashInflows: "",
    cashOutflows: "",
    notes: "",
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (cashFlow) {
      setFormData({
        month: cashFlow.month,
        openingBalance: cashFlow.openingBalance.toString(),
        cashInflows: cashFlow.cashInflows.toString(),
        cashOutflows: cashFlow.cashOutflows.toString(),
        notes: cashFlow.notes || "",
      });
    }
  }, [cashFlow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.month || formData.openingBalance === "" || 
        formData.cashInflows === "" || formData.cashOutflows === "") {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateCashFlow.mutateAsync({
        id: resolvedParams.id,
        data: {
          month: formData.month,
          openingBalance: parseFloat(formData.openingBalance),
          cashInflows: parseFloat(formData.cashInflows),
          cashOutflows: parseFloat(formData.cashOutflows),
          notes: formData.notes || undefined,
        },
      });
      toast.success("Cash flow entry updated successfully");
      router.push(`/cash-flow/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update cash flow entry");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const netCashFlow = formData.cashInflows && formData.cashOutflows
    ? parseFloat(formData.cashInflows) - parseFloat(formData.cashOutflows)
    : 0;
  const closingBalance = formData.openingBalance
    ? parseFloat(formData.openingBalance) + netCashFlow
    : 0;

  if (isLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!cashFlow) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Cash Flow Entry Not Found</h1>
            <p className="text-muted-foreground">The cash flow entry you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/cash-flow')}>Back to Cash Flow</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Cash Flow Entry</h1>
          <p className="text-muted-foreground">Update cash flow information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Information</CardTitle>
            <CardDescription>Update the details for this cash flow entry</CardDescription>
          </CardHeader>
          <CardContent>
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

                {/* Opening Balance */}
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance *</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => handleInputChange('openingBalance', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Cash Inflows */}
                <div className="space-y-2">
                  <Label htmlFor="cashInflows">Cash Inflows *</Label>
                  <Input
                    id="cashInflows"
                    type="number"
                    step="0.01"
                    value={formData.cashInflows}
                    onChange={(e) => handleInputChange('cashInflows', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Cash Outflows */}
                <div className="space-y-2">
                  <Label htmlFor="cashOutflows">Cash Outflows *</Label>
                  <Input
                    id="cashOutflows"
                    type="number"
                    step="0.01"
                    value={formData.cashOutflows}
                    onChange={(e) => handleInputChange('cashOutflows', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Calculated Fields */}
                <div className="space-y-2">
                  <Label>Net Cash Flow</Label>
                  <div className="p-2 bg-muted rounded-md">
                    <span className={netCashFlow >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                      {netCashFlow >= 0 ? '+' : ''}{netCashFlow.toFixed(2)} TND
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Closing Balance</Label>
                  <div className="p-2 bg-muted rounded-md">
                    <span className="font-semibold">
                      {closingBalance.toFixed(2)} TND
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this cash flow"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/cash-flow/${resolvedParams.id}`)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCashFlow.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateCashFlow.isPending ? "Updating..." : "Update Cash Flow Entry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

