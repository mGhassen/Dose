"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { ArrowLeft, Calculator } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useBalanceSheetByMonth, useCalculateBalanceSheet } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";

interface BalanceSheetDetailPageProps {
  params: Promise<{ month: string }>;
}

export default function BalanceSheetDetailPage({ params }: BalanceSheetDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ month: string } | null>(null);
  const { data: balanceSheet, isLoading, refetch } = useBalanceSheetByMonth(resolvedParams?.month || "");
  const calculateMutation = useCalculateBalanceSheet();

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const handleCalculate = async () => {
    if (!resolvedParams?.month) return;

    try {
      await calculateMutation.mutateAsync(resolvedParams.month);
      toast.success("Balance sheet calculated successfully");
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to calculate balance sheet");
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

  if (!balanceSheet) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
            <p className="text-muted-foreground">No balance sheet found for {monthDisplay}</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
              <Calculator className="mr-2 h-4 w-4" />
              {calculateMutation.isPending ? "Calculating..." : "Calculate Balance Sheet"}
            </Button>
            <Button variant="outline" onClick={() => router.push('/balance-sheet')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Balance Sheets
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
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
            <p className="text-muted-foreground">{monthDisplay}</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleCalculate} disabled={calculateMutation.isPending} variant="outline">
              <Calculator className="mr-2 h-4 w-4" />
              {calculateMutation.isPending ? "Recalculating..." : "Recalculate"}
            </Button>
            <Button variant="outline" onClick={() => router.push('/balance-sheet')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Balance Sheets
            </Button>
          </div>
        </div>

        {/* Balance Sheet Card */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Current Assets</span>
                  <span className="font-semibold">{formatCurrency(balanceSheet.currentAssets)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Fixed Assets</span>
                  <span className="font-semibold">{formatCurrency(balanceSheet.fixedAssets)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Intangible Assets</span>
                  <span className="font-semibold">{formatCurrency(balanceSheet.intangibleAssets)}</span>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Assets</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(balanceSheet.totalAssets)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities & Equity */}
          <Card>
            <CardHeader>
              <CardTitle>Liabilities & Equity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Liabilities</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current Liabilities</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.currentLiabilities)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Long-term Debt</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.longTermDebt)}</span>
                    </div>
                  </div>
                  <div className="border-t mt-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Liabilities</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.totalLiabilities)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Equity</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Share Capital</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.shareCapital)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Retained Earnings</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.retainedEarnings)}</span>
                    </div>
                  </div>
                  <div className="border-t mt-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Equity</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.totalEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Liabilities & Equity</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Validation */}
        {balanceSheet.totalAssets !== balanceSheet.totalLiabilities + balanceSheet.totalEquity && (
          <Card className="border-yellow-500">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-600">
                ⚠️ Warning: Assets ({formatCurrency(balanceSheet.totalAssets)}) do not equal Liabilities + Equity ({formatCurrency(balanceSheet.totalLiabilities + balanceSheet.totalEquity)})
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Created:</span> {formatDate(balanceSheet.createdAt)}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span> {formatDate(balanceSheet.updatedAt)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

