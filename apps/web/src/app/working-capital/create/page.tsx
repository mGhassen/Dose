"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Save, X, Calculator } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateWorkingCapital, useCalculateWorkingCapital } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";

export default function CreateWorkingCapitalPage() {
  const router = useRouter();
  const createWorkingCapital = useCreateWorkingCapital();
  const calculateWorkingCapital = useCalculateWorkingCapital();
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    accountsReceivable: "",
    inventory: "",
    accountsPayable: "",
    otherCurrentAssets: "0",
    otherCurrentLiabilities: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.month || formData.accountsReceivable === "" || 
        formData.inventory === "" || formData.accountsPayable === "") {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createWorkingCapital.mutateAsync({
        month: formData.month,
        accountsReceivable: parseFloat(formData.accountsReceivable),
        inventory: parseFloat(formData.inventory),
        accountsPayable: parseFloat(formData.accountsPayable),
        otherCurrentAssets: parseFloat(formData.otherCurrentAssets),
        otherCurrentLiabilities: parseFloat(formData.otherCurrentLiabilities),
      });
      toast.success("Working capital entry created successfully");
      router.push('/working-capital');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create working capital entry");
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
        toast.success("Working capital calculated successfully");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to calculate working capital");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const currentAssets = parseFloat(formData.accountsReceivable || '0') + 
                       parseFloat(formData.inventory || '0') + 
                       parseFloat(formData.otherCurrentAssets || '0');
  const currentLiabilities = parseFloat(formData.accountsPayable || '0') + 
                            parseFloat(formData.otherCurrentLiabilities || '0');
  const workingCapitalNeed = currentAssets - currentLiabilities;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Working Capital Entry</h1>
          <p className="text-muted-foreground">Record working capital for a month</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Working Capital Information</CardTitle>
            <CardDescription>Enter the working capital details for this month</CardDescription>
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

                {/* Accounts Receivable */}
                <div className="space-y-2">
                  <Label htmlFor="accountsReceivable">Accounts Receivable *</Label>
                  <Input
                    id="accountsReceivable"
                    type="number"
                    step="0.01"
                    value={formData.accountsReceivable}
                    onChange={(e) => handleInputChange('accountsReceivable', e.target.value)}
                    placeholder="0.00"
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
                    placeholder="0.00"
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
                    placeholder="0.00"
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
                    placeholder="0.00"
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
                    placeholder="0.00"
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
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCalculate}
                  disabled={calculateWorkingCapital.isPending}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {calculateWorkingCapital.isPending ? "Calculating..." : "Auto-Calculate"}
                </Button>
                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/working-capital')}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createWorkingCapital.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {createWorkingCapital.isPending ? "Creating..." : "Create Entry"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

