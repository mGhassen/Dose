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
import { SupplierFormDialog } from "@/components/supplier-form-dialog";
import { ItemCategorySelector } from "@/components/item-category-selector";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Switch } from "@kit/ui/switch";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { StockMovementType } from "@kit/types";
import { Save, X, Trash2, MoreVertical, Edit2, Package, TrendingUp, TrendingDown, Plus, DollarSign, ChevronRight, Link2 } from "lucide-react";
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
import MergedItemsCard from "@/app/items/[id]/_components/merged-items-card";
import { useItemById, useUpdateItem, useDeleteItem, useInventorySuppliers, useStockMovements, useUnits, useMetadataEnum, useVariablesByType, useRecipes, useUpdateRecipe } from "@kit/hooks";
import type { ItemKind } from "@kit/types";

function toggleItemKind(current: ItemKind[], k: ItemKind): ItemKind[] {
  const next = current.includes(k) ? current.filter((x) => x !== k) : [...current, k];
  return next.length ? next : [k];
}

const ITEM_KIND_OPTIONS: { id: ItemKind; label: string }[] = [
  { id: "item", label: "Item" },
  { id: "product", label: "Product" },
  { id: "modifier", label: "Modifier" },
  { id: "ingredient", label: "Ingredient" },
];
import { toast } from "sonner";
import { dateToYYYYMMDD, taxRulesApi, recipesApi } from "@kit/lib";
import { formatCurrency } from "@kit/lib/config";
import { to2Decimals, netUnitPriceFromInclusive, unitPriceExclToIncl } from "@/lib/transaction-tax";
import { formatDate } from "@kit/lib/date-format";
import { useDateFormat } from "@kit/hooks/use-date-format";
import { DatePicker } from "@kit/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { InputGroupAttached } from "@/components/input-group";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@kit/ui/tooltip";

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

