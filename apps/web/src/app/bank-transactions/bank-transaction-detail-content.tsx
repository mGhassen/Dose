"use client";

import { useEffect, useState } from "react";
import { useBankTransaction } from "@kit/hooks";
import { Button } from "@kit/ui/button";
import { X } from "lucide-react";

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
          <p>{tx.execution_date}</p>
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

      <p className="mt-2 text-xs text-muted-foreground">
        Reconcile actions (create expense/sale, link to existing) — coming in next step.
      </p>
    </div>
  );
}

