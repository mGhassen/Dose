"use client";

import { useState, useMemo } from "react";
import AppLayout from "@/components/app-layout";
import GridView, { GridColumn, GridRow } from "@/components/grid-view";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { 
  Wand2, 
  X, 
  Menu,
  Plus,
  Trash2
} from "lucide-react";
import { formatCurrency } from "@kit/lib/config";

// Generate months for a fiscal year
const generateMonths = (startMonth: string) => {
  const [year, month] = startMonth.split('-').map(Number);
  const months: string[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(year, month - 1 + i, 1);
    const monthName = monthNames[date.getMonth()];
    months.push(`${monthName.toUpperCase()} ${date.getFullYear()}`);
  }
  
  return months;
};

export default function BudgetsPage() {
  const [budgetName, setBudgetName] = useState("2022");
  const [fiscalYear, setFiscalYear] = useState("2022-04");
  const [budgetPeriod, setBudgetPeriod] = useState("monthly");
  const [reportingTag, setReportingTag] = useState(false);
  const [activeTab, setActiveTab] = useState<"income-expense" | "asset-liability">("income-expense");

  const months = useMemo(() => generateMonths(fiscalYear), [fiscalYear]);

  // Sample account structure - in real app, this would come from API
  const [incomeExpenseRows, setIncomeExpenseRows] = useState<GridRow[]>([
    {
      id: "pl",
      label: "Profit and Loss",
      level: 0,
      isGroup: true,
      data: {},
      children: [
        {
          id: "income",
          label: "Income",
          level: 1,
          parentId: "pl",
          isGroup: true,
          data: {},
          children: [
            {
              id: "income-sub",
              label: "Income",
              level: 2,
              parentId: "income",
              isGroup: true,
              data: {},
              children: [
                {
                  id: "new-subscription",
                  label: "New subscription",
                  level: 3,
                  parentId: "income-sub",
                  data: {},
                },
                {
                  id: "recurring-revenues",
                  label: "Recurring revenues",
                  level: 3,
                  parentId: "income-sub",
                  data: {},
                },
              ],
            },
          ],
        },
        {
          id: "expense",
          label: "Expense",
          level: 1,
          parentId: "pl",
          isGroup: true,
          data: {},
          children: [
            {
              id: "expense-sub",
              label: "Expense",
              level: 2,
              parentId: "expense",
              isGroup: true,
              data: {},
              children: [
                {
                  id: "per-diem",
                  label: "Per diem",
                  level: 3,
                  parentId: "expense-sub",
                  data: {},
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  const [assetLiabilityRows, setAssetLiabilityRows] = useState<GridRow[]>([
    {
      id: "balance-sheet",
      label: "Balance Sheet",
      level: 0,
      isGroup: true,
      data: {},
      children: [],
    },
  ]);

  // Create columns dynamically based on months
  const incomeExpenseColumns: GridColumn[] = useMemo(() => {
    const cols: GridColumn[] = [
      {
        id: "account",
        label: "ACCOUNT",
        type: "text",
        width: 300,
        editable: false,
      },
    ];

    months.forEach(month => {
      cols.push({
        id: month.toLowerCase().replace(/\s+/g, '-'),
        label: month,
        type: "currency",
        width: 120,
        editable: true,
      });
    });

    cols.push({
      id: "total",
      label: "TOTAL",
      type: "currency",
      width: 120,
      editable: false,
      formula: (row, allRows) => {
        if (row.isGroup && row.children) {
          // Calculate sum of children for each month
          return months.slice(0, -1).reduce((sum, month) => {
            const monthKey = month.toLowerCase().replace(/\s+/g, '-');
            const monthValue = row.children!.reduce((acc, child) => {
              return acc + (Number(child.data[monthKey]) || 0);
            }, 0);
            return sum + monthValue;
          }, 0);
        }
        // For non-group rows, sum all month values
        return months.slice(0, -1).reduce((sum, month) => {
          const monthKey = month.toLowerCase().replace(/\s+/g, '-');
          return sum + (Number(row.data[monthKey]) || 0);
        }, 0);
      },
    });

    return cols;
  }, [months]);

  const assetLiabilityColumns = incomeExpenseColumns;

  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    const updateRows = (rows: GridRow[]): GridRow[] => {
      return rows.map(row => {
        if (row.id === rowId) {
          return { ...row, data: { ...row.data, [columnId]: value } };
        }
        if (row.children) {
          return { ...row, children: updateRows(row.children) };
        }
        return row;
      });
    };

    if (activeTab === "income-expense") {
      setIncomeExpenseRows(updateRows(incomeExpenseRows));
    } else {
      setAssetLiabilityRows(updateRows(assetLiabilityRows));
    }
  };

  const handleAddAccount = () => {
    const newRow: GridRow = {
      id: `account-${Date.now()}`,
      label: "New Account",
      level: 3,
      data: {},
    };

    const updateRows = (rows: GridRow[]): GridRow[] => {
      return rows.map(row => {
        if (row.id === "income-sub" || row.id === "expense-sub") {
          return {
            ...row,
            children: [...(row.children || []), newRow],
          };
        }
        if (row.children) {
          return { ...row, children: updateRows(row.children) };
        }
        return row;
      });
    };

    if (activeTab === "income-expense") {
      setIncomeExpenseRows(updateRows(incomeExpenseRows));
    }
  };

  const handlePreFillFromPrevious = () => {
    // In real app, this would fetch data from previous years
    // For now, just show a toast or placeholder
    console.log("Pre-fill from previous years' actuals");
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">New Budget</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Budget Details */}
        <div className="p-4 border-b border-border bg-card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="name">Name*</Label>
              <Input
                id="name"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                className="mt-1"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="reporting-tag"
                  checked={reportingTag}
                  onChange={(e) => setReportingTag(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="reporting-tag" className="text-sm font-normal cursor-pointer">
                  Create this budget for a specific reporting tag
                </Label>
              </div>
            </div>
            <div>
              <Label htmlFor="fiscal-year">Fiscal Year*</Label>
              <Input
                id="fiscal-year"
                type="month"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="budget-period">Budget Period*</Label>
              <Select value={budgetPeriod} onValueChange={setBudgetPeriod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="link"
                onClick={handlePreFillFromPrevious}
                className="text-blue-600 hover:text-blue-700"
              >
                <Wand2 className="w-4 h-4 mr-1" />
                Pre-fill from Previous Years' Actuals
              </Button>
            </div>
          </div>
        </div>

        {/* Grid Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border px-4">
              <TabsList>
                <TabsTrigger value="income-expense">Income and Expense Accounts</TabsTrigger>
                <TabsTrigger value="asset-liability">Asset, Liability, and Equity Accounts</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="income-expense" className="flex-1 overflow-hidden m-0">
              <div className="h-full">
                <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleAddAccount}
                    className="text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Or Remove Accounts
                  </Button>
                </div>
                <GridView
                  columns={incomeExpenseColumns}
                  rows={incomeExpenseRows}
                  onCellChange={handleCellChange}
                  onRowAdd={handleAddAccount}
                  showAddRow={false}
                  showAddColumn={false}
                  frozenColumns={1}
                  defaultColumnWidth={120}
                  defaultExpanded={true}
                />
              </div>
            </TabsContent>
            <TabsContent value="asset-liability" className="flex-1 overflow-hidden m-0">
              <div className="h-full">
                <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleAddAccount}
                    className="text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Or Remove Accounts
                  </Button>
                </div>
                <GridView
                  columns={assetLiabilityColumns}
                  rows={assetLiabilityRows}
                  onCellChange={handleCellChange}
                  onRowAdd={handleAddAccount}
                  showAddRow={false}
                  showAddColumn={false}
                  frozenColumns={1}
                  defaultColumnWidth={120}
                  defaultExpanded={true}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

