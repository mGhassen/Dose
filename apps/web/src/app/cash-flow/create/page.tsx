"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateCashFlowEntry } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateCashFlowPage() {
  const router = useRouter();
  const createCashFlow = useCreateCashFlowEntry();
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    openingBalance: "",
    cashInflows: "",
    cashOutflows: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.month || formData.openingBalance === "" || 
        formData.cashInflows === "" || formData.cashOutflows === "") {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createCashFlow.mutateAsync({
        month: formData.month,
        openingBalance: parseFloat(formData.openingBalance),
        cashInflows: parseFloat(formData.cashInflows),
        cashOutflows: parseFloat(formData.cashOutflows),
        notes: formData.notes || undefined,
      });
      toast.success("Cash flow entry created successfully");
      router.push('/cash-flow');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create cash flow entry");
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Cash Flow Entry</h1>
          <p className="text-muted-foreground">Record cash flow for a month</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Information</CardTitle>
            <CardDescription>Enter the cash flow details for this month</CardDescription>
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
                  onClick={() => router.push('/cash-flow')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createCashFlow.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createCashFlow.isPending ? "Creating..." : "Create Cash Flow Entry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

