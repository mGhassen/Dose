"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { ArrowLeft, Download, TrendingDown } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useInvestmentById, useDepreciationSchedule, useGenerateDepreciationSchedule } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { EditableDepreciationRow } from "./depreciation-editable";
import { useQueryClient } from "@tanstack/react-query";

interface InvestmentDepreciationPageProps {
  params: Promise<{ id: string }>;
}

export default function InvestmentDepreciationPage({ params }: InvestmentDepreciationPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: investment, isLoading: investmentLoading } = useInvestmentById(resolvedParams?.id || "");
  const { data: depreciation, isLoading: depreciationLoading } = useDepreciationSchedule(resolvedParams?.id || "");
  const generateDepreciation = useGenerateDepreciationSchedule();

  const handleDepreciationUpdate = () => {
    if (resolvedParams?.id) {
      queryClient.invalidateQueries({ queryKey: ['investments', resolvedParams.id, 'depreciation'] });
    }
  };

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const handleGenerateDepreciation = async () => {
    if (!resolvedParams?.id) return;

    try {
      await generateDepreciation.mutateAsync(resolvedParams.id);
      toast.success("Depreciation schedule generated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate depreciation schedule");
    }
  };

  const handleExport = () => {
    if (!depreciation || depreciation.length === 0) {
      toast.error("No depreciation data to export");
      return;
    }

    const csv = [
      ['Month', 'Depreciation Amount', 'Accumulated Depreciation', 'Book Value'].join(','),
      ...depreciation.map(entry => [
        entry.month,
        entry.depreciationAmount,
        entry.accumulatedDepreciation,
        entry.bookValue,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depreciation-${investment?.name || 'investment'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Depreciation schedule exported successfully");
  };

  if (investmentLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!investment) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Investment Not Found</h1>
            <p className="text-muted-foreground">The investment you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/investments')}>Back to Investments</Button>
        </div>
      </AppLayout>
    );
  }

  const totalDepreciation = depreciation?.reduce((sum, entry) => sum + entry.depreciationAmount, 0) || 0;
  const currentBookValue = depreciation && depreciation.length > 0
    ? depreciation[depreciation.length - 1].bookValue
    : investment.amount;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Depreciation Schedule</h1>
            <p className="text-muted-foreground">
              {investment.name}
            </p>
          </div>
          <div className="flex space-x-2">
            {(!depreciation || depreciation.length === 0) && (
              <Button
                onClick={handleGenerateDepreciation}
                disabled={generateDepreciation.isPending}
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                {generateDepreciation.isPending ? "Generating..." : "Generate Schedule"}
              </Button>
            )}
            {depreciation && depreciation.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push(`/investments/${resolvedParams.id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Investment
            </Button>
          </div>
        </div>

        {/* Investment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Investment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Purchase Amount</label>
                <p className="text-base font-semibold mt-1">{formatCurrency(investment.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Residual Value</label>
                <p className="text-base mt-1">{formatCurrency(investment.residualValue)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Useful Life</label>
                <p className="text-base mt-1">{investment.usefulLifeMonths} months</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Book Value</label>
                <p className="text-base font-semibold mt-1 text-primary">{formatCurrency(currentBookValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Depreciation Table */}
        {depreciationLoading ? (
          <Card>
            <CardContent className="py-10">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            </CardContent>
          </Card>
        ) : depreciation && depreciation.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Depreciation Schedule</CardTitle>
              <CardDescription>
                {depreciation.length} month(s) of depreciation calculated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Depreciation Amount</TableHead>
                      <TableHead className="text-right">Accumulated Depreciation</TableHead>
                      <TableHead className="text-right">Book Value</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depreciation.map((entry, index) => (
                      <EditableDepreciationRow
                        key={entry.id || index}
                        entry={entry}
                        investmentId={resolvedParams?.id || ""}
                        onUpdate={handleDepreciationUpdate}
                      />
                    ))}
                    <TableRow className="font-semibold bg-muted">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalDepreciation)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalDepreciation)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(currentBookValue)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No depreciation schedule generated yet.</p>
                <Button onClick={handleGenerateDepreciation} disabled={generateDepreciation.isPending}>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  {generateDepreciation.isPending ? "Generating..." : "Generate Depreciation Schedule"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

