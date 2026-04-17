"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { dateToYYYYMMDD } from "@kit/lib";
import { DatePicker } from "@kit/ui/date-picker";
import { TimePicker } from "@kit/ui/time-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { InputGroupAttached } from "@/components/input-group";
import { Badge } from "@kit/ui/badge";
import { Separator } from "@kit/ui/separator";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Skeleton } from "@kit/ui/skeleton";
import {
  Save,
  Trash2,
  MoreHorizontal,
  Edit2,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Receipt,
  X,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useSaleById, useUpdateSale, useDeleteSale, useItems, useUnits, useMetadataEnum, usePayments } from "@kit/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatDateTime } from "@kit/lib/date-format";
import type { SalesType, SaleLineItem, SaleLineItemInput, Item } from "@kit/types";
import { mergeSelectorItemsWithLineEmbeds } from "@/lib/merge-selector-items";
import { lineTaxAmount, to2Decimals, netUnitPriceFromInclusive, unitPriceExclToIncl } from "@/lib/transaction-tax";
import { taxRulesApi } from "@kit/lib";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  DocumentPaymentSlicesEditor,
  defaultPaymentSliceRows,
  paymentRowFromApi,
  rowsToPaymentSlices,
  type DocumentPaymentSliceRow,
} from "@/components/document-payment-slices-editor";
import { paymentSlicesSumMatchesTotal } from "@/lib/ledger/replace-entry-payments";

function displayTaxRate(pct: number): number {
  if (pct <= 0) return 0;
  if (Math.abs(pct - 10) <= 0.5) return 10;
  if (Math.abs(pct - 5.5) <= 0.5) return 5.5;
  return pct;
}

