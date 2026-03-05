"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Calendar, Download, Eye, MoreVertical, ChevronDown, LayoutList, CalendarDays } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSubscriptions, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatMonthYear } from "@kit/lib/date-format";
import { projectSubscription } from "@/lib/calculations/subscription-projections";
import type { Subscription, SubscriptionProjection } from "@kit/types";
import { EditableSubscriptionTimelineRow } from "./subscription-timeline-editable";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
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

export default function SubscriptionsTimelinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: subscriptionsResponse, isLoading } = useSubscriptions();
  const subscriptions = subscriptionsResponse?.data || [];
  const { data: categoryValues = [] } = useMetadataEnum("ExpenseCategory");
  const { data: recurrenceValues = [] } = useMetadataEnum("ExpenseRecurrence");
  const categoryLabels = Object.fromEntries(categoryValues.map((ev) => [ev.name, ev.label ?? ev.name]));
  const recurrenceLabels = Object.fromEntries(recurrenceValues.map((ev) => [ev.name, ev.label ?? ev.name]));

  const handleTimelineUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['actual-payments'] });
  };

  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedSubscription, setSelectedSubscription] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const allProjections: Array<SubscriptionProjection & { subscription: Subscription }> = [];
  if (subscriptions) {
    subscriptions.forEach(subscription => {
      const proj = projectSubscription(subscription, startMonth, endMonth);
      proj.forEach(p => {
        allProjections.push({ ...p, subscription });
      });
    });
  }

  const subscriptionProjections: Record<number, SubscriptionProjection[]> = {};
  allProjections.forEach(proj => {
    if (!subscriptionProjections[proj.subscriptionId]) {
      subscriptionProjections[proj.subscriptionId] = [];
    }
    subscriptionProjections[proj.subscriptionId].push(proj);
  });

  const monthlyTotals: Record<string, number> = {};
  allProjections.forEach(proj => {
    monthlyTotals[proj.month] = (monthlyTotals[proj.month] || 0) + proj.amount;
  });

  const handleExport = () => {
    if (allProjections.length === 0) {
      toast.error("No timeline data to export");
      return;
    }
    const csv = [
      ['Subscription Name', 'Month', 'Category', 'Amount', 'Status'].join(','),
      ...allProjections.map(proj => [
        proj.subscriptionName,
        proj.month,
        proj.category,
        proj.amount,
        proj.isProjected ? 'Projected' : 'Actual',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-timeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timeline exported successfully");
  };

  const totalAmount = allProjections.reduce((sum, p) => sum + p.amount, 0);
  const activeSubscriptions = subscriptions?.filter(s => s.isActive) || [];
  const monthCount = Object.keys(monthlyTotals).length;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {/* Compact header + toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Subscriptions Timeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Declarations and actual payments
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {formatMonthYear(new Date(startMonth + "-01"))} → {formatMonthYear(new Date(endMonth + "-01"))}
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
                      <label htmlFor="startMonth" className="text-xs text-muted-foreground">From</label>
                      <Input
                        id="startMonth"
                        type="month"
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                        className="h-8 mt-0.5"
                      />
                    </div>
                    <div>
                      <label htmlFor="endMonth" className="text-xs text-muted-foreground">To</label>
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
            {allProjections.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
                <Download className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* Compact stats bar */}
        {allProjections.length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-muted-foreground">
              <strong className="text-foreground">{activeSubscriptions.length}</strong> active
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">{allProjections.length}</strong> payments
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              <strong className="text-primary">{formatCurrency(totalAmount)}</strong> total
            </span>
            {monthCount > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  ~<strong className="text-foreground">{formatCurrency(totalAmount / monthCount)}</strong>/mo
                </span>
              </>
            )}
          </div>
        )}

        {/* Main content with tabs */}
        {isLoading ? (
          <Card>
            <CardContent className="py-16 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/30 border-t-foreground" />
            </CardContent>
          </Card>
        ) : subscriptions && subscriptions.length > 0 ? (
          <Tabs defaultValue="subscriptions" className="space-y-4">
            <TabsList className="h-9">
              <TabsTrigger value="subscriptions" className="gap-1.5 text-sm">
                <LayoutList className="h-4 w-4" />
                By subscription
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-1.5 text-sm">
                <CalendarDays className="h-4 w-4" />
                By month
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions" className="space-y-3 mt-0">
              {subscriptions.map(subscription => {
                const projections = subscriptionProjections[subscription.id] || [];
                const subscriptionTotal = projections.reduce((sum, p) => sum + p.amount, 0);
                const isExpanded = selectedSubscription === subscription.id;

                return (
                  <Card key={subscription.id} className="overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedSubscription(isExpanded ? null : subscription.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{subscription.name}</span>
                          <Badge variant="outline" className="text-xs font-normal">
                            {categoryLabels[subscription.category] || subscription.category}
                          </Badge>
                          <StatusPin active={subscription.isActive} size="sm" title={subscription.isActive ? "Active" : "Inactive"} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {recurrenceLabels[subscription.recurrence] || subscription.recurrence} · {formatCurrency(subscription.amount)}/occurrence
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">{formatCurrency(subscriptionTotal)}</p>
                          <p className="text-xs text-muted-foreground">{projections.length} in period</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setSelectedSubscription(isExpanded ? null : subscription.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {isExpanded ? "Collapse" : "Expand"} timeline
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/subscriptions/${subscription.id}`)}>
                              View details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    {isExpanded && projections.length > 0 && (
                      <div className="border-t">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[140px]">Month</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead className="w-[140px]">Status</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projections.map((proj, idx) => (
                              <EditableSubscriptionTimelineRow
                                key={`${proj.month}-${idx}`}
                                projection={proj}
                                subscriptionId={subscription.id}
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
              {Object.keys(monthlyTotals).length > 0 ? (
                Object.entries(monthlyTotals)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, total]) => {
                    const monthProjections = allProjections.filter(p => p.month === month);
                    const [year, monthNum] = month.split('-');
                    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                    const isFuture = date > new Date();
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
                            {isFuture && (
                              <Badge variant="secondary" className="text-xs font-normal">Projected</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-primary">{formatCurrency(total)}</p>
                              <p className="text-xs text-muted-foreground">{monthProjections.length} subscription(s)</p>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                        {isExpanded && monthProjections.length > 0 && (
                          <div className="border-t">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="w-[180px]">Subscription</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead className="w-[140px]">Status</TableHead>
                                  <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {monthProjections.map((proj, idx) => (
                                  <EditableSubscriptionTimelineRow
                                    key={`${proj.month}-${proj.subscriptionId}-${idx}`}
                                    projection={proj}
                                    subscriptionId={proj.subscriptionId}
                                    onUpdate={handleTimelineUpdate}
                                    showSubscriptionName
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
              <p className="text-muted-foreground">No subscriptions</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
