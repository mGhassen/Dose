"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Calendar, TrendingUp, Download, Eye, MoreVertical } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSubscriptions } from "@kit/hooks";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";

export default function SubscriptionsTimelinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: subscriptionsResponse, isLoading } = useSubscriptions();
  const subscriptions = subscriptionsResponse?.data || [];

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

  // Calculate all projections
  const allProjections: Array<SubscriptionProjection & { subscription: Subscription }> = [];
  if (subscriptions) {
    subscriptions.forEach(subscription => {
      const proj = projectSubscription(subscription, startMonth, endMonth);
      proj.forEach(p => {
        allProjections.push({ ...p, subscription });
      });
    });
  }

  // Group by subscription
  const subscriptionProjections: Record<number, SubscriptionProjection[]> = {};
  allProjections.forEach(proj => {
    if (!subscriptionProjections[proj.subscriptionId]) {
      subscriptionProjections[proj.subscriptionId] = [];
    }
    subscriptionProjections[proj.subscriptionId].push(proj);
  });

  // Monthly totals across all subscriptions
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

  const categoryLabels: Record<string, string> = {
    rent: "Rent",
    utilities: "Utilities",
    supplies: "Supplies",
    marketing: "Marketing",
    insurance: "Insurance",
    maintenance: "Maintenance",
    professional_services: "Professional Services",
    other: "Other",
  };

  const recurrenceLabels: Record<string, string> = {
    one_time: "One Time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    custom: "Custom",
  };

  const totalAmount = allProjections.reduce((sum, p) => sum + p.amount, 0);
  const activeSubscriptions = subscriptions?.filter(s => s.isActive) || [];

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions Timeline</h1>
          <p className="text-muted-foreground">
            View subscription declarations (projected payments) and record actual output payments
          </p>
        </div>
        {allProjections.length > 0 && (
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
          <CardDescription>Select the date range to view subscription timelines</CardDescription>
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
      {allProjections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Active Subscriptions</label>
                <p className="text-2xl font-bold mt-1">{activeSubscriptions.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Occurrences</label>
                <p className="text-2xl font-bold mt-1">{allProjections.length}</p>
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

      {/* Subscriptions List with Timeline */}
      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      ) : subscriptions && subscriptions.length > 0 ? (
        <div className="space-y-4">
          {subscriptions.map(subscription => {
            const projections = subscriptionProjections[subscription.id] || [];
            const subscriptionTotal = projections.reduce((sum, p) => sum + p.amount, 0);
            const isExpanded = selectedSubscription === subscription.id;

            return (
              <Card key={subscription.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2">
                        <span>{subscription.name}</span>
                        <Badge variant="outline">{categoryLabels[subscription.category] || subscription.category}</Badge>
                        <Badge variant={subscription.isActive ? "default" : "secondary"}>
                          {subscription.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {recurrenceLabels[subscription.recurrence] || subscription.recurrence} • {formatCurrency(subscription.amount)} per occurrence
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total in Period</p>
                        <p className="text-lg font-semibold">{formatCurrency(subscriptionTotal)}</p>
                        <p className="text-xs text-muted-foreground">{projections.length} occurrence(s)</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedSubscription(isExpanded ? null : subscription.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {isExpanded ? "Hide" : "View"} Timeline
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/subscriptions/${subscription.id}/timeline`)}>
                            Detailed View
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && projections.length > 0 && (
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
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
              <p className="text-muted-foreground">No subscriptions found.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary */}
      {Object.keys(monthlyTotals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>Total subscriptions across all categories per month</CardDescription>
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
                          {formatMonthYear(date)}
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

