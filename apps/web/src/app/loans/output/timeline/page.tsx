"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { ArrowLeft, Calendar, Download, Eye, MoreVertical, ChevronDown, LayoutList, CalendarDays } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useAllLoanSchedules, useLoans, useEntries } from "@kit/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatMonthYear } from "@kit/lib/date-format";
import { EditableScheduleRow } from "@/app/loans/[id]/schedule/loan-schedule-editable";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kit/ui/popover";

interface ScheduleWithLoan {
  id: number;
  loanId: number;
  month: number;
  paymentDate: string;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingBalance: number;
  isPaid: boolean;
  paidDate?: string;
  loanName?: string;
  loanNumber?: string;
  offPaymentMonths?: number[];
}

export default function LoanPaymentsTimelinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useAllLoanSchedules(startMonth, endMonth);
  const { data: loans = [] } = useLoans();
  const { data: entriesData } = useEntries({
    direction: "output",
    entryType: "loan_payment",
    includePayments: true,
    limit: 5000,
  });

  const allEntries = entriesData?.data || [];
  const scheduleIds = useMemo(() => new Set(schedules.map((s) => s.id)), [schedules]);
  const entriesForSchedules = useMemo(
    () => allEntries.filter((e) => e.scheduleEntryId && scheduleIds.has(e.scheduleEntryId)),
    [allEntries, scheduleIds]
  );

  const handleTimelineUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["loans", "schedules"] });
    queryClient.invalidateQueries({ queryKey: ["entries"] });
  };

  const loansInPeriod = useMemo(() => {
    const byLoan = new Map<
      number,
      { loanName: string; loanNumber: string; offPaymentMonths: number[]; schedules: ScheduleWithLoan[] }
    >();
    (schedules as ScheduleWithLoan[]).forEach((s) => {
      if (!byLoan.has(s.loanId)) {
        byLoan.set(s.loanId, {
          loanName: s.loanName || "",
          loanNumber: s.loanNumber || "",
          offPaymentMonths: s.offPaymentMonths || [],
          schedules: [],
        });
      }
      byLoan.get(s.loanId)!.schedules.push(s);
    });
    return Array.from(byLoan.entries()).sort(([a], [b]) => a - b);
  }, [schedules]);

  const monthlyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    schedules.forEach((s) => {
      const month = s.paymentDate.slice(0, 7);
      map[month] = (map[month] || 0) + s.totalPayment;
    });
    return map;
  }, [schedules]);

  const monthsInPeriod = useMemo(() => {
    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month]) => month);
  }, [monthlyTotals]);

  const totalAmount = schedules.reduce((sum, s) => sum + s.totalPayment, 0);
  const activeLoans = loans.filter((l) => l.status === "active");
  const monthCount = Object.keys(monthlyTotals).length;

  const handleExport = () => {
    if (schedules.length === 0) {
      toast.error("No timeline data to export");
      return;
    }
    const csv = [
      ["Loan Name", "Loan Number", "Month", "Payment Date", "Total Payment", "Status"].join(","),
      ...(schedules as ScheduleWithLoan[]).map((s) => [
        s.loanName,
        s.loanNumber,
        s.month,
        s.paymentDate,
        s.totalPayment,
        s.isPaid ? "Paid" : "Pending",
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-payments-timeline-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timeline exported successfully");
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/loans/output")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Loan Payments Timeline</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Payment schedule and actual repayments
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {formatMonthYear(new Date(startMonth + "-01"))} →{" "}
                    {formatMonthYear(new Date(endMonth + "-01"))}
                  </span>
                  <span className="sm:hidden">Dates</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Date range</p>
                  <div className="grid gap-2">
                    <div>
                      <label htmlFor="startMonth" className="text-xs text-muted-foreground">
                        From
                      </label>
                      <Input
                        id="startMonth"
                        type="month"
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                        className="h-8 mt-0.5"
                      />
                    </div>
                    <div>
                      <label htmlFor="endMonth" className="text-xs text-muted-foreground">
                        To
                      </label>
                      <Input
                        id="endMonth"
                        type="month"
                        value={endMonth}
                        onChange={(e) => setEndMonth(e.target.value)}
                        className="h-8 mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {schedules.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
                <Download className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        </div>

        {schedules.length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-muted-foreground">
              <strong className="text-foreground">{activeLoans.length}</strong> active loans
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">{schedules.length}</strong> payments
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              <strong className="text-primary">{formatCurrency(totalAmount)}</strong> total
            </span>
            {monthCount > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  ~
                  <strong className="text-foreground">
                    {formatCurrency(totalAmount / monthCount)}
                  </strong>
                  /mo
                </span>
              </>
            )}
          </div>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="py-16 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/30 border-t-foreground" />
            </CardContent>
          </Card>
        ) : loansInPeriod.length > 0 ? (
          <Tabs defaultValue="loans" className="space-y-4">
            <TabsList className="h-9">
              <TabsTrigger value="loans" className="gap-1.5 text-sm">
                <LayoutList className="h-4 w-4" />
                By loan
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-1.5 text-sm">
                <CalendarDays className="h-4 w-4" />
                By month
              </TabsTrigger>
            </TabsList>

            <TabsContent value="loans" className="space-y-3 mt-0">
              {loansInPeriod.map(([loanId, { loanName, loanNumber, offPaymentMonths, schedules: loanSchedules }]) => {
                const loanTotal = loanSchedules.reduce((sum, s) => sum + s.totalPayment, 0);
                const isExpanded = selectedLoanId === loanId;

                return (
                  <Card key={loanId} className="overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedLoanId(isExpanded ? null : loanId)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{loanName}</span>
                          <span className="text-sm text-muted-foreground">({loanNumber})</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {loanSchedules.length} payment(s) in period
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">{formatCurrency(loanTotal)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={() => setSelectedLoanId(isExpanded ? null : loanId)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {isExpanded ? "Collapse" : "Expand"} timeline
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/loans/${loanId}/schedule`)}>
                              View schedule
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    {isExpanded && loanSchedules.length > 0 && (
                      <div className="border-t overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[80px]">Month</TableHead>
                              <TableHead className="w-[120px]">Payment Date</TableHead>
                              <TableHead className="text-right">Principal</TableHead>
                              <TableHead className="text-right">Interest</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                              <TableHead className="w-[100px]">Status</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loanSchedules
                              .sort((a, b) => a.month - b.month)
                              .map((entry) => (
                                <EditableScheduleRow
                                  key={entry.id}
                                  entry={entry}
                                  loanId={String(loanId)}
                                  onUpdate={handleTimelineUpdate}
                                  allEntries={entriesForSchedules}
                                  offPaymentMonths={offPaymentMonths}
                                />
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="monthly" className="mt-0 space-y-3">
              {monthsInPeriod.length > 0 ? (
                monthsInPeriod.map((month) => {
                  const monthSchedules = schedules.filter((s) => s.paymentDate.slice(0, 7) === month);
                  const total = monthlyTotals[month] || 0;
                  const [year, monthNum] = month.split("-");
                  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                  const isExpanded = selectedMonth === month;

                  return (
                    <Card key={month} className="overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedMonth(isExpanded ? null : month)}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{formatMonthYear(date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-primary">{formatCurrency(total)}</p>
                            <p className="text-xs text-muted-foreground">
                              {monthSchedules.length} loan payment(s)
                            </p>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>
                      {isExpanded && monthSchedules.length > 0 && (
                        <div className="border-t overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[180px]">Loan</TableHead>
                                <TableHead className="w-[120px]">Payment Date</TableHead>
                                <TableHead className="text-right">Principal</TableHead>
                                <TableHead className="text-right">Interest</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {monthSchedules
                                .sort((a, b) => ((a as ScheduleWithLoan).loanName || "").localeCompare((b as ScheduleWithLoan).loanName || ""))
                                .map((entry) => (
                                  <EditableScheduleRow
                                    key={entry.id}
                                    entry={entry}
                                    loanId={String(entry.loanId)}
                                    onUpdate={handleTimelineUpdate}
                                    allEntries={entriesForSchedules}
                                    offPaymentMonths={(entry as ScheduleWithLoan).offPaymentMonths || []}
                                    showLoanName
                                    loanName={(entry as ScheduleWithLoan).loanName}
                                  />
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground text-sm">
                    No data for this range
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-16 flex flex-col items-center justify-center gap-3">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No loan schedules in this date range</p>
              <p className="text-sm text-muted-foreground">
                Create loans and generate their schedules to see the timeline
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
