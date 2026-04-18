"use client";

import { useBankTransaction } from "@kit/hooks";
import { formatDate } from "@kit/lib/date-format";
import { Button } from "@kit/ui/button";
import { X } from "lucide-react";
import { AllocationsPanel } from "./_components/allocations-panel";

interface BankTransactionDetailContentProps {
  transactionId: string;
  onClose: () => void;
}

export function BankTransactionDetailContent({
  transactionId,
  onClose,
}: BankTransactionDetailContentProps) {
  const { data: tx, isLoading } = useBankTransaction(transactionId);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
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

  const fullyReconciled = !!tx.fully_reconciled;

  return (
    <div className="flex h-full flex-col gap-4 pb-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Bank transaction #{tx.id}</h2>
          <p className="text-xs text-muted-foreground">
            {fullyReconciled
              ? "Fully reconciled. Remove allocations to change this line."
              : "Split this bank line across one or more allocations. Amounts must balance to save."}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border bg-background p-3 text-sm grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Date" value={formatDate(tx.execution_date)} />
        <Field
          label="Amount"
          value={
            <span className={Number(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}>
              {Number(tx.amount).toFixed(2)} {tx.currency}
            </span>
          }
        />
        <Field label="Label" value={tx.label ?? "—"} />
        <Field label="Counterparty" value={tx.counterparty_name ?? "—"} />
      </div>

      <AllocationsPanel tx={tx} transactionId={transactionId} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="truncate">{value}</p>
    </div>
  );
}
