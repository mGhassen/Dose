"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useStockMovements, useDeleteStockMovement, useItems } from "@kit/hooks";
import type { StockMovement } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { StockMovementType } from "@kit/types";
import { ArrowUpDown, TrendingUp, TrendingDown, Package, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';

export default function StockMovementsContent() {
  const router = useRouter();
  
  const { data: movementsResponse, isLoading } = useStockMovements({ 
    limit: 1000
  });
  
  const { data: itemsResponse } = useItems({ limit: 1000 });
  
  const itemMap = useMemo(() => {
    if (!itemsResponse?.data) return new Map<number, string>();
    return new Map(itemsResponse.data.map(i => [i.id, i.name]));
  }, [itemsResponse?.data]);
  
  const movements = movementsResponse?.data || [];
  const totalCount = movementsResponse?.pagination?.total || movements.length;
  
  const filteredMovements = useMemo(() => {
    return movements;
  }, [movements]);
  const deleteMutation = useDeleteStockMovement();
  
  // Calculate summary stats
  const inMovements = useMemo(() => {
    return movements.filter(m => m.movementType === StockMovementType.IN).length;
  }, [movements]);
  
  const outMovements = useMemo(() => {
    return movements.filter(m => m.movementType === StockMovementType.OUT).length;
  }, [movements]);
  
  const wasteMovements = useMemo(() => {
    return movements.filter(m => m.movementType === StockMovementType.WASTE || m.movementType === StockMovementType.EXPIRED).length;
  }, [movements]);
  
  const totalInQuantity = useMemo(() => {
    return movements
      .filter(m => m.movementType === StockMovementType.IN)
      .reduce((sum, m) => sum + m.quantity, 0);
  }, [movements]);
  
  const totalOutQuantity = useMemo(() => {
    return movements
      .filter(m => m.movementType === StockMovementType.OUT)
      .reduce((sum, m) => sum + m.quantity, 0);
  }, [movements]);

  // Chart data: Daily movements by item over time (top 5 items)
  const dailyChartDataByItem = useMemo(() => {
    // Get top 5 items by movement count
    const itemCounts = new Map<number, number>();
    movements.forEach(m => {
      const itemId = m.itemId || m.ingredientId;
      if (itemId) {
        itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
      }
    });
    
    const topItemIds = Array.from(itemCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([itemId]) => itemId);
    
    // Group by date and item
    const dailyItemMap = new Map<string, Map<number, { in: number; out: number }>>();
    
    movements.forEach(m => {
      const itemId = m.itemId || m.ingredientId;
      if (!itemId || !topItemIds.includes(itemId)) return;
      
      const date = new Date(m.movementDate).toISOString().split('T')[0];
      let dateMap = dailyItemMap.get(date);
      if (!dateMap) {
        dateMap = new Map();
        dailyItemMap.set(date, dateMap);
      }
      
      let itemData = dateMap.get(itemId);
      if (!itemData) {
        itemData = { in: 0, out: 0 };
        dateMap.set(itemId, itemData);
      }
      
      if (m.movementType === StockMovementType.IN) {
        itemData.in += m.quantity;
      } else if (m.movementType === StockMovementType.OUT) {
        itemData.out += m.quantity;
      }
    });
    
    // Convert to chart format
    const dates = Array.from(dailyItemMap.keys())
      .sort((a, b) => a.localeCompare(b))
      .slice(-30); // Last 30 days
    
    return dates.map(date => {
      const dateMap = dailyItemMap.get(date)!;
      const result: any = { date };
      
      topItemIds.forEach(itemId => {
        const itemName = itemMap.get(itemId) || `Item ${itemId}`;
        const itemData = dateMap.get(itemId) || { in: 0, out: 0 };
        result[`${itemName} (In)`] = itemData.in;
        result[`${itemName} (Out)`] = itemData.out;
      });
      
      return result;
    });
  }, [movements, itemMap]);

  // Chart data: Movement types distribution
  const movementTypeData = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    movements.forEach(m => {
      const count = typeMap.get(m.movementType) || 0;
      typeMap.set(m.movementType, count + 1);
    });
    
    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));
  }, [movements]);

  // Chart data: Top items by movement count
  const topItemsData = useMemo(() => {
    const itemStatsMap = new Map<number, { name: string; count: number; in: number; out: number }>();
    
    movements.forEach(m => {
      const itemId = m.itemId || m.ingredientId;
      if (!itemId) return;
      
      const itemName = itemMap.get(itemId) || `Item ${itemId}`;
      const itemData = itemStatsMap.get(itemId) || { name: itemName, count: 0, in: 0, out: 0 };
      
      // Update name if we have it in itemMap
      if (itemMap.has(itemId)) {
        itemData.name = itemMap.get(itemId)!;
      }
      
      itemData.count += 1;
      if (m.movementType === StockMovementType.IN) {
        itemData.in += m.quantity;
      } else if (m.movementType === StockMovementType.OUT) {
        itemData.out += m.quantity;
      }
      
      itemStatsMap.set(itemId, itemData);
    });
    
    return Array.from(itemStatsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [movements, itemMap]);

  const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'];

  const getMovementTypeBadge = (type: StockMovementType) => {
    const variants: Record<StockMovementType, "default" | "secondary" | "destructive" | "outline"> = {
      [StockMovementType.IN]: "default",
      [StockMovementType.OUT]: "destructive",
      [StockMovementType.ADJUSTMENT]: "outline",
      [StockMovementType.TRANSFER]: "secondary",
      [StockMovementType.WASTE]: "destructive",
      [StockMovementType.EXPIRED]: "destructive",
    };
    return variants[type] || "secondary";
  };

  const columns: ColumnDef<StockMovement>[] = useMemo(() => [
    {
      accessorKey: "itemId",
      header: "Item",
      cell: ({ row }) => {
        const itemId = row.original.itemId || row.original.ingredientId;
        if (itemId && itemMap.has(itemId)) {
          return itemMap.get(itemId);
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "movementType",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={getMovementTypeBadge(row.original.movementType)}>
          {row.original.movementType.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ row }) => `${row.original.quantity} ${row.original.unit}`,
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => row.original.location || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "movementDate",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.movementDate),
    },
    {
      accessorKey: "referenceType",
      header: "Reference",
      cell: ({ row }) => row.original.referenceType ? `${row.original.referenceType} #${row.original.referenceId || ''}` : <span className="text-muted-foreground">—</span>,
    },
  ], [itemMap]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this stock movement?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Stock movement deleted successfully");
    } catch (error) {
      toast.error("Failed to delete stock movement");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} stock movement(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} stock movement(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete stock movements");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: StockMovement[], type: 'selected' | 'all') => {
    const movementsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Item', 'Type', 'Quantity', 'Unit', 'Location', 'Date', 'Reference'].join(','),
      ...movementsToCopy.map(movement => [
        itemMap.get(movement.itemId || movement.ingredientId) || '',
        movement.movementType,
        movement.quantity,
        movement.unit,
        movement.location || '',
        movement.movementDate,
        movement.referenceType ? `${movement.referenceType} #${movement.referenceId || ''}` : '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${movementsToCopy.length} stock movement(s) copied to clipboard`);
  };

  const handleBulkExport = (data: StockMovement[], type: 'selected' | 'all') => {
    const movementsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Item', 'Type', 'Quantity', 'Unit', 'Location', 'Date', 'Reference'].join(','),
      ...movementsToExport.map(movement => [
        itemMap.get(movement.itemId || movement.ingredientId) || '',
        movement.movementType,
        movement.quantity,
        movement.unit,
        movement.location || '',
        movement.movementDate,
        movement.referenceType ? `${movement.referenceType} #${movement.referenceId || ''}` : '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${movementsToExport.length} stock movement(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground mt-2">
            Track all inventory movements, receipts, usage, and waste
          </p>
        </div>
        <Link href="/stock-movements/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Record Movement
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              All movements tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inMovements}</div>
            <p className="text-xs text-muted-foreground">
              {totalInQuantity.toFixed(2)} units received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{outMovements}</div>
            <p className="text-xs text-muted-foreground">
              {totalOutQuantity.toFixed(2)} units used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waste/Expired</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{wasteMovements}</div>
            <p className="text-xs text-muted-foreground">
              Items lost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Daily Movements by Item (Top 5) */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Movements by Item (Last 30 Days)</CardTitle>
                <CardDescription>Top 5 items - Stock in and out over time</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyChartDataByItem.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyChartDataByItem}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => value.toFixed(2)}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Legend />
                      {dailyChartDataByItem[0] && Object.keys(dailyChartDataByItem[0])
                        .filter(key => key !== 'date')
                        .map((key, index) => {
                          const isIn = key.includes('(In)');
                          const color = isIn ? COLORS[index % COLORS.length] : COLORS[(index + 1) % COLORS.length];
                          return (
                            <Line 
                              key={key}
                              type="monotone" 
                              dataKey={key} 
                              stroke={color}
                              strokeWidth={2}
                              name={key}
                              dot={false}
                            />
                          );
                        })}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Movement Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Movement Types Distribution</CardTitle>
                <CardDescription>Breakdown by movement type</CardDescription>
              </CardHeader>
              <CardContent>
                {movementTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={movementTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {movementTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movements Trend by Item</CardTitle>
              <CardDescription>Top 5 items - Daily stock in and out quantities</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyChartDataByItem.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={dailyChartDataByItem}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => value.toFixed(2)}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    {dailyChartDataByItem[0] && Object.keys(dailyChartDataByItem[0])
                      .filter(key => key !== 'date')
                      .map((key, index) => {
                        const isIn = key.includes('(In)');
                        const color = COLORS[Math.floor(index / 2) % COLORS.length];
                        return (
                          <Bar 
                            key={key}
                            dataKey={key} 
                            fill={color} 
                            name={key}
                            opacity={isIn ? 1 : 0.7}
                          />
                        );
                      })}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Items by Movement Count</CardTitle>
              <CardDescription>Most active items in stock movements</CardDescription>
            </CardHeader>
            <CardContent>
              {topItemsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topItemsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="in" fill="#22c55e" name="Stock In" />
                    <Bar dataKey="out" fill="#ef4444" name="Stock Out" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/stock-movements/create"
          data={filteredMovements}
          columns={columns}
          loading={isLoading}
          onRowClick={(movement) => router.push(`/stock-movements/${movement.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "movementType", label: "Movement Type" },
          ]}
          sortColumns={[
            { value: "movementDate", label: "Date", type: "timestamp" },
            { value: "quantity", label: "Quantity", type: "numeric" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="stock-movements"
          searchFields={["location", "notes"]}
        />
      </div>
    </div>
  );
}

