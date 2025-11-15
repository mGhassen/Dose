"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Save, X, Trash2, Calculator } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useWorkingCapitalById, useUpdateWorkingCapital, useDeleteWorkingCapital, useCalculateWorkingCapital } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";

interface WorkingCapitalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkingCapitalDetailPage({ params }: WorkingCapitalDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: workingCapital, isLoading, refetch } = useWorkingCapitalById(resolvedParams?.id || "");
  const updateWorkingCapital = useUpdateWorkingCapital();
  const deleteMutation = useDeleteWorkingCapital();
  const calculateWorkingCapital = useCalculateWorkingCapital();
  
  const [formData, setFormData] = useState({
    month: "",
    accountsReceivable: "",
    inventory: "",
    accountsPayable: "",
    otherCurrentAssets: "",
    otherCurrentLiabilities: "",
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (workingCapital) {
      setFormData({
        month: workingCapital.month,
        accountsReceivable: workingCapital.accountsReceivable.toString(),
        inventory: workingCapital.inventory.toString(),
        accountsPayable: workingCapital.accountsPayable.toString(),
        otherCurrentAssets: workingCapital.otherCurrentAssets.toString(),
        otherCurrentLiabilities: workingCapital.otherCurrentLiabilities.toString(),
      });
    }
  }, [workingCapital]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.month || formData.accountsReceivable === "" || 
        formData.inventory === "" || formData.accountsPayable === "") {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateWorkingCapital.mutateAsync({
        id: resolvedParams.id,
        data: {
          month: formData.month,
          accountsReceivable: parseFloat(formData.accountsReceivable),
          inventory: parseFloat(formData.inventory),
          accountsPayable: parseFloat(formData.accountsPayable),
          otherCurrentAssets: parseFloat(formData.otherCurrentAssets),
          otherCurrentLiabilities: parseFloat(formData.otherCurrentLiabilities),
        },
      });
      toast.success("Working capital entry updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update working capital entry");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this working capital entry? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(resolvedParams.id));
      toast.success("Working capital entry deleted successfully");
      router.push('/working-capital');
    } catch (error) {
      toast.error("Failed to delete working capital entry");
      console.error(error);
    }
  };

  const handleCalculate = async () => {
    if (!formData.month) {
      toast.error("Please select a month first");
      return;
    }

    try {
      const result = await calculateWorkingCapital.mutateAsync(formData.month);
      if (result) {
        setFormData({
          month: formData.month,
          accountsReceivable: result.accountsReceivable.toString(),
          inventory: result.inventory.toString(),
          accountsPayable: result.accountsPayable.toString(),
          otherCurrentAssets: result.otherCurrentAssets.toString(),
          otherCurrentLiabilities: result.otherCurrentLiabilities.toString(),
        });
        toast.success("Working capital recalculated successfully");
        refetch();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to calculate working capital");
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

  if (!workingCapital) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Working Capital Entry Not Found</h1>
            <p className="text-muted-foreground">The working capital entry you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/working-capital')}>Back to Working Capital</Button>
        </div>
      </AppLayout>
    );
  }

  const monthDisplay = (() => {
    const [year, monthNum] = workingCapital.month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return formatMonthYear(date);
  })();

  const currentAssets = parseFloat(formData.accountsReceivable || '0') + 
                       parseFloat(formData.inventory || '0') + 
                       parseFloat(formData.otherCurrentAssets || '0');
  const currentLiabilities = parseFloat(formData.accountsPayable || '0') + 
                            parseFloat(formData.otherCurrentLiabilities || '0');
  const workingCapitalNeed = currentAssets - currentLiabilities;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Working Capital Entry" : `Working Capital - ${monthDisplay}`}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update working capital information" : "Working capital details and information"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleCalculate}
                disabled={calculateWorkingCapital.isPending}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {calculateWorkingCapital.isPending ? "Calculating..." : "Recalculate"}
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
            <CardTitle>{isEditing ? "Edit Working Capital Entry" : "Working Capital Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this working capital entry" : "View and manage working capital details"}
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

                  {/* Accounts Receivable */}
                  <div className="space-y-2">
                    <Label htmlFor="accountsReceivable">Accounts Receivable *</Label>
                    <Input
                      id="accountsReceivable"
                      type="number"
                      step="0.01"
                      value={formData.accountsReceivable}
                      onChange={(e) => handleInputChange('accountsReceivable', e.target.value)}
                      required
                    />
                  </div>

                  {/* Inventory */}
                  <div className="space-y-2">
                    <Label htmlFor="inventory">Inventory *</Label>
                    <Input
                      id="inventory"
                      type="number"
                      step="0.01"
                      value={formData.inventory}
                      onChange={(e) => handleInputChange('inventory', e.target.value)}
                      required
                    />
                  </div>

                  {/* Accounts Payable */}
                  <div className="space-y-2">
                    <Label htmlFor="accountsPayable">Accounts Payable *</Label>
                    <Input
                      id="accountsPayable"
                      type="number"
                      step="0.01"
                      value={formData.accountsPayable}
                      onChange={(e) => handleInputChange('accountsPayable', e.target.value)}
                      required
                    />
                  </div>

                  {/* Other Current Assets */}
                  <div className="space-y-2">
                    <Label htmlFor="otherCurrentAssets">Other Current Assets</Label>
                    <Input
                      id="otherCurrentAssets"
                      type="number"
                      step="0.01"
                      value={formData.otherCurrentAssets}
                      onChange={(e) => handleInputChange('otherCurrentAssets', e.target.value)}
                    />
                  </div>

                  {/* Other Current Liabilities */}
                  <div className="space-y-2">
                    <Label htmlFor="otherCurrentLiabilities">Other Current Liabilities</Label>
                    <Input
                      id="otherCurrentLiabilities"
                      type="number"
                      step="0.01"
                      value={formData.otherCurrentLiabilities}
                      onChange={(e) => handleInputChange('otherCurrentLiabilities', e.target.value)}
                    />
                  </div>

                  {/* Calculated Fields */}
                  <div className="space-y-2">
                    <Label>Current Assets</Label>
                    <div className="p-2 bg-muted rounded-md">
                      <span className="font-semibold">
                        {formatCurrency(currentAssets)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Current Liabilities</Label>
                    <div className="p-2 bg-muted rounded-md">
                      <span className="font-semibold">
                        {formatCurrency(currentLiabilities)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Working Capital Need (BFR)</Label>
                    <div className="p-2 bg-muted rounded-md">
                      <span className={`text-lg font-bold ${workingCapitalNeed >= 0 ? 'text-primary' : 'text-red-600'}`}>
                        {formatCurrency(workingCapitalNeed)}
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
                  <Button type="submit" disabled={updateWorkingCapital.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateWorkingCapital.isPending ? "Updating..." : "Update Entry"}
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

                  {/* Accounts Receivable */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Accounts Receivable</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(workingCapital.accountsReceivable)}</p>
                  </div>

                  {/* Inventory */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Inventory</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(workingCapital.inventory)}</p>
                  </div>

                  {/* Accounts Payable */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Accounts Payable</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(workingCapital.accountsPayable)}</p>
                  </div>

                  {/* Other Current Assets */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Other Current Assets</label>
                    <p className="text-base mt-1">{formatCurrency(workingCapital.otherCurrentAssets)}</p>
                  </div>

                  {/* Other Current Liabilities */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Other Current Liabilities</label>
                    <p className="text-base mt-1">{formatCurrency(workingCapital.otherCurrentLiabilities)}</p>
                  </div>

                  {/* Current Assets Total */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Current Assets</label>
                    <p className="text-base font-semibold mt-1">
                      {formatCurrency(
                        workingCapital.accountsReceivable + 
                        workingCapital.inventory + 
                        workingCapital.otherCurrentAssets
                      )}
                    </p>
                  </div>

                  {/* Current Liabilities Total */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Current Liabilities</label>
                    <p className="text-base font-semibold mt-1">
                      {formatCurrency(
                        workingCapital.accountsPayable + 
                        workingCapital.otherCurrentLiabilities
                      )}
                    </p>
                  </div>

                  {/* Working Capital Need */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Working Capital Need (BFR)</label>
                    <p className={`text-2xl font-bold mt-1 ${workingCapital.workingCapitalNeed >= 0 ? 'text-primary' : 'text-red-600'}`}>
                      {formatCurrency(workingCapital.workingCapitalNeed)}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(workingCapital.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(workingCapital.updatedAt)}
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

