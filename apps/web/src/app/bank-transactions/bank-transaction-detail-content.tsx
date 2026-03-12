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
  const { data: expensesResponse, isLoading: expensesLoading } = useExpenses({
    startDate,
    endDate,
    limit: 200,
  });

  const sales = salesResponse?.data ?? [];
  const expenses = expensesResponse?.data ?? [];
  const candidates = entityType === "sale" ? sales : expenses;
  const isLoading = entityType === "sale" ? salesLoading : expensesLoading;

  const selectorItems = useMemo(
    () =>
      candidates.map((c) => ({
        id: c.id,
        name:
          entityType === "sale"
            ? `Sale #${c.id} · ${Number((c as { amount: number; date: string }).amount).toFixed(2)} € · ${(c as { date: string }).date}`
            : `Expense #${c.id} · ${Number((c as { amount: number }).amount).toFixed(2)} € · ${(c as { expenseDate: string }).expenseDate}`,
      })),
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
        searchPlaceholder="Search by id or amount…"
        getDisplayName={(item) => (item.name ?? `${entityType} #${item.id}`)}
      />
    </div>
  );
}

