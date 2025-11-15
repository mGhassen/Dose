"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Calendar, TrendingUp, Download, Eye, MoreVertical } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLeasing } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { projectLeasingPayment, projectLeasingPaymentsForRange } from "@/lib/calculations/leasing-timeline";
import type { LeasingPayment, LeasingTimelineEntry } from "@/lib/calculations/leasing-timeline";
import { EditableLeasingTimelineRow } from "../[id]/timeline/leasing-timeline-editable";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";

export default function LeasingTimelinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: leasingPayments, isLoading } = useLeasing();

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
  const [selectedLeasing, setSelectedLeasing] = useState<number | null>(null);

  // Calculate all timeline entries
  const allEntries: Array<LeasingTimelineEntry & { leasing: LeasingPayment }> = [];
  if (leasingPayments) {
    leasingPayments.forEach(leasing => {
      const entries = projectLeasingPayment(leasing, startMonth, endMonth);
      entries.forEach(e => {
        allEntries.push({ ...e, leasing });
      });
    });
  }

  // Group by leasing
  const leasingTimelines: Record<number, LeasingTimelineEntry[]> = {};
  allEntries.forEach(entry => {
    if (!leasingTimelines[entry.leasingId]) {
      leasingTimelines[entry.leasingId] = [];
    }
    leasingTimelines[entry.leasingId].push(entry);
  });

  // Monthly totals across all leasing
  const monthlyTotals: Record<string, number> = {};
  allEntries.forEach(entry => {
    monthlyTotals[entry.month] = (monthlyTotals[entry.month] || 0) + entry.amount;
  });

  const handleExport = () => {
    if (allEntries.length === 0) {
      toast.error("No timeline data to export");
      return;
    }

    const csv = [
      ['Leasing Name', 'Month', 'Type', 'Amount', 'Payment Date', 'Status'].join(','),
      ...allEntries.map(entry => [
        entry.leasingName,
        entry.month,
        entry.leasing.type,
        entry.amount,
        entry.paymentDate,
        entry.isProjected ? 'Projected' : 'Actual',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leasing-timeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timeline exported successfully");
  };

  const frequencyLabels: Record<string, string> = {
    one_time: "One Time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    custom: "Custom",
  };

  const typeLabels: Record<string, string> = {
    operating: "Operating",
    finance: "Finance",
  };

  const totalAmount = allEntries.reduce((sum, e) => sum + e.amount, 0);
  const activeLeasing = leasingPayments?.filter(l => l.isActive) || [];

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leasing Payments Timeline</h1>
          <p className="text-muted-foreground">View evolution of all leasing payments over time</p>
        </div>
        {allEntries.length > 0 && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Timeline Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Range</CardTitle>
          <CardDescription>Select the date range to view leasing payment timelines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startMonth">Start Month</Label>
              <Input
                id="startMonth"
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endMonth">End Month</Label>
              <Input
                id="endMonth"
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {allEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Active Leasing</label>
                <p className="text-2xl font-bold mt-1">{activeLeasing.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Payments</label>
                <p className="text-2xl font-bold mt-1">{allEntries.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Average per Month</label>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalAmount / Object.keys(monthlyTotals).length || 1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leasing List with Timeline */}
      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      ) : leasingPayments && leasingPayments.length > 0 ? (
        <div className="space-y-4">
          {leasingPayments.map(leasing => {
            const timeline = leasingTimelines[leasing.id] || [];
            const leasingTotal = timeline.reduce((sum, e) => sum + e.amount, 0);
            const isExpanded = selectedLeasing === leasing.id;

            return (
              <Card key={leasing.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2">
                        <span>{leasing.name}</span>
                        <Badge variant="outline">{typeLabels[leasing.type] || leasing.type}</Badge>
                        <Badge variant={leasing.isActive ? "default" : "secondary"}>
                          {leasing.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {frequencyLabels[leasing.frequency] || leasing.frequency} • {formatCurrency(leasing.amount)} per payment
                        {leasing.lessor && ` • Lessor: ${leasing.lessor}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total in Period</p>
                        <p className="text-lg font-semibold">{formatCurrency(leasingTotal)}</p>
                        <p className="text-xs text-muted-foreground">{timeline.length} payment(s)</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedLeasing(isExpanded ? null : leasing.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {isExpanded ? "Hide" : "View"} Timeline
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/leasing/${leasing.id}/timeline`)}>
                            Detailed View
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && timeline.length > 0 && (
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timeline.map((entry, idx) => (
                            <EditableLeasingTimelineRow
                              key={`${entry.month}-${idx}`}
                              entry={entry}
                              leasingId={leasing.id}
                              onUpdate={handleTimelineUpdate}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No leasing payments found.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary */}
      {Object.keys(monthlyTotals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>Total leasing payments across all contracts per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(monthlyTotals)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, total]) => {
                  const [year, monthNum] = month.split('-');
                  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                  const isFuture = date > new Date();
                  return (
                    <div key={month} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-lg">
                          {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        </span>
                        {isFuture && (
                          <Badge variant="secondary">Projected</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        <span className="font-bold text-xl text-primary">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </AppLayout>
  );
}

