import type { ExpenseLineItem } from '@kit/types';

/**
 * Mirrors sales GET: load `item.id`, `item.name`, `item.unit` with a plain `items` query.
 * Avoids relying on PostgREST embeds (e.g. stale nested `item` when select is wrong).
 */
export async function hydrateExpenseLineItemItems(
  supabase: any,
  lineItems: ExpenseLineItem[]
): Promise<ExpenseLineItem[]> {
  const itemIds = [
    ...new Set(
      lineItems
        .map((l) => l.itemId)
        .filter((id): id is number => id != null)
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (itemIds.length === 0) return lineItems;

  const { data, error } = await supabase.from('items').select('id, name, unit').in('id', itemIds);
  if (error) {
    console.error('[hydrateExpenseLineItemItems] items lookup failed', error);
  }
  const rows = (data || []) as { id: number; name: string; unit?: string | null }[];
  const map = new Map<number, { id: number; name: string; unit?: string | null }>(
    rows.map((row) => [Number(row.id), { id: Number(row.id), name: row.name, unit: row.unit }])
  );

  return lineItems.map((line) => {
    if (line.itemId == null) return line;
    const hit = map.get(Number(line.itemId));
    if (!hit) return line;
    return {
      ...line,
      item: { id: hit.id, name: hit.name, unit: hit.unit ?? undefined } as ExpenseLineItem['item'],
    };
  });
}

/**
 * Items + semantic display labels for lines without a catalog item (loan, leasing, payroll, contractor).
 */
export async function hydrateExpenseLineItems(
  supabase: any,
  lineItems: ExpenseLineItem[]
): Promise<ExpenseLineItem[]> {
  const withItems = await hydrateExpenseLineItemItems(supabase, lineItems);

  const loanIds = [
    ...new Set(
      withItems.map((l) => l.loanId).filter((id): id is number => id != null && id > 0)
    ),
  ];
  const scheduleIds = [
    ...new Set(
      withItems.map((l) => l.loanScheduleId).filter((id): id is number => id != null && id > 0)
    ),
  ];
  const leasingIds = [
    ...new Set(
      withItems.map((l) => l.leasingId).filter((id): id is number => id != null && id > 0)
    ),
  ];
  const timelineIds = [
    ...new Set(
      withItems
        .map((l) => l.leasingTimelineEntryId)
        .filter((id): id is number => id != null && id > 0)
    ),
  ];
  const personnelIds = [
    ...new Set(
      withItems.map((l) => l.personnelId).filter((id): id is number => id != null && id > 0)
    ),
  ];

  const [loansRes, schedulesRes, leasingRes, timelinesRes, personnelRes] = await Promise.all([
    loanIds.length
      ? supabase.from('loans').select('id, name').in('id', loanIds)
      : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    scheduleIds.length
      ? supabase.from('loan_schedules').select('id, loan_id, month').in('id', scheduleIds)
      : Promise.resolve({ data: [] as { id: number; loan_id: number; month: number }[] }),
    leasingIds.length
      ? supabase.from('leasing_payments').select('id, name').in('id', leasingIds)
      : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    timelineIds.length
      ? supabase
          .from('leasing_timeline_entries')
          .select('id, leasing_id, month')
          .in('id', timelineIds)
      : Promise.resolve({ data: [] as { id: number; leasing_id: number; month: number }[] }),
    personnelIds.length
      ? supabase.from('personnel').select('id, first_name, last_name').in('id', personnelIds)
      : Promise.resolve({ data: [] as { id: number; first_name: string; last_name: string }[] }),
  ]);

  const loanMap = new Map<number, string>(
    ((loansRes as { data: { id: number; name: string }[] }).data || []).map((r) => [
      Number(r.id),
      String(r.name ?? '').trim(),
    ])
  );
  const scheduleMap = new Map<number, { loanId: number; month: number }>();
  for (const r of (schedulesRes as { data: { id: number; loan_id: number; month: number }[] }).data || []) {
    scheduleMap.set(Number(r.id), { loanId: Number(r.loan_id), month: Number(r.month) });
  }
  const leasingMap = new Map<number, string>(
    ((leasingRes as { data: { id: number; name: string }[] }).data || []).map((r) => [
      Number(r.id),
      String(r.name ?? '').trim(),
    ])
  );
  const timelineMap = new Map<number, { leasingId: number; month: number }>();
  for (const r of (timelinesRes as { data: { id: number; leasing_id: number; month: number }[] }).data || []) {
    timelineMap.set(Number(r.id), { leasingId: Number(r.leasing_id), month: Number(r.month) });
  }
  const personnelMap = new Map<number, string>();
  for (const row of (personnelRes as { data: { id: number; first_name: string; last_name: string }[] }).data || []) {
    const n = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
    personnelMap.set(Number(row.id), n || `Personnel #${row.id}`);
  }

  return withItems.map((line) => {
    const itemName = line.item?.name?.trim();
    const subName = line.subscription?.name?.trim();
    if (itemName || subName) {
      return { ...line, displayLabel: itemName || subName };
    }

    const kind = line.lineKind;
    const lid = line.loanId;
    const sid = line.loanScheduleId;
    if (lid != null) {
      const loanName = loanMap.get(Number(lid)) || `Loan #${lid}`;
      const sch = sid != null ? scheduleMap.get(Number(sid)) : undefined;
      const monthPart = sch != null ? ` (month ${sch.month})` : '';
      return {
        ...line,
        displayLabel: `Loan payment — ${loanName}${monthPart}`,
      };
    }

    const leasId = line.leasingId;
    const tlId = line.leasingTimelineEntryId;
    if (leasId != null) {
      const leaseName = leasingMap.get(Number(leasId)) || `Leasing #${leasId}`;
      const tl = tlId != null ? timelineMap.get(Number(tlId)) : undefined;
      const monthPart = tl != null ? ` (month ${tl.month})` : '';
      return {
        ...line,
        displayLabel: `Leasing payment — ${leaseName}${monthPart}`,
      };
    }

    const pid = line.personnelId;
    const person = pid != null ? personnelMap.get(Number(pid)) : undefined;
    if (pid != null && person) {
      if (kind === 'salary_net') {
        return { ...line, displayLabel: `Net salary — ${person}` };
      }
      if (kind === 'payroll_taxes') {
        return { ...line, displayLabel: `Payroll taxes — ${person}` };
      }
      if (kind === 'contractor_hours') {
        return { ...line, displayLabel: `Contractor hours — ${person}` };
      }
      return { ...line, displayLabel: person };
    }

    if (kind === 'salary_net') return { ...line, displayLabel: 'Net salary' };
    if (kind === 'payroll_taxes') return { ...line, displayLabel: 'Payroll taxes' };
    if (kind === 'contractor_hours') return { ...line, displayLabel: 'Contractor hours' };

    return line;
  });
}
