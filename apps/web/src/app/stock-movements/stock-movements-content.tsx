"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";
import {
  useStockMovements,
  useDeleteStockMovement,
  useItems,
  useMetadataEnum,
} from "@kit/hooks";
import type { StockMovement, Item } from "@kit/types";
import { StockMovementType, StockMovementReferenceType } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kit/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kit/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@kit/ui/command";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@kit/ui/sheet";
import { Skeleton } from "@kit/ui/skeleton";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@kit/ui/tooltip";
import { formatDate, formatDateTime } from "@kit/lib/date-format";
import { cn } from "@kit/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  ChevronRight,
  Clock,
  Filter,
  Inbox,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MovementWithIngredient = StockMovement & { ingredientId?: number };

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function formatNumber(n: number): string {
  return numberFmt.format(n);
}

function formatSignedNumber(n: number): string {
  if (n === 0) return "0";
  return `${n > 0 ? "+" : "−"}${numberFmt.format(Math.abs(n))}`;
}

function resolveItemId(m: MovementWithIngredient): number | undefined {
  return m.itemId ?? m.ingredientId;
}

const IN_LIKE = new Set<StockMovementType>([StockMovementType.IN]);
const OUT_LIKE = new Set<StockMovementType>([
  StockMovementType.OUT,
  StockMovementType.WASTE,
  StockMovementType.EXPIRED,
]);

