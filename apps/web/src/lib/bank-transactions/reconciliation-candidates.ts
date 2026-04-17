export type ReconcilableEntityType = "sale" | "expense";

export type ReconcileCandidateFilters = {
  /** Only keep candidates whose amount equals tx amount (abs). */
  exactAmount?: boolean;
  /** Max distance in days from bank tx date (inclusive). Undefined = no date filter. */
  dayWindow?: number;
  /** Client-side substring on displayed fields (id, amount, date, name/description). */
  searchText?: string;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function matchesSearch(
  entityType: ReconcilableEntityType,
  c: { id: number; amount: number; date?: string; expenseDate?: string; description?: string; name?: string; vendor?: string },
  q: string
): boolean {
  const n = norm(q);
  if (!n) return true;
  const hay = [
    String(c.id),
    String(c.amount),
    entityType === "sale" ? (c.date ?? "") : (c.expenseDate ?? ""),
    entityType === "sale" ? (c.description ?? "") : (c.name ?? ""),
    entityType === "expense" ? (c.vendor ?? "") : "",
    entityType === "expense" ? (c.description ?? "") : "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(n);
}

/**
 * Heuristic score for ranking sale/expense candidates against a bank transaction.
 * Higher is better.
 */
export function scoreReconciliationCandidate(
  entityType: ReconcilableEntityType,
  tx: {
    amount: number;
    execution_date: string;
    label: string | null;
    counterparty_name: string | null;
  },
  c: {
    id: number;
    amount: number;
    date?: string;
    expenseDate?: string;
    description?: string;
    name?: string;
    vendor?: string;
  }
): number {
  const txAmount = Math.abs(Number(tx.amount));
  const candAmount = Math.abs(Number(c.amount));
  const amountDiff = Math.abs(txAmount - candAmount);
  const scoreAmount = amountDiff === 0 ? 5000 : -amountDiff * 100;

  const txDate = tx.execution_date ? new Date(tx.execution_date + "T12:00:00").getTime() : 0;
  const entityDateStr = entityType === "sale" ? c.date : c.expenseDate;
  const entityTime = entityDateStr ? new Date(entityDateStr + "T12:00:00").getTime() : 0;
  const daysDiff = txDate && entityTime ? Math.abs((entityTime - txDate) / (24 * 60 * 60 * 1000)) : 999;
  const scoreDate = -daysDiff * 10;

  const txLabel = norm(tx.label ?? "");
  const txCounterparty = norm(tx.counterparty_name ?? "");
  const nameOrDesc = norm(
    entityType === "sale" ? (c.description ?? "") : [c.name ?? "", c.vendor ?? "", c.description ?? ""].join(" ")
  );

  let textScore = 0;
  if (txLabel && nameOrDesc) {
    if (nameOrDesc.includes(txLabel) || txLabel.includes(nameOrDesc)) textScore += 200;
    const labelTokens = txLabel.split(/\s+/).filter((t) => t.length > 2);
    for (const t of labelTokens) {
      if (nameOrDesc.includes(t)) textScore += 40;
    }
  }
  if (txCounterparty && nameOrDesc) {
    if (nameOrDesc.includes(txCounterparty) || txCounterparty.includes(nameOrDesc)) textScore += 200;
  }

  return scoreAmount + scoreDate + textScore;
}

export function filterReconciliationCandidates<T extends { amount: number; date?: string; expenseDate?: string; description?: string; name?: string; vendor?: string; id: number }>(
  entityType: ReconcilableEntityType,
  tx: { amount: number; execution_date: string },
  candidates: T[],
  filters: ReconcileCandidateFilters
): T[] {
  const txAmount = Math.abs(Number(tx.amount));
  const txTime = tx.execution_date ? new Date(tx.execution_date + "T12:00:00").getTime() : 0;
  const windowDays = filters.dayWindow;

  return candidates.filter((c) => {
    if (filters.exactAmount && Math.abs(Number(c.amount)) !== txAmount) return false;
    if (windowDays != null && windowDays >= 0 && txTime) {
      const entityDateStr = entityType === "sale" ? c.date : c.expenseDate;
      const et = entityDateStr ? new Date(entityDateStr + "T12:00:00").getTime() : 0;
      if (!et) return false;
      const days = Math.abs((et - txTime) / (24 * 60 * 60 * 1000));
      if (days > windowDays) return false;
    }
    if (filters.searchText && !matchesSearch(entityType, c, filters.searchText)) return false;
    return true;
  });
}

export function sortReconciliationCandidates<T extends { amount: number; date?: string; expenseDate?: string; description?: string; name?: string; vendor?: string; id: number }>(
  entityType: ReconcilableEntityType,
  tx: {
    amount: number;
    execution_date: string;
    label: string | null;
    counterparty_name: string | null;
  },
  candidates: T[]
): T[] {
  return [...candidates].sort(
    (a, b) =>
      scoreReconciliationCandidate(entityType, tx, b) - scoreReconciliationCandidate(entityType, tx, a)
  );
}
