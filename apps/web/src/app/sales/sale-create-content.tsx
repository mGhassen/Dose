"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { DatePicker } from "@kit/ui/date-picker";
import { TimePicker } from "@kit/ui/time-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { InputGroupAttached } from "@/components/input-group";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { useCreateSale, useItems, useUnits, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import type { SalesType } from "@kit/types";
import type { SaleLineItemInput } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";
import { formatCurrency } from "@kit/lib/config";

export interface SaleCreateContentProps {
  onClose: () => void;
  onCreated?: (saleId: number) => void;
}

import { lineTaxAmount, to2Decimals, netUnitPriceFromInclusive, unitPriceExclToIncl } from "@/lib/transaction-tax";
import { taxRulesApi } from "@kit/lib";
import { createSaleTransactionSchema } from "@/shared/zod-schemas";
import {
  DocumentPaymentSlicesEditor,
  defaultPaymentSliceRows,
  rowsToPaymentSlices,
  type DocumentPaymentSliceRow,
} from "@/components/document-payment-slices-editor";
import { paymentSlicesSumMatchesTotal } from "@/lib/ledger/replace-entry-payments";

export function SaleCreateContent({ onClose, onCreated }: SaleCreateContentProps) {
  const router = useRouter();
  const createSale = useCreateSale();
  const { data: itemsResponse } = useItems({ limit: 2500, includeRecipes: true });
  const items = itemsResponse?.data ?? [];
  const { data: modifierItemsResponse } = useItems({ limit: 500, itemType: "modifier" });
  const modifierItems = modifierItemsResponse?.data ?? [];
  const { data: unitsData } = useUnits();
  const unitItems = (unitsData || []).map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }));
  const { data: salesTypeValues = [] } = useMetadataEnum("SalesType");
  const typeOptions = salesTypeValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));

  const now = new Date();
  const [formData, setFormData] = useState({
    date: dateToYYYYMMDD(now),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    type: "" as SalesType | "",
    description: "",
    discountType: "amount" as "amount" | "percent",
    discountValue: "",
  });

  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  useEffect(() => {
    if (!formData.type || !formData.date) {
      setDefaultTaxRate(0);
      return;
    }
    taxRulesApi.resolve({ context: 'sale', salesType: formData.type, date: formData.date }).then((r) => setDefaultTaxRate(r.rate)).catch(() => setDefaultTaxRate(0));
  }, [formData.type, formData.date]);

  type ModifierLine = {
    itemId: string;
    unitPrice: string;
    unitCost: string;
    taxRatePercent: string;
    taxInclusive: boolean;
    taxVariableName?: string;
    taxConditionType?: string;
    taxConditionValue?: string;
  };
  type LineItem = {
    itemId: string;
    quantity: string;
    unitId: number | null;
    unitPrice: string;
    unitCost: string;
    taxRatePercent: string;
    taxInclusive: boolean;
    taxVariableName?: string;
    taxConditionType?: string;
    taxConditionValue?: string;
    modifiers: ModifierLine[];
  };
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      itemId: "",
      quantity: "1",
      unitId: null,
      unitPrice: "",
      unitCost: "",
      taxRatePercent: "",
      taxInclusive: false,
      modifiers: [],
    },
  ]);
  const [paymentRows, setPaymentRows] = useState<DocumentPaymentSliceRow[]>(() =>
    defaultPaymentSliceRows(0, dateToYYYYMMDD(now))
  );
  const lineItemsRef = useRef(lineItems);
  lineItemsRef.current = lineItems;

  const hasAnyItem = lineItems.some((l) => l.itemId !== "");
  const { subtotal, totalTax, discountAmount, total } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    const addLineTax = (q: number, p: number, lineRate: number, inclusive: boolean) => {
      const { lineTotalNet, taxAmount } = lineTaxAmount(q, p, lineRate, inclusive);
      sub += lineTotalNet;
      tax += taxAmount;
    };
    for (const line of lineItems) {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unitPrice) || 0;
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : (formData.type ? defaultTaxRate : 0);
      const inclusive = line.taxInclusive && lineRate > 0;
      addLineTax(q, p, lineRate, inclusive);
      for (const m of line.modifiers) {
        const mq = q;
        const mp = parseFloat(m.unitPrice) || 0;
        const mRate = m.taxRatePercent !== "" ? parseFloat(m.taxRatePercent) : (formData.type ? defaultTaxRate : 0);
        const mIncl = m.taxInclusive && mRate > 0;
        addLineTax(mq, mp, mRate, mIncl);
      }
    }
    sub = to2Decimals(sub);
    tax = to2Decimals(tax);
    let disc = 0;
    if (formData.discountValue) {
      const v = parseFloat(formData.discountValue) || 0;
      if (formData.discountType === "percent") disc = to2Decimals(sub * (v / 100));
      else disc = to2Decimals(v);
    }
    const tot = to2Decimals(sub + tax - disc);
    return { subtotal: sub, totalTax: tax, discountAmount: disc, total: tot };
  }, [lineItems, defaultTaxRate, formData.type, formData.discountType, formData.discountValue]);

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      {
        itemId: "",
        quantity: "1",
        unitId: null,
        unitPrice: "",
        unitCost: "",
        taxRatePercent: "",
        taxInclusive: false,
        modifiers: [],
      },
    ]);
  };

  const addModifier = (lineIndex: number) => {
    setLineItems((prev) => {
      const next = [...prev];
      const line = next[lineIndex];
      if (!line) return prev;
      next[lineIndex] = {
        ...line,
        modifiers: [
          ...line.modifiers,
          {
            itemId: "",
            unitPrice: "",
            unitCost: "",
            taxRatePercent: "",
            taxInclusive: false,
          },
        ],
      };
      return next;
    });
  };

  const removeModifier = (lineIndex: number, modIndex: number) => {
    setLineItems((prev) => {
      const next = [...prev];
      const line = next[lineIndex];
      if (!line) return prev;
      next[lineIndex] = {
        ...line,
        modifiers: line.modifiers.filter((_, i) => i !== modIndex),
      };
      return next;
    });
  };

  const updateModifier = (lineIndex: number, modIndex: number, field: keyof ModifierLine, value: string | boolean) => {
    setLineItems((prev) => {
      const next = [...prev];
      const line = next[lineIndex];
      if (!line) return prev;
      const mods = [...line.modifiers];
      const cur = { ...mods[modIndex], [field]: value };
      mods[modIndex] = cur;
      next[lineIndex] = { ...line, modifiers: mods };
      return next;
    });
  };

  const salesTypeLabelMap = useMemo(
    () => Object.fromEntries(salesTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [salesTypeValues]
  );

  useEffect(() => {
    if (!formData.type || !formData.date) return;
    const current = lineItemsRef.current;
    const indicesWithItems = current.map((l, i) => (l.itemId ? i : -1)).filter((i) => i >= 0);
    if (indicesWithItems.length === 0) return;
    Promise.all(
      indicesWithItems.map((index) => {
        const itemId = current[index].itemId!;
        return Promise.all([
          fetch(`/api/items/${itemId}/resolved-price?date=${formData.date!}`).then((r) => r.json()) as Promise<{ unitPrice?: number | null; taxIncluded?: boolean }>,
          taxRulesApi.resolve({ context: 'sale', salesType: formData.type!, itemId: parseInt(itemId, 10), date: formData.date! }),
        ]).then(([data, r]) => ({ index, data, r }));
      })
    )
      .then((results) => {
        setLineItems((prev) => {
          const next = [...prev];
          for (const { index, data, r } of results) {
            if (next[index]?.itemId && data?.unitPrice != null) {
              const rate = r.rate;
              const apiIncl = data.taxIncluded ?? false;
              const excl = apiIncl && rate > 0 ? netUnitPriceFromInclusive(data.unitPrice, rate) : data.unitPrice;
              next[index] = {
                ...next[index],
                unitPrice: String(to2Decimals(excl)),
                taxRatePercent: r.rate.toString(),
                taxVariableName: r.variableName,
                taxConditionType: r.conditionType ?? undefined,
                taxConditionValue: r.conditionValue ?? undefined,
                taxInclusive: r.taxInclusive ?? false,
              };
            } else if (next[index]?.itemId) {
              next[index] = {
                ...next[index],
                taxRatePercent: r.rate.toString(),
                taxVariableName: r.variableName,
                taxConditionType: r.conditionType ?? undefined,
                taxConditionValue: r.conditionValue ?? undefined,
                taxInclusive: r.taxInclusive ?? false,
              };
            }
          }
          return next;
        });
      })
      .catch(() => {});
  }, [formData.type, formData.date]);

  const removeLine = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: string | number | boolean | null) => {
    setLineItems((prev) => {
      const next = [...prev];
      const line = { ...next[index], [field]: value };
      next[index] = line;
      return next;
    });
  };

  const handleItemSelect = (index: number, itemId: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      const line = { ...next[index] };
      line.itemId = itemId;
      if (!itemId) {
        line.quantity = "1";
        line.unitId = null;
        line.unitPrice = "";
        line.taxRatePercent = "";
        line.taxInclusive = false;
        line.taxVariableName = undefined;
        line.taxConditionType = undefined;
        line.taxConditionValue = undefined;
        line.modifiers = [];
      } else {
        const item = items.find((i: { id: number }) => i.id === parseInt(itemId, 10)) as { unitId?: number; unit_price?: number; unitPrice?: number; defaultTaxRatePercent?: number } | undefined;
        line.quantity = "1";
        line.unitId = item?.unitId ?? null;
        line.unitPrice = "";
        line.taxRatePercent = formData.type ? String(defaultTaxRate) : (item?.defaultTaxRatePercent != null ? String(item.defaultTaxRatePercent) : "");
      }
      next[index] = line;
      return next;
    });
    if (!itemId) return;
    const dateStr = formData.date || new Date().toISOString().slice(0, 10);
    const applyPriceAndRule = (data: { unitPrice?: number | null; taxIncluded?: boolean }, r: { rate: number; taxInclusive?: boolean; variableName?: string; conditionType?: string | null; conditionValue?: string | null }) => {
      if (data?.unitPrice == null) return;
      setLineItems((prev) => {
        const next = [...prev];
        if (next[index]?.itemId !== itemId) return next;
        const line = next[index];
        const rate = r.rate;
        const apiIncl = data.taxIncluded ?? false;
        const excl = apiIncl && rate > 0 ? netUnitPriceFromInclusive(data.unitPrice!, rate) : data.unitPrice!;
        next[index] = {
          ...line,
          unitPrice: String(to2Decimals(excl)),
          taxRatePercent: r.rate.toString(),
          taxVariableName: r.variableName,
          taxConditionType: r.conditionType ?? undefined,
          taxConditionValue: r.conditionValue ?? undefined,
          taxInclusive: r.taxInclusive ?? false,
        };
        return next;
      });
    };
    if (formData.type && formData.date) {
      Promise.all([
        fetch(`/api/items/${itemId}/resolved-price?date=${dateStr}`).then((r) => r.json()) as Promise<{ unitPrice?: number | null; taxIncluded?: boolean }>,
        taxRulesApi.resolve({ context: 'sale', salesType: formData.type, itemId: parseInt(itemId, 10), date: formData.date }),
      ])
        .then(([data, r]) => applyPriceAndRule(data, r))
        .catch(() => {});
    } else {
      fetch(`/api/items/${itemId}/resolved-price?date=${dateStr}`)
        .then((r) => r.json())
        .then((data: { unitPrice?: number | null; taxIncluded?: boolean }) => {
          if (data?.unitPrice == null) return;
          const rate = defaultTaxRate;
          const apiIncl = data.taxIncluded ?? false;
          const excl = apiIncl && rate > 0 ? netUnitPriceFromInclusive(data.unitPrice, rate) : data.unitPrice;
          setLineItems((prev) => {
            const next = [...prev];
            if (next[index]?.itemId !== itemId) return next;
            next[index] = { ...next[index], unitPrice: String(excl) };
            return next;
          });
        })
        .catch(() => {});
    }
  };

  const handleModifierItemSelect = (lineIndex: number, modIndex: number, itemId: string) => {
    updateModifier(lineIndex, modIndex, "itemId", itemId);
    if (!itemId) {
      updateModifier(lineIndex, modIndex, "unitPrice", "");
      updateModifier(lineIndex, modIndex, "taxRatePercent", "");
      updateModifier(lineIndex, modIndex, "taxInclusive", false);
      return;
    }
    const dateStr = formData.date || new Date().toISOString().slice(0, 10);
    const apply = (data: { unitPrice?: number | null; taxIncluded?: boolean }, r: { rate: number; taxInclusive?: boolean; variableName?: string; conditionType?: string | null; conditionValue?: string | null }) => {
      if (data?.unitPrice == null) return;
      const rate = r.rate;
      const apiIncl = data.taxIncluded ?? false;
      const excl = apiIncl && rate > 0 ? netUnitPriceFromInclusive(data.unitPrice!, rate) : data.unitPrice!;
      setLineItems((prev) => {
        const next = [...prev];
        const line = next[lineIndex];
        if (!line?.modifiers[modIndex] || line.modifiers[modIndex].itemId !== itemId) return prev;
        const mods = [...line.modifiers];
        mods[modIndex] = {
          ...mods[modIndex],
          unitPrice: String(to2Decimals(excl)),
          taxRatePercent: r.rate.toString(),
          taxVariableName: r.variableName,
          taxConditionType: r.conditionType ?? undefined,
          taxConditionValue: r.conditionValue ?? undefined,
          taxInclusive: r.taxInclusive ?? false,
        };
        next[lineIndex] = { ...line, modifiers: mods };
        return next;
      });
    };
    if (formData.type && formData.date) {
      Promise.all([
        fetch(`/api/items/${itemId}/resolved-price?date=${dateStr}`).then((r) => r.json()) as Promise<{ unitPrice?: number | null; taxIncluded?: boolean }>,
        taxRulesApi.resolve({ context: "sale", salesType: formData.type, itemId: parseInt(itemId, 10), date: formData.date }),
      ])
        .then(([data, r]) => apply(data, r))
        .catch(() => {});
    } else {
      fetch(`/api/items/${itemId}/resolved-price?date=${dateStr}`)
        .then((r) => r.json())
        .then((data: { unitPrice?: number | null; taxIncluded?: boolean }) => {
          if (data?.unitPrice == null) return;
          const rate = defaultTaxRate;
          const apiIncl = data.taxIncluded ?? false;
          const excl = apiIncl && rate > 0 ? netUnitPriceFromInclusive(data.unitPrice, rate) : data.unitPrice;
          updateModifier(lineIndex, modIndex, "unitPrice", String(to2Decimals(excl)));
        })
        .catch(() => {});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.type) {
      toast.error("Date and dining option are required");
      return;
    }
    const payloadLines: SaleLineItemInput[] = [];
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        toast.error(`Line ${i + 1}: quantity (positive) and unit price are required`);
        return;
      }
      for (const m of line.modifiers) {
        if (!m.itemId?.trim()) continue;
        const mp = parseFloat(m.unitPrice);
        if (isNaN(mp) || mp < 0) {
          toast.error(`Line ${i + 1}: modifier needs a valid unit price`);
          return;
        }
      }
      const lineRate = line.taxRatePercent !== "" ? parseFloat(line.taxRatePercent) : defaultTaxRate;
      const parentIdx = payloadLines.length;
      payloadLines.push({
        itemId: line.itemId ? parseInt(line.itemId, 10) : undefined,
        quantity: qty,
        unitId: line.unitId ?? undefined,
        unitPrice: price,
        unitCost: line.unitCost ? parseFloat(line.unitCost) : undefined,
        taxRatePercent: line.taxRatePercent !== "" ? lineRate : undefined,
      });
      for (const m of line.modifiers) {
        if (!m.itemId?.trim()) continue;
        const mp = parseFloat(m.unitPrice);
        const mRate = m.taxRatePercent !== "" ? parseFloat(m.taxRatePercent) : defaultTaxRate;
        payloadLines.push({
          itemId: parseInt(m.itemId, 10),
          quantity: qty,
          unitPrice: mp,
          unitCost: m.unitCost ? parseFloat(m.unitCost) : undefined,
          taxRatePercent: m.taxRatePercent !== "" ? mRate : undefined,
          parentLineIndex: parentIdx,
        });
      }
    }
    const dateTimeIso = new Date(`${formData.date}T${formData.time}`).toISOString();
    const slices = rowsToPaymentSlices(paymentRows);
    if (!slices) {
      toast.error("Each payment needs a positive amount and date");
      return;
    }
    if (!paymentSlicesSumMatchesTotal(slices, total)) {
      toast.error("Payment slices must sum to document total");
      return;
    }
    const payload = {
      date: dateTimeIso,
      type: formData.type as SalesType,
      lineItems: payloadLines,
      description: formData.description || undefined,
      discount:
        formData.discountValue && parseFloat(formData.discountValue) > 0
          ? { type: formData.discountType as "amount" | "percent", value: parseFloat(formData.discountValue) }
          : undefined,
      paymentSlices: slices,
    };
    const parsed = createSaleTransactionSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    try {
      const sale = await createSale.mutateAsync(parsed.data as unknown as import("@kit/types").CreateSaleData);
      toast.success("Transaction created");
      if (onCreated && sale?.id) onCreated(sale.id);
      else onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create transaction");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0 pb-4 border-b border-border">
        <h2 className="text-lg font-semibold">Create transaction</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                id="date"
                value={formData.date ? new Date(formData.date) : undefined}
                onChange={(d) => setFormData((p) => ({ ...p, date: d ? dateToYYYYMMDD(d) : "" }))}
                placeholder="Pick a date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <TimePicker
                id="time"
                value={formData.time}
                onChange={(t) => setFormData((p) => ({ ...p, time: t }))}
                placeholder="Pick a time"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Dining option *</Label>
              <UnifiedSelector
                type="type"
                items={typeOptions}
                selectedId={formData.type || undefined}
                onSelect={(item) => setFormData((p) => ({ ...p, type: (item.id === 0 ? "" : String(item.id)) as SalesType }))}
                placeholder="Select type"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Add line
              </Button>
            </div>
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              {lineItems.map((line, index) => (
                <div key={index} className="space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3 flex flex-col gap-1.5">
                    {line.itemId && (
                      <Link
                        href={`/items/${line.itemId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline hover:text-foreground"
                      >
                        View
                      </Link>
                    )}
                    <UnifiedSelector
                      label=""
                      type="item"
                      items={items}
                      selectedId={line.itemId ? parseInt(line.itemId) : undefined}
                      onSelect={(item) => handleItemSelect(index, item.id === 0 ? "" : String(item.id))}
                      onCreateNew={() => router.push("/items/create")}
                      placeholder="Item (optional)"
                      getDisplayName={(i) => `${(i as { name?: string }).name ?? i.id}`}
                      className="h-10"
                    />
                  </div>
                  {line.itemId ? (
                    <>
                      <div className="col-span-4">
                        <InputGroupAttached
                          label="Qty / Unit"
                          input={
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              className="text-sm tabular-nums"
                              value={line.quantity}
                              onChange={(e) => updateLine(index, "quantity", e.target.value)}
                            />
                          }
                          addon={
                            <UnifiedSelector
                              type="unit"
                              items={unitItems}
                              selectedId={line.unitId ?? undefined}
                              onSelect={(item) => updateLine(index, "unitId", item.id === 0 ? null : (item.id as number))}
                              placeholder="—"
                              className="!min-w-0 w-20"
                            />
                          }
                        />
                      </div>
                      <div className="col-span-4">
                        <InputGroupAttached
                          addonStyle="default"
                          label={(() => {
                            const rate = parseFloat(line.taxRatePercent) || 0;
                            const isIncl = line.taxInclusive && rate > 0;
                            return isIncl ? "Price (incl. tax)" : "Price (excl. tax)";
                          })()}
                          input={
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="text-sm tabular-nums border-0"
                              value={(() => {
                                const rate = parseFloat(line.taxRatePercent) || 0;
                                const isIncl = line.taxInclusive && rate > 0;
                                if (line.unitPrice === "") return "";
                                const p = parseFloat(line.unitPrice) || 0;
                                return isIncl ? unitPriceExclToIncl(p, rate) : line.unitPrice;
                              })()}
                              onChange={(e) => {
                                const rate = parseFloat(line.taxRatePercent) || 0;
                                const isIncl = line.taxInclusive && rate > 0;
                                const raw = e.target.value;
                                if (raw === "") {
                                  updateLine(index, "unitPrice", "");
                                  return;
                                }
                                const num = parseFloat(raw);
                                if (Number.isNaN(num)) return;
                                updateLine(index, "unitPrice", isIncl ? String(netUnitPriceFromInclusive(num, rate)) : raw);
                              }}
                            />
                          }
                          addon={
                            <span className="text-muted-foreground text-xs">
                              {line.taxInclusive && (parseFloat(line.taxRatePercent) || 0) > 0 ? "incl." : "excl."}
                            </span>
                          }
                        />
                      </div>
                      <div className="col-span-1 flex h-10 items-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lineItems.length <= 1}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-4">
                        <InputGroupAttached
                          addonStyle="default"
                          label={line.taxInclusive && (parseFloat(line.taxRatePercent) || 0) > 0 ? "Amount (incl. tax)" : "Amount (excl. tax)"}
                          input={
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="border-0"
                              value={(() => {
                                const rate = parseFloat(line.taxRatePercent) || 0;
                                const isIncl = line.taxInclusive && rate > 0;
                                if (line.unitPrice === "") return "";
                                const p = parseFloat(line.unitPrice) || 0;
                                return isIncl ? unitPriceExclToIncl(p, rate) : line.unitPrice;
                              })()}
                              onChange={(e) => {
                                const rate = parseFloat(line.taxRatePercent) || 0;
                                const isIncl = line.taxInclusive && rate > 0;
                                const raw = e.target.value;
                                if (raw === "") {
                                  updateLine(index, "unitPrice", "");
                                  return;
                                }
                                const num = parseFloat(raw);
                                if (Number.isNaN(num)) return;
                                updateLine(index, "unitPrice", isIncl ? String(netUnitPriceFromInclusive(num, rate)) : raw);
                              }}
                              placeholder="0"
                            />
                          }
                          addon={
                            <span className="text-muted-foreground text-xs">
                              {line.taxInclusive && (parseFloat(line.taxRatePercent) || 0) > 0 ? "incl." : "excl."}
                            </span>
                          }
                        />
                      </div>
                        <div className="col-span-4 flex h-10 items-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lineItems.length <= 1}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        </div>
                    </>
                  )}
                </div>
                {line.itemId ? (
                  <div className="ml-1 pl-3 border-l border-border space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Modifiers</span>
                      <Button type="button" variant="secondary" size="sm" onClick={() => addModifier(index)}>
                        <Plus className="h-3 w-3 mr-1" /> Add modifier
                      </Button>
                    </div>
                    {line.modifiers.map((mod, mi) => (
                      <div key={mi} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-6">
                          <UnifiedSelector
                            label=""
                            type="item"
                            items={modifierItems}
                            selectedId={mod.itemId ? parseInt(mod.itemId, 10) : undefined}
                            onSelect={(item) => handleModifierItemSelect(index, mi, item.id === 0 ? "" : String(item.id))}
                            placeholder="Modifier item"
                            getDisplayName={(i) => `${(i as { name?: string }).name ?? i.id}`}
                            className="h-10"
                          />
                        </div>
                        <div className="col-span-4">
                          <Label className="text-xs text-muted-foreground">Price (excl. tax)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="text-sm tabular-nums"
                            value={mod.unitPrice}
                            onChange={(e) => updateModifier(index, mi, "unitPrice", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 flex h-10 items-end justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeModifier(index, mi)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                </div>
              ))}
            </div>
          </div>

          {hasAnyItem && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount</Label>
                <div className="flex gap-2">
                  <select
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={formData.discountType}
                    onChange={(e) => setFormData((p) => ({ ...p, discountType: e.target.value as "amount" | "percent" }))}
                  >
                    <option value="amount">Amount</option>
                    <option value="percent">Percent</option>
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData((p) => ({ ...p, discountValue: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm">
            {hasAnyItem ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax {defaultTaxRate > 0 && `(${defaultTaxRate.toFixed(1)}%)`}
                  </span>
                  <span className="tabular-nums">{totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">-{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span className="tabular-nums">{total.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-semibold items-center gap-2">
                  <span>Total</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-10 w-24 text-right tabular-nums"
                    value={(() => {
                      const line = lineItems[0];
                      if (!line?.unitPrice) return "";
                      const rate = parseFloat(line.taxRatePercent) || 0;
                      const isIncl = line.taxInclusive && rate > 0;
                      const p = parseFloat(line.unitPrice) || 0;
                      return isIncl ? unitPriceExclToIncl(p, rate) : line.unitPrice;
                    })()}
                    onChange={(e) => {
                      const line = lineItems[0];
                      if (!line) return;
                      const rate = parseFloat(line.taxRatePercent) || 0;
                      const isIncl = line.taxInclusive && rate > 0;
                      const raw = e.target.value;
                      if (raw === "") {
                        updateLine(0, "unitPrice", "");
                        return;
                      }
                      const num = parseFloat(raw);
                      if (Number.isNaN(num)) return;
                      updateLine(0, "unitPrice", isIncl ? String(netUnitPriceFromInclusive(num, rate)) : raw);
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>

          <DocumentPaymentSlicesEditor
            total={total}
            defaultDate={formData.date}
            rows={paymentRows}
            onRowsChange={setPaymentRows}
          />

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSale.isPending || (hasAnyItem ? total <= 0 : (parseFloat(lineItems[0]?.unitPrice ?? "0") || 0) <= 0)}
              className="flex-1"
            >
              {createSale.isPending ? "Creating…" : "Create transaction"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </div>
  );
}
