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
import { Save, X, Trash2, MoreVertical, Edit2, Package, TrendingUp, TrendingDown, Plus, DollarSign } from "lucide-react";
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
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useItemById, useUpdateItem, useDeleteItem, useInventorySuppliers, useStockMovements, useUnits, useMetadataEnum } from "@kit/hooks";
import type { ItemType } from "@kit/types";
import { toast } from "sonner";
import { dateToYYYYMMDD, taxRulesApi } from "@kit/lib";
import { formatCurrency } from "@kit/lib/config";
import { to2Decimals, netUnitPriceFromInclusive, unitPriceExclToIncl } from "@/lib/transaction-tax";
import { formatDate } from "@kit/lib/date-format";
import { DatePicker } from "@kit/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { InputGroupAttached } from "@/components/input-group";

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

interface PriceHistoryEntry {
  id: number;
  effectiveDate: string;
  value: number | null;
  taxIncluded?: boolean;
  resolvedTax?: Record<string, { rate: number; taxInclusive: boolean }>;
}

interface SupplierOrderPriceRow {
  id: number;
  unitPrice: number | null;
  quantity: number | null;
  unit: string;
  orderDate: string | null;
  orderNumber: string | null;
}

function HistoryEntryTable({
  itemId,
  type,
  entries,
  loading,
  onRefetch,
  formatCurrency,
  formatDate,
  taxPercent,
  resolveTaxRateForDate,
  salesTypes,
  addLabel,
  valueLabel,
  emptyMessage,
}: {
  itemId: string;
  type: 'sell' | 'cost';
  entries: PriceHistoryEntry[];
  loading: boolean;
  onRefetch: () => void;
  formatCurrency: (n: number) => string;
  formatDate: (d: string) => string;
  taxPercent: number;
  resolveTaxRateForDate?: (date: string) => Promise<number>;
  salesTypes?: { conditionValue: string; label: string }[];
  addLabel: string;
  valueLabel: string;
  emptyMessage: string;
}) {
  const [adding, setAdding] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  const [addDate, setAddDate] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addInclusive, setAddInclusive] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editInclusive, setEditInclusive] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!addDate || addValue === '' || Number.isNaN(parseFloat(addValue))) return;
    const value = parseFloat(addValue);
    const body: { type: 'sell' | 'cost'; effectiveDate: string; value: number; taxIncluded?: boolean } = {
      type,
      effectiveDate: addDate,
      value,
    };
    body.taxIncluded = addInclusive;
    try {
      const res = await fetch(`/api/items/${itemId}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setAdding(false);
        setAddDate('');
        setAddValue('');
        setAddInclusive(false);
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

  const startEdit = (e: PriceHistoryEntry) => {
    setEditingId(e.id);
    setEditDate(e.effectiveDate);
    setEditValue(e.value != null ? String(e.value) : '');
    setEditInclusive(e.taxIncluded ?? false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate('');
    setEditValue('');
    setEditInclusive(false);
  };

  const handleUpdate = async () => {
    if (editingId == null || !editDate || editValue === '' || Number.isNaN(parseFloat(editValue))) return;
    const payload: { effectiveDate: string; value: number; taxIncluded?: boolean } = {
      effectiveDate: editDate,
      value: parseFloat(editValue),
    };
    payload.taxIncluded = editInclusive;
    try {
      const res = await fetch(`/api/items/${itemId}/price-history/${editingId}?type=${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        cancelEdit();
        onRefetch();
        toast.success('Updated');
      } else {
        const err = await res.json();
        toast.error(err?.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (entryId: number) => {
    setDeleting(entryId);
    try {
      const res = await fetch(`/api/items/${itemId}/price-history/${entryId}?type=${type}`, { method: 'DELETE' });
      if (res.ok) {
        setEntryToDelete(null);
        onRefetch();
      } else toast.error('Failed to delete');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (entryToDelete != null) handleDelete(entryToDelete);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const useTaxRuleColumns = false;
  const inclLabel = !useTaxRuleColumns && taxPercent > 0 ? `Incl. tax (${taxPercent}%)` : null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeId = entries.find((e) => e.effectiveDate <= todayStr)?.id ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{emptyMessage}</span>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {addLabel}
          </Button>
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 px-4 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No entries yet</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add first entry
          </Button>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium p-3">Effective date</th>
                <th className="text-right font-medium p-3">{type === 'sell' ? 'Price' : 'Value (excl. tax)'}</th>
                {useTaxRuleColumns && salesTypes?.map((s) => {
                  const r = entries[0]?.resolvedTax?.[s.conditionValue];
                  const header = r ? (r.rate > 0 ? `${s.label} (${r.rate}% — tax)` : `${s.label} (Exempt)`) : s.label;
                  return <th key={s.conditionValue} className="text-right font-medium p-3">{header}</th>;
                })}
                {inclLabel && <th className="text-right font-medium p-3">{inclLabel}</th>}
                <th className="w-[100px] text-right font-medium p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className={`border-b last:border-0 hover:bg-muted/30 ${e.id === activeId ? 'bg-green-50 dark:bg-green-950/30' : ''}`}
                >
                  <>
                      <td className="p-3 font-medium">{formatDate(e.effectiveDate)}</td>
                      <td className="p-3 text-right tabular-nums font-medium">
                        {e.value != null ? formatCurrency(e.value) : '—'}
                      </td>
                      {useTaxRuleColumns && salesTypes?.map((s) => {
                        const r = e.resolvedTax?.[s.conditionValue];
                        const rate = r?.rate ?? 0;
                        let taxAmount: number | null = null;
                        if (e.value != null && rate > 0) {
                          if (e.taxIncluded) {
                            const anyWithRate = salesTypes?.find((st) => (e.resolvedTax?.[st.conditionValue]?.rate ?? 0) > 0);
                            const refRate = anyWithRate ? (e.resolvedTax?.[anyWithRate.conditionValue]?.rate ?? 0) : 0;
                            const excl = refRate > 0 ? netUnitPriceFromInclusive(e.value, refRate) : e.value;
                            taxAmount = to2Decimals(excl * (rate / 100));
                          } else {
                            taxAmount = to2Decimals(e.value * (rate / 100));
                          }
                        }
                        return (
                          <td key={s.conditionValue} className="p-3 text-right tabular-nums text-muted-foreground">
                            {taxAmount != null ? (
                              <span title="Tax">{formatCurrency(taxAmount)}</span>
                            ) : '—'}
                          </td>
                        );
                      })}
                      {inclLabel && (
                        <td className="p-3 text-right tabular-nums text-muted-foreground">
                          {e.value != null && taxPercent > 0
                            ? formatCurrency(e.taxIncluded ? e.value : unitPriceExclToIncl(e.value, taxPercent))
                            : '—'}
                        </td>
                      )}
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => startEdit(e)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={deleting === e.id} onClick={() => setEntryToDelete(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                  </>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={adding || editingId != null} onOpenChange={(open) => {
          if (!open) {
            setAdding(false);
            cancelEdit();
            setAddDate('');
            setAddValue('');
            setAddInclusive(false);
          }
        }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId != null ? 'Edit' : 'Add'} {type === 'sell' ? 'price' : 'cost'} entry</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2 items-end">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Effective date</Label>
                  <div className="h-10 flex items-center rounded-md border border-input overflow-hidden bg-background px-3">
                    <DatePicker
                      value={(editingId != null ? editDate : addDate) ? new Date(editingId != null ? editDate : addDate) : undefined}
                      onChange={(d) => {
                        const v = d ? dateToYYYYMMDD(d) : "";
                        if (editingId != null) setEditDate(v);
                        else setAddDate(v);
                      }}
                      placeholder="Pick a date"
                      className="border-0 p-0 h-auto [&_button]:h-full"
                    />
                  </div>
                </div>
                {type === 'sell' ? (
                  <InputGroupAttached
                    label={valueLabel}
                    labelClassName="text-muted-foreground font-normal"
                    addonStyle="default"
                    input={
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="border-0 rounded-none h-full"
                        value={editingId != null ? editValue : addValue}
                        onChange={(ev) => {
                          if (editingId != null) setEditValue(ev.target.value);
                          else setAddValue(ev.target.value);
                        }}
                      />
                    }
                    addon={
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="entry-incl-tax-dialog"
                          checked={editingId != null ? editInclusive : addInclusive}
                          onCheckedChange={(c) => {
                            if (editingId != null) setEditInclusive(c === true);
                            else setAddInclusive(c === true);
                          }}
                          aria-label={type === 'sell' ? 'Price includes tax' : 'Cost includes tax'}
                        />
                        <Label htmlFor="entry-incl-tax-dialog" className="text-xs font-normal cursor-pointer whitespace-nowrap">{type === 'sell' ? 'Price includes tax' : 'Cost includes tax'}</Label>
                      </div>
                    }
                  />
                ) : (
                  <InputGroupAttached
                    label={valueLabel}
                    labelClassName="text-muted-foreground font-normal"
                    addonStyle="default"
                    input={
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="border-0 rounded-none h-full"
                        value={editingId != null ? editValue : addValue}
                        onChange={(ev) => {
                          if (editingId != null) setEditValue(ev.target.value);
                          else setAddValue(ev.target.value);
                        }}
                      />
                    }
                    addon={
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="entry-incl-tax-dialog-cost"
                          checked={editingId != null ? editInclusive : addInclusive}
                          onCheckedChange={(c) => {
                            if (editingId != null) setEditInclusive(c === true);
                            else setAddInclusive(c === true);
                          }}
                          aria-label="Cost includes tax"
                        />
                        <Label htmlFor="entry-incl-tax-dialog-cost" className="text-xs font-normal cursor-pointer whitespace-nowrap">Cost includes tax</Label>
                      </div>
                    }
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setAdding(false);
                cancelEdit();
                setAddDate('');
                setAddValue('');
                setAddInclusive(false);
              }}>
                Cancel
              </Button>
              <Button onClick={editingId != null ? handleUpdate : handleAdd}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      <ConfirmationDialog
        open={entryToDelete != null}
        onOpenChange={(open) => !open && setEntryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete price entry"
        description="Are you sure you want to delete this price entry?"
        confirmText="Delete"
        cancelText="Cancel"
        isPending={deleting !== null}
        variant="destructive"
      />
    </div>
  );
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: item, isLoading } = useItemById(resolvedParams?.id || "");
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const { data: stockMovementsResponse } = useStockMovements({ itemId: resolvedParams?.id || "", limit: 1000 });
  const updateItem = useUpdateItem();
  const deleteMutation = useDeleteItem();
  const salesTypeValues = ['on_site', 'delivery', 'takeaway', 'catering', 'other'] as const;
  const [applicableTaxes, setApplicableTaxes] = useState<{
    sales: { conditionValue: string; label: string; rate: number; variableName?: string; taxInclusive?: boolean }[];
    expense: { rate: number; variableName?: string; taxInclusive?: boolean } | null;
  } | null>(null);
  const { data: salesTypeMeta = [] } = useMetadataEnum("SalesType");
  const salesTypeLabels: Record<string, string> = useMemo(
    () => Object.fromEntries(salesTypeMeta.map((ev) => [ev.name, ev.label ?? ev.name])),
    [salesTypeMeta]
  );

  useEffect(() => {
    if (!resolvedParams?.id || !item?.id) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const salesPromises = salesTypeValues.map((st) =>
      taxRulesApi
        .resolve({ context: 'sale', salesType: st, itemId: item.id, date: dateStr })
        .then((r) => ({ conditionValue: st, label: salesTypeLabels[st] ?? st, rate: r.rate, variableName: r.variableName, taxInclusive: r.taxInclusive }))
    );
    const expensePromise = taxRulesApi
      .resolve({ context: 'expense', itemId: item.id, date: dateStr })
      .then((r) => ({ rate: r.rate, variableName: r.variableName, taxInclusive: r.taxInclusive }));
    Promise.all([...salesPromises, expensePromise])
      .then((results) => {
        const sales = results.slice(0, salesTypeValues.length) as { conditionValue: string; label: string; rate: number; variableName?: string; taxInclusive?: boolean }[];
        const expense = results[results.length - 1] as { rate: number; variableName?: string; taxInclusive?: boolean };
        setApplicableTaxes({ sales, expense });
      })
      .catch(() => setApplicableTaxes(null));
  }, [resolvedParams?.id, item?.id, salesTypeLabels]);

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
    itemType: "item" as ItemType,
    type: "",
  });
  const { data: unitsData } = useUnits();
  const { data: categoryValues = [] } = useMetadataEnum("ItemCategory");
  const { data: variableTypeValues = [], isLoading: variableTypeLoading } = useMetadataEnum("VariableType");
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const categoryItems = categoryValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const itemTypeItems: { id: ItemType; name: string }[] = [
    { id: "item", name: "Item" },
    { id: "product", name: "Product" },
  ];
  const typeItems = (variableTypeValues || []).map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));

  const [resolvedPrice, setResolvedPrice] = useState<{ unitPrice: number | null; unitCost: number | null; taxIncluded?: boolean } | null>(null);
  const [sellHistory, setSellHistory] = useState<PriceHistoryEntry[]>([]);
  const [costHistory, setCostHistory] = useState<PriceHistoryEntry[]>([]);
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
        setResolvedPrice({ unitPrice: d.unitPrice ?? null, unitCost: d.unitCost ?? null, taxIncluded: d.taxIncluded });
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
        itemType: (item.itemType === "product" ? "product" : "item") as ItemType,
        type: item.type || "",
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
          itemType: formData.itemType,
          type: formData.type || undefined,
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
    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Item deleted successfully");
      setIsDeleteDialogOpen(false);
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
              {item.itemType === "product" && (
                <Badge variant="secondary" className="text-xs">Product</Badge>
              )}
              {item.itemType === "item" && (
                <Badge variant="secondary" className="text-xs">Item</Badge>
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
                  onClick={() => setIsDeleteDialogOpen(true)}
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

                  {/* Item type */}
                  <div className="space-y-2">
                    <UnifiedSelector
                      label="Item type"
                      type="type"
                      items={itemTypeItems}
                      selectedId={formData.itemType}
                      onSelect={(item) => handleInputChange('itemType', item.id as ItemType)}
                      placeholder="Select type"
                    />
                  </div>

                  {/* Type (variable type) */}
                  <div className="space-y-2">
                    <UnifiedSelector
                      label="Type"
                      type="type"
                      items={typeItems}
                      selectedId={formData.type || undefined}
                      onSelect={(item) => handleInputChange('type', item.id === 0 ? '' : String(item.id))}
                      placeholder={variableTypeLoading ? "Loading…" : "Select type"}
                      manageLink={{ href: '/variables', text: 'Variables' }}
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
                <TabsList className="grid w-full max-w-lg grid-cols-3">
                  <TabsTrigger value="movements">Movements</TabsTrigger>
                  <TabsTrigger value="price">Price</TabsTrigger>
                  <TabsTrigger value="cost">Cost</TabsTrigger>
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

                <TabsContent value="price" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Selling price history</CardTitle>
                      <CardDescription>Selling price uses price history by effective date, or the item default. Add or edit entries below.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {resolvedParams?.id && (
                        <HistoryEntryTable
                          itemId={resolvedParams.id}
                          type="sell"
                          entries={sellHistory}
                          loading={priceHistoryLoading}
                          onRefetch={() => fetchPriceHistory(resolvedParams.id)}
                          formatCurrency={formatCurrency}
                          formatDate={formatDate}
                          taxPercent={applicableTaxes?.sales?.find((s) => s.conditionValue === "on_site")?.rate ?? 0}
                          resolveTaxRateForDate={async (date) => {
                            const r = await taxRulesApi.resolve({ context: 'sale', salesType: 'on_site', itemId: item.id, date });
                            return r.rate;
                          }}
                          salesTypes={salesTypeValues.map((st) => ({ conditionValue: st, label: salesTypeLabels[st] ?? st }))}
                          addLabel="Add"
                          valueLabel="Price"
                          emptyMessage="Track selling prices by effective date."
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="cost" className="mt-4 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost from supplier orders</CardTitle>
                      <CardDescription>Weighted average of current stock; updated when orders are received. Recipe cost and valuation use it first; otherwise cost history or item default.</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost history</CardTitle>
                      <CardDescription>Manual cost entries by effective date for valuation and recipes when no supplier order data exists.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {resolvedParams?.id && (
                        <HistoryEntryTable
                          itemId={resolvedParams.id}
                          type="cost"
                          entries={costHistory}
                          loading={priceHistoryLoading}
                          onRefetch={() => fetchPriceHistory(resolvedParams.id)}
                          formatCurrency={formatCurrency}
                          formatDate={formatDate}
                          taxPercent={applicableTaxes?.expense?.rate ?? 0}
                          addLabel="Add"
                          valueLabel="Cost"
                          emptyMessage="Add dates and costs for valuation and recipes."
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
                      const raw = (resolvedPrice?.unitPrice ?? item.unitPrice) ?? null;
                      const rate = applicableTaxes?.sales?.find((s) => s.conditionValue === "on_site")?.rate ?? 0;
                      const isIncl = resolvedPrice?.taxIncluded === true;
                      const inclPrice = isIncl ? raw : (raw != null && rate > 0 ? unitPriceExclToIncl(raw, rate) : raw);
                      const exclPrice = isIncl && raw != null && rate > 0 ? netUnitPriceFromInclusive(raw, rate) : raw;
                      if (inclPrice == null) return <p className="text-2xl font-semibold tabular-nums">—</p>;
                      return (
                        <>
                          <p className="text-xl font-semibold tabular-nums">{formatCurrency(inclPrice)} <span className="text-xs font-normal text-muted-foreground">(incl. tax)</span></p>
                          {exclPrice != null && rate > 0 && (
                            <div className="text-sm text-muted-foreground tabular-nums space-y-0.5">
                              <p>{formatCurrency(exclPrice)} excl. tax</p>
                              <p>{formatCurrency(to2Decimals(inclPrice - (exclPrice ?? 0)))} tax</p>
                            </div>
                          )}
                        </>
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
                      const raw = (resolvedPrice?.unitCost ?? item.unitCost) ?? null;
                      const rate = applicableTaxes?.expense?.rate ?? 0;
                      const exclPrice = raw;
                      const inclPrice = raw != null && rate > 0 ? unitPriceExclToIncl(raw, rate) : raw;
                      const displayPrice = (rate > 0 ? inclPrice : exclPrice) ?? null;
                      if (displayPrice == null) return <p className="text-2xl font-semibold tabular-nums">—</p>;
                      return (
                        <>
                          <p className="text-xl font-semibold tabular-nums">{formatCurrency(displayPrice)} <span className="text-xs font-normal text-muted-foreground">(incl. tax)</span></p>
                          {exclPrice != null && rate > 0 && (
                            <div className="text-sm text-muted-foreground tabular-nums space-y-0.5">
                              <p>{formatCurrency(exclPrice)} excl. tax</p>
                              <p>{formatCurrency(to2Decimals(displayPrice - exclPrice))} tax</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {applicableTaxes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Applicable tax (from rules)</CardTitle>
                    <CardDescription className="text-xs">Selling = price incl. tax. Cost = price incl. tax (when rule applies).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Selling</p>
                      <div className="space-y-1">
                        {applicableTaxes.sales.map((s) => (
                          <div key={s.conditionValue} className="flex justify-between">
                            <span className="text-muted-foreground">{s.label}</span>
                            <span className="tabular-nums font-medium">
                              {s.rate === 0 ? "0% (Exempt)" : `${s.rate}%${s.variableName ? ` (${s.variableName})` : ""}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {applicableTaxes.expense != null && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Cost</p>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expense</span>
                          <span className="tabular-nums font-medium">
                            {applicableTaxes.expense.rate === 0
                              ? "0% (Exempt)"
                              : `${applicableTaxes.expense.rate}%${applicableTaxes.expense.variableName ? ` (${applicableTaxes.expense.variableName})` : ""}`}
                          </span>
                        </div>
                      </div>
                    )}
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
        <ConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Delete item"
          description="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isPending={deleteMutation.isPending}
          variant="destructive"
        />
      </div>
    </AppLayout>
  );
}

