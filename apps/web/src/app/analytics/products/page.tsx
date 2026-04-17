"use client";

import AppLayout from "@/components/app-layout";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";
import { Alert, AlertDescription, AlertTitle } from "@kit/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kit/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@kit/lib/config";
import { useProductAnalytics, type MenuClassification } from "@kit/hooks";
import Link from "next/link";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];

function ItemLink({ itemId, name }: { itemId: number; name: string }) {
  return (
    <Link
      href={`/items/${itemId}`}
      className="font-medium text-primary hover:underline"
    >
      {name}
    </Link>
  );
}

const CLASS_COLORS: Record<MenuClassification, string> = {
  star: "#22c55e",
  plowhorse: "#eab308",
  puzzle: "#3b82f6",
  dog: "#94a3b8",
};

function classificationLabel(c: MenuClassification): string {
  switch (c) {
    case "star":
      return "Star";
    case "plowhorse":
      return "Plowhorse";
    case "puzzle":
      return "Puzzle";
    case "dog":
      return "Dog";
    default:
      return c;
  }
}

export default function ProductAnalyticsPage() {
  const { dateRange } = useDashboardPeriod();
  const pa = useProductAnalytics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    topN: 20,
    deadStockWindowDays: 30,
  });

  const topByRevenue = (pa.data?.products ?? []).slice(0, 20);
  const topByUnits = [...(pa.data?.products ?? [])].sort((a, b) => b.units - a.units).slice(0, 20);
  const topVelocity = [...(pa.data?.products ?? [])].sort((a, b) => b.unitsPerDay - a.unitsPerDay).slice(0, 20);
  const marginSorted = [...(pa.data?.menuMatrix ?? [])].sort((a, b) => b.marginContribution - a.marginContribution);
  const scatterData = (pa.data?.menuMatrix ?? []).map((p) => ({
    ...p,
    x: p.units,
    y: p.marginPct,
  }));
  const medians = pa.data?.summary.medians;
  const hotIcedChart = (pa.data?.hotIcedSplit ?? [])
    .filter((h) => h.hotRevenue > 0 || h.coldRevenue > 0)
    .slice(0, 12)
    .map((h) => ({
      name: h.name.length > 24 ? `${h.name.slice(0, 24)}…` : h.name,
      Hot: h.hotRevenue,
      Cold: h.coldRevenue,
    }));

  return (
    <AppLayout>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product analytics</h1>
            <p className="text-muted-foreground">Catalog, margin, menu engineering, and mix</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="velocity">Velocity & dead stock</TabsTrigger>
            <TabsTrigger value="mix">Mix & modifiers</TabsTrigger>
            <TabsTrigger value="daypart">Daypart</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {pa.isLoading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(pa.data?.summary.totalRevenue ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Units sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(pa.data?.summary.totalUnits ?? 0).toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Gross margin</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(pa.data?.summary.totalMargin ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg margin %</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{pa.data?.summary.avgMarginPct ?? 0}%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Products sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{pa.data?.summary.uniqueProductsSold ?? 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">COGS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(pa.data?.summary.totalCOGS ?? 0)}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Category mix</CardTitle>
                      <CardDescription>Share of revenue by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pa.data?.categoryMix && pa.data.categoryMix.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <Pie
                              data={pa.data.categoryMix}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ category, pct }) => `${category}: ${pct}%`}
                              outerRadius={100}
                              dataKey="revenue"
                              nameKey="category"
                            >
                              {pa.data.categoryMix.map((_, index) => (
                                <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-[320px] items-center justify-center text-muted-foreground">No data</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top products by revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[360px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topByRevenue.map((p) => (
                            <TableRow key={p.itemId}>
                              <TableCell>
                                <ItemLink itemId={p.itemId} name={p.name} />
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                              <TableCell className="text-right">{p.units.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Top by units (popularity)</CardTitle>
                    <CardDescription>Independent of price</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Units</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topByUnits.map((p) => (
                          <TableRow key={p.itemId}>
                            <TableCell>
                              <ItemLink itemId={p.itemId} name={p.name} />
                            </TableCell>
                            <TableCell className="text-right">{p.units.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="profitability" className="space-y-4">
            {pa.isLoading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Menu engineering matrix</CardTitle>
                    <CardDescription>
                      Median axes: units ≥ {medians?.units?.toFixed?.(2) ?? medians?.units}, margin % ≥{" "}
                      {medians?.marginPct ?? "—"} — Stars, Plowhorses, Puzzles, Dogs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scatterData.length > 0 && medians ? (
                      <ResponsiveContainer width="100%" height={420}>
                        <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" dataKey="x" name="Units" />
                          <YAxis type="number" dataKey="y" name="Margin %" unit="%" />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            formatter={(value: number, key: string) =>
                              key === "y" ? [`${value}%`, "Margin %"] : [value, "Units"]
                            }
                            labelFormatter={(_, payload) => {
                              const p = payload?.[0]?.payload as { name?: string };
                              return p?.name ?? "";
                            }}
                          />
                          <ReferenceLine x={medians.units} stroke="#64748b" strokeDasharray="4 4" />
                          <ReferenceLine y={medians.marginPct} stroke="#64748b" strokeDasharray="4 4" />
                          {(Object.keys(CLASS_COLORS) as MenuClassification[]).map((cls) => (
                            <Scatter
                              key={cls}
                              name={classificationLabel(cls)}
                              data={scatterData.filter((d) => d.classification === cls)}
                              fill={CLASS_COLORS[cls]}
                            />
                          ))}
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[420px] items-center justify-center text-muted-foreground">No data</div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      {(Object.keys(CLASS_COLORS) as MenuClassification[]).map((k) => (
                        <span key={k} className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ background: CLASS_COLORS[k] }} />
                          {classificationLabel(k)}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Margin contribution</CardTitle>
                    <CardDescription>Margin × units — most valuable SKUs</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[480px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Margin $</TableHead>
                          <TableHead className="text-right">Margin %</TableHead>
                          <TableHead className="text-right">Contribution</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marginSorted.map((p) => (
                          <TableRow key={p.itemId}>
                            <TableCell>
                              <ItemLink itemId={p.itemId} name={p.name} />
                            </TableCell>
                            <TableCell>
                              <span
                                className="rounded px-2 py-0.5 text-xs font-medium text-white"
                                style={{ background: CLASS_COLORS[p.classification] }}
                              >
                                {classificationLabel(p.classification)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(p.margin)}</TableCell>
                            <TableCell className="text-right">{p.marginPct}%</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(p.marginContribution)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="velocity" className="space-y-4">
            {pa.isLoading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Velocity</CardTitle>
                    <CardDescription>Units per day in selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topVelocity.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(320, topVelocity.length * 28)}>
                        <BarChart layout="vertical" data={topVelocity} margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => v.toFixed(2)} />
                          <Bar dataKey="unitsPerDay" fill="#22c55e" name="Units/day" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-40 items-center justify-center text-muted-foreground">No data</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Dead stock</CardTitle>
                    <CardDescription>Active catalog items with no sales in the last 30 days (from period end)</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[480px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Days since sale</TableHead>
                          <TableHead className="text-right">Lifetime units</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pa.data?.deadStock ?? []).map((d) => (
                          <TableRow key={d.itemId}>
                            <TableCell>
                              <ItemLink itemId={d.itemId} name={d.name} />
                            </TableCell>
                            <TableCell>{d.category}</TableCell>
                            <TableCell className="text-right">
                              {d.daysSinceLastSale == null ? "Never" : d.daysSinceLastSale}
                            </TableCell>
                            <TableCell className="text-right">{d.lifetimeUnits.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {(pa.data?.deadStock ?? []).length === 0 && (
                      <p className="py-4 text-center text-muted-foreground">No dead stock in this window</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="mix" className="space-y-4">
            {pa.isLoading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Hot vs cold (modifier names)</CardTitle>
                    <CardDescription>Revenue split when hot/cold modifiers match on child lines</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hotIcedChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={hotIcedChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={80} />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Bar dataKey="Hot" stackId="a" fill="#f97316" />
                          <Bar dataKey="Cold" stackId="a" fill="#38bdf8" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        No hot/cold modifier matches in range
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Modifier & add-on revenue</CardTitle>
                      <CardDescription>
                        Share of base line revenue: {pa.data?.modifierRevenue.modifierShareOfBaseRevenue ?? 0}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[360px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Modifier</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(pa.data?.modifierRevenue.items ?? []).map((m) => (
                            <TableRow key={m.itemId}>
                              <TableCell>
                                <ItemLink itemId={m.itemId} name={m.name} />
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(m.revenue)}</TableCell>
                              <TableCell className="text-right">{m.units.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Attach rate (pairs)</CardTitle>
                      <CardDescription>Co-purchase in same sale — lift vs random</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[360px] overflow-auto text-sm">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pair</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Lift</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(pa.data?.attachRate ?? []).slice(0, 20).map((a) => (
                            <TableRow key={`${a.itemAId}-${a.itemBId}`}>
                              <TableCell>
                                <ItemLink itemId={a.itemAId} name={a.itemAName} />
                                <span className="mx-1 text-muted-foreground">+</span>
                                <ItemLink itemId={a.itemBId} name={a.itemBName} />
                              </TableCell>
                              <TableCell className="text-right">{a.pairCount}</TableCell>
                              <TableCell className="text-right">{a.lift}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="daypart" className="space-y-4">
            {pa.isLoading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
            ) : (
              <>
                {!pa.data?.daypart.hasTimeData && (
                  <Alert>
                    <AlertTitle>Timestamps look like midnight only</AlertTitle>
                    <AlertDescription>
                      Daypart uses sale time. After the Square sync stores full order timestamps, re-import orders so
                      buckets reflect real hours.
                    </AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by daypart (UTC)</CardTitle>
                    <CardDescription>Morning 05–11, midday 11–14, afternoon 14–17, evening 17–22, late 22–05</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(pa.data?.daypart.buckets ?? []).some((b) => b.revenue > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pa.data?.daypart.buckets ?? []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bucket" />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="revenue" fill="#6366f1" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[300px] items-center justify-center text-muted-foreground">No revenue in range</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top items per bucket</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(pa.data?.daypart.buckets ?? []).map((b) => (
                      <div key={b.bucket}>
                        <h4 className="mb-2 font-semibold capitalize">
                          {b.bucket} ({b.startHour}–{b.endHour}h)
                        </h4>
                        {b.topItems.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {b.topItems.map((t) => (
                                <TableRow key={t.itemId}>
                                  <TableCell>
                                    <ItemLink itemId={t.itemId} name={t.name} />
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(t.revenue)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground">No base-line revenue</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Units by daypart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={pa.data?.daypart.buckets ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="units" stroke="#22c55e" name="Units" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
