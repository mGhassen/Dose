"use client";

import { useEffect, useMemo, useState } from "react";
import { useBankTransaction, useReconcileBankTransaction, useSales, useExpenses } from "@kit/hooks";
import { formatDate } from "@kit/lib/date-format";
import { Button } from "@kit/ui/button";
import { X } from "lucide-react";
import { UnifiedSelector } from "@/components/unified-selector";
import { Tabs, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { toast } from "sonner";

function dateRangeAround(executionDate: string) {
  const d = new Date(executionDate + "T12:00:00");
  const start = new Date(d);
  start.setDate(start.getDate() - 30);
  const end = new Date(d);
  end.setDate(end.getDate() + 30);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

interface BankTransactionDetailContentProps {
  transactionId: string;
  onClose: () => void;
}

export function BankTransactionDetailContent({
  transactionId,
  onClose,
}: BankTransactionDetailContentProps) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(transactionId);
  }, [transactionId]);

  const { data: tx, isLoading } = useBankTransaction(id);

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!tx) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bank transaction</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Transaction not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 pb-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            Bank transaction #{tx.id}
          </h2>
          <p className="text-xs text-muted-foreground">
            Inspect and reconcile this bank movement.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border bg-background p-4 text-sm space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Date
          </p>
          <p>{formatDate(tx.execution_date)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Amount
          </p>
          <p>
            {Number(tx.amount).toFixed(2)} {tx.currency}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Label
          </p>
          <p>{tx.label ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Counterparty
          </p>
          <p>{tx.counterparty_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Reconciled
          </p>
          <p>
            {tx.reconciled_entity_type
              ? `${tx.reconciled_entity_type} #${tx.reconciled_entity_id}`
              : "—"}
          </p>
        </div>
      </div>

      <ReconciliationBlock tx={tx} />
    </div>
  );
}

type ReconcilableEntityType = "sale" | "expense";

function ReconciliationBlock({ tx }: { tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]> }) {
  const [entityType, setEntityType] = useState<ReconcilableEntityType>("sale");
  const reconcileMutation = useReconcileBankTransaction();
  const { startDate, endDate } = useMemo(() => dateRangeAround(tx.execution_date), [tx.execution_date]);

  const { data: salesResponse, isLoading: salesLoading } = useSales({
    startDate,
    endDate,
    limit: 200,
  });
  const { data: salesFallbackResponse, isLoading: salesFallbackLoading } = useSales({
    limit: 200,
  });
  const { data: expensesResponse, isLoading: expensesLoading } = useExpenses({
    startDate,
    endDate,
    limit: 200,
  });
  const { data: expensesFallbackResponse, isLoading: expensesFallbackLoading } = useExpenses({
    limit: 200,
  });

  const salesDateBounded = salesResponse?.data ?? [];
  const salesFallback = salesFallbackResponse?.data ?? [];
  const expensesDateBounded = expensesResponse?.data ?? [];
  const expensesFallback = expensesFallbackResponse?.data ?? [];

  const sales = salesDateBounded.length > 0 ? salesDateBounded : salesFallback;
  const expenses = expensesDateBounded.length > 0 ? expensesDateBounded : expensesFallback;
  const rawCandidates = entityType === "sale" ? sales : expenses;
  const isLoading =
    entityType === "sale"
      ? salesLoading || (salesDateBounded.length === 0 && salesFallbackLoading)
      : expensesLoading || (expensesDateBounded.length === 0 && expensesFallbackLoading);

  const txAmount = Math.abs(Number(tx.amount));
  const txDate = tx.execution_date ? new Date(tx.execution_date + "T12:00:00").getTime() : 0;
  const txLabel = (tx.label ?? "").toLowerCase();
  const txCounterparty = (tx.counterparty_name ?? "").toLowerCase();

  const candidates = useMemo(() => {
    const score = (c: (typeof rawCandidates)[0]) => {
      const amount = Number((c as { amount: number }).amount);
      const amountDiff = Math.abs(txAmount - amount);
      const scoreAmount = amountDiff === 0 ? 1000 : -amountDiff;
      const entityDate =
        entityType === "sale"
          ? (c as { date: string }).date
          : (c as { expenseDate: string }).expenseDate;
      const entityTime = entityDate ? new Date(entityDate + "T12:00:00").getTime() : 0;
      const daysDiff = txDate ? Math.abs((entityTime - txDate) / (24 * 60 * 60 * 1000)) : 999;
      const scoreDate = -daysDiff;
      const nameOrDesc =
        entityType === "sale"
          ? ((c as { description?: string }).description ?? "").toLowerCase()
          : ((c as { name?: string }).name ?? "").toLowerCase();
      const nameMatch =
        txLabel && nameOrDesc && (nameOrDesc.includes(txLabel) || txLabel.includes(nameOrDesc))
          ? 50
          : 0;
      const counterpartyMatch =
        txCounterparty &&
        nameOrDesc &&
        (nameOrDesc.includes(txCounterparty) || txCounterparty.includes(nameOrDesc))
          ? 50
          : 0;
      return scoreAmount + scoreDate + nameMatch + counterpartyMatch;
    };
    return [...rawCandidates].sort((a, b) => score(b) - score(a));
  }, [rawCandidates, entityType, txAmount, txDate, txLabel, txCounterparty]);

  const selectorItems = useMemo(
    () =>
      candidates.map((c) => {
        const amount = Number((c as { amount: number }).amount).toFixed(2);
        if (entityType === "sale") {
          const s = c as { id: number; date: string; description?: string };
          const label = (s.description ?? "—").slice(0, 40);
          return { id: c.id, name: `Sale #${s.id} · ${label} · ${amount} € · ${s.date}` };
        }
        const e = c as { id: number; name?: string; expenseDate: string };
        const name = (e.name ?? "—").slice(0, 40);
        return { id: c.id, name: `Expense #${e.id} · ${name} · ${amount} € · ${e.expenseDate}` };
      }),
    [candidates, entityType]
  );

  const handleLink = (item: { id: number | string }) => {
    const entityId = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
    if (Number.isNaN(entityId)) return;
    reconcileMutation.mutate(
      {
        id: String(tx.id),
        reconciled_entity_type: entityType,
        reconciled_entity_id: entityId,
      },
      {
        onSuccess: () => toast.success("Reconciliation saved"),
        onError: () => toast.error("Failed to save reconciliation"),
      }
    );
  };

  const handleClear = () => {
    reconcileMutation.mutate(
      {
        id: String(tx.id),
        reconciled_entity_type: null,
        reconciled_entity_id: null,
      },
      {
        onSuccess: () => toast.success("Reconciliation cleared"),
        onError: () => toast.error("Failed to clear reconciliation"),
      }
    );
  };

  if (tx.reconciled_entity_type && tx.reconciled_entity_id != null) {
    return (
      <div className="rounded-lg border bg-background p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Reconciliation</p>
        <p className="text-sm">
          {tx.reconciled_entity_type} #{tx.reconciled_entity_id}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={reconcileMutation.isPending}
        >
          {reconcileMutation.isPending ? "Clearing…" : "Clear reconciliation"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">Reconciliation</p>
      <Tabs value={entityType} onValueChange={(v) => setEntityType(v as ReconcilableEntityType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sale">Sale</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
        </TabsList>
      </Tabs>
      <UnifiedSelector
        mode="single"
        type="item"
        items={selectorItems}
        isLoading={isLoading}
        selectedId={undefined}
        onSelect={(item) => handleLink(item)}
        placeholder={isLoading ? "Loading…" : `Select ${entityType} to link`}
        searchPlaceholder="Search by name, id, amount, date…"
        getDisplayName={(item) => (item.name ?? `${entityType} #${item.id}`)}
      />
    </div>
  );
}

