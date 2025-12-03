"use client";

import { useMemo, useState } from "react";
import { useYear } from "@/contexts/year-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { Button } from "@kit/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Badge } from "@kit/ui/badge";
import AppLayout from "@/components/app-layout";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { 
  useProfitLoss,
  useBalanceSheet,
  useCashFlow,
  useExpenses,
  useSales,
  usePersonnel,
  useLeasing
} from "@kit/hooks";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Wallet, 
  BarChart3,
  Percent,
  Target,
  FileText
} from "lucide-react";
import type { ExpenseCategory, SalesType } from "@kit/types";

interface IncomeStatementRow {
  account: string;
  accountCode?: string;
  amount: number;
  level: number; // 0 = main, 1 = sub, 2 = sub-sub
  isTotal?: boolean;
  isSectionHeader?: boolean;
}

export default function FinancialStatementContent() {
  const { selectedYear } = useYear();
  const [selectedPeriod, setSelectedPeriod] = useState<'year' | 'quarter' | 'month'>('year');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('summary');

  // Fetch all data for the year
  const { data: profitLossData, isLoading: plLoading } = useProfitLoss();
  const { data: balanceSheetData, isLoading: bsLoading } = useBalanceSheet();
  const { data: cashFlowData, isLoading: cfLoading } = useCashFlow();
  const { data: expensesData, isLoading: expLoading } = useExpenses({ year: selectedYear, limit: 10000 });
  const { data: salesData, isLoading: salesLoading } = useSales({ year: selectedYear, limit: 10000 });
  const { data: personnelData, isLoading: personnelLoading } = usePersonnel();
  const { data: leasingData, isLoading: leasingLoading } = useLeasing();

  const isLoading = plLoading || bsLoading || cfLoading || expLoading || salesLoading || personnelLoading || leasingLoading;

  // Filter profit loss by selected period
  const filteredProfitLoss = useMemo(() => {
    if (!profitLossData) return [];
    let filtered = profitLossData.filter(pl => pl.month.startsWith(selectedYear));
    
    if (selectedPeriod === 'quarter' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const quarterStart = Math.floor((parseInt(month) - 1) / 3) * 3 + 1;
      const quarterEnd = quarterStart + 2;
      filtered = filtered.filter(pl => {
        const [, plMonth] = pl.month.split('-');
        const plMonthNum = parseInt(plMonth);
        return plMonthNum >= quarterStart && plMonthNum <= quarterEnd;
      });
    } else if (selectedPeriod === 'month' && selectedMonth) {
      filtered = filtered.filter(pl => pl.month === selectedMonth);
    }
    
    return filtered.sort((a, b) => a.month.localeCompare(b.month));
  }, [profitLossData, selectedYear, selectedPeriod, selectedMonth]);

  // Filter expenses by selected period
  const filteredExpenses = useMemo(() => {
    if (!expensesData?.data) return [];
    let filtered = expensesData.data;
    
    if (selectedPeriod === 'quarter' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const quarterStart = Math.floor((parseInt(month) - 1) / 3) * 3 + 1;
      const quarterEnd = quarterStart + 2;
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        const expMonth = expDate.getMonth() + 1;
        return expMonth >= quarterStart && expMonth <= quarterEnd && expDate.getFullYear().toString() === year;
      });
    } else if (selectedPeriod === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getFullYear().toString() === year && 
               (expDate.getMonth() + 1).toString().padStart(2, '0') === month;
      });
    } else {
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getFullYear().toString() === selectedYear;
      });
    }
    
    return filtered;
  }, [expensesData, selectedYear, selectedPeriod, selectedMonth]);

  // Filter sales by selected period
  const filteredSales = useMemo(() => {
    if (!salesData?.data) return [];
    let filtered = salesData.data;
    
    if (selectedPeriod === 'quarter' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const quarterStart = Math.floor((parseInt(month) - 1) / 3) * 3 + 1;
      const quarterEnd = quarterStart + 2;
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date);
        const saleMonth = saleDate.getMonth() + 1;
        return saleMonth >= quarterStart && saleMonth <= quarterEnd && saleDate.getFullYear().toString() === year;
      });
    } else if (selectedPeriod === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getFullYear().toString() === year && 
               (saleDate.getMonth() + 1).toString().padStart(2, '0') === month;
      });
    } else {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getFullYear().toString() === selectedYear;
      });
    }
    
    return filtered;
  }, [salesData, selectedYear, selectedPeriod, selectedMonth]);

  // Sales type labels
  const salesTypeLabels: Record<SalesType, string> = {
    on_site: "Sur place",
    delivery: "Livraison",
    takeaway: "À emporter",
    catering: "Traiteur",
    other: "Autre"
  };

  // Category labels mapping
  const categoryLabels: Record<ExpenseCategory | string, string> = {
    rent: "Loyer",
    utilities: "Charges",
    supplies: "Fournitures",
    marketing: "Marketing",
    insurance: "Assurance",
    maintenance: "Maintenance",
    professional_services: "Services professionnels",
    other: "Autres"
  };

  // Build detailed hierarchical income statement with individual items
  const detailedIncomeStatement = useMemo(() => {
    const rows: IncomeStatementRow[] = [];
    
    // Operating Income (Produits d'exploitation)
    rows.push({
      account: "Produits d'exploitation",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    // Sales by type with individual items
    const salesByType = filteredSales.reduce((acc, sale) => {
      const type = sale.type || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(sale);
      return acc;
    }, {} as Record<string, typeof filteredSales>);

    Object.entries(salesByType).forEach(([type, sales]) => {
      const typeTotal = sales.reduce((sum, sale) => sum + sale.amount, 0);
      if (typeTotal > 0) {
        rows.push({
          account: salesTypeLabels[type as SalesType] || type,
          accountCode: "706000",
          amount: typeTotal,
          level: 1
        });
        
        // Add individual sales items
        sales.forEach(sale => {
          rows.push({
            account: sale.description || `Vente ${formatDate(sale.date)}`,
            amount: sale.amount,
            level: 2
          });
        });
      }
    });

    // Total Sales
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
    rows.push({
      account: "Total pour Produits d'exploitation",
      amount: totalSales,
      level: 0,
      isTotal: true
    });

    // Cost of Goods Sold (Coût des marchandises vendues)
    rows.push({
      account: "Coût des marchandises vendues",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    const totalCOGS = filteredProfitLoss.reduce((sum, pl) => sum + pl.costOfGoodsSold, 0);
    rows.push({
      account: "Total pour Coût des marchandises vendues",
      amount: totalCOGS,
      level: 0,
      isTotal: true
    });

    // Gross Profit (Profit brut)
    const grossProfit = totalSales - totalCOGS;
    rows.push({
      account: "Profit brut",
      amount: grossProfit,
      level: 0,
      isTotal: true
    });

    // Operating Expenses (Dépenses d'exploitation)
    rows.push({
      account: "Dépenses d'exploitation",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    // Group expenses by category and show individual items
    const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
      const category = exp.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(exp);
      return acc;
    }, {} as Record<string, typeof filteredExpenses>);

    // Add expenses by category with individual items
    Object.entries(expensesByCategory).forEach(([category, expenses]) => {
      const categoryTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      if (categoryTotal > 0) {
        rows.push({
          account: categoryLabels[category] || category,
          amount: categoryTotal,
          level: 1
        });
        
        // Add individual expense items
        expenses.forEach(exp => {
          rows.push({
            account: exp.name || exp.description || `Dépense ${formatDate(exp.expenseDate)}`,
            amount: exp.amount,
            level: 2
          });
        });
      }
    });

    // Personnel Costs (Salaries)
    const totalPersonnel = filteredProfitLoss.reduce((sum, pl) => sum + pl.personnelCosts, 0);
    if (totalPersonnel > 0) {
      rows.push({
        account: "Salaires et rémunération des employés",
        amount: totalPersonnel,
        level: 1
      });
    }

    // Social Security Contributions (CNSS)
    const totalCNSS = filteredProfitLoss.reduce((sum, pl) => {
      return sum + (pl.personnelCosts * 0.22); // Approximate 22% for CNSS
    }, 0);
    
    if (totalCNSS > 0) {
      rows.push({
        account: "Charge CNSS",
        level: 1,
        amount: 0,
        isSectionHeader: true
      });
      
      const cnssG = totalCNSS * 0.05;
      const cnssW = totalCNSS * 0.05;
      
      rows.push({
        account: "CNSS G",
        amount: cnssG,
        level: 2
      });
      
      rows.push({
        account: "CNSS W",
        amount: cnssW,
        level: 2
      });
      
      rows.push({
        account: "Total pour Charge CNSS",
        amount: totalCNSS,
        level: 1,
        isTotal: true
      });
    }

    // Leasing Costs
    const totalLeasing = filteredProfitLoss.reduce((sum, pl) => sum + pl.leasingCosts, 0);
    if (totalLeasing > 0) {
      rows.push({
        account: "Loyers et charges locatives",
        amount: totalLeasing,
        level: 1
      });
    }

    // Depreciation
    const totalDepreciation = filteredProfitLoss.reduce((sum, pl) => sum + pl.depreciation, 0);
    if (totalDepreciation > 0) {
      rows.push({
        account: "Amortissements",
        amount: totalDepreciation,
        level: 1
      });
    }

    // Interest Expense
    const totalInterest = filteredProfitLoss.reduce((sum, pl) => sum + pl.interestExpense, 0);
    if (totalInterest > 0) {
      rows.push({
        account: "Intérêts",
        amount: totalInterest,
        level: 1
      });
    }

    // Taxes
    const totalTaxes = filteredProfitLoss.reduce((sum, pl) => sum + pl.taxes, 0);
    if (totalTaxes > 0) {
      rows.push({
        account: "Impôts",
        amount: totalTaxes,
        level: 1
      });
    }

    // Other Expenses
    const totalOther = filteredProfitLoss.reduce((sum, pl) => sum + pl.otherExpenses, 0);
    if (totalOther > 0) {
      rows.push({
        account: "Autres charges",
        amount: totalOther,
        level: 1
      });
    }

    // Total Operating Expenses
    const totalOperatingExpenses = filteredProfitLoss.reduce((sum, pl) => 
      sum + pl.operatingExpenses + pl.personnelCosts + pl.leasingCosts + pl.depreciation + pl.interestExpense + pl.taxes + pl.otherExpenses, 0);
    
    rows.push({
      account: "Total pour Dépenses d'exploitation",
      amount: totalOperatingExpenses,
      level: 0,
      isTotal: true
    });

    // Operating Profit (Bénéfice d'exploitation)
    const operatingProfit = filteredProfitLoss.reduce((sum, pl) => sum + pl.operatingProfit, 0);
    rows.push({
      account: "Bénéfice d'exploitation",
      amount: operatingProfit,
      level: 0,
      isTotal: true
    });

    // Non-operating Income (Bénéfices hors exploitation)
    rows.push({
      account: "Bénéfices hors exploitation",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    rows.push({
      account: "Total pour Bénéfices hors exploitation",
      amount: 0,
      level: 0,
      isTotal: true
    });

    // Non-operating Expenses (Frais hors exploitation)
    rows.push({
      account: "Frais hors exploitation",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    const exchangeGainsLosses = 0;
    if (exchangeGainsLosses !== 0) {
      rows.push({
        account: "Échangez un gain ou une perte",
        amount: exchangeGainsLosses,
        level: 1
      });
    }

    rows.push({
      account: "Total pour Frais hors exploitation",
      amount: exchangeGainsLosses,
      level: 0,
      isTotal: true
    });

    // Net Profit/Loss (Profit net / Perte nette)
    const netProfit = filteredProfitLoss.reduce((sum, pl) => sum + pl.netProfit, 0);
    rows.push({
      account: "Profit net / Perte nette",
      amount: netProfit,
      level: 0,
      isTotal: true
    });

    return rows;
  }, [filteredProfitLoss, filteredExpenses, filteredSales]);

  // Build summary income statement (grouped by category only)
  const summaryIncomeStatement = useMemo(() => {
    const rows: IncomeStatementRow[] = [];
    
    rows.push({
      account: "Produits d'exploitation",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
    rows.push({
      account: "Ventes",
      accountCode: "706000",
      amount: totalSales,
      level: 1
    });

    rows.push({
      account: "Total pour Produits d'exploitation",
      amount: totalSales,
      level: 0,
      isTotal: true
    });

    rows.push({
      account: "Coût des marchandises vendues",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    const totalCOGS = filteredProfitLoss.reduce((sum, pl) => sum + pl.costOfGoodsSold, 0);
    rows.push({
      account: "Total pour Coût des marchandises vendues",
      amount: totalCOGS,
      level: 0,
      isTotal: true
    });

    const grossProfit = totalSales - totalCOGS;
    rows.push({
      account: "Profit brut",
      amount: grossProfit,
      level: 0,
      isTotal: true
    });

    rows.push({
      account: "Dépenses d'exploitation",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
      const category = exp.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(exp);
      return acc;
    }, {} as Record<string, typeof filteredExpenses>);

    Object.entries(expensesByCategory).forEach(([category, expenses]) => {
      const categoryTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      if (categoryTotal > 0) {
        rows.push({
          account: categoryLabels[category] || category,
          amount: categoryTotal,
          level: 1
        });
      }
    });

    const totalPersonnel = filteredProfitLoss.reduce((sum, pl) => sum + pl.personnelCosts, 0);
    if (totalPersonnel > 0) {
      rows.push({
        account: "Salaires et rémunération des employés",
        amount: totalPersonnel,
        level: 1
      });
    }

    const totalCNSS = filteredProfitLoss.reduce((sum, pl) => sum + (pl.personnelCosts * 0.22), 0);
    if (totalCNSS > 0) {
      rows.push({
        account: "Charge CNSS",
        level: 1,
        amount: 0,
        isSectionHeader: true
      });
      
      rows.push({
        account: "CNSS G",
        amount: totalCNSS * 0.05,
        level: 2
      });
      
      rows.push({
        account: "CNSS W",
        amount: totalCNSS * 0.05,
        level: 2
      });
      
      rows.push({
        account: "Total pour Charge CNSS",
        amount: totalCNSS,
        level: 1,
        isTotal: true
      });
    }

    const totalLeasing = filteredProfitLoss.reduce((sum, pl) => sum + pl.leasingCosts, 0);
    if (totalLeasing > 0) {
      rows.push({
        account: "Loyers et charges locatives",
        amount: totalLeasing,
        level: 1
      });
    }

    const totalDepreciation = filteredProfitLoss.reduce((sum, pl) => sum + pl.depreciation, 0);
    if (totalDepreciation > 0) {
      rows.push({
        account: "Amortissements",
        amount: totalDepreciation,
        level: 1
      });
    }

    const totalInterest = filteredProfitLoss.reduce((sum, pl) => sum + pl.interestExpense, 0);
    if (totalInterest > 0) {
      rows.push({
        account: "Intérêts",
        amount: totalInterest,
        level: 1
      });
    }

    const totalTaxes = filteredProfitLoss.reduce((sum, pl) => sum + pl.taxes, 0);
    if (totalTaxes > 0) {
      rows.push({
        account: "Impôts",
        amount: totalTaxes,
        level: 1
      });
    }

    const totalOther = filteredProfitLoss.reduce((sum, pl) => sum + pl.otherExpenses, 0);
    if (totalOther > 0) {
      rows.push({
        account: "Autres charges",
        amount: totalOther,
        level: 1
      });
    }

    const totalOperatingExpenses = filteredProfitLoss.reduce((sum, pl) => 
      sum + pl.operatingExpenses + pl.personnelCosts + pl.leasingCosts + pl.depreciation + pl.interestExpense + pl.taxes + pl.otherExpenses, 0);
    
    rows.push({
      account: "Total pour Dépenses d'exploitation",
      amount: totalOperatingExpenses,
      level: 0,
      isTotal: true
    });

    const operatingProfit = filteredProfitLoss.reduce((sum, pl) => sum + pl.operatingProfit, 0);
    rows.push({
      account: "Bénéfice d'exploitation",
      amount: operatingProfit,
      level: 0,
      isTotal: true
    });

    rows.push({
      account: "Bénéfices hors exploitation",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    rows.push({
      account: "Total pour Bénéfices hors exploitation",
      amount: 0,
      level: 0,
      isTotal: true
    });

    rows.push({
      account: "Frais hors exploitation",
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    rows.push({
      account: "Total pour Frais hors exploitation",
      amount: 0,
      level: 0,
      isTotal: true
    });

    const netProfit = filteredProfitLoss.reduce((sum, pl) => sum + pl.netProfit, 0);
    rows.push({
      account: "Profit net / Perte nette",
      amount: netProfit,
      level: 0,
      isTotal: true
    });

    return rows;
  }, [filteredProfitLoss, filteredExpenses, filteredSales]);

  // Combined data for comprehensive view
  const combinedData = useMemo(() => {
    const months = new Set<string>();
    
    filteredProfitLoss.forEach(pl => months.add(pl.month));
    if (balanceSheetData) balanceSheetData.forEach(bs => months.add(bs.month));
    if (cashFlowData) cashFlowData.forEach(cf => months.add(cf.month));

    return Array.from(months)
      .sort()
      .map(month => {
        const pl = filteredProfitLoss.find(p => p.month === month);
        const bs = balanceSheetData?.find(b => b.month === month);
        const cf = cashFlowData?.find(c => c.month === month);

        return {
          month,
          revenue: pl?.totalRevenue || 0,
          grossProfit: pl?.grossProfit || 0,
          operatingProfit: pl?.operatingProfit || 0,
          netProfit: pl?.netProfit || 0,
          totalExpenses: (pl?.costOfGoodsSold || 0) + (pl?.operatingExpenses || 0) + (pl?.personnelCosts || 0) + (pl?.leasingCosts || 0) + (pl?.depreciation || 0) + (pl?.interestExpense || 0) + (pl?.taxes || 0) + (pl?.otherExpenses || 0),
          totalAssets: bs?.totalAssets || 0,
          totalEquity: bs?.totalEquity || 0,
          closingBalance: cf?.closingBalance || 0,
        };
      });
  }, [filteredProfitLoss, balanceSheetData, cashFlowData]);

  // Summary statistics
  const summary = useMemo(() => {
    if (combinedData.length === 0) return null;

    const latest = combinedData[combinedData.length - 1];
    const first = combinedData[0];
    const totalRevenue = combinedData.reduce((sum, d) => sum + d.revenue, 0);
    const totalProfit = combinedData.reduce((sum, d) => sum + d.netProfit, 0);
    const avgCashBalance = combinedData.reduce((sum, d) => sum + d.closingBalance, 0) / combinedData.length;

    return {
      totalRevenue,
      totalProfit,
      avgCashBalance,
      latestAssets: latest.totalAssets,
      latestEquity: latest.totalEquity,
      revenueGrowth: first.revenue > 0 ? ((latest.revenue - first.revenue) / first.revenue) * 100 : 0,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      assetsGrowth: first.totalAssets > 0 ? ((latest.totalAssets - first.totalAssets) / first.totalAssets) * 100 : 0,
    };
  }, [combinedData]);

  // Get date range for display
  const dateRange = useMemo(() => {
    if (selectedPeriod === 'year') {
      return `De 01/01/${selectedYear} À 31/12/${selectedYear}`;
    } else if (selectedPeriod === 'quarter' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const quarterStart = Math.floor((parseInt(month) - 1) / 3) * 3 + 1;
      const quarterEnd = quarterStart + 2;
      const startDate = new Date(parseInt(year), quarterStart - 1, 1);
      const endDate = new Date(parseInt(year), quarterEnd, 0);
      return `De ${formatDate(startDate.toISOString())} À ${formatDate(endDate.toISOString())}`;
    } else if (selectedPeriod === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      return `De ${formatDate(startDate.toISOString())} À ${formatDate(endDate.toISOString())}`;
    }
    return `De 01/01/${selectedYear} À 31/12/${selectedYear}`;
  }, [selectedYear, selectedPeriod, selectedMonth]);

  // Generate month options
  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const monthStr = `${selectedYear}-${String(i).padStart(2, '0')}`;
      const date = new Date(parseInt(selectedYear), i - 1, 1);
      months.push({
        value: monthStr,
        label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      });
    }
    return months;
  }, [selectedYear]);

  const handleExport = (statement: IncomeStatementRow[]) => {
    const csv = [
      ['COMPTE', 'CODE DU COMPTE', 'TOTAL'].join(','),
      ...statement.map(row => [
        `"${'  '.repeat(row.level)}${row.account}"`,
        row.accountCode || '',
        row.amount.toFixed(2).replace('.', ',')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etats-des-resultats-${selectedYear}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderIncomeStatementTable = (statement: IncomeStatementRow[]) => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b-2">
              <tr>
                <th className="text-left p-4 font-semibold">COMPTE</th>
                <th className="text-center p-4 font-semibold">CODE DU COMPTE</th>
                <th className="text-right p-4 font-semibold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {statement.map((row, index) => {
                const indentClass = row.level === 0 ? '' : row.level === 1 ? 'pl-6' : 'pl-12';
                const isBold = row.isTotal || row.isSectionHeader;
                const isSectionHeader = row.isSectionHeader;
                const isNetProfit = row.account === "Profit net / Perte nette";
                
                return (
                  <tr 
                    key={index}
                    className={`
                      ${isSectionHeader ? 'bg-muted/50 border-t-2' : ''}
                      ${isNetProfit ? 'bg-primary/10 border-t-2 border-primary' : ''}
                      ${row.level > 0 && !isSectionHeader ? 'border-b border-dashed' : ''}
                    `}
                  >
                    <td className={`p-3 ${indentClass} ${isBold ? 'font-semibold' : ''} ${isNetProfit ? 'text-lg' : ''}`}>
                      {row.account}
                    </td>
                    <td className="text-center p-3 text-muted-foreground">
                      {row.accountCode || ''}
                    </td>
                    <td className={`text-right p-3 ${isBold ? 'font-semibold' : ''} ${isNetProfit ? 'text-lg' : ''} ${row.amount < 0 ? 'text-red-600' : ''}`}>
                      {row.amount !== 0 || row.isTotal || row.isSectionHeader ? formatCurrency(row.amount) : '0,00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            **Le montant s'affiche dans votre devise de base EUR
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  const currentStatement = viewMode === 'detailed' ? detailedIncomeStatement : summaryIncomeStatement;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Statement</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive financial overview and detailed income statements
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={(value: 'year' | 'quarter' | 'month') => {
              setSelectedPeriod(value);
              if (value === 'year') {
                setSelectedMonth('');
              }
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">Année complète</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
              </SelectContent>
            </Select>
            {(selectedPeriod === 'quarter' || selectedPeriod === 'month') && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => handleExport(currentStatement)} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="comprehensive" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comprehensive">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="income-statement">États des résultats</TabsTrigger>
          </TabsList>

          {/* Comprehensive View */}
          <TabsContent value="comprehensive" className="space-y-4">
            {summary && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.revenueGrowth >= 0 ? (
                        <span className="text-green-600">+{summary.revenueGrowth.toFixed(1)}% growth</span>
                      ) : (
                        <span className="text-red-600">{summary.revenueGrowth.toFixed(1)}% decline</span>
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalProfit)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.profitMargin.toFixed(1)}% profit margin
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.latestAssets)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.assetsGrowth >= 0 ? (
                        <span className="text-green-600">+{summary.assetsGrowth.toFixed(1)}% growth</span>
                      ) : (
                        <span className="text-red-600">{summary.assetsGrowth.toFixed(1)}% decline</span>
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Cash Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.avgCashBalance)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average monthly balance
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Financial Performance Overview</CardTitle>
                <CardDescription>
                  Key financial metrics over time for {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                      }}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#0088FE" name="Revenue" />
                    <Bar yAxisId="left" dataKey="netProfit" fill="#00C49F" name="Net Profit" />
                    <Line yAxisId="right" type="monotone" dataKey="closingBalance" stroke="#FF8042" strokeWidth={2} name="Cash Balance" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income Statement View */}
          <TabsContent value="income-statement" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-center space-y-2 flex-1">
                <h2 className="text-2xl font-bold">OPUS3 BUSINESS</h2>
                <p className="text-lg font-semibold">États des résultats</p>
                <p className="text-sm text-muted-foreground">Base : Comptabilité d'exercice</p>
                <p className="text-sm font-medium">{dateRange}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === 'summary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('summary')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Résumé
                </Button>
                <Button 
                  variant={viewMode === 'detailed' ? 'default' : 'outline'}
                  onClick={() => setViewMode('detailed')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Détail
                </Button>
              </div>
            </div>

            {renderIncomeStatementTable(currentStatement)}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
