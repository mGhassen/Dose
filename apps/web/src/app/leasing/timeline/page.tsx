"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  MoreVertical,
  ChevronDown,
  LayoutList,
  CalendarDays,
} from "lucide-react";
import AppLayout from "@/components/app-layout";
import {
  useAllLeasingSchedules,
  useLeasing,
  useEntries,
  useMetadataEnum,
} from "@kit/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatMonthYear } from "@kit/lib/date-format";
import { EditableLeasingTimelineRow } from "../[id]/timeline/leasing-timeline-editable";
import type { LeasingScheduleEntry } from "@kit/lib";
import type { LeasingTimelineEntry } from "@/lib/calculations/leasing-timeline";
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
import { Badge } from "@kit/ui/badge";

function scheduleToTimelineEntry(s: LeasingScheduleEntry): LeasingTimelineEntry {
  return {
    id: s.id,
    leasingId: s.leasingId,
    leasingName: s.leasingName,
    month: s.month,
    paymentDate: s.paymentDate,
    amount: s.amount,
    isProjected: s.isProjected,
    isFixedAmount: s.isFixedAmount,
    isPaid: s.isPaid,
    paidDate: s.paidDate ?? undefined,
    entryId: s.entryId,
    totalPaid: s.totalPaid,
  };
}

export default function LeasingTimelinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: leasingPayments = [], isLoading: leasingLoading } = useLeasing();
  const { data: leasingTypeValues = [] } = useMetadataEnum("LeasingType");
  const typeLabels: Record<string, string> = Object.fromEntries(
    leasingTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])
  );

  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedLeasingId, setSelectedLeasingId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useAllLeasingSchedules(startMonth, endMonth);

  const { data: entriesData } = useEntries({
    direction: "output",
    entryType: "leasing_payment",
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
    queryClient.invalidateQueries({ queryKey: ["leasing", "schedules"] });
    queryClient.invalidateQueries({ queryKey: ["entries"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const leasingInPeriod = useMemo(() => {
    const byLeasing = new Map<
      number,
      { leasingName: string; leasingType: string; lessor: string | null; schedules: LeasingScheduleEntry[] }
    >();
    schedules.forEach((s) => {
      if (!byLeasing.has(s.leasingId)) {
        byLeasing.set(s.leasingId, {
          leasingName: s.leasingName,
          leasingType: s.leasingType,
          lessor: s.lessor ?? null,
          schedules: [],
        });
      }
      byLeasing.get(s.leasingId)!.schedules.push(s);
    });
    return Array.from(byLeasing.entries()).sort(([a], [b]) => a - b);
  }, [schedules]);

  const monthlyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    schedules.forEach((s) => {
      const month = s.paymentDate.slice(0, 7);
      map[month] = (map[month] || 0) + s.amount;
    });
    return map;
  }, [schedules]);

  const monthsInPeriod = useMemo(() => {
    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month]) => month);
  }, [monthlyTotals]);

  const totalAmount = schedules.reduce((sum, s) => sum + s.amount, 0);
  const activeLeasing = leasingPayments.filter((l) => l.isActive);
  const monthCount = Object.keys(monthlyTotals).length;

  const handleExport = () => {
    if (schedules.length === 0) {
      toast.error("No timeline data to export");
      return;
    }
    const csv = [
      ["Leasing Name", "Type", "Month", "Payment Date", "Amount", "Status"].join(","),
      ...schedules.map((s) =>
        [
          s.leasingName,
          s.leasingType,
          s.month,
          s.paymentDate,
          s.amount,
          s.isPaid ? "Paid" : "Pending",
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leasing-timeline-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timeline exported successfully");
  };

  const loading = isLoading || leasingLoading;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/leasing")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Leasing Payments Timeline</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Payment schedule and actual payments across all contracts
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
              <strong className="text-foreground">{activeLeasing.length}</strong> active leases
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

        {loading ? (
          <Card>
            <CardContent className="py-16 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/30 border-t-foreground" />
            </CardContent>
          </Card>
        ) : leasingInPeriod.length > 0 ? (
          <Tabs defaultValue="leasing" className="space-y-4">
            <TabsList className="h-9">
              <TabsTrigger value="leasing" className="gap-1.5 text-sm">
                <LayoutList className="h-4 w-4" />
                By lease
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-1.5 text-sm">
                <CalendarDays className="h-4 w-4" />
                By month
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leasing" className="space-y-3 mt-0">
              {leasingInPeriod.map(([leasingId, { leasingName, leasingType, lessor, schedules: leaseSchedules }]) => {
                const leaseTotal = leaseSchedules.reduce((sum, s) => sum + s.amount, 0);
                const isExpanded = selectedLeasingId === leasingId;

                return (
                  <Card key={leasingId} className="overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedLeasingId(isExpanded ? null : leasingId)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{leasingName}</span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[leasingType] || leasingType}
                          </Badge>
                          {lessor && (
                            <span className="text-sm text-muted-foreground">· {lessor}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {leaseSchedules.length} payment(s) in period
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">{formatCurrency(leaseTotal)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setSelectedLeasingId(isExpanded ? null : leasingId)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {isExpanded ? "Collapse" : "Expand"} timeline
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/leasing/${leasingId}/timeline`)}>
                              Detailed view
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    {isExpanded && leaseSchedules.length > 0 && (
                      <div className="border-t overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[120px]">Month</TableHead>
                              <TableHead className="w-[140px]">Payment Date</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="w-[120px]">Status</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaseSchedules
                              .sort((a, b) => a.month.localeCompare(b.month))
                              .map((s) => (
                                <EditableLeasingTimelineRow
                                  key={s.id}
                                  entry={scheduleToTimelineEntry(s)}
                                  leasingId={s.leasingId}
                                  allEntries={entriesForSchedules}
                                  onUpdate={handleTimelineUpdate}
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
                              {monthSchedules.length} lease payment(s)
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
                                <TableHead className="w-[200px]">Lease</TableHead>
                                <TableHead className="w-[140px]">Payment Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {monthSchedules
                                .sort((a, b) => a.leasingName.localeCompare(b.leasingName))
                                .map((s) => (
                                  <EditableLeasingTimelineRow
                                    key={s.id}
                                    entry={scheduleToTimelineEntry(s)}
                                    leasingId={s.leasingId}
                                    allEntries={entriesForSchedules}
                                    onUpdate={handleTimelineUpdate}
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
              <p className="text-muted-foreground">No leasing schedules in this date range</p>
              <p className="text-sm text-muted-foreground">
                Create a lease and generate its timeline to see it here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
