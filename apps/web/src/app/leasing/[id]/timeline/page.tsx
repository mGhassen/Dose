"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { ArrowLeft, Calendar, TrendingUp, Download } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLeasingPaymentById } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { projectLeasingPayment } from "@/lib/calculations/leasing-timeline";
import type { LeasingTimelineEntry } from "@/lib/calculations/leasing-timeline";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";

interface LeasingTimelinePageProps {
  params: Promise<{ id: string }>;
}

export default function LeasingTimelinePage({ params }: LeasingTimelinePageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: leasing, isLoading: leasingLoading } = useLeasingPaymentById(resolvedParams?.id || "");
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [timeline, setTimeline] = useState<LeasingTimelineEntry[]>([]);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (leasing && startMonth && endMonth) {
      const entries = projectLeasingPayment(leasing, startMonth, endMonth);
      setTimeline(entries);
    }
  }, [leasing, startMonth, endMonth]);

  const handleExport = () => {
    if (!leasing || timeline.length === 0) {
      toast.error("No timeline data to export");
      return;
    }

    const csv = [
      ['Month', 'Leasing Name', 'Type', 'Amount', 'Payment Date', 'Status'].join(','),
      ...timeline.map(entry => [
        entry.month,
        entry.leasingName,
        leasing.type,
        entry.amount,
        entry.paymentDate,
        entry.isProjected ? 'Projected' : 'Actual',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leasing-timeline-${leasing.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timeline exported successfully");
  };

  if (leasingLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!leasing) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Leasing Payment Not Found</h1>
            <p className="text-muted-foreground">The leasing payment you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/leasing')}>Back to Leasing</Button>
        </div>
      </AppLayout>
    );
  }

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

  const totalAmount = timeline.reduce((sum, e) => sum + e.amount, 0);
  const actualCount = timeline.filter(e => !e.isProjected).length;
  const projectedCount = timeline.filter(e => e.isProjected).length;

  // Group by month for visualization
  const monthlyTotals: Record<string, number> = {};
  timeline.forEach(e => {
    monthlyTotals[e.month] = (monthlyTotals[e.month] || 0) + e.amount;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leasing Payment Timeline</h1>
            <p className="text-muted-foreground">
              {leasing.name} - Evolution over time
            </p>
          </div>
          <div className="flex space-x-2">
            {timeline.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push(`/leasing/${resolvedParams.id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leasing
            </Button>
          </div>
        </div>

        {/* Leasing Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Leasing Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-base font-semibold mt-1">{leasing.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p className="text-base mt-1">{typeLabels[leasing.type] || leasing.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="text-base font-semibold mt-1">{formatCurrency(leasing.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                <p className="text-base mt-1">{frequencyLabels[leasing.frequency] || leasing.frequency}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p className="text-base mt-1">{formatDate(leasing.startDate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">End Date</label>
                <p className="text-base mt-1">{leasing.endDate ? formatDate(leasing.endDate) : "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lessor</label>
                <p className="text-base mt-1">{leasing.lessor || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={leasing.isActive ? "default" : "secondary"} className="mt-1">
                  {leasing.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline Range</CardTitle>
            <CardDescription>Select the date range to view the leasing payment timeline</CardDescription>
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

        {/* Timeline Statistics */}
        {timeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Timeline Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Payments</label>
                  <p className="text-2xl font-bold mt-1">{timeline.length}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Actual Payments</label>
                  <p className="text-2xl font-bold mt-1 text-green-600">{actualCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Projected Payments</label>
                  <p className="text-2xl font-bold mt-1 text-blue-600">{projectedCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                  <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline Table */}
        {timeline.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Timeline Evolution</CardTitle>
              <CardDescription>
                Detailed breakdown of leasing payment occurrences over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeline.map((entry, index) => {
                      const [year, month] = entry.month.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                      const paymentDate = new Date(entry.paymentDate);
                      return (
                        <TableRow key={`${entry.month}-${index}`}>
                          <TableCell className="font-medium">
                            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          </TableCell>
                          <TableCell>
                            {paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(entry.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.isProjected ? "secondary" : "default"}>
                              {entry.isProjected ? "Projected" : "Actual"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-semibold bg-muted">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell>{formatCurrency(totalAmount)}</TableCell>
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
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No timeline data available for the selected period.
                  {!leasing.isActive && " This leasing payment is inactive."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Summary Chart */}
        {Object.keys(monthlyTotals).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>Total leasing payment amount per month</CardDescription>
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
                      <div key={month} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          </span>
                          {isFuture && (
                            <Badge variant="secondary" className="text-xs">Projected</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-lg">{formatCurrency(total)}</span>
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

