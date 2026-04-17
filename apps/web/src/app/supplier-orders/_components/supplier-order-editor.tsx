"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { UnifiedSelector } from "@/components/unified-selector";
import { InputGroupAttached } from "@/components/input-group";
import { CreateItemMultiStepDialog } from "@/components/create-item-multistep-dialog";
import { AddSupplierDialog } from "@/components/add-supplier-dialog";
import { useInventorySuppliers, useItems, useUnits, useVariablesByType } from "@kit/hooks";
import { dateToYYYYMMDD, taxRulesApi } from "@kit/lib";
import { formatCurrency } from "@kit/lib/config";
import { toast } from "sonner";
import type { CreateSupplierOrderData, SupplierOrder, SupplierOrderItem, UpdateSupplierOrderData } from "@kit/types";
import { SupplierOrderStatus } from "@kit/types";
import { lineTaxAmount, to2Decimals } from "@/lib/transaction-tax";

type OrderEditorItem = {
  id?: number;
  itemId: number;
  quantity: number;
  unit: string;
  unitId?: number;
  unitPrice: number;
  taxVariableId?: number | "auto";
  taxRatePercent?: number;
  taxInclusive?: boolean;
  notes?: string;
};

type OrderEditorState = {
  supplierId: number | null;
  orderNumber: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: SupplierOrderStatus;
  notes: string;
  items: OrderEditorItem[];
};

export function supplierOrderStateFromOrder(order: SupplierOrder): OrderEditorState {
  return {
    supplierId: order.supplierId ?? null,
    orderNumber: order.orderNumber ?? "",
    orderDate: order.orderDate ?? "",
    expectedDeliveryDate: order.expectedDeliveryDate ?? "",
    status: order.status ?? SupplierOrderStatus.PENDING,
    notes: order.notes ?? "",
    items: (order.items ?? []).map((it: SupplierOrderItem) => ({
      id: it.id,
      itemId: it.itemId ?? 0,
      quantity: it.quantity ?? 0,
      unit: it.unit ?? it.item?.unit ?? "",
      unitId: it.unitId ?? it.item?.unitId ?? undefined,
      unitPrice: it.unitPrice ?? 0,
      taxRatePercent: it.taxRatePercent,
      taxInclusive: (it as SupplierOrderItem & { taxInclusive?: boolean }).taxInclusive,
      notes: it.notes ?? "",
    })),
  };
}

export function supplierOrderStateToCreatePayload(state: OrderEditorState, defaultTaxRatePercent: number): CreateSupplierOrderData {
  return {
    supplierId: state.supplierId ?? 0,
    orderNumber: state.orderNumber || undefined,
    orderDate: state.orderDate || undefined,
    expectedDeliveryDate: state.expectedDeliveryDate || undefined,
    status: state.status,
    notes: state.notes || undefined,
    items: state.items.map((it) => ({
      itemId: it.itemId,
      quantity: it.quantity,
      unit: it.unit,
      unitId: it.unitId,
      unitPrice: it.unitPrice,
      taxRatePercent: it.taxRatePercent ?? defaultTaxRatePercent,
      taxInclusive: it.taxInclusive,
      notes: it.notes || undefined,
    })),
  };
}

export function supplierOrderStateToUpdatePayload(state: OrderEditorState, defaultTaxRatePercent: number): UpdateSupplierOrderData {
  return {
    supplierId: state.supplierId ?? undefined,
    orderNumber: state.orderNumber || undefined,
    orderDate: state.orderDate || undefined,
    expectedDeliveryDate: state.expectedDeliveryDate || undefined,
    status: state.status,
    notes: state.notes || undefined,
    items: state.items.map((it) => ({
      id: it.id,
      itemId: it.itemId,
      quantity: it.quantity,
      unit: it.unit,
      unitId: it.unitId,
      unitPrice: it.unitPrice,
      taxRatePercent: it.taxRatePercent ?? defaultTaxRatePercent,
      taxInclusive: it.taxInclusive,
      notes: it.notes || undefined,
    })),
  };
}

export type SupplierOrderEditorSubmit =
  | { kind: "create"; data: CreateSupplierOrderData }
  | { kind: "update"; data: UpdateSupplierOrderData };

