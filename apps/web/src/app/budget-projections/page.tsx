"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Badge } from "@kit/ui/badge";
import { 
  Calendar, 
  TrendingUp, 
  Receipt, 
  Users, 
  Building2, 
  Download
} from "lucide-react";
import { useBudgetProjections } from "@kit/hooks";
import { formatCurrency } from "@kit/lib/config";
import { toast } from "sonner";

interface MonthlyProjection {
  month: string;
  expenses: number;
  personnel: number;
  leasing: number;
  sales: number;
  total: number;
  items: Array<{
    type: string;
    amount: number;
    category?: string | null;
    referenceId: number | null;
    isProjected: boolean;
  }>;
}

export default function BudgetProjectionsAgendaPage() {
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + 11);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: projections, isLoading } = useBudgetProjections({
    startMonth,
    endMonth,
  });

  // Group projections by month
  const monthlyProjections = useMemo(() => {
    if (!projections) return {};

    const grouped: Record<string, MonthlyProjection> = {};

    projections.forEach(proj => {
      if (selectedType && proj.projection_type !== selectedType) return;

      if (!grouped[proj.month]) {
        grouped[proj.month] = {
          month: proj.month,
          expenses: 0,
          personnel: 0,
          leasing: 0,
          sales: 0,
          total: 0,
          items: [],
        };
      }

      const monthData = grouped[proj.month];
      monthData.items.push({
        type: proj.projection_type,
        amount: proj.amount,
        category: proj.category,
        referenceId: proj.reference_id,
        isProjected: proj.is_projected,
      });

      switch (proj.projection_type) {
        case 'expense':
          monthData.expenses += proj.amount;
          break;
        case 'personnel':
          monthData.personnel += proj.amount;
          break;
        case 'leasing':
          monthData.leasing += proj.amount;
          break;
        case 'sales':
          monthData.sales += proj.amount;
          break;
      }
      monthData.total = monthData.expenses + monthData.personnel + monthData.leasing - monthData.sales;
    });

    return grouped;
  }, [projections, selectedType]);

  const sortedMonths = useMemo(() => {
    return Object.keys(monthlyProjections).sort();
  }, [monthlyProjections]);

  const handleExport = () => {
    const csv = [
      ['Month', 'Expenses', 'Personnel', 'Leasing', 'Sales', 'Net Total'].join(','),
      ...sortedMonths.map(month => {
        const data = monthlyProjections[month];
        return [
          month,
          data.expenses,
          data.personnel,
          data.leasing,
          data.sales,
          data.total,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-projections-${startMonth}-to-${endMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Budget projections exported successfully');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return <Receipt className="h-4 w-4" />;
      case 'personnel':
        return <Users className="h-4 w-4" />;
      case 'leasing':
        return <Building2 className="h-4 w-4" />;
      case 'sales':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'expense':
        return 'Expense';
      case 'personnel':
        return 'Personnel';
      case 'leasing':
        return 'Leasing';
      case 'sales':
        return 'Sales';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'expense':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'personnel':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'leasing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sales':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Projections Agenda</h1>
          <p className="text-muted-foreground mt-2">
            View all budget projections organized by month
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select date range and projection type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startMonth">Start Month</Label>
              <Input
                id="startMonth"
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endMonth">End Month</Label>
              <Input
                id="endMonth"
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type">Projection Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || null)}
              >
                <option value="">All Types</option>
                <option value="expense">Expenses</option>
                <option value="personnel">Personnel</option>
                <option value="leasing">Leasing</option>
                <option value="sales">Sales</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  setStartMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                  const nextYear = new Date(now);
                  nextYear.setMonth(nextYear.getMonth() + 11);
                  setEndMonth(`${nextYear.getFullYear()}-${String(nextYear.getMonth() + 1).padStart(2, '0')}`);
                  setSelectedType(null);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Projections */}
      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">Loading projections...</div>
          </CardContent>
        </Card>
      ) : sortedMonths.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">
              No projections found for the selected date range
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedMonths.map(month => {
            const data = monthlyProjections[month];
            const [year, monthNum] = month.split('-');
            const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            const isPast = date < new Date();
            const isCurrent = date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();

            return (
              <Card key={month} className={isCurrent ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-xl">{monthName}</CardTitle>
                        <CardDescription>
                          {data.items.length} projection{data.items.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isPast && <Badge variant="secondary">Past</Badge>}
                      {isCurrent && <Badge variant="default">Current</Badge>}
                      {!isPast && !isCurrent && <Badge variant="outline">Future</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Expenses</div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(data.expenses)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Personnel</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(data.personnel)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Leasing</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(data.leasing)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Sales</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(data.sales)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Net Total</div>
                      <div className={`text-2xl font-bold ${data.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data.total)}
                      </div>
                    </div>
                  </div>

                  {/* Projection Items */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Projection Details</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {data.items.map((item, idx) => (
                        <div
                          key={`${item.type}-${item.referenceId}-${idx}`}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${getTypeColor(item.type)}`}>
                              {getTypeIcon(item.type)}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{getTypeLabel(item.type)}</div>
                              {item.category && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  {item.category.replace('_', ' ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatCurrency(item.amount)}</div>
                            {item.isProjected && (
                              <Badge variant="secondary" className="text-xs mt-1">Projected</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

