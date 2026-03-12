"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/app-layout";
import { useBankTransaction } from "@kit/hooks";
import { Button } from "@kit/ui/button";
import Link from "next/link";

export default function BankTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);
  const { data: tx, isLoading } = useBankTransaction(id);

  if (!id) return null;
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">Loading…</div>
      </AppLayout>
    );
  }
  if (!tx) {
    return (
      <AppLayout>
        <div className="p-6">Transaction not found.</div>
        <Button variant="outline" asChild>
          <Link href="/bank-transactions">Back to list</Link>
        </Button>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bank-transactions">← Back</Link>
          </Button>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Bank transaction #{tx.id}</h2>
          <dl className="mt-4 grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd>{tx.execution_date}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Amount</dt>
              <dd>
                {Number(tx.amount).toFixed(2)} {tx.currency}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Label</dt>
              <dd>{tx.label ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Counterparty</dt>
              <dd>{tx.counterparty_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reconciled</dt>
              <dd>
                {tx.reconciled_entity_type
                  ? `${tx.reconciled_entity_type} #${tx.reconciled_entity_id}`
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            Reconcile actions (create expense/sale, link to existing) — coming in next step.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
