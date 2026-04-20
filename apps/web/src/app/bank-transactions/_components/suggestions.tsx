"use client";

import { useMemo } from "react";
import { Button } from "@kit/ui/button";
import { useSales, useExpenses, useEntries } from "@kit/hooks";
import type { BankTransaction, Entry } from "@kit/lib";
import {
  filterReconciliationCandidates,
  scoreReconciliationCandidate,
  sortReconciliationCandidates,
  type ReconcilableEntityType,
} from "@/lib/bank-transactions/reconciliation-candidates";
import type { DraftLine } from "./allocation-types";

type Props = {
  tx: BankTransaction;
  /** Not currently allocated nor pending in drafts. Suggestions should exclude these. */
  excludedExpenseIds: Set<number>;
  excludedSaleIds: Set<number>;
  excludedEntryIds: Set<number>;
  remaining: number;
  addDraft: (seed: Partial<DraftLine> & { kind: DraftLine["kind"] }) => void;
};

function dateRangeAround(executionDate: string, daysBefore = 60, daysAfter = 60) {
  const d = new Date((executionDate || "").slice(0, 10) + "T12:00:00");
  const start = new Date(d);
  start.setDate(start.getDate() - daysBefore);
  const end = new Date(d);
  end.setDate(end.getDate() + daysAfter);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function SuggestionsPanel({
  tx,
  excludedExpenseIds,
  excludedSaleIds,
  excludedEntryIds,
  remaining,
  addDraft,
}: Props) {
  const isCredit = Number(tx.amount) > 0;
  const bankSign = Math.sign(Number(tx.amount)) || 1;
  const { startDate, endDate } = useMemo(() => dateRangeAround(tx.execution_date), [tx.execution_date]);

  const { data: salesRes } = useSales({ startDate, endDate, limit: 200 });
  const { data: expensesRes } = useExpenses({ startDate, endDate, limit: 200 });
  const { data: entriesRes } = useEntries({
    direction: isCredit ? "input" : "output",
    entryType: isCredit ? "sale" : undefined,
    fromDate: startDate,
    toDate: endDate,
    includePayments: true,
    limit: 200,
  });

  const primaryKind: ReconcilableEntityType = isCredit ? "sale" : "expense";
  const primaryRows = (isCredit ? salesRes?.data : expensesRes?.data) ?? [];
  const primaryCandidates = primaryRows.filter((r: { id: number }) =>
    isCredit ? !excludedSaleIds.has(r.id) : !excludedExpenseIds.has(r.id)
  );

  const ranked = useMemo(() => {
    const filtered = filterReconciliationCandidates(primaryKind, tx, primaryCandidates as never, {
      dayWindow: 30,
    });
    return sortReconciliationCandidates(primaryKind, tx, filtered as never).slice(0, 5);
  }, [primaryKind, tx, primaryCandidates]);

  const entryRows = (entriesRes?.data ?? []).filter((e) => {
    const paid = (e.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    return e.amount - paid > 0.02 && !excludedEntryIds.has(e.id);
  });
  const rankedEntries = useMemo(() => {
    const mapped = entryRows.map((e) => ({
      id: e.id,
      amount: e.amount,
      entryDate: e.entryDate,
      description: e.name,
    }));
    const filtered = filterReconciliationCandidates("entry", tx, mapped, { dayWindow: 60 });
    return sortReconciliationCandidates("entry", tx, filtered).slice(0, 3);
  }, [entryRows, tx]);

  const unpaidByExpenseId = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of entriesRes?.data ?? []) {
      const row = e as Entry;
      if (row.direction !== "output" || row.entryType !== "expense") continue;
      if (row.referenceId == null) continue;
      const paid = (row.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const open = Math.max(0, Number(row.amount) - paid);
      map.set(row.referenceId, open);
    }
    return map;
  }, [entriesRes?.data]);

  const unpaidBySaleId = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of entriesRes?.data ?? []) {
      const row = e as Entry;
      if (row.direction !== "input" || row.entryType !== "sale") continue;
      if (row.referenceId == null) continue;
      const paid = (row.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const open = Math.max(0, Number(row.amount) - paid);
      map.set(row.referenceId, open);
    }
    return map;
  }, [entriesRes?.data]);

  if (ranked.length === 0 && rankedEntries.length === 0) {
    return null;
  }

  const remainingStr = remaining.toFixed(2);
  const remainingAbs = Math.abs(Number(remainingStr));

  const suggestedLinkAmountStr = (entityId: number, kind: "expense" | "sale") => {
    const open = Math.max(
      0,
      kind === "expense" ? unpaidByExpenseId.get(entityId) ?? 0 : unpaidBySaleId.get(entityId) ?? 0
    );
    // If the entity is already fully paid on the ledger, "link" is a pure bank reconciliation
    // allocation (no new payment). In that case, default to the bank remaining.
    const capped = open <= 0.02 ? remainingAbs : Math.min(remainingAbs, open);
    const signed = bankSign * capped;
    // Keep a stable string for tiny floats
    return (Math.round(signed * 100) / 100).toFixed(2);
  };

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <p className="text-xs font-medium uppercase text-muted-foreground">Suggested matches</p>
      <div className="space-y-1.5">
        {ranked.map((c) => {
          const score = Math.round(
            scoreReconciliationCandidate(primaryKind, tx, c as never)
          );
          const amt = Number((c as { amount: number }).amount);
          const label = isCredit
            ? `Sale #${c.id} · ${((c as { description?: string }).description ?? "—").slice(
                0,
                34
              )} · ${(c as { date?: string }).date ?? "—"} · ${amt.toFixed(2)}`
            : `Expense #${c.id} · ${((c as { name?: string }).name ?? "—").slice(0, 34)} · ${
                (c as { expenseDate?: string }).expenseDate ?? "—"
              } · ${amt.toFixed(2)}`;
          const linkAmtStr = suggestedLinkAmountStr(c.id, isCredit ? "sale" : "expense");
          const linkAmtNum = parseFloat(linkAmtStr);
          const canLink = Number.isFinite(linkAmtNum) && Math.abs(linkAmtNum) > 0.0001;

          return (
            <div
              key={`${primaryKind}-${c.id}`}
              className="flex items-center justify-between gap-2 rounded border border-border/60 bg-muted/20 px-2 py-1.5 text-xs"
            >
              <span className="truncate">
                {label} <span className="text-muted-foreground">· match {score}</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 text-xs"
                disabled={!canLink}
                onClick={() =>
                  addDraft(
                    isCredit
                      ? {
                          kind: "link_sale",
                          saleId: c.id,
                          amount: linkAmtStr,
                        }
                      : {
                          kind: "link_expense",
                          expenseId: c.id,
                          amount: linkAmtStr,
                        }
                  )
                }
              >
                {canLink ? `Link for ${linkAmtStr}` : "Fully paid"}
              </Button>
            </div>
          );
        })}
        {rankedEntries.map((e) => (
          <div
            key={`entry-${e.id}`}
            className="flex items-center justify-between gap-2 rounded border border-border/60 bg-muted/20 px-2 py-1.5 text-xs"
          >
            <span className="truncate">
              Entry #{e.id} · {((e as { description?: string }).description ?? "").slice(0, 34)} · {e.entryDate} ·{" "}
              {Number(e.amount).toFixed(2)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 shrink-0 text-xs"
              onClick={() =>
                addDraft({
                  kind: "payment",
                  entryId: e.id,
                  amount: remainingStr,
                  paymentDate: tx.execution_date.slice(0, 10),
                })
              }
            >
              Record payment
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
