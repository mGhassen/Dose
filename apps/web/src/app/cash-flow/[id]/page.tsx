"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Save, X, Trash2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCashFlowEntryById, useUpdateCashFlowEntry, useDeleteCashFlowEntry } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";

interface CashFlowDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CashFlowDetailPage({ params }: CashFlowDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: cashFlow, isLoading } = useCashFlowEntryById(resolvedParams?.id || "");
  const updateCashFlow = useUpdateCashFlowEntry();
  const deleteMutation = useDeleteCashFlowEntry();
  
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
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update cash flow entry");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this cash flow entry? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(resolvedParams.id));
      toast.success("Cash flow entry deleted successfully");
      router.push('/cash-flow');
    } catch (error) {
      toast.error("Failed to delete cash flow entry");
      console.error(error);
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

  const monthDisplay = (() => {
    const [year, monthNum] = cashFlow.month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  })();

  const netCashFlow = formData.cashInflows && formData.cashOutflows
    ? parseFloat(formData.cashInflows) - parseFloat(formData.cashOutflows)
    : cashFlow.netCashFlow;
  const closingBalance = formData.openingBalance
    ? parseFloat(formData.openingBalance) + netCashFlow
    : cashFlow.closingBalance;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Cash Flow Entry" : `Cash Flow - ${monthDisplay}`}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update cash flow information" : "Cash flow details and information"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
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
            <CardTitle>{isEditing ? "Edit Cash Flow Entry" : "Cash Flow Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this cash flow entry" : "View and manage cash flow details"}
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

                  {/* Opening Balance */}
                  <div className="space-y-2">
                    <Label htmlFor="openingBalance">Opening Balance *</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      step="0.01"
                      value={formData.openingBalance}
                      onChange={(e) => handleInputChange('openingBalance', e.target.value)}
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
                  <Button type="submit" disabled={updateCashFlow.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateCashFlow.isPending ? "Updating..." : "Update Cash Flow Entry"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Month */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Month</label>
                    <p className="text-base font-semibold mt-1">{monthDisplay}</p>
                  </div>

                  {/* Opening Balance */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Opening Balance</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(cashFlow.openingBalance)}</p>
                  </div>

                  {/* Cash Inflows */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cash Inflows</label>
                    <p className="text-base font-semibold mt-1 text-green-600">
                      {formatCurrency(cashFlow.cashInflows)}
                    </p>
                  </div>

                  {/* Cash Outflows */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cash Outflows</label>
                    <p className="text-base font-semibold mt-1 text-red-600">
                      {formatCurrency(cashFlow.cashOutflows)}
                    </p>
                  </div>

                  {/* Net Cash Flow */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Net Cash Flow</label>
                    <p className={`text-base font-semibold mt-1 ${cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlow.netCashFlow)}
                    </p>
                  </div>

                  {/* Closing Balance */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Closing Balance</label>
                    <p className="text-base font-semibold mt-1">
                      {formatCurrency(cashFlow.closingBalance)}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {cashFlow.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-base mt-1 whitespace-pre-wrap">{cashFlow.notes}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {new Date(cashFlow.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {new Date(cashFlow.updatedAt).toLocaleDateString()}
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

