import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  appDefaultTimeZone,
  inclusiveDaysBetweenYmd,
  inclusiveUtcRangeFromYmdStrings,
  timestamptzBoundsFromYmdRange,
} from '@kit/lib';

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

const HOT_RE = /\b(hot)\b/i;
const COLD_RE = /\b(cold|iced|ice)\b/i;

function classifyTemp(name: string): 'hot' | 'cold' | null {
  if (COLD_RE.test(name)) return 'cold';
  if (HOT_RE.test(name)) return 'hot';
  return null;
}

function daypartFromHourUtc(hour: number): {
  bucket: string;
  startHour: number;
  endHour: number;
} {
  if (hour >= 5 && hour < 11) return { bucket: 'morning', startHour: 5, endHour: 11 };
  if (hour >= 11 && hour < 14) return { bucket: 'midday', startHour: 11, endHour: 14 };
  if (hour >= 14 && hour < 17) return { bucket: 'afternoon', startHour: 14, endHour: 17 };
  if (hour >= 17 && hour < 22) return { bucket: 'evening', startHour: 17, endHour: 22 };
  return { bucket: 'late', startHour: 22, endHour: 5 };
}

function isMidnightUtc(iso: string): boolean {
  const d = new Date(iso);
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

function hasItemOrProductTypes(types: string[] | null): boolean {
  if (!types?.length) return false;
  return types.includes('item') || types.includes('product');
}

function hasModifierType(types: string[] | null): boolean {
  return Boolean(types?.includes('modifier'));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');
    const topN = Math.max(5, Math.min(100, parseInt(searchParams.get('topN') ?? '20', 10)));
    const deadStockWindowDays = Math.max(1, Math.min(365, parseInt(searchParams.get('deadStockWindowDays') ?? '30', 10)));

    if (!startDate || !endDate) {
      const y = new Date().getFullYear().toString();
      startDate = `${y}-01-01`;
      endDate = `${y}-12-31`;
    }

    const salesDateBounds = timestamptzBoundsFromYmdRange(startDate, endDate);
    const supabase = supabaseServer();

    const saleDateById = new Map<number, string>();
    let page = 0;
    const pageSize = 1000;
    let hasMoreSales = true;
    while (hasMoreSales) {
      const { data, error } = await supabase
        .from('sales')
        .select('id, date')
        .gte('date', salesDateBounds.gte)
        .lte('date', salesDateBounds.lte)
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      if (data && data.length > 0) {
        for (const row of data) {
          saleDateById.set(row.id as number, row.date as string);
        }
        hasMoreSales = data.length === pageSize;
        page++;
      } else {
        hasMoreSales = false;
      }
    }

    const saleIds = [...saleDateById.keys()];
    type LineRow = {
      id: number;
      sale_id: number;
      parent_sale_line_id: number | null;
      item_id: number | null;
      quantity: number;
      line_total: number;
      unit_cost: number | null;
    };
    const allLines: LineRow[] = [];
    const chunkSize = 150;
    for (let i = 0; i < saleIds.length; i += chunkSize) {
      const chunk = saleIds.slice(i, i + chunkSize);
      let offset = 0;
      const innerPage = 1000;
      let more = true;
      while (more) {
        const { data, error } = await supabase
          .from('sale_line_items')
          .select('id, sale_id, parent_sale_line_id, item_id, quantity, line_total, unit_cost')
          .in('sale_id', chunk)
          .order('id', { ascending: true })
          .range(offset, offset + innerPage - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          for (const r of data) {
            allLines.push({
              id: r.id as number,
              sale_id: r.sale_id as number,
              parent_sale_line_id: (r.parent_sale_line_id as number | null) ?? null,
              item_id: (r.item_id as number | null) ?? null,
              quantity: parseFloat(String(r.quantity)) || 0,
              line_total: parseFloat(String(r.line_total)) || 0,
              unit_cost: r.unit_cost != null ? parseFloat(String(r.unit_cost)) : null,
            });
          }
          more = data.length === innerPage;
          offset += innerPage;
        } else {
          more = false;
        }
      }
    }

    const itemIds = new Set<number>();
    for (const l of allLines) {
      if (l.item_id != null) itemIds.add(l.item_id);
    }

    const itemsById = new Map<
      number,
      { id: number; name: string; category: string | null; item_types: string[] | null; is_active: boolean | null }
    >();
    if (itemIds.size > 0) {
      const ids = [...itemIds];
      for (let i = 0; i < ids.length; i += 200) {
        const batch = ids.slice(i, i + 200);
        const { data, error } = await supabase
          .from('items')
          .select('id, name, item_types, is_active, category:item_categories(name)')
          .in('id', batch);
        if (error) throw error;
        for (const row of data || []) {
          itemsById.set(row.id as number, {
            id: row.id as number,
            name: (row.name as string) ?? '',
            category: ((row as any).category?.name as string | null) ?? null,
            item_types: (row.item_types as string[] | null) ?? null,
            is_active: row.is_active as boolean | null,
          });
        }
      }
    }

    const periodDays = inclusiveDaysBetweenYmd(startDate, endDate);

    const productAgg = new Map<
      number,
      {
        itemId: number;
        name: string;
        category: string;
        units: number;
        revenue: number;
        cost: number;
      }
    >();

    const modifierAgg = new Map<number, { itemId: number; name: string; units: number; revenue: number }>();
    let baseRevenueTotal = 0;

    const linesBySale = new Map<number, LineRow[]>();
    for (const l of allLines) {
      const arr = linesBySale.get(l.sale_id) || [];
      arr.push(l);
      linesBySale.set(l.sale_id, arr);
    }

    const pairCounts = new Map<string, number>();
    const itemSalesCount = new Map<number, number>();
    for (const [, lines] of linesBySale) {
      const seen = new Set<number>();
      for (const l of lines) {
        if (l.parent_sale_line_id != null) continue;
        if (l.item_id == null) continue;
        seen.add(l.item_id);
      }
      for (const id of seen) {
        itemSalesCount.set(id, (itemSalesCount.get(id) || 0) + 1);
      }
    }

    const hotIcedMap = new Map<
      number,
      { itemId: number; name: string; hotUnits: number; coldUnits: number; neutralUnits: number; hotRevenue: number; coldRevenue: number }
    >();

    const daypartBuckets: Record<
      string,
      { bucket: string; startHour: number; endHour: number; revenue: number; units: number; itemRev: Map<number, { name: string; revenue: number }> }
    > = {};

    function ensureDaypart(meta: { bucket: string; startHour: number; endHour: number }) {
      if (!daypartBuckets[meta.bucket]) {
        daypartBuckets[meta.bucket] = {
          ...meta,
          revenue: 0,
          units: 0,
          itemRev: new Map(),
        };
      }
      return daypartBuckets[meta.bucket]!;
    }

    let midnightSaleCount = 0;
    let totalSalesForTimeCheck = 0;

    for (const [sid, dateIso] of saleDateById) {
      totalSalesForTimeCheck++;
      if (isMidnightUtc(dateIso)) midnightSaleCount++;
    }

    const hasTimeData = totalSalesForTimeCheck === 0 ? true : midnightSaleCount / totalSalesForTimeCheck <= 0.8;

    for (const l of allLines) {
      const saleDate = saleDateById.get(l.sale_id);
      if (!saleDate) continue;
      const item = l.item_id != null ? itemsById.get(l.item_id) : null;
      const name = item?.name ?? 'Unknown';
      const isModifierLine = l.parent_sale_line_id != null || (item && hasModifierType(item.item_types));

      if (isModifierLine && l.item_id != null) {
        const m = modifierAgg.get(l.item_id) || { itemId: l.item_id, name, units: 0, revenue: 0 };
        m.units += l.quantity;
        m.revenue += l.line_total;
        modifierAgg.set(l.item_id, m);
      }

      if (l.parent_sale_line_id == null) {
        baseRevenueTotal += l.line_total;
      }

      if (l.parent_sale_line_id == null && l.item_id != null) {
        const cat = item?.category?.trim() || 'Uncategorized';
        const prev = productAgg.get(l.item_id) || {
          itemId: l.item_id,
          name,
          category: cat,
          units: 0,
          revenue: 0,
          cost: 0,
        };
        prev.units += l.quantity;
        prev.revenue += l.line_total;
        const c = (l.unit_cost ?? 0) * l.quantity;
        prev.cost += c;
        productAgg.set(l.item_id, prev);

        const d = new Date(saleDate);
        const hour = d.getUTCHours();
        const dp = daypartFromHourUtc(hour);
        const b = ensureDaypart(dp);
        b.revenue += l.line_total;
        b.units += l.quantity;
        const ir = b.itemRev.get(l.item_id) || { name, revenue: 0 };
        ir.revenue += l.line_total;
        b.itemRev.set(l.item_id, ir);
      }
    }

    for (const [saleId, lines] of linesBySale) {
      const baseIds = new Set<number>();
      for (const l of lines) {
        if (l.parent_sale_line_id == null && l.item_id != null) baseIds.add(l.item_id);
      }
      const bases = [...baseIds].sort((a, b) => a - b);
      for (let i = 0; i < bases.length; i++) {
        for (let j = i + 1; j < bases.length; j++) {
          const key = `${bases[i]}:${bases[j]}`;
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      }

      for (const l of lines) {
        if (l.parent_sale_line_id != null) continue;
        if (l.item_id == null) continue;
        const children = lines.filter((x) => x.parent_sale_line_id === l.id);
        if (children.length === 0) continue;
        let mode: 'hot' | 'cold' | null = null;
        for (const ch of children) {
          const chItem = ch.item_id != null ? itemsById.get(ch.item_id) : null;
          const chName = chItem?.name ?? '';
          const t = classifyTemp(chName);
          if (t === 'cold') {
            mode = 'cold';
            break;
          }
          if (t === 'hot') mode = 'hot';
        }
        if (mode == null) continue;
        const prev = hotIcedMap.get(l.item_id) ?? {
          itemId: l.item_id,
          name: itemsById.get(l.item_id)?.name ?? 'Unknown',
          hotUnits: 0,
          coldUnits: 0,
          neutralUnits: 0,
          hotRevenue: 0,
          coldRevenue: 0,
        };
        if (mode === 'cold') {
          prev.coldUnits += l.quantity;
          prev.coldRevenue += l.line_total;
        } else {
          prev.hotUnits += l.quantity;
          prev.hotRevenue += l.line_total;
        }
        hotIcedMap.set(l.item_id, prev);
      }
    }

    const products = [...productAgg.values()].map((p) => {
      const margin = p.revenue - p.cost;
      const marginPct = p.revenue > 0 ? (margin / p.revenue) * 100 : 0;
      return {
        itemId: p.itemId,
        name: p.name,
        category: p.category,
        units: p.units,
        revenue: Math.round(p.revenue * 100) / 100,
        cost: Math.round(p.cost * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        marginPct: Math.round(marginPct * 100) / 100,
        marginContribution: Math.round(margin * 100) / 100,
        avgPrice: p.units > 0 ? Math.round((p.revenue / p.units) * 100) / 100 : 0,
        unitsPerDay: Math.round((p.units / periodDays) * 1000) / 1000,
      };
    });

    const marginPcts = products.map((p) => p.marginPct);
    const unitss = products.map((p) => p.units);
    const medUnits = median(unitss);
    const medMarginPct = median(marginPcts);

    type Classification = 'star' | 'plowhorse' | 'puzzle' | 'dog';
    function classify(u: number, mp: number): Classification {
      const highU = u >= medUnits;
      const highM = mp >= medMarginPct;
      if (highU && highM) return 'star';
      if (highU && !highM) return 'plowhorse';
      if (!highU && highM) return 'puzzle';
      return 'dog';
    }

    const menuMatrix = products.map((p) => ({
      ...p,
      classification: classify(p.units, p.marginPct) as Classification,
    }));

    const totalRev = products.reduce((s, p) => s + p.revenue, 0);
    const categoryMixMap = new Map<string, { revenue: number; units: number }>();
    for (const p of products) {
      const c = p.category || 'Uncategorized';
      const prev = categoryMixMap.get(c) || { revenue: 0, units: 0 };
      prev.revenue += p.revenue;
      prev.units += p.units;
      categoryMixMap.set(c, prev);
    }
    const categoryMix = [...categoryMixMap.entries()].map(([category, v]) => ({
      category,
      revenue: Math.round(v.revenue * 100) / 100,
      units: Math.round(v.units * 1000) / 1000,
      pct: totalRev > 0 ? Math.round((v.revenue / totalRev) * 10000) / 100 : 0,
    }));

    const pairEntries = [...pairCounts.entries()]
      .map(([key, pairCount]) => {
        const [a, b] = key.split(':').map(Number);
        const nameA = itemsById.get(a)?.name ?? `#${a}`;
        const nameB = itemsById.get(b)?.name ?? `#${b}`;
        const aSales = itemSalesCount.get(a) || 0;
        const bSales = itemSalesCount.get(b) || 0;
        const denomA = aSales > 0 ? pairCount / aSales : 0;
        const denomB = bSales > 0 ? pairCount / bSales : 0;
        const n = saleIds.length;
        const expected = n > 0 ? (aSales / n) * (bSales / n) * n : 0;
        const lift = expected > 0 ? pairCount / expected : pairCount > 0 ? 999 : 0;
        return {
          itemAId: a,
          itemBId: b,
          itemAName: nameA,
          itemBName: nameB,
          pairCount,
          aSales,
          bSales,
          confidenceAtoB: Math.round(denomA * 10000) / 10000,
          confidenceBtoA: Math.round(denomB * 10000) / 10000,
          lift: Math.round(lift * 100) / 100,
        };
      })
      .sort((x, y) => y.pairCount - x.pairCount)
      .slice(0, 30);

    const hotIcedSplit = [...hotIcedMap.values()].map((r) => ({
      ...r,
      hotUnits: Math.round(r.hotUnits * 1000) / 1000,
      coldUnits: Math.round(r.coldUnits * 1000) / 1000,
      neutralUnits: Math.round(r.neutralUnits * 1000) / 1000,
      hotRevenue: Math.round(r.hotRevenue * 100) / 100,
      coldRevenue: Math.round(r.coldRevenue * 100) / 100,
    }));

    const modifierItems = [...modifierAgg.values()]
      .map((m) => ({
        ...m,
        revenue: Math.round(m.revenue * 100) / 100,
        units: Math.round(m.units * 1000) / 1000,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalModifierRevenue = modifierItems.reduce((s, m) => s + m.revenue, 0);
    const modifierShareOfBaseRevenue = baseRevenueTotal > 0 ? Math.round((totalModifierRevenue / baseRevenueTotal) * 10000) / 100 : 0;

    const totalCOGS = products.reduce((s, p) => s + p.cost, 0);
    const totalMargin = products.reduce((s, p) => s + p.margin, 0);
    const totalUnits = products.reduce((s, p) => s + p.units, 0);
    const avgMarginPct = totalRev > 0 ? Math.round((totalMargin / totalRev) * 10000) / 100 : 0;

    const daypart = {
      buckets: ['morning', 'midday', 'afternoon', 'evening', 'late'].map((key) => {
        const b = daypartBuckets[key];
        if (!b) {
          const meta =
            key === 'morning'
              ? { bucket: 'morning', startHour: 5, endHour: 11 }
              : key === 'midday'
                ? { bucket: 'midday', startHour: 11, endHour: 14 }
                : key === 'afternoon'
                  ? { bucket: 'afternoon', startHour: 14, endHour: 17 }
                  : key === 'evening'
                    ? { bucket: 'evening', startHour: 17, endHour: 22 }
                    : { bucket: 'late', startHour: 22, endHour: 5 };
          return {
            ...meta,
            revenue: 0,
            units: 0,
            topItems: [] as { itemId: number; name: string; revenue: number }[],
          };
        }
        const topItems = [...b.itemRev.entries()]
          .map(([itemId, v]) => ({ itemId, name: v.name, revenue: Math.round(v.revenue * 100) / 100 }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
        return {
          bucket: b.bucket,
          startHour: b.startHour,
          endHour: b.endHour,
          revenue: Math.round(b.revenue * 100) / 100,
          units: Math.round(b.units * 1000) / 1000,
          topItems,
        };
      }),
      hasTimeData,
    };

    const { endUtc } = inclusiveUtcRangeFromYmdStrings(startDate, endDate, appDefaultTimeZone());
    const cutoff = new Date(endUtc.getTime() - deadStockWindowDays * 86400000);

    const lastSaleAndLife = new Map<number, { last: string | null; lifetime: number }>();
    let lp = 0;
    const lpSize = 1000;
    let moreLife = true;
    while (moreLife) {
      const { data, error } = await supabase
        .from('sale_line_items')
        .select('item_id, quantity, parent_sale_line_id, sales!inner(date)')
        .is('parent_sale_line_id', null)
        .not('item_id', 'is', null)
        .order('id', { ascending: true })
        .range(lp * lpSize, (lp + 1) * lpSize - 1);
      if (error) throw error;
      if (data && data.length > 0) {
        for (const row of data) {
          const iid = row.item_id as number;
          const q = parseFloat(String(row.quantity)) || 0;
          const rawSales = row.sales as { date: string } | { date: string }[] | null;
          const d = Array.isArray(rawSales) ? rawSales[0]?.date : rawSales?.date;
          if (!d) continue;
          const prev = lastSaleAndLife.get(iid) || { last: null as string | null, lifetime: 0 };
          prev.lifetime += q;
          if (!prev.last || d > prev.last) prev.last = d;
          lastSaleAndLife.set(iid, prev);
        }
        moreLife = data.length === lpSize;
        lp++;
      } else {
        moreLife = false;
      }
    }

    const { data: catalogItems, error: catErr } = await supabase
      .from('items')
      .select('id, name, item_types, is_active, category:item_categories(name)')
      .eq('is_active', true);
    if (catErr) throw catErr;

    const deadStock: Array<{
      itemId: number;
      name: string;
      category: string;
      daysSinceLastSale: number | null;
      lifetimeUnits: number;
    }> = [];

    for (const row of catalogItems || []) {
      const types = row.item_types as string[] | null;
      if (!hasItemOrProductTypes(types)) continue;
      const id = row.id as number;
      const agg = lastSaleAndLife.get(id);
      const last = agg?.last ?? null;
      const lifetimeUnits = agg?.lifetime ?? 0;
      const catName = (((row as any).category?.name as string | null) ?? '').trim() || 'Uncategorized';
      if (last == null) {
        deadStock.push({
          itemId: id,
          name: (row.name as string) ?? '',
          category: catName,
          daysSinceLastSale: null,
          lifetimeUnits: Math.round(lifetimeUnits * 1000) / 1000,
        });
        continue;
      }
      const lastD = new Date(last);
      if (lastD <= cutoff) {
        const daysSince = Math.floor((Date.now() - lastD.getTime()) / 86400000);
        deadStock.push({
          itemId: id,
          name: (row.name as string) ?? '',
          category: catName,
          daysSinceLastSale: daysSince,
          lifetimeUnits: Math.round(lifetimeUnits * 1000) / 1000,
        });
      }
    }

    deadStock.sort((a, b) => {
      if (a.daysSinceLastSale == null && b.daysSinceLastSale == null) return 0;
      if (a.daysSinceLastSale == null) return -1;
      if (b.daysSinceLastSale == null) return 1;
      return b.daysSinceLastSale - a.daysSinceLastSale;
    });

    const deadStockTop = deadStock.slice(0, topN);

    return NextResponse.json({
      products: products.sort((a, b) => b.revenue - a.revenue),
      menuMatrix,
      categoryMix: categoryMix.sort((a, b) => b.revenue - a.revenue),
      attachRate: pairEntries,
      hotIcedSplit,
      modifierRevenue: {
        items: modifierItems.slice(0, topN),
        totalModifierRevenue: Math.round(totalModifierRevenue * 100) / 100,
        modifierShareOfBaseRevenue,
      },
      deadStock: deadStockTop,
      daypart,
      summary: {
        totalRevenue: Math.round(totalRev * 100) / 100,
        totalUnits: Math.round(totalUnits * 1000) / 1000,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        totalMargin: Math.round(totalMargin * 100) / 100,
        avgMarginPct,
        uniqueProductsSold: products.length,
        periodDays,
        medians: { units: medUnits, marginPct: Math.round(medMarginPct * 100) / 100 },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching product analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch product analytics', details: message }, { status: 500 });
  }
}
