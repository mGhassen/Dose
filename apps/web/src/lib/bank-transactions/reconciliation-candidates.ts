export type ReconcilableEntityType = "sale" | "expense" | "entry" | "balance_movement";

export type ReconcileCandidateFilters = {
  /** Only keep candidates whose amount equals tx amount (abs). */
  exactAmount?: boolean;
  /** Max distance in days from bank tx date (inclusive). Undefined = no date filter. */
  dayWindow?: number;
  /** Client-side substring on displayed fields (id, amount, date, name/description). */
  searchText?: string;
};

/** Shape covering every candidate kind we score. Only a subset of fields is populated per kind. */
export type ReconcileCandidate = {
  id: number;
  amount: number;
  /** sales date */
  date?: string;
  /** expense date */
  expenseDate?: string;
  /** entry/balance movement effective date */
  entryDate?: string;
  description?: string;
  name?: string;
  vendor?: string;
  label?: string | null;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function candidateDate(entityType: ReconcilableEntityType, c: ReconcileCandidate): string {
  switch (entityType) {
    case "sale":
      return c.date ?? "";
    case "expense":
      return c.expenseDate ?? "";
    case "entry":
    case "balance_movement":
      return c.entryDate ?? c.date ?? c.expenseDate ?? "";
  }
}

function candidateTextBlob(entityType: ReconcilableEntityType, c: ReconcileCandidate): string {
  const pieces: string[] = [String(c.id), String(c.amount)];
  pieces.push(candidateDate(entityType, c));
  switch (entityType) {
    case "sale":
      pieces.push(c.description ?? "");
      break;
    case "expense":
      pieces.push(c.name ?? "", c.vendor ?? "", c.description ?? "");
      break;
    case "entry":
    case "balance_movement":
      pieces.push(c.label ?? "", c.description ?? "", c.name ?? "");
      break;
  }
  return pieces.join(" ").toLowerCase();
}

function matchesSearch(entityType: ReconcilableEntityType, c: ReconcileCandidate, q: string): boolean {
  const n = norm(q);
  if (!n) return true;
  return candidateTextBlob(entityType, c).includes(n);
}

/**
 * Heuristic score for ranking candidates against a bank transaction.
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
  c: ReconcileCandidate
): number {
  const txAmount = Math.abs(Number(tx.amount));
  const candAmount = Math.abs(Number(c.amount));
  const amountDiff = Math.abs(txAmount - candAmount);
  const scoreAmount = amountDiff === 0 ? 5000 : -amountDiff * 100;

  const txDate = tx.execution_date ? new Date(tx.execution_date + "T12:00:00").getTime() : 0;
  const entityDateStr = candidateDate(entityType, c);
  const entityTime = entityDateStr ? new Date(entityDateStr + "T12:00:00").getTime() : 0;
  const daysDiff = txDate && entityTime ? Math.abs((entityTime - txDate) / (24 * 60 * 60 * 1000)) : 999;
  const scoreDate = -daysDiff * 10;

  const txLabel = norm(tx.label ?? "");
  const txCounterparty = norm(tx.counterparty_name ?? "");
  const nameOrDesc = norm(candidateTextBlob(entityType, c));

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

export function filterReconciliationCandidates<T extends ReconcileCandidate>(
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
      const entityDateStr = candidateDate(entityType, c);
      const et = entityDateStr ? new Date(entityDateStr + "T12:00:00").getTime() : 0;
      if (!et) return false;
      const days = Math.abs((et - txTime) / (24 * 60 * 60 * 1000));
      if (days > windowDays) return false;
    }
    if (filters.searchText && !matchesSearch(entityType, c, filters.searchText)) return false;
    return true;
  });
}

export function sortReconciliationCandidates<T extends ReconcileCandidate>(
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
