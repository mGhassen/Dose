"use client";

import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStockMovements } from "@kit/hooks";
import type { StockMovement } from "@kit/types";
import { StockMovementType } from "@kit/types";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { formatDate } from "@kit/lib/date-format";
import { dateToYYYYMMDD, parseYYYYMMDDToLocalDate } from "@kit/lib/date-utils";

const numberFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function formatNumber(n: number): string {
  return numberFmt.format(n);
}

function signedDelta(m: StockMovement): number {
  if (m.movementType === StockMovementType.IN) return m.quantity;
  if (
    m.movementType === StockMovementType.OUT ||
    m.movementType === StockMovementType.WASTE ||
    m.movementType === StockMovementType.EXPIRED
  ) {
    return -m.quantity;
  }
  if (m.movementType === StockMovementType.TRANSFER) return 0;
  return m.quantity;
}

function normLoc(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function eachDayInRange(startYmd: string, endYmd: string): string[] {
  const start = parseYYYYMMDDToLocalDate(startYmd);
  const end = parseYYYYMMDDToLocalDate(endYmd);
  const days: string[] = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(dateToYYYYMMDD(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

const COLOR_IN = "#10b981";
const COLOR_OUT = "#f43f5e";
const COLOR_BALANCE = "#8b5cf6";

type Props = {
  itemId: number;
  location: string | null | undefined;
  currentQuantity: number;
  unit: string;
};

export function StockVariationCharts({ itemId, location, currentQuantity, unit }: Props) {
  const balanceGradientId = `stockBal-${useId().replace(/:/g, "")}`;
  const [periodDays, setPeriodDays] = useState<30 | 90 | 180>(90);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (periodDays - 1));
    return {
      startDate: dateToYYYYMMDD(start),
      endDate: dateToYYYYMMDD(end),
    };
  }, [periodDays]);

  const loc = normLoc(location);
  const { data: movementsResponse, isLoading } = useStockMovements({
    itemId: String(itemId),
    startDate,
    endDate,
    limit: 5000,
    page: 1,
    ...(loc ? { location: loc } : {}),
  });

  const { dailyRows, truncated, startBalance, hasMovementsAtLocation } = useMemo(() => {
    const raw = (movementsResponse?.data ?? []) as StockMovement[];
    const total = movementsResponse?.pagination?.total ?? raw.length;
    const truncated = total > 5000;

    const filtered = raw.filter((m) => normLoc(m.location) === loc);
    const hasMovementsAtLocation = filtered.length > 0;

    const netByDay = new Map<string, number>();
    for (const m of filtered) {
      const key = toLocalDateKey(m.movementDate);
      const delta = signedDelta(m);
      netByDay.set(key, (netByDay.get(key) ?? 0) + delta);
    }

    const days = eachDayInRange(startDate, endDate);
    let sumNet = 0;
    const dailyRows = days.map((date) => {
      const net = netByDay.get(date) ?? 0;
      sumNet += net;
      return { date, net };
    });

    const startBalance = currentQuantity - sumNet;
    return { dailyRows, truncated, startBalance, hasMovementsAtLocation };
  }, [movementsResponse, startDate, endDate, loc, currentQuantity]);

  const balanceRows = useMemo(() => {
    let b = startBalance;
    return dailyRows.map((row) => {
      b += row.net;
      return { ...row, balance: b };
    });
  }, [dailyRows, startBalance]);

  const xTickFormatter = (v: string) =>
    new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Stock variation</CardTitle>
            <CardDescription>
              Daily changes and balance for this location, from recorded movements ({formatDate(startDate)} →{" "}
              {formatDate(endDate)}).
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-1">
            {([30, 90, 180] as const).map((d) => (
              <Button
                key={d}
                type="button"
                variant={periodDays === d ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setPeriodDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>
        {truncated && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Showing the latest 5,000 movements in range; totals may be incomplete if there are more.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading charts…</div>
        ) : (
          <>
            <div>
              <h3 className="mb-2 text-sm font-medium">Daily net change</h3>
              {!hasMovementsAtLocation ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No movements at this location in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={xTickFormatter}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatNumber(v)}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(v) => formatDate(v as string)}
                      formatter={(value: number) => [`${formatNumber(value)} ${unit}`, "Net"]}
                    />
                    <Bar dataKey="net" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {dailyRows.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.net >= 0 ? COLOR_IN : COLOR_OUT}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Balance at location</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={balanceRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={balanceGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_BALANCE} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLOR_BALANCE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={xTickFormatter}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatNumber(v)}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(v) => formatDate(v as string)}
                    formatter={(value: number) => [`${formatNumber(value)} ${unit}`, "Balance"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke={COLOR_BALANCE}
                    strokeWidth={2}
                    fill={`url(#${balanceGradientId})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