function signedDelta(m: StockMovement): number {
  if (IN_LIKE.has(m.movementType)) return m.quantity;
  if (OUT_LIKE.has(m.movementType)) return -m.quantity;
  if (m.movementType === StockMovementType.TRANSFER) return 0;
  return m.quantity;
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.round((now - then) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return rtf.format(-Math.sign(diffSec) * abs, "second");
  if (abs < 3600) return rtf.format(-Math.sign(diffSec) * Math.round(abs / 60), "minute");
  if (abs < 86400) return rtf.format(-Math.sign(diffSec) * Math.round(abs / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(-Math.sign(diffSec) * Math.round(abs / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(-Math.sign(diffSec) * Math.round(abs / (86400 * 30)), "month");
  return rtf.format(-Math.sign(diffSec) * Math.round(abs / (86400 * 365)), "year");
}

function prettyReferenceLabel(type?: string): string {
  if (!type) return "";
  return type
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function referenceHref(
  refType?: string,
  refId?: number
): string | null {
  if (!refType || !refId) return null;
  if (refType === StockMovementReferenceType.SUPPLIER_ORDER) return `/supplier-orders/${refId}`;
  if (refType === StockMovementReferenceType.RECIPE) return `/recipes/${refId}`;
  if (refType === StockMovementReferenceType.SALE) return `/sales/${refId}`;
  if (refType === StockMovementReferenceType.EXPENSE) return `/expenses/${refId}`;
  return null;
}

const TYPE_META: Record<
  StockMovementType,
  { label: string; icon: React.ElementType; color: string; tint: string; dot: string }
> = {
  [StockMovementType.IN]: {
    label: "IN",
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  [StockMovementType.OUT]: {
    label: "OUT",
    icon: TrendingDown,
    color: "text-sky-600 dark:text-sky-400",
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  [StockMovementType.ADJUSTMENT]: {
    label: "ADJ",
    icon: RefreshCw,
    color: "text-amber-600 dark:text-amber-400",
    tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  [StockMovementType.TRANSFER]: {
    label: "TRANS",
    icon: ArrowLeftRight,
    color: "text-violet-600 dark:text-violet-400",
    tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  [StockMovementType.WASTE]: {
    label: "WASTE",
    icon: Trash2,
    color: "text-rose-600 dark:text-rose-400",
    tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  [StockMovementType.EXPIRED]: {
    label: "EXPIRED",
    icon: Clock,
    color: "text-rose-600 dark:text-rose-400",
    tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

const TYPE_ORDER: StockMovementType[] = [
  StockMovementType.IN,
  StockMovementType.OUT,
  StockMovementType.ADJUSTMENT,
  StockMovementType.TRANSFER,
  StockMovementType.WASTE,
  StockMovementType.EXPIRED,
];

function shiftRangeBack(range: { startDate: string; endDate: string }) {
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return { startDate: toKey(prevStart), endDate: toKey(prevEnd) };
}

function ItemAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
      {initials || "?"}
    </div>
  );
}

function Sparkline({
  data,
  colorVar,
  height = 28,
}: {
  data: Array<{ v: number }>;
  colorVar: string;
  height?: number;
}) {
  if (!data.length) return <div style={{ height }} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${colorVar}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorVar} stopOpacity={0.4} />
              <stop offset="100%" stopColor={colorVar} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={colorVar}
            strokeWidth={1.5}
            fill={`url(#spark-${colorVar})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tintClass,
  sparkData,
  sparkColor,
  delta,
  loading,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon: React.ElementType;
  tintClass: string;
  sparkData: Array<{ v: number }>;
  sparkColor: string;
  delta?: number | null;
  loading?: boolean;
}) {
  const deltaPositive = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            tintClass
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="text-2xl font-bold tracking-tight">{value}</div>
        )}
        {subtitle ? (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
        <div className="flex items-end justify-between gap-2 pt-1">
          <div className="flex-1">
            <Sparkline data={sparkData} colorVar={sparkColor} />
          </div>
          {delta != null && !Number.isNaN(delta) ? (
            <div
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                deltaPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {deltaPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {deltaPositive ? "+" : ""}
              {formatNumber(delta)}%
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TypeChip({
  type,
  active,
  onClick,
  count,
}: {
  type: StockMovementType;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? cn(meta.tint, "border-transparent")
          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
      {count != null ? (
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px]",
            active ? "bg-background/60" : "bg-muted"
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function ItemCombobox({
  items,
  selectedId,
  onSelect,
}: {
  items: Item[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => String(i.id) === selectedId);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-[220px] justify-between"
        >
          <span className="flex items-center gap-2 truncate">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            {selected ? selected.name : "All items"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search items..." />
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onSelect("");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedId === "" ? "opacity-100" : "opacity-0"
                  )}
                />
                All items
              </CommandItem>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.id}`}
                  onSelect={() => {
                    onSelect(String(item.id));
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(item.id) === selectedId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.unit}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function StockMovementsContent() {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const { dateRange } = useDashboardPeriod();

  const [selectedItemId, setSelectedItemId] = useState<string>(
    urlSearchParams.get("itemId") ?? ""
  );
  const [activeTypes, setActiveTypes] = useState<Set<StockMovementType>>(
    new Set()
  );
  const [openMovementId, setOpenMovementId] = useState<number | null>(() => {
    const raw = urlSearchParams.get("open");
    return raw ? Number(raw) : null;
  });

  useEffect(() => {
    const current = urlSearchParams.get("itemId") ?? "";
    if (current === selectedItemId) return;
    const sp = new URLSearchParams(urlSearchParams.toString());
    if (selectedItemId) sp.set("itemId", selectedItemId);
    else sp.delete("itemId");
    const qs = sp.toString();
    router.replace(`/stock-movements${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [selectedItemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sp = new URLSearchParams(urlSearchParams.toString());
    const current = sp.get("open") ?? "";
    const next = openMovementId ? String(openMovementId) : "";
    if (current === next) return;
    if (next) sp.set("open", next);
    else sp.delete("open");
    const qs = sp.toString();
    router.replace(`/stock-movements${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [openMovementId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: movementsResponse, isLoading } = useStockMovements({
    limit: 1000,
    itemId: selectedItemId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const prevRange = useMemo(() => shiftRangeBack(dateRange), [dateRange]);
  const { data: prevMovementsResponse } = useStockMovements({
    limit: 1000,
    itemId: selectedItemId || undefined,
    startDate: prevRange.startDate,
    endDate: prevRange.endDate,
  });

  const { data: itemsResponse } = useItems({ limit: 1000 });
  const items: Item[] = itemsResponse?.data ?? [];
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const selectedItem = selectedItemId ? itemMap.get(Number(selectedItemId)) : undefined;

  const allMovements: MovementWithIngredient[] =
    (movementsResponse?.data as MovementWithIngredient[]) || [];
  const prevMovements: MovementWithIngredient[] =
    (prevMovementsResponse?.data as MovementWithIngredient[]) || [];

  const filteredMovements = useMemo(() => {
    if (activeTypes.size === 0) return allMovements;
    return allMovements.filter((m) => activeTypes.has(m.movementType));
  }, [allMovements, activeTypes]);

  const totalCount = movementsResponse?.pagination?.total ?? allMovements.length;

  const deleteMutation = useDeleteStockMovement();
  const { data: movementTypeValues = [] } = useMetadataEnum("StockMovementType");
  const movementTypeLabels: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        movementTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])
      ),
    [movementTypeValues]
  );

  const typeCounts = useMemo(() => {
    const m = new Map<StockMovementType, number>();
    for (const mov of allMovements) {
      m.set(mov.movementType, (m.get(mov.movementType) ?? 0) + 1);
    }
    return m;
  }, [allMovements]);

  const kpi = useMemo(() => {
    let inCount = 0, outCount = 0, wasteCount = 0, expiredCount = 0;
    let inQty = 0, outQty = 0, wasteQty = 0, expiredQty = 0, adjQty = 0;
    for (const m of filteredMovements) {
      if (m.movementType === StockMovementType.IN) {
        inCount++;
        inQty += m.quantity;
      } else if (m.movementType === StockMovementType.OUT) {
        outCount++;
        outQty += m.quantity;
      } else if (m.movementType === StockMovementType.WASTE) {
        wasteCount++;
        wasteQty += m.quantity;
      } else if (m.movementType === StockMovementType.EXPIRED) {
        expiredCount++;
        expiredQty += m.quantity;
      } else if (m.movementType === StockMovementType.ADJUSTMENT) {
        adjQty += m.quantity;
      }
    }
    const net = inQty - outQty - wasteQty - expiredQty + adjQty;
    return {
      inCount, outCount, wasteCount, expiredCount,
      inQty, outQty, wasteQty, expiredQty, adjQty,
      net,
      total: filteredMovements.length,
    };
  }, [filteredMovements]);

  const prevKpi = useMemo(() => {
    let inCount = 0, outCount = 0, wasteCount = 0, expiredCount = 0;
    let inQty = 0, outQty = 0, wasteQty = 0, expiredQty = 0, adjQty = 0;
    const scoped =
      activeTypes.size === 0
        ? prevMovements
        : prevMovements.filter((m) => activeTypes.has(m.movementType));
    for (const m of scoped) {
      if (m.movementType === StockMovementType.IN) {
        inCount++;
        inQty += m.quantity;
      } else if (m.movementType === StockMovementType.OUT) {
        outCount++;
        outQty += m.quantity;
      } else if (m.movementType === StockMovementType.WASTE) {
        wasteCount++;
        wasteQty += m.quantity;
      } else if (m.movementType === StockMovementType.EXPIRED) {
        expiredCount++;
        expiredQty += m.quantity;
      } else if (m.movementType === StockMovementType.ADJUSTMENT) {
        adjQty += m.quantity;
      }
    }
    const net = inQty - outQty - wasteQty - expiredQty + adjQty;
    return {
      inCount, outCount, wasteCount, expiredCount,
      inQty, outQty, wasteQty, expiredQty, adjQty,
      net,
      total: scoped.length,
    };
  }, [prevMovements, activeTypes]);

  const deltaPct = (now: number, prev: number): number | null => {
    if (!Number.isFinite(now) || !Number.isFinite(prev)) return null;
    if (prev === 0) return now === 0 ? 0 : null;
    return Math.round(((now - prev) / Math.abs(prev)) * 1000) / 10;
  };

  const dayBuckets = useMemo(() => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const days: string[] = [];
    const d = new Date(start);
    while (d <= end) {
      days.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`
      );
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [dateRange.startDate, dateRange.endDate]);

  const dailyByType = useMemo(() => {
    const map = new Map<
      string,
      { in: number; out: number; waste: number; expired: number; adj: number; count: number; net: number }
    >();
    for (const day of dayBuckets) {
      map.set(day, { in: 0, out: 0, waste: 0, expired: 0, adj: 0, count: 0, net: 0 });
    }
    for (const m of filteredMovements) {
      const key = toLocalDateKey(m.movementDate);
      const bucket = map.get(key);
      if (!bucket) continue;
      bucket.count++;
      if (m.movementType === StockMovementType.IN) bucket.in += m.quantity;
      else if (m.movementType === StockMovementType.OUT) bucket.out += m.quantity;
      else if (m.movementType === StockMovementType.WASTE) bucket.waste += m.quantity;
      else if (m.movementType === StockMovementType.EXPIRED) bucket.expired += m.quantity;
      else if (m.movementType === StockMovementType.ADJUSTMENT) bucket.adj += m.quantity;
      bucket.net += signedDelta(m);
    }
    return dayBuckets.map((day) => {
      const b = map.get(day)!;
      return { date: day, ...b };
    });
  }, [filteredMovements, dayBuckets]);

  const sparkSeries = useMemo(() => {
    const total = dailyByType.map((d) => ({ v: d.count }));
    const inSeries = dailyByType.map((d) => ({ v: d.in }));
    const outSeries = dailyByType.map((d) => ({ v: d.out }));
    const wasteSeries = dailyByType.map((d) => ({ v: d.waste + d.expired }));
    let running = 0;
    const netSeries = dailyByType.map((d) => {
      running += d.net;
      return { v: running };
    });
    return { total, inSeries, outSeries, wasteSeries, netSeries };
  }, [dailyByType]);

  const unitLabel = selectedItem?.unit ?? "units";

  const balanceChartData = useMemo(() => {
    if (!selectedItemId) return [];
    let running = 0;
    return dailyByType.map((d) => {
      running += d.net;
      return {
        date: d.date,
        in: d.in,
        out: -(d.out + d.waste + d.expired),
        balance: running,
      };
    });
  }, [dailyByType, selectedItemId]);

  const startingBalance = 0;
  const endingBalance = balanceChartData.length
    ? balanceChartData[balanceChartData.length - 1].balance
    : 0;

  const multiItemTopSeries = useMemo(() => {
    if (selectedItemId) return [];
    const itemCounts = new Map<number, number>();
    for (const m of filteredMovements) {
      const id = resolveItemId(m);
      if (!id) continue;
      itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1);
    }
    const topIds = [...itemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const perDay = new Map<string, Record<string, number>>();
    for (const day of dayBuckets) perDay.set(day, { date: day } as any);

    for (const m of filteredMovements) {
      const id = resolveItemId(m);
      if (!id || !topIds.includes(id)) continue;
      const key = toLocalDateKey(m.movementDate);
      const row = perDay.get(key);
      if (!row) continue;
      const name = itemMap.get(id)?.name ?? `Item ${id}`;
      row[name] = ((row[name] as number) ?? 0) + signedDelta(m);
    }
    return {
      data: [...perDay.values()],
      keys: topIds.map((id) => itemMap.get(id)?.name ?? `Item ${id}`),
    } as { data: any[]; keys: string[] };
  }, [filteredMovements, selectedItemId, itemMap, dayBuckets]);

  const typeDistribution = useMemo(() => {
    const entries: Array<{ name: string; value: number; type: StockMovementType }> = [];
    for (const t of TYPE_ORDER) {
      const count = filteredMovements.filter((m) => m.movementType === t).length;
      if (count > 0) entries.push({ name: TYPE_META[t].label, value: count, type: t });
    }
    return entries;
  }, [filteredMovements]);

  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const pieFillForType = (t: StockMovementType): string => {
    if (t === StockMovementType.IN) return "hsl(var(--chart-1))";
    if (t === StockMovementType.OUT) return "hsl(var(--chart-2))";
    if (t === StockMovementType.ADJUSTMENT) return "hsl(var(--chart-3))";
    if (t === StockMovementType.TRANSFER) return "hsl(var(--chart-4))";
    return "hsl(var(--chart-5))";
  };

  const resetFilters = () => {
    setSelectedItemId("");
    setActiveTypes(new Set());
  };

  const toggleType = (t: StockMovementType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const openMovement = openMovementId
    ? allMovements.find((m) => m.id === openMovementId)
    : undefined;

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Stock movement deleted");
      if (openMovementId === id) setOpenMovementId(null);
    } catch (error) {
      toast.error("Failed to delete stock movement");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} stock movement(s) deleted`);
    } catch (error) {
      toast.error("Failed to delete stock movements");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: StockMovement[]) => {
    const rows = [
      ["Item", "Type", "Quantity", "Unit", "Location", "Date", "Reference"].join(","),
      ...data.map((m) => {
        const id = resolveItemId(m as MovementWithIngredient);
        return [
          id ? itemMap.get(id)?.name ?? "" : "",
          m.movementType,
          m.quantity,
          m.unit,
          m.location ?? "",
          m.movementDate,
          m.referenceType ? `${m.referenceType} #${m.referenceId ?? ""}` : "",
        ].join(",");
      }),
    ].join("\n");
    navigator.clipboard.writeText(rows);
    toast.success(`${data.length} movement(s) copied`);
  };

  const handleBulkExport = (data: StockMovement[]) => {
    const csv = [
      ["Item", "Type", "Quantity", "Unit", "Location", "Date", "Reference"].join(","),
      ...data.map((m) => {
        const id = resolveItemId(m as MovementWithIngredient);
        return [
          id ? itemMap.get(id)?.name ?? "" : "",
          m.movementType,
          m.quantity,
          m.unit,
          m.location ?? "",
          m.movementDate,
          m.referenceType ? `${m.referenceType} #${m.referenceId ?? ""}` : "",
        ].join(",");
      }),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} movement(s) exported`);
  };

  const columns: ColumnDef<StockMovement>[] = useMemo(
    () => [
      {
        accessorKey: "itemId",
        header: "Item",
        cell: ({ row }) => {
          const id = resolveItemId(row.original as MovementWithIngredient);
          const item = id ? itemMap.get(id) : undefined;
          return (
            <div className="flex items-center gap-2">
              <ItemAvatar name={item?.name ?? "?"} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {item?.name ?? <span className="text-muted-foreground">—</span>}
                </div>
                {item?.unit ? (
                  <div className="text-xs text-muted-foreground">{item.unit}</div>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "movementType",
        header: "Type",
        cell: ({ row }) => {
          const t = row.original.movementType;
          const meta = TYPE_META[t];
          const Icon = meta.icon;
          return (
            <Badge
              variant="outline"
              className={cn("gap-1 border-transparent", meta.tint)}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
              <Icon className="h-3 w-3" />
              {movementTypeLabels[t] ?? meta.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "quantity",
        header: () => <div className="text-right">Quantity</div>,
        cell: ({ row }) => {
          const m = row.original;
          const signed = signedDelta(m);
          const cls =
            signed > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : signed < 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-muted-foreground";
          const display =
            m.movementType === StockMovementType.TRANSFER
              ? `${formatNumber(m.quantity)} ${m.unit}`
              : `${formatSignedNumber(signed)} ${m.unit}`;
          return (
            <div className={cn("text-right font-semibold tabular-nums", cls)}>
              {display}
            </div>
          );
        },
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) =>
          row.original.location ? (
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {row.original.location}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "movementDate",
        header: "Date",
        cell: ({ row }) => (
          <TooltipProvider delayDuration={200}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-sm">
                  {formatRelative(row.original.movementDate)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {formatDateTime(row.original.movementDate)}
              </TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        ),
      },
      {
        accessorKey: "referenceType",
        header: "Reference",
        cell: ({ row }) => {
          const refType = row.original.referenceType;
          const refId = row.original.referenceId;
          if (!refType) {
            return <span className="text-muted-foreground">—</span>;
          }
          const href = referenceHref(refType, refId);
          const label = `${prettyReferenceLabel(refType)}${refId ? ` #${refId}` : ""}`;
          if (href) {
            return (
              <Link
                href={href}
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-primary hover:underline"
              >
                {label}
              </Link>
            );
          }
          return <span className="text-sm">{label}</span>;
        },
      },
      {
        id: "__chevron",
        header: "",
        cell: () => (
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        ),
      },
    ],
    [itemMap, movementTypeLabels]
  );

  const hasActiveFilters = selectedItemId !== "" || activeTypes.size > 0;
  const showInitialEmpty = !isLoading && allMovements.length === 0 && !hasActiveFilters;
  const showFilteredEmpty =
    !isLoading && filteredMovements.length === 0 && hasActiveFilters;

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-20 -mx-4 border-b bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Stock movements
              {selectedItem ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {selectedItem.name}
                </span>
              ) : null}
            </h1>
            <p className="text-xs text-muted-foreground">
              {formatDate(dateRange.startDate)} → {formatDate(dateRange.endDate)} ·{" "}
              {formatNumber(totalCount)} movements
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ItemCombobox
              items={items}
              selectedId={selectedItemId}
              onSelect={setSelectedItemId}
            />
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={resetFilters}
              >
                <X className="mr-1 h-4 w-4" />
                Reset
              </Button>
            ) : null}
            <Button asChild size="sm" className="h-9">
              <Link href="/stock-movements/create">
                <Plus className="mr-1 h-4 w-4" />
                New movement
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TYPE_ORDER.map((t) => (
            <TypeChip
              key={t}
              type={t}
              active={activeTypes.has(t)}
              onClick={() => toggleType(t)}
              count={typeCounts.get(t)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              title="Total movements"
              value={formatNumber(kpi.total)}
              subtitle="All tracked entries"
              icon={ArrowUpDown}
              tintClass="bg-primary/10 text-primary"
              sparkData={sparkSeries.total}
              sparkColor="hsl(var(--chart-1))"
              delta={deltaPct(kpi.total, prevKpi.total)}
            />
            <KpiCard
              title="Stock in"
              value={formatNumber(kpi.inCount)}
              subtitle={`${formatNumber(kpi.inQty)} ${unitLabel} received`}
              icon={TrendingUp}
              tintClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              sparkData={sparkSeries.inSeries}
              sparkColor="hsl(var(--chart-1))"
              delta={deltaPct(kpi.inCount, prevKpi.inCount)}
            />
            <KpiCard
              title="Stock out"
              value={formatNumber(kpi.outCount)}
              subtitle={`${formatNumber(kpi.outQty)} ${unitLabel} used`}
              icon={TrendingDown}
              tintClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              sparkData={sparkSeries.outSeries}
              sparkColor="hsl(var(--chart-2))"
              delta={deltaPct(kpi.outCount, prevKpi.outCount)}
            />
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Waste / Expired
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Trash2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Waste</div>
                    <div className="text-lg font-bold">
                      {formatNumber(kpi.wasteCount)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({formatNumber(kpi.wasteQty)} {unitLabel})
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Expired</div>
                    <div className="text-lg font-bold">
                      {formatNumber(kpi.expiredCount)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({formatNumber(kpi.expiredQty)} {unitLabel})
                      </span>
                    </div>
                  </div>
                </div>
                <Sparkline
                  data={sparkSeries.wasteSeries}
                  colorVar="hsl(var(--chart-5))"
                />
              </CardContent>
            </Card>
            <KpiCard
              title="Net variation"
              value={
                <span
                  className={cn(
                    kpi.net > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : kpi.net < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : ""
                  )}
                >
                  {formatSignedNumber(kpi.net)} {unitLabel}
                </span>
              }
              subtitle="IN − OUT − waste − expired + ADJ"
              icon={Scale}
              tintClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              sparkData={sparkSeries.netSeries}
              sparkColor="hsl(var(--chart-3))"
              delta={deltaPct(kpi.net, prevKpi.net)}
            />
          </>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
      ) : selectedItemId && selectedItem ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Stock variation · {selectedItem.name}</CardTitle>
                <CardDescription>
                  Running balance + daily IN/OUT across selected period
                </CardDescription>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Start
                  </div>
                  <div className="font-semibold tabular-nums">
                    {formatSignedNumber(startingBalance)} {selectedItem.unit}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    End
                  </div>
                  <div
                    className={cn(
                      "font-semibold tabular-nums",
                      endingBalance > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : endingBalance < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : ""
                    )}
                  >
                    {formatSignedNumber(endingBalance)} {selectedItem.unit}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {balanceChartData.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <Inbox className="h-8 w-8" />
                <div>No movements in this period</div>
                {hasActiveFilters ? (
                  <Button variant="link" size="sm" onClick={resetFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={balanceChartData}>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    formatter={(value: number, key: string) => [
                      `${formatSignedNumber(Math.abs(value) === value && key === "out" ? -value : value)} ${selectedItem.unit}`,
                      key === "in" ? "IN" : key === "out" ? "OUT" : "Balance",
                    ]}
                    labelFormatter={(v) => formatDate(v)}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    yAxisId="left"
                    y={0}
                    stroke="hsl(var(--border))"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="in"
                    name="IN"
                    fill="hsl(var(--chart-1))"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="out"
                    name="OUT"
                    fill="hsl(var(--chart-5))"
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daily net variation · top 5 items</CardTitle>
              <CardDescription>
                Stacked daily net change by item (IN − OUT − waste)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {multiItemTopSeries && (multiItemTopSeries as any).data?.length ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={(multiItemTopSeries as any).data}>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(v) => formatDate(v)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    {(multiItemTopSeries as any).keys.map((k: string, i: number) => (
                      <Bar
                        key={k}
                        dataKey={k}
                        stackId="a"
                        fill={chartColors[i % chartColors.length]}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Inbox className="h-8 w-8" />
                  <div>No movements in this period</div>
                  {hasActiveFilters ? (
                    <Button variant="link" size="sm" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Distribution</CardTitle>
              <CardDescription>Movements by type</CardDescription>
            </CardHeader>
            <CardContent>
              {typeDistribution.length ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {typeDistribution.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={pieFillForType(entry.type)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-muted-foreground">
                  <Inbox className="h-8 w-8" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showInitialEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold">No stock movements yet</div>
              <div className="text-sm text-muted-foreground">
                Create your first movement to start tracking inventory.
              </div>
            </div>
            <Button asChild>
              <Link href="/stock-movements/create">
                <Plus className="mr-1 h-4 w-4" />
                Create first movement
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : showFilteredEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Filter className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">
              No movements match your filters
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTablePage
          title=""
          description=""
          data={filteredMovements}
          columns={columns}
          loading={isLoading}
          onRowClick={(movement) => setOpenMovementId(movement.id)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "itemId", label: "Item", type: "select" },
            { value: "movementType", label: "Movement Type", type: "select" },
            { value: "quantity", label: "Quantity" },
            { value: "location", label: "Location", type: "select" },
            { value: "movementDate", label: "Date" },
            { value: "referenceType", label: "Reference Type", type: "select" },
          ]}
          sortColumns={[
            { value: "itemId", label: "Item", type: "numeric" },
            { value: "movementType", label: "Movement Type", type: "character varying" },
            { value: "quantity", label: "Quantity", type: "numeric" },
            { value: "location", label: "Location", type: "character varying" },
            { value: "movementDate", label: "Date", type: "timestamp" },
            { value: "referenceType", label: "Reference Type", type: "character varying" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="stock-movements"
          searchFields={["location", "notes"]}
        />
      )}

      <Sheet
        open={!!openMovement}
        onOpenChange={(open) => {
          if (!open) setOpenMovementId(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-md">
          {openMovement ? (
            <MovementDetail
              movement={openMovement}
              item={
                (() => {
                  const id = resolveItemId(openMovement as MovementWithIngredient);
                  return id ? itemMap.get(id) : undefined;
                })()
              }
              allMovements={allMovements}
              selectedItemId={selectedItemId}
              dayBuckets={dayBuckets}
              onDelete={async () => {
                await handleDelete(openMovement.id);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MovementDetail({
  movement,
  item,
  allMovements,
  selectedItemId,
  dayBuckets,
  onDelete,
}: {
  movement: StockMovement;
  item?: Item;
  allMovements: MovementWithIngredient[];
  selectedItemId: string;
  dayBuckets: string[];
  onDelete: () => Promise<void>;
}) {
  const meta = TYPE_META[movement.movementType];
  const Icon = meta.icon;
  const signed = signedDelta(movement);

  const itemIdForSpark =
    resolveItemId(movement as MovementWithIngredient) ?? undefined;

  const sparkData = useMemo(() => {
    const per = new Map<string, number>();
    for (const d of dayBuckets) per.set(d, 0);
    for (const m of allMovements) {
      const id = resolveItemId(m);
      if (itemIdForSpark && id !== itemIdForSpark) continue;
      const key = toLocalDateKey(m.movementDate);
      if (!per.has(key)) continue;
      per.set(key, (per.get(key) ?? 0) + signedDelta(m));
    }
    let running = 0;
    const movementDay = toLocalDateKey(movement.movementDate);
    return dayBuckets.map((d) => {
      running += per.get(d) ?? 0;
      return { date: d, v: running, marker: d === movementDay ? running : null };
    });
  }, [allMovements, dayBuckets, itemIdForSpark, movement.movementDate]);

  const href = referenceHref(movement.referenceType, movement.referenceId);
  const label = movement.referenceType
    ? `${prettyReferenceLabel(movement.referenceType)}${movement.referenceId ? ` #${movement.referenceId}` : ""}`
    : null;

  return (
    <>
      <SheetHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1 border-transparent", meta.tint)}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            #{movement.id}
          </span>
        </div>
        <SheetTitle className="text-xl">
          {item?.name ?? "Stock movement"}
        </SheetTitle>
        <div
          className={cn(
            "text-3xl font-bold tabular-nums",
            signed > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : signed < 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-muted-foreground"
          )}
        >
          {movement.movementType === StockMovementType.TRANSFER
            ? `${formatNumber(movement.quantity)} ${movement.unit}`
            : `${formatSignedNumber(signed)} ${movement.unit}`}
        </div>
        <SheetDescription className="sr-only">
          Stock movement details
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 py-4">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Running balance
            {selectedItemId ? "" : " (all items)"}
          </div>
          <div style={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id="bal-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={1.5}
                  fill="url(#bal-grad)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="marker"
                  stroke="hsl(var(--primary))"
                  strokeWidth={0}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b pb-2">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="text-right">{formatDateTime(movement.movementDate)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b pb-2">
            <dt className="text-muted-foreground">Location</dt>
            <dd className="text-right">
              {movement.location ?? <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b pb-2">
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="text-right">
              {href ? (
                <Link href={href} className="text-primary hover:underline">
                  {label}
                </Link>
              ) : (
                label ?? <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b pb-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd className="text-right">{formatDateTime(movement.createdAt)}</dd>
          </div>
          {movement.notes ? (
            <div className="space-y-1 pt-2">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="whitespace-pre-wrap rounded-md bg-muted p-2 text-sm">
                {movement.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/stock-movements/${movement.id}`}>Full page</Link>
          </Button>
          {item ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/items/${item.id}`}>Open item</Link>
            </Button>
          ) : null}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Delete this stock movement?")) void onDelete();
          }}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </SheetFooter>
    </>
  );
}
