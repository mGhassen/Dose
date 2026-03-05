"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLoanById, useLoanSchedule, useGenerateLoanSchedule, useEntries } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { EditableScheduleRow } from "./loan-schedule-editable";

interface LoanSchedulePageProps {
  params: Promise<{ id: string }>;
}

export default function LoanSchedulePage({ params }: LoanSchedulePageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: loan, isLoading: loanLoading } = useLoanById(resolvedParams?.id || "");
  const { data: schedule, isLoading: scheduleLoading } = useLoanSchedule(resolvedParams?.id || "");
  const generateSchedule = useGenerateLoanSchedule();
  
  // Fetch all entries for this loan at once (instead of per-row)
  const { data: allEntriesData } = useEntries({
    direction: 'output',
    entryType: 'loan_payment',
    referenceId: resolvedParams?.id ? parseInt(resolvedParams.id) : undefined,
    includePayments: true,
    limit: 1000, // Get all entries
  });

  const handleScheduleUpdate = () => {
    // Hooks handle invalidation automatically
  };

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const handleGenerateSchedule = async () => {
    if (!resolvedParams?.id) return;
    try {
      await generateSchedule.mutateAsync(resolvedParams.id);
      toast.success("Loan schedule generated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate loan schedule");
    }
  };

  const handleExport = () => {
    if (!schedule || schedule.length === 0) {
      toast.error("No schedule data to export");
      return;
    }

    const csv = [
      ['Month', 'Payment Date', 'Principal Payment', 'Interest Payment', 'Total Payment', 'Remaining Balance', 'Status'].join(','),
      ...schedule.map(entry => [
        entry.month,
        entry.paymentDate,
        entry.principalPayment,
        entry.interestPayment,
        entry.totalPayment,
        entry.remainingBalance,
        entry.isPaid ? 'Paid' : 'Pending',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-schedule-${loan?.loanNumber || 'loan'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Schedule exported successfully");
  };

  if (loanLoading || !resolvedParams) {
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

  const totalPrincipal = schedule?.reduce((sum, entry) => sum + entry.principalPayment, 0) || 0;
  const totalInterest = schedule?.reduce((sum, entry) => sum + entry.interestPayment, 0) || 0;
  const totalPayments = schedule?.reduce((sum, entry) => sum + entry.totalPayment, 0) || 0;
  const paidCount = schedule?.filter(e => e.isPaid).length || 0;
  const pendingCount = schedule?.filter(e => !e.isPaid).length || 0;
  const lastPaidEntry = schedule?.filter(e => e.isPaid).pop();
  const summaryRemainingBalance = lastPaidEntry ? lastPaidEntry.remainingBalance : loan.principalAmount;

  return (
    <AppLayout>
      <div className="flex flex-col max-h-[calc(100vh-5rem)] overflow-hidden">
        <div className="flex items-center justify-between shrink-0 py-2">
          <div>
            <h1 className="text-2xl font-bold">Loan Amortization Schedule</h1>
            <p className="text-muted-foreground">
              {loan.name} ({loan.loanNumber})
            </p>
          </div>
          <div className="flex space-x-2">
            {(!schedule || schedule.length === 0) && (
              <Button
                onClick={handleGenerateSchedule}
                disabled={generateSchedule.isPending}
              >
                {generateSchedule.isPending ? "Generating..." : "Generate Schedule"}
              </Button>
            )}
            {schedule && schedule.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push(`/loans/${resolvedParams.id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Loan
            </Button>
          </div>
        </div>

        <Card className="shrink-0">
          <CardHeader>
            <CardTitle>Loan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Principal Amount</label>
                <p className="text-base font-semibold mt-1">{formatCurrency(loan.principalAmount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Interest Rate</label>
                <p className="text-base mt-1">{loan.interestRate}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <p className="text-base mt-1">{loan.durationMonths} months</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p className="text-base mt-1">{formatDate(loan.startDate)}</p>
              </div>
            </div>
            {schedule && schedule.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Payments</label>
                  <p className="text-base font-semibold mt-1">{schedule.length}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Paid</label>
                  <p className="text-base font-semibold mt-1 text-green-600">{paidCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pending</label>
                  <p className="text-base font-semibold mt-1 text-blue-600">{pendingCount}</p>
                </div>
                {loan.offPaymentMonths && loan.offPaymentMonths.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Interest-Only Months</label>
                    <p className="text-base font-semibold mt-1 text-amber-600">{loan.offPaymentMonths.length}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Remaining Balance</label>
                  <p className="text-base font-semibold mt-1">
                    {formatCurrency(summaryRemainingBalance)}
                  </p>
                </div>
              </div>
            )}
            {loan.offPaymentMonths && loan.offPaymentMonths.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium text-muted-foreground">Off-Payment Months (Interest Only)</label>
                <p className="text-sm mt-1 text-muted-foreground">
                  Months {loan.offPaymentMonths.join(", ")} - Only interest will be paid (no principal)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {scheduleLoading ? (
          <div className="flex items-center justify-center flex-1 min-h-0 py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : schedule && schedule.length > 0 ? (
          <div className="flex flex-col flex-1 min-h-0 mt-4">
            <div className="flex items-center justify-between shrink-0 mb-2">
              <p className="text-sm text-muted-foreground">
                {schedule.length} payment(s) scheduled
                {loan.offPaymentMonths && loan.offPaymentMonths.length > 0 && (
                  <span className="ml-2">
                    • {loan.offPaymentMonths.length} interest-only month{loan.offPaymentMonths.length > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <div className="flex-1 min-h-0 rounded-md border overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed caption-bottom text-sm">
                <TableHeader className="sticky top-0 z-20 bg-background [&_tr]:border-b shadow-sm">
                  <TableRow>
                    <TableHead className="w-14">Month</TableHead>
                    <TableHead className="w-40">Payment Date</TableHead>
                    <TableHead className="text-right w-32">Principal</TableHead>
                    <TableHead className="text-right w-32">Interest</TableHead>
                    <TableHead className="text-right w-32">Total Payment</TableHead>
                    <TableHead className="text-right w-32">Remaining Balance</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((entry, index) => (
                    <EditableScheduleRow
                      key={entry.id || index}
                      entry={entry}
                      loanId={resolvedParams?.id || ""}
                      onUpdate={handleScheduleUpdate}
                      allEntries={allEntriesData?.data || []}
                      offPaymentMonths={loan.offPaymentMonths || []}
                    />
                  ))}
                </TableBody>
                <TableFooter className="sticky bottom-0 z-20 bg-muted [&>tr]:border-t-0">
                  <TableRow className="bg-muted font-semibold hover:bg-muted">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalPrincipal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalInterest)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalPayments)}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableFooter>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 min-h-0 py-10">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">No schedule generated yet.</p>
              <Button onClick={handleGenerateSchedule} disabled={generateSchedule.isPending}>
                {generateSchedule.isPending ? "Generating..." : "Generate Amortization Schedule"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