interface ItemCatalogPayload {
  parentItem: { id: number; name: string; isCatalogParent: boolean } | null;
  variantMeta: { nameSnapshot: string | null; squareVariationId: string | null } | null;
  modifierListsSourceItemId?: number;
  modifierListUsageByRecipe?: Record<
    number,
    Array<{ recipeId: number; recipeName: string; modifierCount: number }>
  >;
  variations: {
    id: number;
    variantItemId: number;
    name: string;
    sku: string | null;
    sortOrder: number | null;
    nameSnapshot: string | null;
    squareVariationId: string | null;
  }[];
  modifierLists: {
    linkSortOrder: number | null;
    minSelected: number | null;
    maxSelected: number | null;
    enabled: boolean;
    id: number;
    name: string | null;
    selectionType: string | null;
    squareModifierListId: string | null;
    modifiers: {
      id: number;
      name: string | null;
      priceAmountCents: number | null;
      sortOrder: number;
      squareModifierId: string | null;
      supplyItemId: number | null;
      supplyItemName: string | null;
      supplyItemAffectsStock: boolean;
    }[];
  }[];
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
  sellVatRates,
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
  sellVatRates?: number[];
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
  const useSellVatColumns = type === 'sell' && sellVatRates != null && sellVatRates.length > 0;
  const expenseTax = type === 'cost' ? entries[0]?.resolvedTax?.expense : undefined;
  const useCostTaxColumn = type === 'cost' && expenseTax != null;
  const inclLabel = !useTaxRuleColumns && !useSellVatColumns && !useCostTaxColumn && taxPercent > 0 ? `Incl. tax (${taxPercent}%)` : null;
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
                <th className="text-right font-medium p-3">
                  {useCostTaxColumn ? 'Price (excl. tax)' : 'Price'}
                </th>
                {useCostTaxColumn && (
                  <th className="text-right font-medium p-3">
                    {expenseTax!.rate > 0 ? `Tax (${expenseTax!.rate}%)` : 'Tax'}
                  </th>
                )}
                {useCostTaxColumn && (
                  <th className="text-right font-medium p-3">Total (incl. tax)</th>
                )}
                {useTaxRuleColumns && salesTypes?.map((s) => {
                  const r = entries[0]?.resolvedTax?.[s.conditionValue];
                  const header = r ? (r.rate > 0 ? `${s.label} (${r.rate}% — tax)` : `${s.label} (Exempt)`) : s.label;
                  return <th key={s.conditionValue} className="text-right font-medium p-3">{header}</th>;
                })}
                {useSellVatColumns && sellVatRates?.map((rate) => (
                  <th key={rate} className="text-right font-medium p-3">Tax ({rate}%)</th>
                ))}
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
                      {useCostTaxColumn ? (() => {
                        const r = e.resolvedTax?.expense;
                        const rate = r?.rate ?? 0;
                        if (e.value == null || rate <= 0) {
                          return (
                            <>
                              <td className="p-3 text-right tabular-nums font-medium">
                                {e.value != null ? formatCurrency(e.value) : '—'}
                              </td>
                              <td className="p-3 text-right tabular-nums text-muted-foreground">—</td>
                              <td className="p-3 text-right tabular-nums text-muted-foreground">
                                {e.value != null ? formatCurrency(e.value) : '—'}
                              </td>
                            </>
                          );
                        }
                        const excl = r?.taxInclusive ? netUnitPriceFromInclusive(e.value, rate) : e.value;
                        const taxAmount = to2Decimals(excl * (rate / 100));
                        const total = r?.taxInclusive ? e.value : to2Decimals(excl + taxAmount);
                        return (
                          <>
                            <td className="p-3 text-right tabular-nums font-medium">
                              {formatCurrency(excl)}
                            </td>
                            <td className="p-3 text-right tabular-nums text-muted-foreground">
                              <span className="whitespace-nowrap">
                                {formatCurrency(taxAmount)}
                              </span>
                              <span className="ml-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                {r?.taxInclusive ? 'incl.' : 'add.'}
                              </span>
                            </td>
                            <td className="p-3 text-right tabular-nums text-muted-foreground">
                              {formatCurrency(total)}
                            </td>
                          </>
                        );
                      })() : (
                        <td className="p-3 text-right tabular-nums font-medium">
                          {e.value != null ? formatCurrency(e.value) : '—'}
                        </td>
                      )}
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
                      {useSellVatColumns && sellVatRates?.map((rate) => {
                        if (e.value == null) return <td key={rate} className="p-3 text-right tabular-nums text-muted-foreground">—</td>;
                        const excl = e.taxIncluded ? netUnitPriceFromInclusive(e.value, 10) : e.value;
                        const taxAmount = to2Decimals(excl * (rate / 100));
                        return (
                          <td key={rate} className="p-3 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(taxAmount)}
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

const CONDITION_TYPES = [
  { id: "sales_type", name: "Sales" },
  { id: "expense", name: "Expense" },
] as const;

function ItemTaxesSection({
  itemId,
  itemTaxesList,
  loading,
  onRefetch,
  taxVariableOptions,
  salesTypeOptions,
}: {
  itemId: string | undefined;
  itemTaxesList: { id: number; variableId: number; conditionType: string; conditionValues?: string[]; calculationType?: string; priority: number; variableName?: string; variableValue?: number }[];
  loading: boolean;
  onRefetch: () => void;
  taxVariableOptions: { id: number; name: string; value: number }[];
  salesTypeOptions: { id: string; name: string }[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<{ id: number; variableId: number; conditionType: string; conditionValues: string[]; calculationType: string } | null>(null);
  const [applyPending, setApplyPending] = useState(false);
  const [addVariableId, setAddVariableId] = useState<number | "">("");
  const [addConditionType, setAddConditionType] = useState<string>("expense");
  const [addConditionValues, setAddConditionValues] = useState<string[]>([]);
  const [addCalculationType, setAddCalculationType] = useState<string>("inclusive");
  const [addSaving, setAddSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const handleAdd = async () => {
    if (!itemId || addVariableId === "") return;
    setAddSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/item-taxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variableId: addVariableId,
          conditionType: addConditionType,
          conditionValues: addConditionType === "sales_type" ? (addConditionValues.length ? addConditionValues : null) : null,
          calculationType: addCalculationType,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setAddVariableId("");
        setAddConditionType("expense");
        setAddConditionValues([]);
        setAddCalculationType("inclusive");
        onRefetch();
        toast.success("Tax added");
      } else {
        const err = await res.json();
        toast.error(err?.error || "Failed to add");
      }
    } catch {
      toast.error("Failed to add");
    } finally {
      setAddSaving(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!itemId) return;
    try {
      const res = await fetch(`/api/items/${itemId}/item-taxes/${entryId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteId(null);
        onRefetch();
        toast.success("Tax removed");
      } else toast.error("Failed to delete");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const startEdit = (row: { id: number; variableId: number; conditionType: string; conditionValues?: string[]; calculationType?: string }) => {
    setEditRow({
      id: row.id,
      variableId: row.variableId,
      conditionType: row.conditionType,
      conditionValues: row.conditionValues ?? [],
      calculationType: row.calculationType ?? "inclusive",
    });
  };

  const handleUpdate = async () => {
    if (!itemId || !editRow) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/item-taxes/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variableId: editRow.variableId,
          conditionType: editRow.conditionType,
          conditionValues: editRow.conditionType === "sales_type" ? (editRow.conditionValues.length ? editRow.conditionValues : null) : null,
          calculationType: editRow.calculationType,
        }),
      });
      if (res.ok) {
        setEditRow(null);
        onRefetch();
        toast.success("Tax updated");
      } else {
        const err = await res.json();
        toast.error(err?.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setEditSaving(false);
    }
  };

  const handleApplyTaxRules = async () => {
    if (!itemId) return;
    setApplyPending(true);
    try {
      const res = await fetch(`/api/items/${itemId}/apply-tax-rules`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        onRefetch();
        toast.success(`Applied ${data.applied ?? 0} tax rule(s) to this item`);
      } else toast.error(data?.error || "Failed to apply");
    } catch {
      toast.error("Failed to apply tax rules");
    } finally {
      setApplyPending(false);
    }
  };

  if (!itemId) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Item taxes</CardTitle>
            <CardDescription>Taxes applied to this item by context (sales type or expense). Used in sales, expenses, and subscriptions.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleApplyTaxRules} disabled={applyPending}>
              {applyPending ? "Applying…" : "Apply tax rules to this item"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add tax
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : itemTaxesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 px-4 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No taxes assigned</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Add one manually or use &quot;Apply tax rules to this item&quot; to copy from global tax rules.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={handleApplyTaxRules} disabled={applyPending}>
                {applyPending ? "Applying…" : "Apply tax rules"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add tax
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-3">Scope</th>
                  <th className="text-left font-medium p-3">Condition</th>
                  <th className="text-left font-medium p-3">Tax variable</th>
                  <th className="text-right font-medium p-3">Rate</th>
                  <th className="text-left font-medium p-3">Method</th>
                  <th className="text-right font-medium p-3">Priority</th>
                  <th className="w-[100px] text-right" />
                </tr>
              </thead>
              <tbody>
                {itemTaxesList.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 align-middle">
                      <Badge variant="outline" className="inline-flex items-center leading-none">
                        {row.conditionType === "expense" ? "Expense" : "Sales"}
                      </Badge>
                    </td>
                    <td className="p-3 align-middle text-muted-foreground">
                      {row.conditionType === "sales_type" && row.conditionValues?.length
                        ? row.conditionValues
                            .map((v) => salesTypeOptions.find((c) => c.id === v)?.name ?? v)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{row.variableName ?? `Variable #${row.variableId}`}</span>
                      </div>
                    </td>
                    <td className="p-3 align-middle text-right tabular-nums">
                      {row.variableValue != null ? (
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">
                          {row.variableValue}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 align-middle">
                      {row.calculationType === "inclusive" ? (
                        <Badge variant="secondary" className="font-normal">Inclusive</Badge>
                      ) : row.calculationType === "additive" ? (
                        <Badge variant="secondary" className="font-normal">Additive</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 align-middle text-right tabular-nums">
                      <span className="text-muted-foreground">{row.priority}</span>
                    </td>
                    <td className="p-3 align-middle text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => startEdit(row)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add tax to item</DialogTitle>
              <DialogDescription>Assign a tax variable to this item for a condition (e.g. expense or sales type).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Tax variable</Label>
                <select
                  className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={addVariableId}
                  onChange={(e) => setAddVariableId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Select variable</option>
                  {taxVariableOptions.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.value}%)</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Condition type</Label>
                <select
                  className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={addConditionType}
                  onChange={(e) => setAddConditionType(e.target.value)}
                >
                  {CONDITION_TYPES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {addConditionType !== "sales_type" && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  No condition values for Expense. Choose <span className="font-medium">Sales</span> to target specific sales types.
                </p>
              )}
              {addConditionType === "sales_type" && (
                <div>
                  <Label>Sales type</Label>
                  <select
                    className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    multiple
                    value={addConditionValues}
                    onChange={(e) =>
                      setAddConditionValues(Array.from(e.target.selectedOptions).map((o) => o.value))
                    }
                  >
                    {salesTypeOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">Optional. Select one or more; leave empty for all.</p>
                </div>
              )}
              <div>
                <Label>Calculation</Label>
                <select
                  className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={addCalculationType}
                  onChange={(e) => setAddCalculationType(e.target.value)}
                >
                  <option value="inclusive">Inclusive</option>
                  <option value="additive">Additive</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addSaving || addVariableId === ""}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={editRow != null} onOpenChange={(open) => !open && setEditRow(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit tax</DialogTitle>
              <DialogDescription>Change tax variable, condition, or calculation for this item.</DialogDescription>
            </DialogHeader>
            {editRow && (
              <div className="space-y-4 py-4">
                <div>
                  <Label>Tax variable</Label>
                  <select
                    className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editRow.variableId}
                    onChange={(e) => setEditRow((r) => r ? { ...r, variableId: Number(e.target.value) } : null)}
                  >
                    {taxVariableOptions.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.value}%)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Condition type</Label>
                  <select
                    className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editRow.conditionType}
                    onChange={(e) => setEditRow((r) => r ? { ...r, conditionType: e.target.value } : null)}
                  >
                    {CONDITION_TYPES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {editRow.conditionType !== "sales_type" && (
                  <p className="-mt-2 text-xs text-muted-foreground">
                    No condition values for Expense. Choose <span className="font-medium">Sales</span> to target specific sales types.
                  </p>
                )}
                {editRow.conditionType === "sales_type" && (
                  <div>
                    <Label>Sales type</Label>
                    <select
                      className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      multiple
                      value={editRow.conditionValues}
                      onChange={(e) =>
                        setEditRow((r) =>
                          r
                            ? { ...r, conditionValues: Array.from(e.target.selectedOptions).map((o) => o.value) }
                            : null
                        )
                      }
                    >
                      {salesTypeOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Optional. Select one or more; leave empty for all.</p>
                  </div>
                )}
                <div>
                  <Label>Calculation</Label>
                  <select
                    className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editRow.calculationType}
                    onChange={(e) => setEditRow((r) => r ? { ...r, calculationType: e.target.value } : null)}
                  >
                    <option value="inclusive">Inclusive</option>
                    <option value="additive">Additive</option>
                  </select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={editSaving}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ConfirmationDialog
          open={deleteId != null}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={() => deleteId != null && handleDelete(deleteId)}
          title="Remove tax"
          description="Remove this tax assignment from the item?"
          confirmText="Remove"
          cancelText="Cancel"
          isPending={false}
          variant="destructive"
        />
      </CardContent>
    </Card>
  );
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const router = useRouter();
  const { formattingLocale } = useDateFormat();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [linkRecipeOpen, setLinkRecipeOpen] = useState(false);
  const [linkRecipeId, setLinkRecipeId] = useState<number | null>(null);
  const { data: item, isLoading, refetch: refetchItem } = useItemById(resolvedParams?.id || "");
  const { data: recipesListResponse } = useRecipes({ page: 1, limit: 500 });
  const updateRecipe = useUpdateRecipe();
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
    () =>
      Object.fromEntries(
        salesTypeMeta.map((ev: { name: string; label?: string | null }) => [ev.name, ev.label ?? ev.name])
      ),
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
  
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: null as number | null,
    sku: "",
    unitId: null as number | null,
    vendorId: "",
    notes: "",
    isActive: true,
    affectsStock: true,
    produceOnSale: false,
    itemTypes: ["item"] as ItemKind[],
  });
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));

  const [resolvedPrice, setResolvedPrice] = useState<{ unitPrice: number | null; unitCost: number | null; taxIncluded?: boolean; costTaxIncluded?: boolean } | null>(null);
  const [sellHistory, setSellHistory] = useState<PriceHistoryEntry[]>([]);
  const [costHistory, setCostHistory] = useState<PriceHistoryEntry[]>([]);
  const [supplierOrderPrices, setSupplierOrderPrices] = useState<{ id: number; unitPrice: number | null; quantity: number | null; unit: string; orderDate: string | null; orderNumber: string | null }[]>([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [itemTaxesList, setItemTaxesList] = useState<{ id: number; variableId: number; conditionType: string; conditionValues?: string[]; calculationType?: string; priority: number; variableName?: string; variableValue?: number }[]>([]);
  const [itemTaxesLoading, setItemTaxesLoading] = useState(false);
  const [catalogInfo, setCatalogInfo] = useState<ItemCatalogPayload | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const { data: transactionTaxVars = [] } = useVariablesByType("transaction_tax");
  const { data: taxVars = [] } = useVariablesByType("tax");
  const taxVariableOptions = [...(transactionTaxVars as { id: number; name: string; value: number }[]), ...(taxVars as { id: number; name: string; value: number }[])];
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
        setResolvedPrice({ unitPrice: d.unitPrice ?? null, unitCost: d.unitCost ?? null, taxIncluded: d.taxIncluded, costTaxIncluded: d.costTaxIncluded });
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
    if (resolvedParams?.id && item != null && !isEditing) fetchPriceHistory(resolvedParams.id);
  }, [resolvedParams?.id, item, isEditing, fetchPriceHistory]);

  const fetchItemTaxes = useCallback(async (itemId: string) => {
    setItemTaxesLoading(true);
    try {
      const res = await fetch(`/api/items/${itemId}/item-taxes`);
      if (res.ok) setItemTaxesList(await res.json());
      else setItemTaxesList([]);
    } catch {
      setItemTaxesList([]);
    } finally {
      setItemTaxesLoading(false);
    }
  }, []);
  useEffect(() => {
    if (resolvedParams?.id) fetchItemTaxes(resolvedParams.id);
  }, [resolvedParams?.id, fetchItemTaxes]);

  useEffect(() => {
    if (!resolvedParams?.id) return;
    setCatalogLoading(true);
    fetch(`/api/items/${resolvedParams.id}/catalog`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCatalogInfo(d))
      .catch(() => setCatalogInfo(null))
      .finally(() => setCatalogLoading(false));
  }, [resolvedParams?.id]);

  const toggleModifierAffectsStock = useCallback(
    async (supplyItemId: number, next: boolean) => {
      setCatalogInfo((prev) =>
        prev
          ? {
              ...prev,
              modifierLists: prev.modifierLists.map((list) => ({
                ...list,
                modifiers: list.modifiers.map((m) =>
                  m.supplyItemId === supplyItemId ? { ...m, supplyItemAffectsStock: next } : m,
                ),
              })),
            }
          : prev,
      );
      try {
        const res = await fetch(`/api/items/${supplyItemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ affectsStock: next }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success(next ? "Modifier now affects stock" : "Modifier no longer affects stock");
      } catch (err: any) {
        setCatalogInfo((prev) =>
          prev
            ? {
                ...prev,
                modifierLists: prev.modifierLists.map((list) => ({
                  ...list,
                  modifiers: list.modifiers.map((m) =>
                    m.supplyItemId === supplyItemId ? { ...m, supplyItemAffectsStock: !next } : m,
                  ),
                })),
              }
            : prev,
        );
        toast.error(err?.message || "Failed to update modifier");
      }
    },
    [],
  );

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        categoryId: item.categoryId ?? item.category?.id ?? null,
        sku: item.sku || "",
        unitId: item.unitId ?? null,
        vendorId: item.vendorId?.toString() || "",
        notes: item.notes || "",
        isActive: item.isActive,
        affectsStock: item.affectsStock ?? true,
        produceOnSale: item.produceOnSale ?? false,
        itemTypes: item.itemTypes?.length ? item.itemTypes : (["item"] as ItemKind[]),
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
          categoryId: formData.categoryId,
          sku: formData.sku || undefined,
          unitId: formData.unitId ?? undefined,
          vendorId: formData.vendorId ? parseInt(formData.vendorId) : undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
          affectsStock: formData.affectsStock,
          produceOnSale: formData.produceOnSale,
          itemTypes: formData.itemTypes,
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

  const supplierName = item.vendorId && suppliersResponse?.data?.find((s) => s.id === item.vendorId)?.name;

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
              {"instructions" in item && (item as { instructions?: string }).instructions != null && (
                <Badge variant="secondary" className="text-xs">Recipe</Badge>
              )}
              {item.itemTypes?.includes("product") && (
                <Badge variant="secondary" className="text-xs">Product</Badge>
              )}
              {item.itemTypes?.includes("item") && (
                <Badge variant="secondary" className="text-xs">Item</Badge>
              )}
              {item.itemTypes?.includes("modifier") && (
                <Badge variant="secondary" className="text-xs">Modifier</Badge>
              )}
              {item.itemTypes?.includes("ingredient") && (
                <Badge variant="secondary" className="text-xs">Ingredient</Badge>
              )}
              {item.affectsStock === false && (
                <Badge variant="outline" className="text-xs" title="Stock is not tracked for this item">
                  No stock
                </Badge>
              )}
              {item.isCatalogParent && (
                <Badge variant="outline" className="text-xs">Catalog group</Badge>
              )}
              {item.groupId && item.isCanonical && (
                <Badge variant="outline" className="text-xs">
                  Group · {item.groupName}
                </Badge>
              )}
              {item.groupId && !item.isCanonical && (
                <Badge variant="outline" className="text-xs">
                  merged → {item.canonicalItemName}
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

        {!isEditing && item.groupId && !item.isCanonical && item.canonicalItemId && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="text-sm">
                This item is merged into{" "}
                <Link
                  href={`/items/${item.canonicalItemId}`}
                  className="font-semibold underline"
                >
                  {item.canonicalItemName}
                </Link>
                . Combined analytics live on the canonical page. This item keeps its own Square
                sync, price history and stock movements.
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/items/${item.canonicalItemId}`}>Open canonical</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!isEditing && item.groupId && item.isCanonical && (
          <MergedItemsCard groupId={item.groupId} />
        )}

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

                  <div className="space-y-2">
                    <ItemCategorySelector
                      label="Category"
                      selectedId={formData.categoryId}
                      onSelect={(cat) => handleInputChange('categoryId', cat?.id ?? null)}
                      placeholder="Select category"
                    />
                  </div>

                  {/* Types (multi) */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Types</Label>
                    <div className="flex flex-wrap gap-4">
                      {ITEM_KIND_OPTIONS.map(({ id, label }) => (
                        <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={formData.itemTypes.includes(id)}
                            onCheckedChange={() =>
                              setFormData((prev) => ({
                                ...prev,
                                itemTypes: toggleItemKind(prev.itemTypes, id),
                              }))
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
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
                      onCreateNew={() => setAddVendorOpen(true)}
                      placeholder="Select vendor"
                    />
                    <SupplierFormDialog
                      open={addVendorOpen}
                      onOpenChange={setAddVendorOpen}
                      onCreated={(v) => handleInputChange('vendorId', String(v.id))}
                      entityLabel="vendor"
                      defaultSupplierTypes={["vendor"]}
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

                  {/* Affects Stock */}
                  <div className="space-y-1 pt-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="affectsStock"
                        checked={formData.affectsStock}
                        onCheckedChange={(checked) => handleInputChange('affectsStock', checked)}
                      />
                      <Label htmlFor="affectsStock" className="cursor-pointer">
                        Affects stock (deduct on sale)
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      When off, sales and recipe production skip stock movements for this item.
                      Useful for virtual items (e.g. the default milk option).
                    </p>
                  </div>

                  {!item.producedFromRecipeId && (
                    <div className="space-y-1 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="produceOnSale"
                          checked={formData.produceOnSale}
                          onCheckedChange={(checked) => handleInputChange("produceOnSale", checked)}
                        />
                        <Label htmlFor="produceOnSale" className="cursor-pointer">
                          Produced on sale
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        When on, we create a production recipe linked to this SKU (if needed) so sales run
                        through recipe production (ingredient OUT + finished IN, then sale OUT). Add ingredients to
                        that recipe to deduct stock. Ignored when a recipe is already linked.
                      </p>
                    </div>
                  )}
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
                      {item.producibleEstimate != null && (
                        <div className="text-sm mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-800/60 max-w-md">
                          <span className="font-medium text-foreground">
                            ~{item.producibleEstimate} {item.unit || "units"}
                          </span>
                          <span className="text-muted-foreground"> max from ingredients (recipe)</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            Theoretical bottleneck from current ingredient stock; ingredients may be shared with other
                            products.
                          </p>
                        </div>
                      )}
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
              <div className="grid grid-cols-2 gap-4">
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
                <TabsList className="grid w-full max-w-2xl grid-cols-4">
                  <TabsTrigger value="movements">Movements</TabsTrigger>
                  <TabsTrigger value="price">Price</TabsTrigger>
                  <TabsTrigger value="cost">Cost</TabsTrigger>
                  <TabsTrigger value="taxes">Taxes</TabsTrigger>
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
                              tickFormatter={(value) => new Date(value).toLocaleDateString(formattingLocale, { month: 'short', day: 'numeric' })}
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis style={{ fontSize: '12px' }} />
                            <Tooltip 
                              formatter={(value: number) => value.toFixed(2)}
                              labelFormatter={(value) => new Date(value).toLocaleDateString(formattingLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
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
            sellVatRates={[5.5, 10]}
            addLabel="Add"
            valueLabel="Price"
            emptyMessage="Track selling prices by effective date."
          />
        )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="taxes" className="mt-4 space-y-4">
                  <ItemTaxesSection
                    itemId={resolvedParams?.id}
                    itemTaxesList={itemTaxesList}
                    loading={itemTaxesLoading}
                    onRefetch={() => resolvedParams?.id && fetchItemTaxes(resolvedParams.id)}
                    taxVariableOptions={taxVariableOptions}
                    salesTypeOptions={salesTypeMeta.map((s: { name: string; label?: string | null }) => ({ id: s.name, name: s.label ?? s.name }))}
                  />
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

            <div className="lg:col-span-4 space-y-6">
              <Card>
                <Tabs defaultValue="item-data" className="w-full">
                  <CardHeader className="pb-3">
                    <TabsList className="grid w-full grid-cols-3 h-auto gap-1 p-1">
                      <TabsTrigger value="item-data" className="text-xs px-1.5 py-2">
                        Item data
                      </TabsTrigger>
                      <TabsTrigger value="square-catalog" className="text-xs px-1.5 py-2">
                        Square variation
                      </TabsTrigger>
                      <TabsTrigger value="modifiers" className="text-xs px-1.5 py-2">
                        Modifiers
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="item-data" className="mt-0 space-y-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Name</label>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusPin active={item.isActive} title={item.isActive ? "Active" : "Inactive"} />
                          <p className="text-base font-semibold">{item.name}</p>
                        </div>
                      </div>

                      {item.sku && (
                        <>
                          <Separator />
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">SKU</label>
                            <p className="text-sm mt-1 font-mono">{item.sku}</p>
                          </div>
                        </>
                      )}

                      {item.category && (
                        <>
                          <Separator />
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Category</label>
                            <p className="text-sm mt-1">{item.category.label ?? item.category.name}</p>
                          </div>
                        </>
                      )}

                      {item.unit && (
                        <>
                          <Separator />
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Unit</label>
                            <p className="text-sm mt-1">{item.unit}</p>
                          </div>
                        </>
                      )}

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

                      {item.itemTypes?.includes("product") && !item.isCatalogParent && !isEditing && (
                        <>
                          <Separator />
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Recipe output</label>
                            <div className="mt-2 flex flex-col gap-2">
                              {item.producedFromRecipeId ? (
                                <>
                                  <Link href={`/recipes/${item.producedFromRecipeId}`} className="w-full">
                                    <Button variant="outline" size="sm" className="w-full">
                                      View recipe
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    disabled={updateRecipe.isPending}
                                    onClick={async () => {
                                      const rid = item.producedFromRecipeId;
                                      if (!rid || !item.id) return;
                                      try {
                                        const recipe = await recipesApi.getById(String(rid));
                                        const currentIds =
                                          (recipe as { producedItems?: { id: number }[] }).producedItems?.map(
                                            (p) => p.id
                                          ) ?? [];
                                        const nextIds = currentIds.filter((id) => id !== item.id);
                                        await updateRecipe.mutateAsync({
                                          id: String(rid),
                                          data: { producedItemIds: nextIds },
                                        });
                                        await refetchItem();
                                        toast.success("Unlinked from recipe");
                                      } catch (e: unknown) {
                                        toast.error(e instanceof Error ? e.message : "Failed to unlink");
                                      }
                                    }}
                                  >
                                    Unlink from recipe
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link href={`/recipes/create?producedItemId=${item.id}`}>Create recipe</Link>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      setLinkRecipeId(null);
                                      setLinkRecipeOpen(true);
                                    }}
                                  >
                                    <Link2 className="mr-2 h-4 w-4" />
                                    Link existing recipe
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(item.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">Updated:</span> {formatDate(item.updatedAt)}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="square-catalog" className="mt-0 space-y-4">
                      {catalogLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                      ) : (
                        <>
                          {catalogInfo?.parentItem && (
                            <div>
                              <p className="text-sm font-medium mb-2">Parent catalog group</p>
                              <Link
                                href={`/items/${catalogInfo.parentItem.id}`}
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {catalogInfo.parentItem.name}
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                              {catalogInfo.variantMeta?.nameSnapshot && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Variation: {catalogInfo.variantMeta.nameSnapshot}
                                </p>
                              )}
                            </div>
                          )}

                          {item.isCatalogParent && (catalogInfo?.variations?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Variants (sellable SKUs)</p>
                              <p className="text-xs text-muted-foreground mb-2">
                                Selling price and history apply to each variant, not this group row.
                              </p>
                              <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="text-left p-2 font-medium">Name</th>
                                      <th className="text-left p-2 font-medium">SKU</th>
                                      <th className="text-right p-2 font-medium w-[100px]">Open</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {catalogInfo!.variations.map((v) => (
                                      <tr key={v.id} className="border-b last:border-0">
                                        <td className="p-2">{v.name}</td>
                                        <td className="p-2 font-mono text-muted-foreground">{v.sku || "—"}</td>
                                        <td className="p-2 text-right">
                                          <Link href={`/items/${v.variantItemId}`}>
                                            <Button variant="ghost" size="sm" className="h-8">
                                              View
                                            </Button>
                                          </Link>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {!catalogInfo?.parentItem &&
                            !(item.isCatalogParent && (catalogInfo?.variations?.length ?? 0) > 0) && (
                              <p className="text-sm text-muted-foreground">
                                {item.isCatalogParent &&
                                (catalogInfo?.variations?.length ?? 0) === 0
                                  ? "No linked variants in the catalog for this group yet."
                                  : "No Square catalog parent or variation link for this item."}
                              </p>
                            )}
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="modifiers" className="mt-0 space-y-4">
                      {catalogLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                      ) : (catalogInfo?.modifierLists?.length ?? 0) > 0 ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium">Modifier lists</p>
                            {catalogInfo?.modifierListsSourceItemId != null &&
                              catalogInfo.modifierListsSourceItemId !== item.id && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  From parent catalog group (item #{catalogInfo.modifierListsSourceItemId})
                                </p>
                              )}
                          </div>
                          {catalogInfo!.modifierLists.map((list) => (
                            <div key={list.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                              <div className="flex flex-wrap items-center gap-2 justify-between">
                                <span className="font-medium">{list.name || `List #${list.id}`}</span>
                                <div className="flex gap-1 flex-wrap">
                                  {list.selectionType && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                      {list.selectionType}
                                    </Badge>
                                  )}
                                  {!list.enabled && (
                                    <Badge variant="outline" className="text-xs">
                                      Disabled
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {(() => {
                                const usages = catalogInfo?.modifierListUsageByRecipe?.[list.id] ?? [];
                                if (usages.length === 0) return null;
                                return (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Used by:</span>
                                    {usages.map((u) => (
                                      <Link
                                        key={u.recipeId}
                                        href={`/recipes/${u.recipeId}`}
                                        className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-accent"
                                      >
                                        <span>{u.recipeName}</span>
                                        {u.modifierCount > 1 && (
                                          <span className="text-muted-foreground">· {u.modifierCount}</span>
                                        )}
                                      </Link>
                                    ))}
                                  </div>
                                );
                              })()}
                              <ul className="text-sm space-y-1.5 pl-0 list-none">
                                {list.modifiers.map((m) => (
                                  <li
                                    key={m.id}
                                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 last:border-0 pb-1.5 last:pb-0"
                                  >
                                    <span className="inline-flex items-center gap-2">
                                      {m.supplyItemId != null && (
                                        <TooltipProvider>
                                          <UiTooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex items-center">
                                                <Checkbox
                                                  checked={m.supplyItemAffectsStock}
                                                  onCheckedChange={(checked) =>
                                                    toggleModifierAffectsStock(m.supplyItemId!, checked === true)
                                                  }
                                                  aria-label="Affects stock"
                                                />
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Affects stock</TooltipContent>
                                          </UiTooltip>
                                        </TooltipProvider>
                                      )}
                                      {m.name || "—"}
                                      {m.supplyItemId != null && (
                                        <span className="text-muted-foreground text-xs ml-2">
                                          →{" "}
                                          <Link
                                            href={`/items/${m.supplyItemId}`}
                                            className="text-primary hover:underline"
                                          >
                                            {m.supplyItemName || "item"}
                                          </Link>
                                        </span>
                                      )}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-muted-foreground tabular-nums text-xs">
                                        {m.priceAmountCents != null
                                          ? formatCurrency(m.priceAmountCents / 100)
                                          : "—"}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No modifier lists in the catalog for this item.
                        </p>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Selling price (today)</CardTitle>
                    {item.isCatalogParent && (
                      <p className="text-xs text-muted-foreground font-normal pt-1">
                        Use each variant&apos;s page for sell price and history.
                      </p>
                    )}
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
                          <p className="text-xl font-semibold tabular-nums">
                            {formatCurrency(inclPrice)}{" "}
                            <span className="text-xs font-normal text-muted-foreground">(incl. tax)</span>
                          </p>
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
                    <CardTitle
                      className="text-sm font-medium text-muted-foreground"
                      title="Weighted average of current stock; updated when supplier orders are received"
                    >
                      Buying price (today)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {(() => {
                      const raw = (resolvedPrice?.unitCost ?? item.unitCost) ?? null;
                      const rate = applicableTaxes?.expense?.rate ?? 0;
                      const costTaxIncludedFlag = resolvedPrice?.costTaxIncluded;
                      const ruleTaxInclusiveFlag = applicableTaxes?.expense?.taxInclusive;
                      const costIncl =
                        costTaxIncludedFlag != null ? costTaxIncludedFlag : ruleTaxInclusiveFlag === true;

                      if (raw == null) return <p className="text-2xl font-semibold tabular-nums">—</p>;

                      if (rate <= 0) {
                        return (
                          <p className="text-xl font-semibold tabular-nums">
                            {formatCurrency(raw)}{" "}
                            <span className="text-xs font-normal text-muted-foreground">(no tax)</span>
                          </p>
                        );
                      }

                      const exclPrice = costIncl ? netUnitPriceFromInclusive(raw, rate) : raw;
                      const inclPrice = costIncl ? raw : unitPriceExclToIncl(raw, rate);

                      return (
                        <>
                          <p className="text-xl font-semibold tabular-nums">
                            {formatCurrency(inclPrice)}{" "}
                            <span className="text-xs font-normal text-muted-foreground">(incl. tax)</span>
                          </p>
                          {exclPrice != null && (
                            <div className="text-sm text-muted-foreground tabular-nums space-y-0.5">
                              <p>{formatCurrency(exclPrice)} excl. tax</p>
                              <p>{formatCurrency(to2Decimals(inclPrice - exclPrice))} tax</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
        <Dialog
          open={linkRecipeOpen}
          onOpenChange={(open) => {
            setLinkRecipeOpen(open);
            if (!open) setLinkRecipeId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link to recipe</DialogTitle>
              <DialogDescription>
                This product will be added as an output of the recipe you select.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <UnifiedSelector
                label="Recipe"
                type="recipe"
                items={(recipesListResponse?.data ?? []).map((r) => ({
                  id: r.id,
                  name: r.name,
                }))}
                selectedId={linkRecipeId ?? undefined}
                onSelect={(sel) => setLinkRecipeId(sel.id === 0 ? null : Number(sel.id))}
                placeholder="Select recipe"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkRecipeOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!linkRecipeId || !item?.id || updateRecipe.isPending}
                onClick={async () => {
                  if (!linkRecipeId || !item?.id) return;
                  try {
                    const recipe = await recipesApi.getById(String(linkRecipeId));
                    const currentIds =
                      (recipe as { producedItems?: { id: number }[] }).producedItems?.map((p) => p.id) ?? [];
                    if (currentIds.includes(item.id)) {
                      toast.error("Already linked to this recipe");
                      return;
                    }
                    await updateRecipe.mutateAsync({
                      id: String(linkRecipeId),
                      data: { producedItemIds: [...currentIds, item.id] },
                    });
                    await refetchItem();
                    setLinkRecipeOpen(false);
                    setLinkRecipeId(null);
                    toast.success("Linked to recipe");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Failed to link");
                  }
                }}
              >
                Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

