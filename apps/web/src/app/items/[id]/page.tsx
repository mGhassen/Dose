"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { StockMovementType } from "@kit/types";
import { Save, X, Trash2, MoreVertical, Edit2, Package, TrendingUp, TrendingDown, Plus, DollarSign, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { Separator } from "@kit/ui/separator";
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
  AreaChart,
  Area,
} from 'recharts';
import AppLayout from "@/components/app-layout";
import { useItemById, useUpdateItem, useDeleteItem, useInventorySuppliers, useStockMovements, useUnits, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import { dateToYYYYMMDD, taxRulesApi } from "@kit/lib";
import { formatCurrency } from "@kit/lib/config";
import { to2Decimals, netUnitPriceFromInclusive } from "@/lib/transaction-tax";
import { formatDate } from "@kit/lib/date-format";
import { DatePicker } from "@kit/ui/date-picker";
import { InputGroupAttached } from "@/components/input-group";

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

interface PriceHistoryEntry {
  id: number;
  effectiveDate: string;
  value: number | null;
}

interface SupplierOrderPriceRow {
  id: number;
  unitPrice: number | null;
  quantity: number | null;
  unit: string;
  orderDate: string | null;
  orderNumber: string | null;
}

function PriceCostHistorySection({
  itemId,
  sellHistory,
  costHistory,
  supplierOrderPrices = [],
  resolvedPrice,
  itemUnitPrice,
  itemUnitCost,
  loading,
  onRefetch,
  formatCurrency,
  formatDate,
  saleTaxPercent = 0,
  expenseTaxPercent = 0,
}: {
  itemId: string;
  sellHistory: PriceHistoryEntry[];
  costHistory: PriceHistoryEntry[];
  supplierOrderPrices?: SupplierOrderPriceRow[];
  resolvedPrice: { unitPrice: number | null; unitCost: number | null } | null;
  itemUnitPrice?: number;
  itemUnitCost?: number;
  loading: boolean;
  onRefetch: () => void;
  formatCurrency: (n: number) => string;
  formatDate: (d: string) => string;
  saleTaxPercent?: number;
  expenseTaxPercent?: number;
}) {
  const [adding, setAdding] = useState<'sell' | 'cost' | null>(null);
  const [addDate, setAddDate] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addPriceInclusive, setAddPriceInclusive] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleAdd = async (type: 'sell' | 'cost') => {
    if (!addDate || addValue === '' || Number.isNaN(parseFloat(addValue))) return;
    const raw = parseFloat(addValue);
    const taxPct = type === 'sell' ? saleTaxPercent : expenseTaxPercent;
    const value = addPriceInclusive && taxPct > 0 ? netUnitPriceFromInclusive(raw, taxPct) : raw;
    try {
      const res = await fetch(`/api/items/${itemId}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, effectiveDate: addDate, value }),
      });
      if (res.ok) {
        setAdding(null);
        setAddDate('');
        setAddValue('');
        setAddPriceInclusive(false);
        onRefetch();
        toast.success('Added');
      } else {
        const err = await res.json();
        toast.error(err?.error || 'Failed to add');
      }
    } catch {
      toast.error('Failed to add');
    }
  };

  const handleDelete = async (type: 'sell' | 'cost', entryId: number) => {
    setDeleting(entryId);
    try {
      const res = await fetch(`/api/items/${itemId}/price-history/${entryId}?type=${type}`, { method: 'DELETE' });
      if (res.ok) onRefetch();
      else toast.error('Failed to delete');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const currentSell = resolvedPrice?.unitPrice ?? itemUnitPrice;
  const currentCost = resolvedPrice?.unitCost ?? itemUnitCost;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Cost from supplier orders</h4>
        <p className="text-xs text-muted-foreground">
          Cost above is the weighted average of current stock and is updated when orders are received. Recipe cost and valuation use it first; otherwise cost history or item default.
        </p>
        <div className="rounded-md border">
          {supplierOrderPrices.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No supplier order lines for this item yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-3">Order date</th>
                  <th className="text-right font-medium p-3">Unit price</th>
                  <th className="text-right font-medium p-3">Quantity</th>
                  <th className="text-left font-medium p-3">Order #</th>
                </tr>
              </thead>
              <tbody>
                {supplierOrderPrices.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">{r.orderDate ? formatDate(r.orderDate) : '—'}</td>
                    <td className="p-3 text-right font-medium tabular-nums">{r.unitPrice != null ? formatCurrency(r.unitPrice) : '—'}</td>
                    <td className="p-3 text-right tabular-nums">{r.quantity != null ? `${r.quantity} ${r.unit}` : '—'}</td>
                    <td className="p-3 text-muted-foreground">{r.orderNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Selling price history</CardTitle>
              </div>
              {adding !== 'sell' && (
                <Button variant="outline" size="sm" onClick={() => setAdding('sell')}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {adding === 'sell' && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="sell-date" className="text-muted-foreground font-normal">Effective date</Label>
                    <DatePicker value={addDate ? new Date(addDate) : undefined} onChange={(d) => setAddDate(d ? dateToYYYYMMDD(d) : "")} placeholder="Pick a date" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-normal">Price</Label>
                    <InputGroupAttached
                      addonStyle="default"
                      input={
                        <Input id="sell-price" type="number" step="0.01" min="0" placeholder="0.00" value={addValue} onChange={(e) => setAddValue(e.target.value)} className="border-0" />
                      }
                      addon={
                        <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs text-muted-foreground">
                          <Checkbox checked={addPriceInclusive} onCheckedChange={(c) => setAddPriceInclusive(c === true)} aria-label="Price includes tax" />
                          <span>Incl. tax</span>
                        </label>
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => { setAdding(null); setAddDate(''); setAddValue(''); setAddPriceInclusive(false); }}>Cancel</button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => handleAdd('sell')}>Save</Button>
                </div>
              </div>
            )}
            {sellHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 px-4 text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No selling price history</p>
                <p className="text-xs text-muted-foreground mt-1">Add dates and prices to track changes over time.</p>
                {adding !== 'sell' && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setAdding('sell')}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add first entry
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border divide-y">
                {sellHistory.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <History className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium tabular-nums">{e.value != null ? formatCurrency(e.value) : '—'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(e.effectiveDate)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" disabled={deleting === e.id} onClick={() => handleDelete('sell', e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Cost history</CardTitle>
              </div>
              {adding !== 'cost' && (
                <Button variant="outline" size="sm" onClick={() => setAdding('cost')}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {adding === 'cost' && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="cost-date" className="text-muted-foreground font-normal">Effective date</Label>
                    <DatePicker value={addDate ? new Date(addDate) : undefined} onChange={(d) => setAddDate(d ? dateToYYYYMMDD(d) : "")} placeholder="Pick a date" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-normal">Cost</Label>
                    <InputGroupAttached
                      addonStyle="default"
                      input={
                        <Input id="cost-value" type="number" step="0.01" min="0" placeholder="0.00" value={addValue} onChange={(e) => setAddValue(e.target.value)} className="border-0" />
                      }
                      addon={
                        <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs text-muted-foreground">
                          <Checkbox checked={addPriceInclusive} onCheckedChange={(c) => setAddPriceInclusive(c === true)} aria-label="Cost includes tax" />
                          <span>Incl. tax</span>
                        </label>
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => { setAdding(null); setAddDate(''); setAddValue(''); setAddPriceInclusive(false); }}>Cancel</button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => handleAdd('cost')}>Save</Button>
                </div>
              </div>
            )}
            {costHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 px-4 text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No cost history</p>
                <p className="text-xs text-muted-foreground mt-1">Add dates and costs for valuation and recipes.</p>
                {adding !== 'cost' && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setAdding('cost')}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add first entry
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border divide-y">
                {costHistory.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <History className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium tabular-nums">{e.value != null ? formatCurrency(e.value) : '—'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(e.effectiveDate)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" disabled={deleting === e.id} onClick={() => handleDelete('cost', e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PriceCostHistoryCard(
  props: {
    itemId: string;
    sellHistory: PriceHistoryEntry[];
    costHistory: PriceHistoryEntry[];
    loading: boolean;
    onRefetch: () => void;
    formatCurrency: (n: number) => string;
    formatDate: (d: string) => string;
  }
) {
  return (
    <PriceCostHistorySection
      {...props}
      supplierOrderPrices={[]}
      resolvedPrice={null}
      itemUnitPrice={undefined}
      itemUnitCost={undefined}
    />
  );
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: item, isLoading } = useItemById(resolvedParams?.id || "");
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const { data: stockMovementsResponse } = useStockMovements({ itemId: resolvedParams?.id || "", limit: 1000 });
  const updateItem = useUpdateItem();
  const deleteMutation = useDeleteItem();
  const [resolvedTax, setResolvedTax] = useState<{ sale: number; expense: number } | null>(null);

  useEffect(() => {
    if (!resolvedParams?.id || !item?.id) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    Promise.all([
      taxRulesApi.resolve({ context: 'sale', salesType: 'on_site', itemId: item.id, date: dateStr }),
      taxRulesApi.resolve({ context: 'expense', itemId: item.id, date: dateStr }),
    ])
      .then(([saleRes, expenseRes]) => setResolvedTax({ sale: saleRes.rate, expense: expenseRes.rate }))
      .catch(() => setResolvedTax(null));
  }, [resolvedParams?.id, item?.id]);

  // Calculate stock level from movements (running balance)
  const calculatedStock = useMemo(() => {
    if (!stockMovementsResponse?.data) return { total: 0, byLocation: new Map() };
    
    // Sort movements by date (oldest first) to calculate running balance
    const sortedMovements = [...stockMovementsResponse.data].sort((a, b) => 
      new Date(a.movementDate).getTime() - new Date(b.movementDate).getTime()
    );
    
    const byLocation = new Map<string, number>();
    let total = 0;
    
    sortedMovements.forEach(movement => {
      const location = movement.location || 'Default';
      const currentLocation = byLocation.get(location) || 0;
      
      if (movement.movementType === StockMovementType.IN) {
        byLocation.set(location, currentLocation + movement.quantity);
        total += movement.quantity;
      } else if (movement.movementType === StockMovementType.OUT || 
                 movement.movementType === StockMovementType.WASTE || 
                 movement.movementType === StockMovementType.EXPIRED) {
        const newLocationValue = Math.max(0, currentLocation - movement.quantity);
        byLocation.set(location, newLocationValue);
        total = Math.max(0, total - movement.quantity);
      } else if (movement.movementType === StockMovementType.ADJUSTMENT) {
        // Adjustment sets the value directly (positive or negative)
        byLocation.set(location, movement.quantity);
        total = movement.quantity; // For total, we'd need to know if it's a total adjustment or per-location
      } else if (movement.movementType === StockMovementType.TRANSFER) {
        // Transfer moves stock between locations, doesn't change total
        // This is complex - for now, treat as OUT from source location
        const newLocationValue = Math.max(0, currentLocation - movement.quantity);
        byLocation.set(location, newLocationValue);
      }
    });
    
    // Recalculate total from all locations
    const recalculatedTotal = Array.from(byLocation.values()).reduce((sum, qty) => sum + qty, 0);
    
    return { total: Math.max(0, recalculatedTotal), byLocation };
  }, [stockMovementsResponse?.data]);
  
  // Chart data: Daily movements over time
  const dailyChartData = useMemo(() => {
    if (!stockMovementsResponse?.data) return [];
    
    const dailyMap = new Map<string, { date: string; in: number; out: number }>();
    
    stockMovementsResponse.data.forEach(m => {
      const date = new Date(m.movementDate).toISOString().split('T')[0];
      const dayData = dailyMap.get(date) || { date, in: 0, out: 0 };
      
      if (m.movementType === StockMovementType.IN) {
        dayData.in += m.quantity;
      } else if (m.movementType === StockMovementType.OUT) {
        dayData.out += m.quantity;
      }
      
      dailyMap.set(date, dayData);
    });
    
    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }, [stockMovementsResponse?.data]);
  
  // Chart data: Movement types distribution
  const movementTypeData = useMemo(() => {
    if (!stockMovementsResponse?.data) return [];
    
    const typeMap = new Map<string, number>();
    
    stockMovementsResponse.data.forEach(m => {
      const count = typeMap.get(m.movementType) || 0;
      typeMap.set(m.movementType, count + 1);
    });
    
    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));
  }, [stockMovementsResponse?.data]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    sku: "",
    unitId: null as number | null,
    vendorId: "",
    notes: "",
    isActive: true,
  });
  const { data: unitsData } = useUnits();
  const { data: categoryValues = [] } = useMetadataEnum("ItemCategory");
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const categoryItems = categoryValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));

  const [resolvedPrice, setResolvedPrice] = useState<{ unitPrice: number | null; unitCost: number | null } | null>(null);
  const [sellHistory, setSellHistory] = useState<{ id: number; effectiveDate: string; value: number | null }[]>([]);
  const [costHistory, setCostHistory] = useState<{ id: number; effectiveDate: string; value: number | null }[]>([]);
  const [supplierOrderPrices, setSupplierOrderPrices] = useState<{ id: number; unitPrice: number | null; quantity: number | null; unit: string; orderDate: string | null; orderNumber: string | null }[]>([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const fetchPriceHistory = useCallback(async (itemId: string) => {
    setPriceHistoryLoading(true);
    try {
      const [res, sell, cost, orders] = await Promise.all([
        fetch(`/api/items/${itemId}/resolved-price`),
        fetch(`/api/items/${itemId}/price-history?type=sell`),
        fetch(`/api/items/${itemId}/price-history?type=cost`),
        fetch(`/api/items/${itemId}/supplier-order-prices`),
      ]);
      if (res.ok) {
        const d = await res.json();
        setResolvedPrice({ unitPrice: d.unitPrice ?? null, unitCost: d.unitCost ?? null });
      } else setResolvedPrice(null);
      if (sell.ok) setSellHistory(await sell.json());
      else setSellHistory([]);
      if (cost.ok) setCostHistory(await cost.json());
      else setCostHistory([]);
      if (orders.ok) setSupplierOrderPrices(await orders.json());
      else setSupplierOrderPrices([]);
    } catch {
      setResolvedPrice(null);
      setSellHistory([]);
      setCostHistory([]);
      setSupplierOrderPrices([]);
    } finally {
      setPriceHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (resolvedParams?.id && !isEditing) fetchPriceHistory(resolvedParams.id);
  }, [resolvedParams?.id, isEditing, fetchPriceHistory]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        category: item.category || "",
        sku: item.sku || "",
        unitId: item.unitId ?? null,
        vendorId: item.vendorId?.toString() || "",
        notes: item.notes || "",
        isActive: item.isActive,
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the item name");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateItem.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category || undefined,
          sku: formData.sku || undefined,
          unitId: formData.unitId ?? undefined,
          unit: formData.unitId != null ? (unitsData || []).find((u) => u.id === formData.unitId)?.symbol : undefined,
          vendorId: formData.vendorId ? parseInt(formData.vendorId) : undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        },
      });
      toast.success("Item updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update item");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Item deleted successfully");
      router.push('/items');
    } catch (error) {
      toast.error("Failed to delete item");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Item Not Found</h1>
            <p className="text-muted-foreground">The item you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/items')}>Back to Items</Button>
        </div>
      </AppLayout>
    );
  }

  const supplierName = item.vendorId && suppliersResponse?.data?.find(s => s.id === item.vendorId)?.name;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <StatusPin active={item.isActive} title={item.isActive ? "Active" : "Inactive"} />
              <h1 className="text-2xl font-bold">
                {isEditing ? "Edit Item" : item.name}
              </h1>
              {item.itemType === "recipe" && (
                <Badge variant="secondary" className="text-xs">Recipe</Badge>
              )}
              {item.itemType === "item" && (
                <Badge variant="secondary" className="text-xs">
                  {item.producedFromRecipeId ? "Product" : "Item"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {isEditing ? "Update item information" : "Item details and information"}
            </p>
          </div>
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Item</CardTitle>
              <CardDescription>Update the details for this item</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  {/* SKU */}
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <UnifiedSelector
                      label="Category"
                      type="category"
                      items={categoryItems}
                      selectedId={formData.category || undefined}
                      onSelect={(item) => handleInputChange('category', item.id === 0 ? '' : String(item.id))}
                      placeholder="Select category"
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-2">
                    <UnifiedSelector
                      label="Unit"
                      type="unit"
                      items={unitItems}
                      selectedId={formData.unitId ?? undefined}
                      onSelect={(item) => handleInputChange('unitId', item.id === 0 ? null : (item.id as number))}
                      placeholder="Select unit"
                      manageLink={{ href: '/variables', text: 'Variables' }}
                    />
                  </div>

                  {/* Vendor */}
                  <div className="space-y-2">
                    <UnifiedSelector
                      label="Vendor"
                      type="vendor"
                      items={suppliersResponse?.data ?? []}
                      selectedId={formData.vendorId ? parseInt(formData.vendorId) : undefined}
                      onSelect={(item) => handleInputChange('vendorId', item.id === 0 ? '' : String(item.id))}
                      placeholder="Select vendor"
                    />
                  </div>

                  {/* Is Active */}
                  <div className="space-y-2 flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateItem.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateItem.isPending ? "Updating..." : "Update Item"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Main Content (8 columns) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Hero Stock Card - Large Prominent Display */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg mb-1">Current Stock</CardTitle>
                      <CardDescription>Real-time inventory level</CardDescription>
                    </div>
                    <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {calculatedStock.total.toFixed(2)}
                      </div>
                      <div className="text-lg text-muted-foreground">{item.unit || 'units'}</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        From {stockMovementsResponse?.data?.length || 0} movements
                      </div>
                    </div>
                    <div className="text-right">
                      {calculatedStock.total === 0 ? (
                        <Badge variant="destructive" className="text-base px-4 py-2">Out of Stock</Badge>
                      ) : (
                        <Badge variant="default" className="text-base px-4 py-2 bg-green-600">In Stock</Badge>
                      )}
                      <div className="mt-3">
                        <Link href={`/stock-movements/create?itemId=${item.id}`}>
                          <Button size="sm" className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Record Movement
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                  {calculatedStock.byLocation.size > 0 && (
                    <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
                      <div className="text-sm font-medium mb-3">Stock by Location</div>
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from(calculatedStock.byLocation.entries()).map(([location, quantity]) => (
                          <div key={location} className="flex justify-between items-center p-3 bg-background/60 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                            <span className="text-sm font-medium">{location}</span>
                            <span className="text-sm font-bold">{quantity.toFixed(2)} {item.unit || 'units'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Total Movements</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stockMovementsResponse?.data?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Stock In</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stockMovementsResponse?.data?.filter(m => m.movementType === StockMovementType.IN).reduce((sum, m) => sum + m.quantity, 0).toFixed(2) || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">Received</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Stock Out</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {stockMovementsResponse?.data?.filter(m => m.movementType === StockMovementType.OUT).reduce((sum, m) => sum + m.quantity, 0).toFixed(2) || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">Used</p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="movements" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="movements">Movements</TabsTrigger>
                  <TabsTrigger value="price-cost">Price & cost</TabsTrigger>
                </TabsList>

                <TabsContent value="movements" className="mt-4 space-y-4">
              {/* Charts Grid */}
              {stockMovementsResponse?.data && stockMovementsResponse.data.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Daily Movements (30 Days)</CardTitle>
                      <CardDescription className="text-xs">Stock in vs out trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dailyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={dailyChartData}>
                            <defs>
                              <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis style={{ fontSize: '12px' }} />
                            <Tooltip 
                              formatter={(value: number) => value.toFixed(2)}
                              labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="in" stroke="#22c55e" fillOpacity={1} fill="url(#colorIn)" name="Stock In" />
                            <Area type="monotone" dataKey="out" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" name="Stock Out" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Movement Types</CardTitle>
                      <CardDescription className="text-xs">Distribution by type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {movementTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={movementTypeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                            <YAxis style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#3b82f6" name="Count" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recent Movements */}
              {stockMovementsResponse?.data && stockMovementsResponse.data.length > 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Recent Movements</CardTitle>
                        <CardDescription>Latest stock activity</CardDescription>
                      </div>
                      <Link href={`/stock-movements?itemId=${item.id}`}>
                        <Button variant="outline" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {stockMovementsResponse.data.slice(0, 10).map((movement) => {
                        const isIn = movement.movementType === StockMovementType.IN;
                        const isOut = movement.movementType === StockMovementType.OUT;
                        return (
                          <div key={movement.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isIn ? (
                                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                  </div>
                                ) : isOut ? (
                                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">
                                    {isIn ? '+' : '-'}{movement.quantity} {movement.unit}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Badge variant={isIn ? "default" : "destructive"} className="text-xs">
                                      {movement.movementType.toUpperCase()}
                                    </Badge>
                                    {movement.location && <span>• {movement.location}</span>}
                                  </div>
                                  {movement.notes && (
                                    <div className="text-xs text-muted-foreground mt-1">{movement.notes}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(movement.movementDate)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Stock Movements</CardTitle>
                    <CardDescription>No movements recorded yet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No stock movements have been recorded for this item.</p>
                      <Link href={`/stock-movements/create?itemId=${item.id}`}>
                        <Button variant="outline" size="sm" className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Record First Movement
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
                </TabsContent>

                <TabsContent value="price-cost" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Price & cost history</CardTitle>
                      <CardDescription>Cost is the weighted average of current stock (updated when supplier orders are received). Selling price uses price history or item default.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {resolvedParams?.id && (
                        <PriceCostHistorySection
                          itemId={resolvedParams.id}
                          sellHistory={sellHistory}
                          costHistory={costHistory}
                          supplierOrderPrices={supplierOrderPrices}
                          resolvedPrice={resolvedPrice}
                          itemUnitPrice={item.unitPrice}
                          itemUnitCost={item.unitCost}
                          loading={priceHistoryLoading}
                          onRefetch={() => fetchPriceHistory(resolvedParams.id)}
                          formatCurrency={formatCurrency}
                          formatDate={formatDate}
                          saleTaxPercent={resolvedTax?.sale ?? 0}
                          expenseTaxPercent={resolvedTax?.expense ?? 0}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Sidebar (4 columns) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Item Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Item Details</CardTitle>
                  <CardDescription>Basic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusPin active={item.isActive} title={item.isActive ? "Active" : "Inactive"} />
                      <p className="text-base font-semibold">{item.name}</p>
                    </div>
                  </div>

                  {/* SKU */}
                  {item.sku && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">SKU</label>
                        <p className="text-sm mt-1 font-mono">{item.sku}</p>
                      </div>
                    </>
                  )}

                  {/* Category */}
                  {item.category && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                        <p className="text-sm mt-1">{item.category}</p>
                      </div>
                    </>
                  )}

                  {/* Unit */}
                  {item.unit && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Unit</label>
                        <p className="text-sm mt-1">{item.unit}</p>
                      </div>
                    </>
                  )}

                  {/* Default tax rate */}
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Default tax rate</label>
                      <p className="text-sm mt-1">
                        {item.defaultTaxRatePercent != null ? `${item.defaultTaxRatePercent}%` : '—'}
                      </p>
                    </div>
                  </>

                  {/* Vendor */}
                  {supplierName && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Vendor</label>
                        <div className="mt-1">
                          <Badge variant="outline">{supplierName}</Badge>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Produced From Recipe */}
                  {item.producedFromRecipeId && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Source Recipe</label>
                        <div className="mt-2">
                          <Link href={`/recipes/${item.producedFromRecipeId}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              View Recipe
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Metadata */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(item.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {formatDate(item.updatedAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Selling price (today)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {(() => {
                      const excl = (resolvedPrice?.unitPrice ?? item.unitPrice) != null ? (resolvedPrice?.unitPrice ?? item.unitPrice)! : null;
                      const rate = resolvedTax?.sale ?? 0;
                      const incl = excl != null && rate > 0 ? to2Decimals(excl * (1 + rate / 100)) : excl;
                      return excl != null ? (
                        <>
                          <p className="text-xl font-semibold tabular-nums">{formatCurrency(excl)} <span className="text-xs font-normal text-muted-foreground">(excl. tax)</span></p>
                          {rate > 0 && incl != null && <p className="text-sm tabular-nums text-muted-foreground">{formatCurrency(incl)} (incl. {rate}% tax)</p>}
                        </>
                      ) : (
                        <p className="text-2xl font-semibold tabular-nums">—</p>
                      );
                    })()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground" title="Weighted average of current stock; updated when supplier orders are received">
                      Buying price (today)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {(() => {
                      const excl = (resolvedPrice?.unitCost ?? item.unitCost) != null ? (resolvedPrice?.unitCost ?? item.unitCost)! : null;
                      const rate = resolvedTax?.expense ?? 0;
                      const incl = excl != null && rate > 0 ? to2Decimals(excl * (1 + rate / 100)) : excl;
                      return excl != null ? (
                        <>
                          <p className="text-xl font-semibold tabular-nums">{formatCurrency(excl)} <span className="text-xs font-normal text-muted-foreground">(excl. tax)</span></p>
                          {rate > 0 && incl != null && <p className="text-sm tabular-nums text-muted-foreground">{formatCurrency(incl)} (incl. {rate}% tax)</p>}
                        </>
                      ) : (
                        <p className="text-2xl font-semibold tabular-nums">—</p>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {resolvedTax && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Applicable tax (from rules)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales (on-site)</span>
                      <span className="tabular-nums font-medium">{resolvedTax.sale}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expense</span>
                      <span className="tabular-nums font-medium">{resolvedTax.expense}%</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Description & Notes */}
              {(item.description || item.notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item.description && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Description</label>
                        <p className="text-sm whitespace-pre-wrap">{item.description}</p>
                      </div>
                    )}
                    {item.notes && (
                      <>
                        {item.description && <Separator />}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-2 block">Notes</label>
                          <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

