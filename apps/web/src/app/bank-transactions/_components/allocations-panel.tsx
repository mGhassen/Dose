"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useSplitBankTransaction,
  useDeleteBankTransactionAllocation,
} from "@kit/hooks";
import type { BankTransaction } from "@kit/lib";
import type { BankTransactionAllocation } from "@kit/types";
import { Button } from "@kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { DraftRow } from "./draft-row";
import { SuggestionsPanel } from "./suggestions";
import {
  draftIsReady,
  draftToSplitLine,
  emptyDraftOfKind,
  type DraftKind,
  type DraftLine,
} from "./allocation-types";

type Props = {
  tx: BankTransaction;
  transactionId: string;
};

const ALL_KINDS: DraftKind[] = [
  "balance_movement",
  "payment",
  "link_expense",
  "link_sale",
  "new_expense",
  "new_sale",
];

export function AllocationsPanel({ tx, transactionId }: Props) {
  const allocations = tx.allocations ?? [];
  const isCredit = Number(tx.amount) > 0;
  const bankAmount = Number(tx.amount) || 0;
  const allocatedSum = Number(tx.allocated_total ?? 0);
  const remainingOnServer = Number(tx.remaining ?? bankAmount - allocatedSum);

  const localIdRef = useRef(0);
  const [drafts, setDrafts] = useState<DraftLine[]>([]);

  useEffect(() => {
    setDrafts([]);
  }, [tx.id]);

  const draftSum = useMemo(
    () =>
      drafts.reduce((s, d) => {
        const v = parseFloat(d.amount);
        return s + (Number.isNaN(v) ? 0 : v);
      }, 0),
    [drafts]
  );
  const leftoverAfterDrafts = Math.round((remainingOnServer - draftSum) * 100) / 100;
  const balanced = Math.abs(leftoverAfterDrafts) < 0.01;

  const splitMutation = useSplitBankTransaction();
  const deleteAlloc = useDeleteBankTransactionAllocation();

  const addDraft = (seed: Partial<DraftLine> & { kind: DraftKind }) => {
    localIdRef.current += 1;
    const localId = localIdRef.current;
    const suggested = remainingOnServer !== 0 ? remainingOnServer.toFixed(2) : "0";
    const base = emptyDraftOfKind(seed.kind, localId, tx.execution_date, suggested);
    const merged = { ...base, ...seed, localId, kind: seed.kind } as DraftLine;
    setDrafts((prev) => [...prev, merged]);
  };

  const updateDraft = (localId: number, patch: Partial<DraftLine>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.localId === localId ? ({ ...d, ...patch } as DraftLine) : d))
    );
  };

  const removeDraft = (localId: number) => {
    setDrafts((prev) => prev.filter((d) => d.localId !== localId));
  };

  const handleDelete = (allocId: number) => {
    deleteAlloc.mutate(
      { id: transactionId, allocationId: allocId },
      {
        onSuccess: () => toast.success("Allocation removed"),
        onError: (err: Error) => toast.error(err.message || "Failed to remove allocation"),
      }
    );
  };

  const handleSave = () => {
    if (drafts.length === 0) return;
    const notReady = drafts.find((d) => !draftIsReady(d));
    if (notReady) {
      toast.error("One or more draft rows are incomplete");
      return;
    }
    const lines = drafts
      .map((d) => draftToSplitLine(d))
      .filter((l): l is NonNullable<typeof l> => l != null);
    if (lines.length === 0) return;
    splitMutation.mutate(
      { id: transactionId, body: { lines } },
      {
        onSuccess: () => {
          toast.success("Allocations saved");
          setDrafts([]);
        },
        onError: (err: Error) => toast.error(err.message || "Failed to save allocations"),
      }
    );
  };

  const usedExpenseIds = useMemo(
    () => collectEntityIds(allocations, drafts, "expense"),
    [allocations, drafts]
  );
  const usedSaleIds = useMemo(
    () => collectEntityIds(allocations, drafts, "sale"),
    [allocations, drafts]
  );
  const usedEntryIds = useMemo(() => {
    const set = new Set<number>();
    for (const a of allocations) {
      if (a.entity_type === "payment") continue;
    }
    for (const d of drafts) {
      if (d.kind === "payment" && d.entryId != null) set.add(d.entryId);
    }
    return set;
  }, [allocations, drafts]);

  const availableKinds = ALL_KINDS.filter((k) => {
    if (isCredit) return k !== "link_expense" && k !== "new_expense";
    return k !== "link_sale" && k !== "new_sale";
  });

  return (
    <div className="space-y-3">
      <AllocationsSummary
        bankAmount={bankAmount}
        allocatedSum={allocatedSum}
        draftSum={draftSum}
        leftoverAfterDrafts={leftoverAfterDrafts}
        currency={tx.currency}
      />

      {allocations.length > 0 ? (
        <div className="rounded-lg border bg-background">
          <div className="border-b px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
            Current allocations
          </div>
          <div className="divide-y">
            {allocations.map((a) => (
              <ExistingAllocationRow
                key={a.id}
                allocation={a}
                onDelete={() => handleDelete(a.id)}
                disabled={deleteAlloc.isPending}
              />
            ))}
          </div>
        </div>
      ) : null}

      <SuggestionsPanel
        tx={tx}
        excludedExpenseIds={usedExpenseIds}
        excludedSaleIds={usedSaleIds}
        excludedEntryIds={usedEntryIds}
        remaining={leftoverAfterDrafts}
        addDraft={addDraft}
      />

      {drafts.length > 0 ? (
        <div className="space-y-2">
          {drafts.map((d) => (
            <DraftRow
              key={d.localId}
              draft={d}
              txExecutionDate={tx.execution_date}
              update={(patch) => updateDraft(d.localId, patch)}
              remove={() => removeDraft(d.localId)}
              usedExpenseIds={usedExpenseIds}
              usedSaleIds={usedSaleIds}
              usedEntryIds={usedEntryIds}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add allocation
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableKinds.map((k) => (
              <DropdownMenuItem
                key={k}
                onClick={() => addDraft({ kind: k })}
              >
                {KIND_LABEL[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={
            splitMutation.isPending ||
            drafts.length === 0 ||
            drafts.some((d) => !draftIsReady(d)) ||
            leftoverAfterDrafts < -0.01
          }
        >
          {splitMutation.isPending
            ? "Saving…"
            : balanced
            ? `Save ${drafts.length} allocation${drafts.length > 1 ? "s" : ""} (balanced)`
            : `Save ${drafts.length} allocation${drafts.length > 1 ? "s" : ""} (leaves ${leftoverAfterDrafts.toFixed(2)})`}
        </Button>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<DraftKind, string> = {
  balance_movement: "Balance account",
  payment: "Ledger payment",
  link_expense: "Link existing expense",
  link_sale: "Link existing sale",
  new_expense: "Create new expense",
  new_sale: "Create new sale",
};

function AllocationsSummary({
  bankAmount,
  allocatedSum,
  draftSum,
  leftoverAfterDrafts,
  currency,
}: {
  bankAmount: number;
  allocatedSum: number;
  draftSum: number;
  leftoverAfterDrafts: number;
  currency: string;
}) {
  const color =
    Math.abs(leftoverAfterDrafts) < 0.01
      ? "text-green-600"
      : Math.sign(leftoverAfterDrafts) !== Math.sign(bankAmount) && leftoverAfterDrafts !== 0
      ? "text-red-600"
      : "text-amber-600";
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border bg-background p-3 text-xs sm:grid-cols-4">
      <Stat label="Bank amount" value={`${bankAmount.toFixed(2)} ${currency}`} />
      <Stat label="Allocated" value={allocatedSum.toFixed(2)} />
      <Stat label="Drafts Σ" value={draftSum.toFixed(2)} />
      <Stat
        label="Remaining after save"
        value={leftoverAfterDrafts.toFixed(2)}
        valueClass={color}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-semibold tabular-nums ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

function ExistingAllocationRow({
  allocation,
  onDelete,
  disabled,
}: {
  allocation: BankTransactionAllocation;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const { entity_type, entity_id, amount, label, notes } = allocation;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate">
          <span className="font-medium">{entity_type}</span>{" "}
          <span className="text-muted-foreground">#{entity_id}</span>
          {label ? <span className="text-muted-foreground"> · {label}</span> : null}
          {notes ? <span className="text-muted-foreground"> · {notes}</span> : null}
        </p>
      </div>
      <span className="w-24 shrink-0 text-right font-mono tabular-nums">
        {Number(amount).toFixed(2)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onDelete}
        disabled={disabled}
        aria-label="Delete allocation"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function collectEntityIds(
  allocations: BankTransactionAllocation[],
  drafts: DraftLine[],
  kind: "expense" | "sale"
): Set<number> {
  const set = new Set<number>();
  for (const a of allocations) {
    if (a.entity_type === kind) set.add(a.entity_id);
  }
  for (const d of drafts) {
    if (kind === "expense" && d.kind === "link_expense" && d.expenseId != null) set.add(d.expenseId);
    if (kind === "sale" && d.kind === "link_sale" && d.saleId != null) set.add(d.saleId);
  }
  return set;
}
