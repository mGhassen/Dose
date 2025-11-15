"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { ArrowLeft, Calculator } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useProfitLossByMonth, useCalculateProfitLoss } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";

interface ProfitLossDetailPageProps {
  params: Promise<{ month: string }>;
}

export default function ProfitLossDetailPage({ params }: ProfitLossDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ month: string } | null>(null);
  const { data: profitLoss, isLoading, refetch } = useProfitLossByMonth(resolvedParams?.month || "");
  const calculateMutation = useCalculateProfitLoss();

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const handleCalculate = async () => {
    if (!resolvedParams?.month) return;

    try {
      await calculateMutation.mutateAsync(resolvedParams.month);
      toast.success("Profit & Loss statement calculated successfully");
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to calculate profit & loss statement");
    }
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

  const monthDisplay = (() => {
    const [year, monthNum] = resolvedParams.month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return formatMonthYear(date);
  })();

  if (!profitLoss) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
            <p className="text-muted-foreground">No statement found for {monthDisplay}</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
              <Calculator className="mr-2 h-4 w-4" />
              {calculateMutation.isPending ? "Calculating..." : "Calculate Statement"}
            </Button>
            <Button variant="outline" onClick={() => router.push('/profit-loss')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Statements
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
            <p className="text-muted-foreground">{monthDisplay}</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleCalculate} disabled={calculateMutation.isPending} variant="outline">
              <Calculator className="mr-2 h-4 w-4" />
              {calculateMutation.isPending ? "Recalculating..." : "Recalculate"}
            </Button>
            <Button variant="outline" onClick={() => router.push('/profit-loss')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Statements
            </Button>
          </div>
        </div>

        {/* Statement Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss Statement</CardTitle>
            <CardDescription>Comprehensive financial statement for {monthDisplay}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Revenue Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Revenue</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Revenue</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(profitLoss.totalRevenue)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Gross Profit</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(profitLoss.grossProfit)}</span>
                </div>
              </div>

              {/* Expenses Section */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-lg font-semibold">Expenses</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cost of Goods Sold</label>
                    <p className="text-base mt-1">{formatCurrency(profitLoss.costOfGoodsSold)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Operating Expenses</label>
                    <p className="text-base mt-1">{formatCurrency(profitLoss.operatingExpenses)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Personnel Costs</label>
                    <p className="text-base mt-1">{formatCurrency(profitLoss.personnelCosts)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Leasing Costs</label>
                    <p className="text-base mt-1">{formatCurrency(profitLoss.leasingCosts)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Depreciation</label>
                    <p className="text-base mt-1">{formatCurrency(profitLoss.depreciation)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Interest Expense</label>
                    <p className="text-base mt-1">{formatCurrency(profitLoss.interestExpense)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Taxes</label>
                    <p className="text-base mt-1">{formatCurrency(profitLoss.taxes)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Other Expenses</label>
                    <p className="text-base mt-1">{formatCurrency(profitLoss.otherExpenses)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Operating Profit</span>
                  <span className={`text-lg font-bold ${profitLoss.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitLoss.operatingProfit)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Net Profit</span>
                  <span className={`text-xl font-bold ${profitLoss.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitLoss.netProfit)}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(profitLoss.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> {formatDate(profitLoss.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

