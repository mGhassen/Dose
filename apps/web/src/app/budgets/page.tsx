"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
  Trash2,
  Save
} from "lucide-react";
import { formatCurrency } from "@kit/lib/config";
import { 
  useBudgets, 
  useBudgetById, 
  useCreateBudget, 
  useUpdateBudget,
  useBudgetAccounts,
  useCreateBudgetAccount,
  useBudgetEntries,
  useCreateBudgetEntry,
  useUpdateBudgetEntry,
  useCreateBudgetEntries
} from "@kit/hooks";
import type { BudgetAccount, BudgetEntry } from "@kit/types";
import { toast } from "@kit/hooks";

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
  const [budgetPeriod, setBudgetPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [reportingTag, setReportingTag] = useState(false);
  const [activeTab, setActiveTab] = useState<"income-expense" | "asset-liability">("income-expense");
  const [currentBudgetId, setCurrentBudgetId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const months = useMemo(() => generateMonths(fiscalYear), [fiscalYear]);
  
  // Convert month display format to YYYY-MM format
  const monthToKey = useCallback((monthDisplay: string): string => {
    const [monthName, year] = monthDisplay.split(' ');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = monthNames.indexOf(monthName.toUpperCase());
    if (monthIndex === -1) return '';
    const monthNum = String(monthIndex + 1).padStart(2, '0');
    return `${year}-${monthNum}`;
  }, []);

  // Convert YYYY-MM to display format
  const keyToMonth = useCallback((monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  }, []);

  // Load or create budget
  const { data: budgets } = useBudgets({ fiscalYear, includeAccounts: true, includeEntries: true });
  const { data: currentBudget, isLoading: isLoadingBudget } = useBudgetById(
    currentBudgetId || 0,
    { includeAccounts: true, includeEntries: true }
  );
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const createAccount = useCreateBudgetAccount();
  const createEntry = useCreateBudgetEntry();
  const updateEntry = useUpdateBudgetEntry();
  const createEntries = useCreateBudgetEntries();

  // Initialize or load budget
  useEffect(() => {
    if (budgets && budgets.length > 0 && !currentBudgetId) {
      // Load first budget for this fiscal year
      setCurrentBudgetId(budgets[0].id);
      setBudgetName(budgets[0].name);
      setBudgetPeriod(budgets[0].budgetPeriod);
    }
  }, [budgets, currentBudgetId]);

  // Convert accounts and entries to hierarchical grid rows
  const convertAccountsToGridRows = useCallback((
    accounts: BudgetAccount[],
    entries: BudgetEntry[],
    accountType: 'income' | 'expense' | 'asset' | 'liability' | 'equity'
  ): GridRow[] => {
    if (!accounts || accounts.length === 0) {
      // Return default structure if no accounts
      return [{
        id: accountType === 'income' || accountType === 'expense' ? 'pl' : 'balance-sheet',
        label: accountType === 'income' || accountType === 'expense' ? 'Profit and Loss' : 'Balance Sheet',
        level: 0,
        isGroup: true,
        data: {},
        children: [],
      }];
    }

    // Filter accounts by type
    const filteredAccounts = accounts.filter(acc => acc.accountType === accountType);
    
    // Build hierarchy from account paths
    const buildHierarchy = (accounts: BudgetAccount[], parentPath: string | null = null, level: number = 0): GridRow[] => {
      const children = accounts.filter(acc => acc.parentPath === parentPath);
      
      return children.map(account => {
        // Get entries for this account
        const accountEntries = entries.filter(e => e.accountPath === account.accountPath);
        const rowData: Record<string, any> = {};
        
        // Map entries to month columns
        months.forEach(monthDisplay => {
          const monthKey = monthToKey(monthDisplay);
          const entry = accountEntries.find(e => e.month === monthKey);
          const columnKey = monthDisplay.toLowerCase().replace(/\s+/g, '-');
          rowData[columnKey] = entry ? entry.amount : 0;
        });

        const childrenRows = buildHierarchy(accounts, account.accountPath, level + 1);

        return {
          id: account.accountPath,
          label: account.accountLabel,
          level: account.level,
          parentId: account.parentPath || undefined,
          isGroup: account.isGroup,
          data: rowData,
          children: childrenRows.length > 0 ? childrenRows : undefined,
        };
      });
    };

    // Find root accounts (no parent or parent not in filtered accounts)
    const rootAccounts = filteredAccounts.filter(acc => 
      !acc.parentPath || !filteredAccounts.some(a => a.accountPath === acc.parentPath)
    );

    if (rootAccounts.length === 0) {
      return buildHierarchy(filteredAccounts);
    }

    return buildHierarchy(filteredAccounts);
  }, [months, monthToKey]);

  const incomeExpenseRows = useMemo(() => {
    if (!currentBudget || !currentBudget.accounts || !currentBudget.entries) {
      return [{
        id: "pl",
        label: "Profit and Loss",
        level: 0,
        isGroup: true,
        data: {},
        children: [],
      }];
    }

    const incomeAccounts = currentBudget.accounts.filter(a => a.accountType === 'income');
    const expenseAccounts = currentBudget.accounts.filter(a => a.accountType === 'expense');
    
    const incomeRows = convertAccountsToGridRows(incomeAccounts, currentBudget.entries, 'income');
    const expenseRows = convertAccountsToGridRows(expenseAccounts, currentBudget.entries, 'expense');

    return [{
      id: "pl",
      label: "Profit and Loss",
      level: 0,
      isGroup: true,
      data: {},
      children: [
        ...(incomeRows.length > 0 ? [{
          id: "income",
          label: "Income",
          level: 1,
          parentId: "pl",
          isGroup: true,
          data: {},
          children: incomeRows,
        }] : []),
        ...(expenseRows.length > 0 ? [{
          id: "expense",
          label: "Expense",
          level: 1,
          parentId: "pl",
          isGroup: true,
          data: {},
          children: expenseRows,
        }] : []),
      ],
    }];
  }, [currentBudget, convertAccountsToGridRows]);

  const assetLiabilityRows = useMemo(() => {
    if (!currentBudget || !currentBudget.accounts || !currentBudget.entries) {
      return [{
        id: "balance-sheet",
        label: "Balance Sheet",
        level: 0,
        isGroup: true,
        data: {},
        children: [],
      }];
    }

    const assetAccounts = currentBudget.accounts.filter(a => a.accountType === 'asset');
    const liabilityAccounts = currentBudget.accounts.filter(a => a.accountType === 'liability');
    const equityAccounts = currentBudget.accounts.filter(a => a.accountType === 'equity');

    const assetRows = convertAccountsToGridRows(assetAccounts, currentBudget.entries, 'asset');
    const liabilityRows = convertAccountsToGridRows(liabilityAccounts, currentBudget.entries, 'liability');
    const equityRows = convertAccountsToGridRows(equityAccounts, currentBudget.entries, 'equity');

    return [{
      id: "balance-sheet",
      label: "Balance Sheet",
      level: 0,
      isGroup: true,
      data: {},
      children: [
        ...assetRows,
        ...liabilityRows,
        ...equityRows,
      ],
    }];
  }, [currentBudget, convertAccountsToGridRows]);

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

  const handleCellChange = useCallback(async (rowId: string, columnId: string, value: any) => {
    if (!currentBudgetId || columnId === 'account' || columnId === 'total') return;

    // Find the account path from rowId
    const accountPath = rowId;
    const monthDisplay = months.find(m => m.toLowerCase().replace(/\s+/g, '-') === columnId);
    if (!monthDisplay) return;

    const monthKey = monthToKey(monthDisplay);
    const amount = parseFloat(value) || 0;

    try {
      setIsSaving(true);
      // Try to update existing entry, or create new one
      await updateEntry.mutateAsync({
        budgetId: currentBudgetId,
        accountPath,
        month: monthKey,
        data: { amount },
      });
    } catch (error) {
      // If update fails, try creating
      try {
        await createEntry.mutateAsync({
          budgetId: currentBudgetId,
          data: {
            budgetId: currentBudgetId,
            accountPath,
            month: monthKey,
            amount,
          },
        });
      } catch (createError) {
        console.error('Error saving budget entry:', createError);
        toast.error('Failed to save budget entry');
      }
    } finally {
      setIsSaving(false);
    }
  }, [currentBudgetId, months, monthToKey, updateEntry, createEntry]);

  const handleSaveBudget = useCallback(async () => {
    if (!budgetName || !fiscalYear) {
      toast.error('Budget name and fiscal year are required');
      return;
    }

    try {
      setIsSaving(true);
      if (currentBudgetId) {
        // Update existing budget
        await updateBudget.mutateAsync({
          id: currentBudgetId,
          data: {
            name: budgetName,
            fiscalYearStart: fiscalYear,
            budgetPeriod,
            reportingTagId: reportingTag ? undefined : null,
          },
        });
        toast.success('Budget saved successfully');
      } else {
        // Create new budget
        const newBudget = await createBudget.mutateAsync({
          name: budgetName,
          fiscalYearStart: fiscalYear,
          budgetPeriod,
          reportingTagId: reportingTag ? undefined : null,
        });
        setCurrentBudgetId(newBudget.id);
        toast.success('Budget created successfully');
      }
    } catch (error: any) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  }, [budgetName, fiscalYear, budgetPeriod, reportingTag, currentBudgetId, updateBudget, createBudget]);

  const handleAddAccount = useCallback(async () => {
    if (!currentBudgetId) {
      toast.error('Please save the budget first');
      return;
    }

    const accountType = activeTab === 'income-expense' ? 'income' : 'asset';
    const parentPath = activeTab === 'income-expense' 
      ? 'Profit and Loss/Income/Income' 
      : 'Balance Sheet';
    const accountPath = `${parentPath}/New Account ${Date.now()}`;
    const level = activeTab === 'income-expense' ? 3 : 1;

    try {
      await createAccount.mutateAsync({
        budgetId: currentBudgetId,
        data: {
          budgetId: currentBudgetId,
          accountPath,
          accountLabel: `New Account ${Date.now()}`,
          accountType,
          level,
          parentPath,
          isGroup: false,
          displayOrder: 0,
        },
      });
      toast.success('Account added successfully');
    } catch (error: any) {
      console.error('Error adding account:', error);
      toast.error('Failed to add account');
    }
  }, [currentBudgetId, activeTab, createAccount]);

  const handlePreFillFromPrevious = useCallback(async () => {
    if (!currentBudgetId) {
      toast.error('Please save the budget first');
      return;
    }

    // TODO: Implement pre-fill logic
    // This would fetch actuals from previous years and populate the budget
    toast.info('Pre-fill feature coming soon');
  }, [currentBudgetId]);

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
            <div className="flex items-end gap-2">
              <Button
                variant="link"
                onClick={handlePreFillFromPrevious}
                className="text-blue-600 hover:text-blue-700"
              >
                <Wand2 className="w-4 h-4 mr-1" />
                Pre-fill from Previous Years' Actuals
              </Button>
              <Button
                onClick={handleSaveBudget}
                disabled={isSaving}
                className="bg-primary hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? 'Saving...' : currentBudgetId ? 'Update Budget' : 'Create Budget'}
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

