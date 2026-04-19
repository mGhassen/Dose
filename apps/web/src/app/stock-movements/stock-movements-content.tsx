"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";
import {
  useStockMovements,
  useStockMovementsAnalytics,
  useStockMovementById,
  useDeleteStockMovement,
  useItemById,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
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
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(20);
  const [openMovementId, setOpenMovementId] = useState<number | null>(() => {
    const raw = urlSearchParams.get("open");
    return raw ? Number(raw) : null;
  });
  const [analyticsTab, setAnalyticsTab] = useState<string>(
    urlSearchParams.get("itemId") ? "balance" : "activity"
  );

  useEffect(() => {
    if (selectedItemId) setAnalyticsTab((prev) => (prev === "activity" ? "balance" : prev));
    else setAnalyticsTab((prev) => (prev === "balance" ? "activity" : prev));
  }, [selectedItemId]);

  useEffect(() => {
    setTablePage(1);
  }, [
    dateRange.startDate,
    dateRange.endDate,
    selectedItemId,
    activeTypes,
  ]);

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

  const activeTypesCsv = useMemo(
    () => [...activeTypes].join(","),
    [activeTypes]
  );
  
  const { data: tableResponse } = useStockMovements({
    page: tablePage,
    limit: tablePageSize,
    itemId: selectedItemId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    movementType: activeTypesCsv || undefined,
  });

  const prevRange = useMemo(() => shiftRangeBack(dateRange), [dateRange]);

  const { data: analytics, isLoading: isLoadingAnalytics } = useStockMovementsAnalytics({
    itemId: selectedItemId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    movementType: activeTypesCsv || undefined,
  });

  const { data: analyticsAll } = useStockMovementsAnalytics({
    itemId: selectedItemId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: analyticsPrev } = useStockMovementsAnalytics({
    itemId: selectedItemId || undefined,
    startDate: prevRange.startDate,
    endDate: prevRange.endDate,
    movementType: activeTypesCsv || undefined,
  });

  const isLoading = isLoadingAnalytics;

  const { data: itemsResponse } = useItems({ limit: 1000, excludeCatalogParents: true });
  const items: Item[] = itemsResponse?.data ?? [];
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const selectedItemFromList = useMemo(
    () => (selectedItemId ? itemMap.get(Number(selectedItemId)) : undefined),
    [itemMap, selectedItemId]
  );
  const { data: selectedItemFetched } = useItemById(
    selectedItemId && !selectedItemFromList ? selectedItemId : ""
  );
  const selectedItem = selectedItemFromList ?? selectedItemFetched ?? undefined;

  const tableMovements: MovementWithIngredient[] =
    (tableResponse?.data as MovementWithIngredient[]) || [];

  const totalCount = analyticsAll?.totals?.total_count ?? 0;
  const tableTotalCount = tableResponse?.pagination?.total ?? 0;
  const tableTotalPages = tableResponse?.pagination?.totalPages ?? 0;

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
    for (const t of analyticsAll?.by_type ?? []) {
      m.set(t.type as StockMovementType, t.count);
    }
    return m;
  }, [analyticsAll]);

  const kpi = useMemo(() => {
    const t = analytics?.totals;
    return {
      inCount: t?.count_in ?? 0,
      outCount: t?.count_out ?? 0,
      wasteCount: t?.count_waste ?? 0,
      expiredCount: t?.count_expired ?? 0,
      inQty: Number(t?.total_in_qty ?? 0),
      outQty: Number(t?.total_out_qty ?? 0),
      wasteQty: Number(t?.total_waste_qty ?? 0),
      expiredQty: Number(t?.total_expired_qty ?? 0),
      adjQty: Number(t?.total_adj_qty ?? 0),
      net: Number(t?.net ?? 0),
      total: t?.total_count ?? 0,
    };
  }, [analytics]);

  const prevKpi = useMemo(() => {
    const t = analyticsPrev?.totals;
    return {
      inCount: t?.count_in ?? 0,
      outCount: t?.count_out ?? 0,
      wasteCount: t?.count_waste ?? 0,
      expiredCount: t?.count_expired ?? 0,
      inQty: Number(t?.total_in_qty ?? 0),
      outQty: Number(t?.total_out_qty ?? 0),
      wasteQty: Number(t?.total_waste_qty ?? 0),
      expiredQty: Number(t?.total_expired_qty ?? 0),
      adjQty: Number(t?.total_adj_qty ?? 0),
      net: Number(t?.net ?? 0),
      total: t?.total_count ?? 0,
    };
  }, [analyticsPrev]);

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
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
          d.getUTCDate()
        ).padStart(2, "0")}`
      );
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return days;
  }, [dateRange.startDate, dateRange.endDate]);

  const dailyByType = useMemo(() => {
    const lookup = new Map(
      (analytics?.daily ?? []).map((d) => [d.date, d])
    );
    return dayBuckets.map((day) => {
      const d = lookup.get(day);
      return {
        date: day,
        in: Number(d?.qty_in ?? 0),
        out: Number(d?.qty_out ?? 0),
        waste: Number(d?.qty_waste ?? 0),
        expired: Number(d?.qty_expired ?? 0),
        adj: Number(d?.qty_adj ?? 0),
        count: Number(d?.count ?? 0),
        net: Number(d?.net ?? 0),
      };
    });
  }, [analytics, dayBuckets]);

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

  const multiItemTopSeries = useMemo(
    () => ({ data: [] as any[], keys: [] as string[] }),
    []
  );

  const typeDistribution = useMemo(() => {
    return TYPE_ORDER.map((t) => {
      const found = (analytics?.by_type ?? []).find((x) => x.type === t);
      return {
        name: TYPE_META[t].label,
        value: Number(found?.count ?? 0),
        type: t,
      };
    }).filter((e) => e.value > 0);
  }, [analytics]);

  const dailyActivity = useMemo(
    () =>
      dailyByType.map((d) => ({
        date: d.date,
        IN: d.in,
        OUT: -d.out,
        WASTE: -d.waste,
        EXPIRED: -d.expired,
        ADJ: d.adj,
      })),
    [dailyByType]
  );

  const categoryBreakdown = useMemo(
    () =>
      (analytics?.by_category ?? []).slice(0, 12).map((c) => ({
        name: c.name,
        in: Number(c.qty_in),
        out: Number(c.qty_out),
        net: Number(c.net),
        count: Number(c.count),
      })),
    [analytics]
  );

  const topItemsBreakdown = useMemo(
    () =>
      (analytics?.top_items ?? []).slice(0, 10).map((it) => ({
        id: it.item_id,
        name: it.name,
        unit: it.unit,
        in: Number(it.qty_in),
        out: Number(it.qty_out),
        net: Number(it.net),
        count: Number(it.count),
      })),
    [analytics]
  );

  const locationBreakdown = useMemo(
    () =>
      (analytics?.by_location ?? []).slice(0, 8).map((l) => ({
        name: l.name,
        value: Number(l.value),
      })),
    [analytics]
  );

  const heatmapData = useMemo(() => {
    if (dailyByType.length === 0) return { weeks: [], max: 0 };
    const max = Math.max(1, ...dailyByType.map((d) => d.count));
    const weeks: Array<{
      weekStart: string;
      cells: Array<{ date: string; count: number; intensity: number; weekday: number } | null>;
    }> = [];
    let currentWeek: { weekStart: string; cells: Array<any> } | null = null;
    for (const d of dailyByType) {
      const date = new Date(d.date);
      const wd = (date.getDay() + 6) % 7;
      if (wd === 0 || !currentWeek) {
        if (currentWeek) {
          while (currentWeek.cells.length < 7) currentWeek.cells.push(null);
          weeks.push(currentWeek);
        }
        currentWeek = { weekStart: d.date, cells: [] };
        while (currentWeek.cells.length < wd) currentWeek.cells.push(null);
      }
      currentWeek.cells.push({
        date: d.date,
        count: d.count,
        intensity: d.count / max,
        weekday: wd,
      });
    }
    if (currentWeek) {
      while (currentWeek.cells.length < 7) currentWeek.cells.push(null);
      weeks.push(currentWeek);
    }
    return { weeks, max };
  }, [dailyByType]);

  const weekdayBreakdown = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return labels.map((label, i) => {
      const dow = i + 1;
      const found = (analytics?.weekday ?? []).find((w) => w.dow === dow);
      return {
        name: label,
        count: Number(found?.count ?? 0),
        qty: Number(found?.qty ?? 0),
      };
    });
  }, [analytics]);

  const referenceBreakdown = useMemo(
    () =>
      (analytics?.by_reference ?? []).map((r) => ({
        name: r.name === "Manual" ? "Manual" : prettyReferenceLabel(r.name),
        value: Number(r.value),
      })),
    [analytics]
  );

  const COLOR_IN = "#10b981";
  const COLOR_OUT = "#f43f5e";
  const COLOR_BALANCE = "#8b5cf6";
  const COLOR_ADJ = "#f59e0b";
  const COLOR_TRANS = "#3b82f6";

  const chartColors = [COLOR_IN, COLOR_OUT, COLOR_BALANCE, COLOR_ADJ, COLOR_TRANS];

  const pieFillForType = (t: StockMovementType): string => {
    if (t === StockMovementType.IN) return COLOR_IN;
    if (t === StockMovementType.OUT) return COLOR_OUT;
    if (t === StockMovementType.ADJUSTMENT) return COLOR_ADJ;
    if (t === StockMovementType.TRANSFER) return COLOR_TRANS;
    return "#ef4444";
  };

  const xTickInterval = Math.max(0, Math.floor(dayBuckets.length / 12));

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

  const fromTable = openMovementId
    ? tableMovements.find((m) => m.id === openMovementId)
    : undefined;
  const { data: openMovementFetched } = useStockMovementById(
    openMovementId && !fromTable ? String(openMovementId) : ""
  );
  const openMovement = (fromTable ?? openMovementFetched) as
    | MovementWithIngredient
    | undefined;

  const detailItemId = openMovement
    ? resolveItemId(openMovement as MovementWithIngredient)
    : undefined;
  const { data: detailAnalytics } = useStockMovementsAnalytics(
    detailItemId
      ? {
          itemId: String(detailItemId),
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : undefined
  );
  const detailDailyForItem = useMemo(() => {
    if (!detailAnalytics?.daily) return [];
    return detailAnalytics.daily.map((d) => ({
      date: d.date,
      net: Number(d.net ?? 0),
    }));
  }, [detailAnalytics]);

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
  const showInitialEmpty =
    !isLoading && (analyticsAll?.totals?.total_count ?? 0) === 0 && !hasActiveFilters;
  const showFilteredEmpty =
    !isLoading && (analytics?.totals?.total_count ?? 0) === 0 && hasActiveFilters;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
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
              sparkColor={COLOR_BALANCE}
              delta={deltaPct(kpi.total, prevKpi.total)}
            />
            <KpiCard
              title="Stock in"
              value={formatNumber(kpi.inCount)}
              subtitle={`${formatNumber(kpi.inQty)} ${unitLabel} received`}
              icon={TrendingUp}
              tintClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              sparkData={sparkSeries.inSeries}
              sparkColor={COLOR_IN}
              delta={deltaPct(kpi.inCount, prevKpi.inCount)}
            />
            <KpiCard
              title="Stock out"
              value={formatNumber(kpi.outCount)}
              subtitle={`${formatNumber(kpi.outQty)} ${unitLabel} used`}
              icon={TrendingDown}
              tintClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              sparkData={sparkSeries.outSeries}
              sparkColor={COLOR_OUT}
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
                  colorVar="#ef4444"
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
              sparkColor={COLOR_BALANCE}
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
      ) : (
        <AnalyticsBlock
          activeTab={analyticsTab}
          onTabChange={setAnalyticsTab}
          selectedItemId={selectedItemId}
          selectedItem={selectedItem}
          balanceChartData={balanceChartData}
          startingBalance={startingBalance}
          endingBalance={endingBalance}
          dailyActivity={dailyActivity}
          multiItemTopSeries={multiItemTopSeries as any}
          categoryBreakdown={categoryBreakdown}
          topItemsBreakdown={topItemsBreakdown}
          locationBreakdown={locationBreakdown}
          referenceBreakdown={referenceBreakdown}
          heatmapData={heatmapData}
          weekdayBreakdown={weekdayBreakdown}
          typeDistribution={typeDistribution}
          chartColors={chartColors}
          pieFillForType={pieFillForType}
          xTickInterval={xTickInterval}
          unitLabel={unitLabel}
          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}
          colorIn={COLOR_IN}
          colorOut={COLOR_OUT}
          colorBalance={COLOR_BALANCE}
          colorAdj={COLOR_ADJ}
        />
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
          data={tableMovements}
          columns={columns}
          loading={isLoading}
          onRowClick={(movement) => setOpenMovementId(movement.id)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          pagination={{
            page: tablePage,
            pageSize: tablePageSize,
            totalCount: tableTotalCount,
            totalPages: tableTotalPages,
            onPageChange: setTablePage,
            onPageSizeChange: (newSize) => {
              setTablePageSize(newSize);
              setTablePage(1);
            },
          }}
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
              dailyForItem={detailDailyForItem}
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

type AnalyticsBlockProps = {
  activeTab: string;
  onTabChange: (v: string) => void;
  selectedItemId: string;
  selectedItem?: Item;
  balanceChartData: Array<{ date: string; in: number; out: number; balance: number }>;
  startingBalance: number;
  endingBalance: number;
  dailyActivity: Array<{
    date: string;
    IN: number;
    OUT: number;
    WASTE: number;
    EXPIRED: number;
    ADJ: number;
  }>;
  multiItemTopSeries: { data: any[]; keys: string[] } | any[];
  categoryBreakdown: Array<{ name: string; in: number; out: number; net: number; count: number }>;
  topItemsBreakdown: Array<{
    id: number;
    name: string;
    unit: string;
    in: number;
    out: number;
    net: number;
    count: number;
  }>;
  locationBreakdown: Array<{ name: string; value: number }>;
  referenceBreakdown: Array<{ name: string; value: number }>;
  heatmapData: {
    weeks: Array<{
      weekStart: string;
      cells: Array<{ date: string; count: number; intensity: number; weekday: number } | null>;
    }>;
    max: number;
  };
  weekdayBreakdown: Array<{ name: string; count: number; qty: number }>;
  typeDistribution: Array<{ name: string; value: number; type: StockMovementType }>;
  chartColors: string[];
  pieFillForType: (t: StockMovementType) => string;
  xTickInterval: number;
  unitLabel: string;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  colorIn: string;
  colorOut: string;
  colorBalance: string;
  colorAdj: string;
};

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

function EmptyChart({
  hasActiveFilters,
  resetFilters,
  message = "No movements in this period",
}: {
  hasActiveFilters: boolean;
  resetFilters: () => void;
  message?: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <Inbox className="h-8 w-8" />
      <div>{message}</div>
      {hasActiveFilters ? (
        <Button variant="link" size="sm" onClick={resetFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function AnalyticsBlock({
  activeTab,
  onTabChange,
  selectedItemId,
  selectedItem,
  balanceChartData,
  startingBalance,
  endingBalance,
  dailyActivity,
  multiItemTopSeries,
  categoryBreakdown,
  topItemsBreakdown,
  locationBreakdown,
  referenceBreakdown,
  heatmapData,
  weekdayBreakdown,
  typeDistribution,
  chartColors,
  pieFillForType,
  xTickInterval,
  unitLabel,
  hasActiveFilters,
  resetFilters,
  colorIn,
  colorOut,
  colorBalance,
  colorAdj,
}: AnalyticsBlockProps) {
  const xTickFormatter = (v: string) =>
    new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const totalDailyActivity = dailyActivity.reduce(
    (acc, d) => acc + d.IN + Math.abs(d.OUT) + Math.abs(d.WASTE) + Math.abs(d.EXPIRED) + Math.abs(d.ADJ),
    0
  );
  return (
            <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Stock analytics</CardTitle>
            <CardDescription>
              {selectedItemId
                ? `Detailed insights for ${selectedItem?.name ?? "…"}`
                : "Detailed insights across all items"}
            </CardDescription>
          </div>
          {selectedItemId && balanceChartData.length > 0 ? (
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Start</div>
                <div className="font-semibold tabular-nums">
                  {formatSignedNumber(startingBalance)} {unitLabel}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">End</div>
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
                  {formatSignedNumber(endingBalance)} {unitLabel}
                </div>
              </div>
            </div>
          ) : null}
        </div>
              </CardHeader>
              <CardContent>
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="activity">Daily activity</TabsTrigger>
            <TabsTrigger value="balance" disabled={!selectedItemId}>
              Running balance
            </TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="categories">By category</TabsTrigger>
            <TabsTrigger value="items" disabled={!!selectedItemId}>
              Top items
            </TabsTrigger>
            <TabsTrigger value="types">By type</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            {totalDailyActivity === 0 ? (
              <EmptyChart hasActiveFilters={hasActiveFilters} resetFilters={resetFilters} />
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={dailyActivity}
                  margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                  stackOffset="sign"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                    tickFormatter={xTickFormatter}
                    tick={{ fontSize: 11 }}
                    interval={xTickInterval}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                      <Tooltip 
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(v) => formatDate(v as string)}
                    formatter={(value: number, name: string) => [
                      `${formatSignedNumber(value)} ${selectedItem?.unit ?? unitLabel}`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Bar dataKey="IN" stackId="s" fill={colorIn} maxBarSize={18} />
                  <Bar dataKey="ADJ" stackId="s" fill={colorAdj} maxBarSize={18} />
                  <Bar dataKey="OUT" stackId="s" fill={colorOut} maxBarSize={18} />
                  <Bar dataKey="WASTE" stackId="s" fill="#ef4444" maxBarSize={18} />
                  <Bar dataKey="EXPIRED" stackId="s" fill="#a16207" maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="balance" className="mt-4">
            {!selectedItemId || balanceChartData.length === 0 ? (
              <EmptyChart
                hasActiveFilters={hasActiveFilters}
                resetFilters={resetFilters}
                message={
                  !selectedItemId
                    ? "Pick an item to see its running balance"
                    : "No movements in this period"
                }
              />
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart
                  data={balanceChartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colorBalance} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={colorBalance} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={xTickFormatter}
                    tick={{ fontSize: 11 }}
                    interval={xTickInterval}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatNumber(v)}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatNumber(v)}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(v) => formatDate(v as string)}
                    formatter={(value: number, key: string) => [
                      `${formatSignedNumber(value)} ${selectedItem?.unit ?? unitLabel}`,
                      key === "in" ? "IN" : key === "out" ? "OUT" : "Balance",
                    ]}
                    cursor={{ fill: "rgba(139, 92, 246, 0.08)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                  <ReferenceLine yAxisId="right" y={0} stroke="hsl(var(--border))" />
                  <Area
                    yAxisId="right"
                              type="monotone" 
                    dataKey="balance"
                    name="Balance"
                    stroke={colorBalance}
                    strokeWidth={2.5}
                    fill="url(#balanceGradient)"
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="in"
                    name="IN"
                    fill={colorIn}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={14}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="out"
                    name="OUT"
                    fill={colorOut}
                    radius={[0, 0, 3, 3]}
                    maxBarSize={14}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            {categoryBreakdown.length === 0 ? (
              <EmptyChart hasActiveFilters={hasActiveFilters} resetFilters={resetFilters} />
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(280, categoryBreakdown.length * 36)}
              >
                <BarChart
                  data={categoryBreakdown}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [
                      `${formatNumber(value)}`,
                      name === "in" ? "IN" : name === "out" ? "OUT" : name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Bar dataKey="in" name="IN" stackId="c" fill={colorIn} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="out" name="OUT" stackId="c" fill={colorOut} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            {topItemsBreakdown.length === 0 ? (
              <EmptyChart hasActiveFilters={hasActiveFilters} resetFilters={resetFilters} />
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  Top {topItemsBreakdown.length} items by movement count · IN (right) vs OUT (left)
                </div>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(320, topItemsBreakdown.length * 40)}
                >
                  <BarChart
                    data={topItemsBreakdown.map((it) => ({
                      ...it,
                      inSigned: it.in,
                      outSigned: -it.out,
                    }))}
                    layout="vertical"
                    margin={{ top: 8, right: 32, left: 16, bottom: 8 }}
                    stackOffset="sign"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatNumber(Math.abs(v))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={180}
                    />
                    <ReferenceLine x={0} stroke="hsl(var(--border))" />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number, name: string, p: any) => {
                        const unit = p?.payload?.unit ?? "";
                        return [
                          `${formatNumber(Math.abs(value))} ${unit}`,
                          name === "outSigned" ? "OUT" : "IN",
                        ];
                      }}
                      labelFormatter={(label, payload) => {
                        const row: any = payload?.[0]?.payload;
                        if (!row) return label as string;
                        return `${row.name} · ${formatNumber(row.count)} movements · net ${formatSignedNumber(
                          row.net
                        )} ${row.unit}`;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar
                      dataKey="outSigned"
                      name="OUT"
                      stackId="t"
                      fill={colorOut}
                      radius={[4, 0, 0, 4]}
                    />
                    <Bar
                      dataKey="inSigned"
                      name="IN"
                      stackId="t"
                      fill={colorIn}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="heatmap" className="mt-4">
            {heatmapData.weeks.length === 0 || heatmapData.max === 0 ? (
              <EmptyChart hasActiveFilters={hasActiveFilters} resetFilters={resetFilters} />
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Activity calendar
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Max: {heatmapData.max} movements / day
                    </div>
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <TooltipProvider delayDuration={100}>
                      <div className="flex gap-1">
                        <div className="flex flex-col gap-1 pr-2 text-[10px] text-muted-foreground">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                            <div
                              key={d}
                              className={cn("h-4 leading-4", i % 2 === 1 ? "opacity-0" : "")}
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                        {heatmapData.weeks.map((w, wi) => (
                          <div key={wi} className="flex flex-col gap-1">
                            {w.cells.map((cell, di) => {
                              if (!cell) {
                                return (
                                  <div
                                    key={di}
                                    className="h-4 w-4 rounded-sm bg-muted/30"
                                  />
                                );
                              }
                              const opacity = cell.count === 0 ? 0.08 : 0.15 + 0.85 * cell.intensity;
                              return (
                                <UiTooltip key={di}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="h-4 w-4 cursor-pointer rounded-sm ring-1 ring-inset ring-black/5 transition hover:ring-2 hover:ring-violet-400"
                                      style={{
                                        background:
                                          cell.count === 0
                                            ? "hsl(var(--muted))"
                                            : `rgba(139, 92, 246, ${opacity})`,
                                      }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <div className="font-medium">{formatDate(cell.date)}</div>
                                      <div className="text-muted-foreground">
                                        {cell.count} movement{cell.count === 1 ? "" : "s"}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </UiTooltip>
                          );
                        })}
                          </div>
                        ))}
                      </div>
                    </TooltipProvider>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Less</span>
                    {[0.1, 0.3, 0.55, 0.8, 1].map((o) => (
                      <div
                        key={o}
                        className="h-3 w-3 rounded-sm"
                        style={{ background: `rgba(139, 92, 246, ${o})` }}
                      />
                    ))}
                    <span>More</span>
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
                    By day of week
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={weekdayBreakdown}
                      margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number) => [
                          `${formatNumber(value)} movements`,
                          "",
                        ]}
                      />
                      <Bar
                        dataKey="count"
                        fill={colorBalance}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                  </div>
                )}
          </TabsContent>

          <TabsContent value="types" className="mt-4">
            {typeDistribution.length === 0 ? (
              <EmptyChart hasActiveFilters={hasActiveFilters} resetFilters={resetFilters} />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                      data={typeDistribution}
                        dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      >
                      {typeDistribution.map((entry) => (
                        <Cell key={entry.type} fill={pieFillForType(entry.type)} />
                        ))}
                      </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    By reference source
                  </div>
                  {referenceBreakdown.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {referenceBreakdown.map((r, i) => {
                        const total = referenceBreakdown.reduce((a, b) => a + b.value, 0) || 1;
                        const pct = Math.round((r.value / total) * 100);
                        return (
                          <li key={r.name} className="flex items-center gap-3 text-sm">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: chartColors[i % chartColors.length] }}
                            />
                            <span className="flex-1 truncate">{r.name}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {formatNumber(r.value)}
                            </span>
                            <span className="w-10 text-right tabular-nums text-muted-foreground">
                              {pct}%
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
          </div>
              </div>
            )}
        </TabsContent>

          <TabsContent value="locations" className="mt-4">
            {locationBreakdown.length === 0 ? (
              <EmptyChart hasActiveFilters={hasActiveFilters} resetFilters={resetFilters} />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={locationBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {locationBreakdown.map((_, i) => (
                        <Cell key={i} fill={chartColors[i % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Top locations
                  </div>
                  <ul className="space-y-1.5">
                    {locationBreakdown.map((r, i) => {
                      const total = locationBreakdown.reduce((a, b) => a + b.value, 0) || 1;
                      const pct = Math.round((r.value / total) * 100);
                        return (
                        <li key={r.name} className="flex items-center gap-3 text-sm">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: chartColors[i % chartColors.length] }}
                          />
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="flex-1 truncate">{r.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatNumber(r.value)}
                          </span>
                          <span className="w-10 text-right tabular-nums text-muted-foreground">
                            {pct}%
                          </span>
                        </li>
                        );
                      })}
                  </ul>
                </div>
                </div>
              )}
          </TabsContent>
        </Tabs>
            </CardContent>
          </Card>
  );
}

function MovementDetail({
  movement,
  item,
  dailyForItem,
  selectedItemId,
  dayBuckets,
  onDelete,
}: {
  movement: StockMovement;
  item?: Item;
  dailyForItem: Array<{ date: string; net: number }>;
  selectedItemId: string;
  dayBuckets: string[];
  onDelete: () => Promise<void>;
}) {
  const meta = TYPE_META[movement.movementType];
  const Icon = meta.icon;
  const signed = signedDelta(movement);

  const sparkData = useMemo(() => {
    const per = new Map(dailyForItem.map((d) => [d.date, d.net]));
    let running = 0;
    const movementDay = toLocalDateKey(movement.movementDate);
    return dayBuckets.map((d) => {
      running += per.get(d) ?? 0;
      return { date: d, v: running, marker: d === movementDay ? running : null };
    });
  }, [dailyForItem, dayBuckets, movement.movementDate]);

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
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  fill="url(#bal-grad)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="marker"
                  stroke="#8b5cf6"
                  strokeWidth={0}
                  dot={{ r: 4, fill: "#8b5cf6" }}
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