interface SaleDetailContentProps {
  saleId: string;
  initialEditMode?: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export function SaleDetailContent({ saleId, initialEditMode = false, onClose, onDeleted }: SaleDetailContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: sale, isLoading } = useSaleById(saleId);
  const { data: salePaymentsPage, isLoading: salePaymentsLoading } = usePayments({
    entryType: "sale",
    referenceId: saleId,
    limit: 500,
    page: 1,
  });
  const salePayments = salePaymentsPage?.data ?? [];

  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);
  const { data: itemsResponse } = useItems({ limit: 2500, includeRecipes: true });
  const { data: modifierItemsResponse } = useItems({ limit: 500, itemType: "modifier" });
  const modifierItems = modifierItemsResponse?.data ?? [];
  const { data: unitsData } = useUnits();
  const updateSale = useUpdateSale();
  const deleteMutation = useDeleteSale();
  const itemsBase = itemsResponse?.data ?? [];
  const selectorItems = useMemo(
    () => mergeSelectorItemsWithLineEmbeds<Item>(itemsBase, sale?.lineItems),
    [itemsBase, sale?.lineItems]
  );
  const unitItems = (unitsData || []).map((u: { id: number; symbol?: string; name?: string }) => ({ id: u.id, name: `${u.symbol ?? ""} (${u.name ?? ""})` }));
  const { data: salesTypeValues = [] } = useMetadataEnum("SalesType");
  const typeOptions = salesTypeValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const typeLabels: Record<string, string> = Object.fromEntries(
    salesTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])
  );

  const [formData, setFormData] = useState({
    date: "",
    time: "00:00",
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
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [paymentRows, setPaymentRows] = useState<DocumentPaymentSliceRow[]>([]);
  const lineItemsRef = useRef(lineItems);
  lineItemsRef.current = lineItems;

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

  const detailTotals = useMemo(() => {
    if (!sale) return { subtotal: 0, total: 0 };
    const sub = sale.subtotal ?? 0;
    const tax = sale.totalTax ?? 0;
    const disc = sale.totalDiscount ?? 0;
    const tot = sale.amount ?? 0;
    return { subtotal: sub, total: tot };
  }, [sale]);

  const [resolvedLineTax, setResolvedLineTax] = useState<Record<number, { rate: number; taxInclusive: boolean }>>({});
  useEffect(() => {
    if (!sale?.lineItems?.length || !sale.type || !sale.date) {
      setResolvedLineTax({});
      return;
    }
    const dateStr = sale.date.split("T")[0];
    Promise.all(
      sale.lineItems.map((line: { id: number; itemId?: number }) =>
        taxRulesApi
          .resolve({ context: "sale", salesType: sale.type, itemId: line.itemId ?? undefined, date: dateStr })
          .then((r) => ({ lineId: line.id, rate: r.rate, taxInclusive: r.taxInclusive ?? false }))
      )
    )
      .then((results) => {
        setResolvedLineTax(
          Object.fromEntries(results.map((r) => [r.lineId, { rate: r.rate, taxInclusive: r.taxInclusive }]))
        );
      })
      .catch(() => {});
  }, [sale?.id, sale?.type, sale?.date, sale?.lineItems?.length]);

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
      mods[modIndex] = { ...mods[modIndex], [field]: value };
      next[lineIndex] = { ...line, modifiers: mods };
      return next;
    });
  };
  const salesTypeLabelMap = useMemo(
    () => Object.fromEntries(salesTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [salesTypeValues]
  );
  const removeLine = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };
  const updateLine = (index: number, field: string, value: string | number | boolean | null) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
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
        const item = selectorItems.find((i: { id: number }) => i.id === parseInt(itemId, 10)) as { unitId?: number; unit_price?: number; unitPrice?: number; defaultTaxRatePercent?: number } | undefined;
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
            next[index] = { ...next[index], unitPrice: String(to2Decimals(excl)) };
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

  const hasAnyItem = lineItems.some((l) => l.itemId !== "");

  useEffect(() => {
    if (!isEditing || !sale || salePaymentsLoading) return;
    setPaymentRows((prev) => {
      if (salePayments.length > 0) {
        const next = salePayments.map(paymentRowFromApi);
        const prevSig = prev.map((r) => `${r.id ?? ""}:${r.amount}:${r.paymentDate}`).join("|");
        const nextSig = next.map((r) => `${r.id ?? ""}:${r.amount}:${r.paymentDate}`).join("|");
        return prevSig === nextSig ? prev : next;
      }
      if (prev.length > 1) return prev;
      return defaultPaymentSliceRows(sale.amount, sale.date.split("T")[0]);
    });
  }, [isEditing, sale, salePaymentsLoading, salePayments]);

  useEffect(() => {
    if (sale) {
      const hasTime = sale.date.includes("T");
      setFormData({
        date: sale.date.split("T")[0],
        time: hasTime ? sale.date.slice(11, 16) : "00:00",
        type: sale.type,
        description: sale.description || "",
        discountType: "amount",
        discountValue: sale.totalDiscount != null && sale.totalDiscount > 0 ? sale.totalDiscount.toString() : "",
      });
      if (sale.lineItems?.length) {
        const sorted = [...sale.lineItems].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const childrenByParent = new Map<number, SaleLineItem[]>();
        const roots: SaleLineItem[] = [];
        for (const l of sorted) {
          if (l.parentSaleLineId) {
            const arr = childrenByParent.get(l.parentSaleLineId) ?? [];
            arr.push(l);
            childrenByParent.set(l.parentSaleLineId, arr);
          } else {
            roots.push(l);
          }
        }
        setLineItems(
          roots.map((l) => {
            const up = l.unitPrice;
            const unitPriceStr =
              up != null && Number.isFinite(up)
                ? String(up)
                : l.quantity && l.lineTotal != null
                  ? String(to2Decimals(l.lineTotal / l.quantity))
                  : "";
            const childLines = childrenByParent.get(l.id) ?? [];
            const modifiers: ModifierLine[] = childLines.map((m) => {
              const mup = m.unitPrice;
              const mUnitPriceStr =
                mup != null && Number.isFinite(mup)
                  ? String(mup)
                  : m.quantity && m.lineTotal != null
                    ? String(to2Decimals(m.lineTotal / m.quantity))
                    : "";
              return {
                itemId: m.itemId?.toString() ?? "",
                unitPrice: mUnitPriceStr,
                unitCost: m.unitCost != null ? String(m.unitCost) : "",
                taxRatePercent: m.taxRatePercent != null ? String(m.taxRatePercent) : "",
                taxInclusive: (m as { taxInclusive?: boolean }).taxInclusive ?? false,
              };
            });
            return {
              itemId: l.itemId?.toString() ?? "",
              quantity: String(l.quantity),
              unitId: l.unitId ?? null,
              unitPrice: unitPriceStr,
              unitCost: l.unitCost != null ? String(l.unitCost) : "",
              taxRatePercent: l.taxRatePercent != null ? String(l.taxRatePercent) : "",
              taxInclusive: (l as { taxInclusive?: boolean }).taxInclusive ?? false,
              modifiers,
            };
          })
        );
      } else {
        setLineItems([
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
      }
    }
  }, [sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateTimeIso = new Date(`${formData.date}T${formData.time}`).toISOString();
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
      const slices = rowsToPaymentSlices(paymentRows);
      if (!slices) {
        toast.error("Each payment needs a positive amount and date");
        return;
      }
      if (!paymentSlicesSumMatchesTotal(slices, total)) {
        toast.error("Payment slices must sum to document total");
        return;
      }
      await updateSale.mutateAsync({
        id: saleId,
        data: {
          date: dateTimeIso,
          type: formData.type as SalesType,
          lineItems: payloadLines,
          description: formData.description || undefined,
          discount:
            formData.discountValue && parseFloat(formData.discountValue) > 0
              ? { type: formData.discountType as "amount" | "percent", value: parseFloat(formData.discountValue) }
              : undefined,
          paymentSlices: slices,
        },
      });
      toast.success("Sale updated successfully");
      router.push(`/sales/${saleId}`);
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sale");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(String(saleId));
      toast.success("Sale deleted successfully");
      setIsDeleteDialogOpen(false);
      onDeleted();
    } catch (error) {
      toast.error("Failed to delete sale");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    const updates: Record<string, string | number> = { [field]: value };
    if (field === "itemId") {
      if (!value) {
        updates.unitPrice = "";
        updates.unitCost = "";
      }
    }
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="space-y-4 px-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Sale not found</h2>
          <p className="text-sm text-muted-foreground">
            This sale may have been deleted or doesn't exist.
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to sales
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col h-full">
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-6 pb-6 pr-1">
            <div>
              <h2 className="text-lg font-semibold">Edit transaction</h2>
              <p className="text-sm text-muted-foreground">Update line items and totals</p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker value={formData.date ? new Date(formData.date) : undefined} onChange={(d) => handleInputChange("date", d ? dateToYYYYMMDD(d) : "")} placeholder="Pick a date" />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <TimePicker value={formData.time} onChange={(t) => handleInputChange("time", t)} placeholder="Time" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Dining option</Label>
                <UnifiedSelector
                  type="type"
                  items={typeOptions}
                  selectedId={formData.type || undefined}
                  onSelect={(item) => handleInputChange("type", item.id === 0 ? "" : String(item.id))}
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
                        type="item"
                        items={selectorItems}
                        selectedId={line.itemId ? parseInt(line.itemId) : undefined}
                        onSelect={(item) => handleItemSelect(index, item.id === 0 ? "" : String(item.id))}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <div className="flex gap-2">
                    <select className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={formData.discountType} onChange={(e) => setFormData((p) => ({ ...p, discountType: e.target.value as "amount" | "percent" }))}>
                      <option value="amount">Amount</option>
                      <option value="percent">Percent</option>
                    </select>
                    <Input type="number" step="0.01" min="0" value={formData.discountValue} onChange={(e) => setFormData((p) => ({ ...p, discountValue: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm">
              {hasAnyItem ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax ({defaultTaxRate.toFixed(1)}%)</span><span className="tabular-nums">{totalTax.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="tabular-nums">-{discountAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold pt-2 border-t"><span>Total</span><span className="tabular-nums">{total.toFixed(2)}</span></div>
                </>
              ) : (
                <div className="flex justify-between font-semibold items-center">
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
              )}
            </div>
            <DocumentPaymentSlicesEditor
              total={total}
              defaultDate={formData.date}
              rows={paymentRows}
              onRowsChange={setPaymentRows}
            />
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} placeholder="Notes" rows={2} className="resize-none" />
            </div>
          </div>
        </ScrollArea>
        <div className="mt-auto flex shrink-0 gap-3 border-t bg-background p-4 -mx-6">
          <Button type="button" variant="outline" onClick={() => router.push(`/sales/${saleId}`)} className="flex-1">Cancel</Button>
          <Button
            type="submit"
            disabled={updateSale.isPending || (hasAnyItem ? total <= 0 : (parseFloat(lineItems[0]?.unitPrice ?? "0") || 0) <= 0)}
            className="flex-1"
          >
            {updateSale.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 space-y-0">
        <div className="flex items-start justify-between gap-4 pb-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(sale.date)} · {typeLabels[sale.type] || sale.type}
            </p>
            <h2 className="text-lg font-semibold">Sale details</h2>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/sales/${saleId}/edit`)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit sale
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={deleteMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
        <Separator />
      </div>
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-6 pb-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {formatCurrency(detailTotals.total)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(sale.date)}
                </span>
                <Badge variant="secondary" className="font-normal">
                  {typeLabels[sale.type] || sale.type}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-0">
            <DetailRow icon={Calendar} label="Date">
              {formatDateTime(sale.date)}
            </DetailRow>
            <Separator />
            <DetailRow icon={Tag} label="Type">
              <Badge variant="outline">{typeLabels[sale.type] || sale.type}</Badge>
            </DetailRow>
            <Separator />
            <div className="py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Line items</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Item</th>
                      <th className="text-right p-2 font-medium">Qty</th>
                      <th className="text-right p-2 font-medium">Price</th>
                      <th className="text-right p-2 font-medium">Tax</th>
                      <th className="text-right p-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.lineItems && sale.lineItems.length > 0
                      ? [...sale.lineItems].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      : [{ id: 0, quantity: 1, unitPrice: sale.amount, lineTotal: sale.amount, sortOrder: 0 }]
                    ).map(
                      (
                        line: {
                          id: number;
                          parentSaleLineId?: number;
                          itemId?: number;
                          item?: { id?: number; name?: string };
                          quantity: number;
                          unitPrice: number;
                          lineTotal: number;
                          taxRatePercent?: number;
                          taxAmount?: number;
                          sortOrder?: number;
                        }
                      ) => {
                        const isModifierLine = line.parentSaleLineId != null;
                        const resolved = resolvedLineTax[line.id];
                        const rate = (line.taxRatePercent ?? resolved?.rate ?? 0);
                        const inclusive = (resolved?.taxInclusive ?? false) && rate > 0;
                        const displayUnitPrice =
                          inclusive ? unitPriceExclToIncl(line.unitPrice, rate) : line.unitPrice;
                        const computedLineTotal =
                          inclusive
                            ? to2Decimals(line.quantity * displayUnitPrice)
                            : Math.round(line.quantity * line.unitPrice * 100) / 100;
                        const displayLineTotal = line.lineTotal ?? computedLineTotal;
                        const computedTaxAmount = lineTaxAmount(
                          line.quantity,
                          line.unitPrice,
                          rate,
                          inclusive
                        ).taxAmount;
                        const displayTaxAmount = line.taxAmount ?? computedTaxAmount;
                        const itemId = line.itemId ?? line.item?.id;
                        const itemLabel = line.item?.name ?? (itemId != null ? `Item #${itemId}` : "—");
                        const hasItemLink = itemId != null;

                        return (
                          <tr key={line.id} className={`border-b last:border-0 ${isModifierLine ? "bg-muted/15" : ""}`}>
                            <td className="p-2">
                              <span className="inline-flex items-center gap-1.5">
                                {isModifierLine ? (
                                  <span className="text-muted-foreground shrink-0" aria-hidden>
                                    ↳
                                  </span>
                                ) : null}
                                <span className="min-w-0">
                              {hasItemLink ? (
                                <Link
                                  href={`/items/${itemId}`}
                                  className="group inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  {itemLabel}
                                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                </Link>
                              ) : (
                                itemLabel
                              )}
                                </span>
                              </span>
                            </td>
                            <td className="p-2 text-right tabular-nums">{line.quantity}</td>
                            <td className="p-2 text-right tabular-nums">
                              {formatCurrency(displayUnitPrice)}
                            </td>
                            <td className="p-2 text-right tabular-nums">
                              {formatCurrency(displayTaxAmount)}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({displayTaxRate(rate).toFixed(1)}%)
                              </span>
                            </td>
                            <td className="p-2 text-right tabular-nums">
                              {formatCurrency(displayLineTotal)}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(detailTotals.subtotal)}</span>
                </div>
                {sale.totalTax != null && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      Tax
                      {detailTotals.subtotal > 0 && (
                        <span className="ml-1 font-normal text-muted-foreground/80">
                          ({displayTaxRate((sale.totalTax / detailTotals.subtotal) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums">{formatCurrency(sale.totalTax)}</span>
                  </div>
                )}
                {sale.totalDiscount != null && sale.totalDiscount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatCurrency(sale.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t mt-1 pt-2">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(detailTotals.total)}</span>
                </div>
              </div>
            </div>
            {sale.description && (
              <>
                <Separator />
                <DetailRow icon={FileText} label="Description">
                  <p className="whitespace-pre-wrap text-foreground/90">
                    {sale.description}
                  </p>
                </DetailRow>
              </>
            )}
          </div>

          <Separator />

          <div className="flex gap-6 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created</span>{" "}
              {formatDate(sale.createdAt)}
            </div>
            <div>
              <span className="font-medium">Updated</span>{" "}
              {formatDate(sale.updatedAt)}
            </div>
          </div>
        </div>
      </ScrollArea>
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete sale"
        description="Are you sure you want to delete this sale? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isPending={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