export function SupplierOrderEditor(props: {
  mode: "create" | "edit";
  initialOrder?: SupplierOrder;
  onCancel?: () => void;
  onSubmit: (payload: SupplierOrderEditorSubmit) => Promise<void> | void;
  submitLabel?: string;
  className?: string;
}) {
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const { data: itemsResponse } = useItems({ limit: 1000 });
  const { data: unitsResponse } = useUnits();
  const { data: transactionTaxVariables = [] } = useVariablesByType("transaction_tax");
  const suppliers = suppliersResponse?.data ?? [];
  const allItems = itemsResponse?.data ?? [];
  const units = unitsResponse ?? [];

  const defaultTaxRate = 0;
  const prefillSeq = useRef(0);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createItemTargetIdx, setCreateItemTargetIdx] = useState<number | null>(null);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);

  const [state, setState] = useState<OrderEditorState>(() => {
    if (props.initialOrder) return supplierOrderStateFromOrder(props.initialOrder);
    return {
      supplierId: null,
      orderNumber: "",
      orderDate: dateToYYYYMMDD(new Date()),
      expectedDeliveryDate: "",
      status: SupplierOrderStatus.PENDING,
      notes: "",
      items: [],
    };
  });

  const lineErrors = useMemo(() => {
    return state.items.map((it) => {
      if (!it.itemId) return { ok: false, message: "Item is required" };
      if (it.quantity <= 0) return { ok: false, message: "Quantity must be > 0" };
      if (it.unitPrice < 0) return { ok: false, message: "Unit price must be >= 0" };
      if (!it.unit) return { ok: false, message: "Unit is required" };
      return { ok: true, message: "" };
    });
  }, [state.items]);

  const isOrderValid = useMemo(() => {
    if (!state.supplierId) return false;
    if (state.items.length === 0) return false;
    return lineErrors.every((e) => e.ok);
  }, [state.supplierId, state.items.length, lineErrors]);

  const autoTaxSignature = useMemo(() => {
    return state.items
      .filter((it) => it.taxVariableId === "auto" && !!it.itemId)
      .map((it) => String(it.itemId))
      .sort()
      .join("|");
  }, [state.items]);

  useEffect(() => {
    if (!props.initialOrder) return;
    setState(supplierOrderStateFromOrder(props.initialOrder));
  }, [props.initialOrder]);

  // Only keep "Auto (rules)" in sync with the currently selected order date.
  useEffect(() => {
    if (!state.orderDate) return;
    const autoItems = state.items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => it.taxVariableId === "auto" && !!it.itemId);
    if (autoItems.length === 0) return;

    Promise.all(
      autoItems.map(({ it, idx }) => {
        const item = allItems.find((x: any) => x.id === it.itemId);
        return taxRulesApi
          .resolve({
            context: "expense",
            date: state.orderDate,
            itemId: it.itemId,
            itemCategory: item?.category?.name ?? undefined,
          })
          .then((r) => ({ idx, r }))
          .catch(() => null);
      })
    ).then((results) => {
      setState((s) => {
        let changed = false;
        const next = [...s.items];
        for (const res of results) {
          if (!res) continue;
          const cur = next[res.idx];
          if (!cur || cur.taxVariableId !== "auto") continue;
          const nextRate = res.r.rate;
          const nextInclusive = res.r.taxInclusive ?? false;
          if (
            (cur.taxRatePercent ?? 0) === nextRate &&
            (cur.taxInclusive ?? false) === nextInclusive
          ) {
            continue;
          }
          changed = true;
          next[res.idx] = { ...cur, taxRatePercent: nextRate, taxInclusive: nextInclusive };
        }
        return changed ? { ...s, items: next } : s;
      });
    });
  }, [state.orderDate, autoTaxSignature, allItems]);

  const totals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    for (const it of state.items) {
      const rate = it.taxRatePercent ?? defaultTaxRate;
      const inclusive = it.taxInclusive ?? false;
      const { lineTotalNet, taxAmount } = lineTaxAmount(it.quantity, it.unitPrice, rate, inclusive);
      sub += lineTotalNet;
      tax += taxAmount;
    }
    return {
      subtotal: to2Decimals(sub),
      tax: to2Decimals(tax),
      total: to2Decimals(sub + tax),
    };
  }, [state.items, defaultTaxRate]);

  const taxBreakdown = useMemo(() => {
    const map = new Map<string, { rate: number; inclusive: boolean; tax: number }>();
    for (const it of state.items) {
      const rate = it.taxRatePercent ?? defaultTaxRate;
      const inclusive = it.taxInclusive ?? false;
      const { taxAmount } = lineTaxAmount(it.quantity, it.unitPrice, rate, inclusive);
      if (taxAmount <= 0 && rate <= 0) continue;

      const key = `${rate}|${inclusive ? 1 : 0}`;
      const prev = map.get(key);
      map.set(key, {
        rate,
        inclusive,
        tax: (prev?.tax ?? 0) + taxAmount,
      });
    }

    return Array.from(map.values())
      .map((v) => ({ ...v, tax: to2Decimals(v.tax) }))
      .sort((a, b) => b.rate - a.rate || Number(b.inclusive) - Number(a.inclusive));
  }, [state.items, defaultTaxRate]);

  const addItem = () => {
    setState((s) => ({
      ...s,
      items: [...s.items, { itemId: 0, quantity: 0, unit: "", unitPrice: 0, taxInclusive: false }],
    }));
  };

  const removeItem = (idx: number) => {
    setState((s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx: number, patch: Partial<OrderEditorItem>) => {
    setState((s) => {
      const items = [...s.items];
      const current = items[idx];
      const next = { ...current, ...patch };

      if (patch.itemId != null) {
        const selected = allItems.find((i) => i.id === patch.itemId);
        if (selected) {
          if (!next.unit) next.unit = selected.unit || "";
          if (next.unitId == null && selected.unitId != null) next.unitId = selected.unitId;

          // If the line has no explicit tax yet, prefill it using tax rules.
          // This relies on the existing effect that resolves `taxVariableId === "auto"`.
          if (current.taxVariableId == null && current.taxRatePercent == null) {
            next.taxVariableId = "auto";
          }
        }
      }

      if (patch.unitId != null) {
        const selectedUnit = units.find((u: any) => u.id === patch.unitId);
        if (selectedUnit) next.unit = selectedUnit.symbol || selectedUnit.name || next.unit || "";
      }

      items[idx] = next;
      return { ...s, items };
    });

    if (patch.itemId != null && patch.itemId) {
      const seq = ++prefillSeq.current;
      fetch(`/api/items/${patch.itemId}/supplier-order-prices`)
        .then((r) => (r.ok ? r.json() : null))
        .then((list: any) => {
          if (!Array.isArray(list) || list.length === 0) return;
          const latest = list[0];
          const unitPrice = latest?.unitPrice != null ? Number(latest.unitPrice) : NaN;
          const unit = typeof latest?.unit === "string" ? latest.unit : "";
          if (!Number.isFinite(unitPrice)) return;
          setState((s) => {
            if (seq !== prefillSeq.current) return s;
            const items = [...s.items];
            const cur = items[idx];
            if (!cur || cur.itemId !== patch.itemId) return s;
            if (cur.unitPrice > 0) return s;
            const next = { ...cur, unitPrice };
            if (!next.unit && unit) next.unit = unit;
            items[idx] = next;
            return { ...s, items };
          });
        })
        .catch(() => {});
    }
  };

  const submit = async () => {
    if (!state.supplierId) return;
    if (state.items.length === 0) return;
    if (!isOrderValid) {
      const first = lineErrors.find((e) => !e.ok);
      toast.error(first?.message ?? "Please complete the order form");
      return;
    }

    if (props.mode === "create") {
      await props.onSubmit({ kind: "create", data: supplierOrderStateToCreatePayload(state, defaultTaxRate) });
      return;
    }
    await props.onSubmit({ kind: "update", data: supplierOrderStateToUpdatePayload(state, defaultTaxRate) });
  };

  return (
    <div className={props.className}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Order information</CardTitle>
              <CardDescription>Header fields for this supplier order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <UnifiedSelector
                    label="Supplier"
                    required
                    type="supplier"
                    items={suppliers.filter((s) => s.isActive)}
                    selectedId={state.supplierId ?? undefined}
                    onSelect={(item) =>
                      setState((s) => ({ ...s, supplierId: item.id === 0 ? null : Number(item.id) }))
                    }
                    onCreateNew={() => setAddSupplierOpen(true)}
                    placeholder="Select supplier"
                  />
                </div>

                <div>
                  <Label htmlFor="orderNumber">Order number</Label>
                  <Input
                    id="orderNumber"
                    value={state.orderNumber}
                    onChange={(e) => setState((s) => ({ ...s, orderNumber: e.target.value }))}
                    placeholder="PO-2026-001"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={state.status}
                    onValueChange={(v) => setState((s) => ({ ...s, status: v as SupplierOrderStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(SupplierOrderStatus).map((st) => (
                        <SelectItem key={st} value={st}>
                          {st.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Order date</Label>
                  <DatePicker
                    value={state.orderDate ? new Date(state.orderDate) : undefined}
                    onChange={(d) => setState((s) => ({ ...s, orderDate: d ? dateToYYYYMMDD(d) : "" }))}
                    placeholder="Pick a date"
                  />
                </div>

                <div>
                  <Label>Expected delivery</Label>
                  <DatePicker
                    value={state.expectedDeliveryDate ? new Date(state.expectedDeliveryDate) : undefined}
                    onChange={(d) =>
                      setState((s) => ({ ...s, expectedDeliveryDate: d ? dateToYYYYMMDD(d) : "" }))
                    }
                    placeholder="Pick a date"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={state.notes}
                    onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Optional notes"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 min-w-0">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Totals</CardTitle>
              <CardDescription>Computed from your line items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-sm tabular-nums">{formatCurrency(totals.subtotal)}</div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-sm text-muted-foreground">Tax</div>
                <div className="text-sm tabular-nums">{formatCurrency(totals.tax)}</div>
              </div>
              {taxBreakdown.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {taxBreakdown.map((t) => (
                    <div key={`${t.rate}-${t.inclusive ? "incl" : "excl"}`} className="flex items-baseline justify-between">
                      <div className="text-xs text-muted-foreground">
                        Tax {t.rate}% {t.inclusive ? "incl" : "excl"}
                      </div>
                      <div className="text-xs tabular-nums">{formatCurrency(t.tax)}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 pt-3 border-t flex items-baseline justify-between">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold tabular-nums">{formatCurrency(totals.total)}</div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Default tax rate (by date): <span className="tabular-nums">{defaultTaxRate}%</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {props.onCancel ? (
              <Button type="button" variant="outline" onClick={props.onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={submit}
                disabled={!isOrderValid}
            >
              {props.submitLabel ?? (props.mode === "create" ? "Create order" : "Save changes")}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 min-w-0">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Line items</CardTitle>
                <CardDescription>Add items, quantities, and pricing</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <div className="min-w-[980px] w-full">
                <div className="grid grid-cols-[280px_100px_160px_140px_120px_110px_120px_48px] gap-3 px-2 pb-2 text-xs text-muted-foreground">
                  <div>Item</div>
                  <div className="text-right">Qty</div>
                  <div>Unit</div>
                  <div className="text-right">Unit price</div>
                  <div className="text-right">Tax %</div>
                  <div className="text-center">Tax incl</div>
                  <div className="text-right">Line total</div>
                  <div />
                </div>

                <div className="divide-y rounded-lg border">
                  {state.items.length === 0 ? (
                    <div className="px-4 py-8 text-sm text-muted-foreground">No items yet.</div>
                  ) : (
                    state.items.map((it, idx) => {
                      const rate = it.taxRatePercent ?? defaultTaxRate;
                      const inclusive = it.taxInclusive ?? false;
                      const { lineTotalNet, taxAmount } = lineTaxAmount(it.quantity, it.unitPrice, rate, inclusive);
                      const lineTotal = lineTotalNet + taxAmount;
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-[280px_100px_160px_140px_120px_110px_120px_48px] gap-3 p-3 items-center"
                        >
                          <div>
                            <UnifiedSelector
                              label=""
                              required
                              type="item"
                              items={allItems
                                .filter((i) => i.isActive && i.itemTypes?.includes("item"))
                                .map((item) => ({ ...item, id: item.id, name: `${item.name} (${item.unit})` }))}
                              selectedId={it.itemId || undefined}
                              onSelect={(sel) => updateItem(idx, { itemId: sel.id === 0 ? 0 : Number(sel.id) })}
                              onCreateNew={() => {
                                setCreateItemTargetIdx(idx);
                                setCreateItemOpen(true);
                              }}
                              placeholder="Select item"
                            />
                          </div>

                          <div>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="text-right tabular-nums h-10"
                              value={it.quantity || ""}
                              onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <Select
                              value={it.unitId != null ? String(it.unitId) : ""}
                              onValueChange={(v) => updateItem(idx, { unitId: v ? Number(v) : undefined })}
                            >
                              <SelectTrigger
                                className={`h-10 ${!it.unit ? "border-destructive" : ""}`}
                              >
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map((u: any) => (
                                  <SelectItem key={u.id} value={String(u.id)}>
                                    {u.symbol ? `${u.name} (${u.symbol})` : u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="text-right tabular-nums h-10"
                              value={it.unitPrice || ""}
                              onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <UnifiedSelector
                              label=""
                              type="tax"
                              items={[
                                { id: "auto", name: "Auto (rules)" },
                                ...(transactionTaxVariables as any[]).map((v) => ({
                                  ...v,
                                  id: v.id,
                                  // Show the variable's own value (not a date-effective resolver).
                                  name: `${v.name} (${v.value}%)`,
                                })),
                              ]}
                              selectedId={it.taxVariableId ?? undefined}
                              selectedDisplayName={it.taxVariableId === "auto" ? "Auto (rules)" : undefined}
                              onSelect={(sel) => {
                                if (sel.id === 0) {
                                  updateItem(idx, { taxVariableId: undefined, taxRatePercent: undefined });
                                  return;
                                }
                                if (sel.id === "auto") {
                                  taxRulesApi
                                    .resolve({
                                      context: "expense",
                                      date: state.orderDate || undefined,
                                      itemId: it.itemId || undefined,
                                      itemCategory: allItems.find((x: any) => x.id === it.itemId)?.category?.name ?? undefined,
                                    })
                                    .then((r) => {
                                      updateItem(idx, {
                                        taxVariableId: "auto",
                                        taxRatePercent: r.rate,
                                        taxInclusive: r.taxInclusive ?? false,
                                      });
                                    })
                                    .catch(() => {});
                                  return;
                                }
                                const v = sel as any;
                                const rate = typeof v?.value === "number" ? v.value : parseFloat(String(v?.value ?? "0")) || 0;
                                const calc = (v?.payload as any)?.calculationType;
                                updateItem(idx, {
                                  taxVariableId: typeof v.id === "number" ? v.id : undefined,
                                  taxRatePercent: rate,
                                  taxInclusive: calc === "inclusive",
                                });
                              }}
                              placeholder="Tax"
                            />
                          </div>

                          <div className="flex justify-center">
                            <Checkbox
                              checked={inclusive}
                              onCheckedChange={(v) => updateItem(idx, { taxInclusive: v === true })}
                            />
                          </div>

                          <div className="text-right tabular-nums text-sm">
                            <div className="flex items-center justify-end h-10">
                              {formatCurrency(lineTotal)}
                            </div>
                            {taxAmount > 0 || (it.taxRatePercent ?? defaultTaxRate) > 0 ? (
                              <div className="text-[11px] text-muted-foreground">
                                Tax {formatCurrency(taxAmount)} ({rate}%){inclusive ? " incl." : " excl."}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateItemMultiStepDialog
        open={createItemOpen}
        onOpenChange={(open) => {
          setCreateItemOpen(open);
          if (!open) setCreateItemTargetIdx(null);
        }}
        defaultItemTypes={["item"]}
        onCreated={(created) => {
          const idx = createItemTargetIdx;
          if (idx == null) return;
          updateItem(idx, {
            itemId: created.id,
            unitId: created.unitId ?? undefined,
            unit: created.unit ?? "",
          });
        }}
      />

      <AddSupplierDialog
        open={addSupplierOpen}
        onOpenChange={setAddSupplierOpen}
        onCreated={(created) => {
          setState((s) => ({ ...s, supplierId: created.id }));
        }}
        supplierTypes={["supplier"]}
      />
    </div>
  );
}

