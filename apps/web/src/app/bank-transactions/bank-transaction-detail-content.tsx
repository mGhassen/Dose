"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useBankTransaction,
  useReconcileBankTransaction,
  useCreateExpenseFromBankTransaction,
  useCreateSaleFromBankTransaction,
  useAllocatePaymentFromBankTransaction,
  useAllocateReceiptsBulkFromBankTransaction,
  useSales,
  useExpenses,
  useEntries,
  useInventorySuppliers,
  useSupplierOrders,
  useItems,
} from "@kit/hooks";
import { formatDate } from "@kit/lib/date-format";
import { Button } from "@kit/ui/button";
import { X } from "lucide-react";
import { UnifiedSelector } from "@/components/unified-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { toast } from "sonner";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { Checkbox } from "@kit/ui/checkbox";
import { EXPENSE_CATEGORY_NAMES, SALES_TYPE_NAMES } from "@/shared/zod-schemas";
import {
  filterReconciliationCandidates,
  scoreReconciliationCandidate,
  sortReconciliationCandidates,
  type ReconcilableEntityType,
} from "@/lib/bank-transactions/reconciliation-candidates";
import type {
  BankTransactionAllocatePaymentPayload,
  BankTransactionAllocateReceiptsBulkPayload,
  BankTransactionCreateExpensePayload,
  BankTransactionCreateSalePayload,
} from "@kit/lib";

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

  const isReconciled = !!(tx.reconciled_entity_type && tx.reconciled_entity_id != null);
  const isDebit = Number(tx.amount) < 0;
  const isCredit = Number(tx.amount) > 0;

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

      {isReconciled ? (
        <ReconciledActionsBlock tx={tx} />
      ) : (
        <Tabs
          key={tx.id}
          defaultValue="reconcile"
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <TabsList className="grid w-full shrink-0 grid-cols-3">
            <TabsTrigger value="reconcile">Reconcile existing</TabsTrigger>
            <TabsTrigger value="create-expense" disabled={!isDebit}>
              Debit (out)
            </TabsTrigger>
            <TabsTrigger value="create-sale" disabled={!isCredit}>
              Credit (in)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reconcile" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
            <ReconciliationBlock tx={tx} />
          </TabsContent>
          <TabsContent value="create-expense" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
            {isDebit ? (
              <DebitOutflowPanel tx={tx} transactionId={transactionId} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Debit actions are only for negative amounts (money out).
              </p>
            )}
          </TabsContent>
          <TabsContent value="create-sale" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
            {isCredit ? (
              <CreditInflowPanel tx={tx} transactionId={transactionId} />
            ) : (
              <p className="text-sm text-muted-foreground">Credit actions are only for positive amounts (money in).</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ReconciledActionsBlock({
  tx,
}: {
  tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]>;
}) {
  const reconcileMutation = useReconcileBankTransaction();

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

function ReconciliationBlock({ tx }: { tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]> }) {
  const [entityType, setEntityType] = useState<ReconcilableEntityType>("sale");
  const [exactAmount, setExactAmount] = useState(false);
  const [dayWindow, setDayWindow] = useState("60");
  const [useDayWindow, setUseDayWindow] = useState(true);
  const [searchText, setSearchText] = useState("");
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

  const dayWindowNum = Math.max(0, parseInt(dayWindow, 10) || 0);

  const candidates = useMemo(() => {
    const filtered = filterReconciliationCandidates(entityType, tx, rawCandidates as never, {
      exactAmount,
      dayWindow: useDayWindow ? dayWindowNum : undefined,
      searchText: searchText.trim() || undefined,
    });
    return sortReconciliationCandidates(entityType, tx, filtered as never);
  }, [rawCandidates, entityType, tx, exactAmount, useDayWindow, dayWindowNum, searchText]);

  const selectorItems = useMemo(
    () =>
      candidates.map((c) => {
        const amount = Number((c as { amount: number }).amount).toFixed(2);
        const sc = scoreReconciliationCandidate(entityType, tx, c as never);
        const scoreLabel = Math.round(sc);
        if (entityType === "sale") {
          const s = c as { id: number; date: string; description?: string };
          const label = (s.description ?? "—").slice(0, 36);
          return {
            id: c.id,
            name: `Sale #${s.id} · ${label} · ${amount} € · ${s.date} · match ${scoreLabel}`,
          };
        }
        const e = c as { id: number; name?: string; expenseDate: string };
        const name = (e.name ?? "—").slice(0, 36);
        return {
          id: c.id,
          name: `Expense #${e.id} · ${name} · ${amount} € · ${e.expenseDate} · match ${scoreLabel}`,
        };
      }),
    [candidates, entityType, tx]
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

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">Reconcile existing</p>
      <div className="flex w-full gap-2 rounded-md border border-border bg-muted/40 p-1">
        <Button
          type="button"
          variant={entityType === "sale" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setEntityType("sale")}
        >
          Sale
        </Button>
        <Button
          type="button"
          variant={entityType === "expense" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setEntityType("expense")}
        >
          Expense
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="exact-amount"
            checked={exactAmount}
            onCheckedChange={(v) => setExactAmount(v === true)}
          />
          <Label htmlFor="exact-amount" className="text-xs font-normal">
            Exact amount only
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="use-window"
            checked={useDayWindow}
            onCheckedChange={(v) => setUseDayWindow(v === true)}
          />
          <Label htmlFor="use-window" className="text-xs font-normal shrink-0">
            ± days
          </Label>
          <Input
            type="number"
            min={0}
            className="h-8 w-20 text-xs"
            disabled={!useDayWindow}
            value={dayWindow}
            onChange={(e) => setDayWindow(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Filter list (id, amount, date, name…)</Label>
        <Input
          className="h-9 text-sm"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Type to narrow candidates…"
        />
      </div>
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

const DEBIT_OBLIGATION_ENTRY_TYPES: { value: string; label: string }[] = [
  { value: "loan_payment", label: "Loan installment" },
  { value: "expense", label: "Expense" },
  { value: "subscription_payment", label: "Subscription" },
  { value: "leasing_payment", label: "Leasing (ledger)" },
  { value: "expense_payment", label: "Expense payment (legacy)" },
];

function DebitOutflowPanel({
  tx,
  transactionId,
}: {
  tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]>;
  transactionId: string;
}) {
  const [mode, setMode] = useState<"expense" | "allocate">("expense");

  return (
    <div className="space-y-3">
      <div className="flex w-full gap-2 rounded-md border border-border bg-muted/40 p-1">
        <Button
          type="button"
          variant={mode === "expense" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setMode("expense")}
        >
          New expense
        </Button>
        <Button
          type="button"
          variant={mode === "allocate" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setMode("allocate")}
        >
          Loan / subscription / …
        </Button>
      </div>
      {mode === "expense" ? (
        <CreateExpenseFromTransactionForm tx={tx} transactionId={transactionId} />
      ) : (
        <AllocateDebitPaymentForm tx={tx} transactionId={transactionId} />
      )}
    </div>
  );
}

function sumEntryPayments(entry: { payments?: Array<{ amount: number }> }) {
  if (!entry.payments?.length) return 0;
  return entry.payments.reduce((s, p) => s + Number(p.amount), 0);
}

function AllocateDebitPaymentForm({
  tx,
  transactionId,
}: {
  tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]>;
  transactionId: string;
}) {
  const absBank = Math.abs(Number(tx.amount));
  const [entryType, setEntryType] = useState("loan_payment");
  const { startDate: fromDate, endDate: toDate } = useMemo(() => {
    const d = new Date((tx.execution_date || "").slice(0, 10) + "T12:00:00");
    const start = new Date(d);
    start.setDate(start.getDate() - 120);
    const end = new Date(d);
    end.setDate(end.getDate() + 60);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [tx.execution_date]);

  const { data: entriesRes, isLoading: entriesLoading } = useEntries({
    direction: "output",
    entryType,
    fromDate,
    toDate,
    includePayments: true,
    limit: 200,
  });
  const rawEntries = entriesRes?.data ?? [];

  const payableEntries = useMemo(() => {
    return rawEntries.filter((e) => {
      const paid = sumEntryPayments(e);
      return e.amount - paid > 0.02;
    });
  }, [rawEntries]);

  const selectorItems = useMemo(
    () =>
      payableEntries.map((e) => {
        const paid = sumEntryPayments(e);
        const rem = (e.amount - paid).toFixed(2);
        return {
          id: e.id,
          name: `#${e.id} ${e.entryType} · ${e.name.slice(0, 28)} · ${e.entryDate} · due ${e.amount.toFixed(2)} € · left ${rem} €`,
        };
      }),
    [payableEntries]
  );

  const [selectedEntryId, setSelectedEntryId] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState(String(absBank.toFixed(2)));
  const [paymentDate, setPaymentDate] = useState((tx.execution_date || "").slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setAmount(String(Math.abs(Number(tx.amount)).toFixed(2)));
    setPaymentDate((tx.execution_date || "").slice(0, 10));
    setSelectedEntryId(undefined);
    setNotes("");
  }, [tx.id, tx.execution_date, tx.amount, entryType]);

  const allocateMutation = useAllocatePaymentFromBankTransaction();

  const submit = () => {
    if (selectedEntryId == null) {
      toast.error("Select a ledger line");
      return;
    }
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Invalid amount");
      return;
    }
    const body: BankTransactionAllocatePaymentPayload = {
      entryId: selectedEntryId,
      amount: amt,
      paymentDate: paymentDate.length >= 10 ? paymentDate.slice(0, 10) : paymentDate,
      notes: notes.trim() || undefined,
    };
    allocateMutation.mutate(
      { id: transactionId, body },
      {
        onSuccess: () => toast.success("Payment recorded against bank line"),
        onError: (err: Error & { message?: string }) =>
          toast.error(err?.message ?? "Failed to allocate payment"),
      }
    );
  };

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">Allocate bank debit</p>
      <p className="text-xs text-muted-foreground">
        Records a row in <span className="font-mono">payments</span> linked to this bank transaction (same cap rules as elsewhere). Use{" "}
        <span className="font-medium">Loan installment</span> for scheduled loan outputs, <span className="font-medium">Subscription</span> for
        subscription_payment lines. Some leasing flows use Actual payments instead of ledger payments—those are not listed here unless a{" "}
        <span className="font-mono">leasing_payment</span> entry exists.
      </p>
      <div className="space-y-1">
        <Label className="text-xs">Obligation type</Label>
        <Select value={entryType} onValueChange={(v) => setEntryType(v)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEBIT_OBLIGATION_ENTRY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <UnifiedSelector
        mode="single"
        type="item"
        items={selectorItems}
        isLoading={entriesLoading}
        selectedId={selectedEntryId}
        onSelect={(item) => {
          const id = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
          setSelectedEntryId(Number.isNaN(id) ? undefined : id);
        }}
        placeholder={entriesLoading ? "Loading…" : "Select unpaid output line…"}
        searchPlaceholder="Search…"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Amount</Label>
          <Input
            className="h-9"
            type="number"
            step="0.01"
            min={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Payment date</Label>
          <Input className="h-9" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes (optional)</Label>
        <Input className="h-9" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button size="sm" onClick={submit} disabled={allocateMutation.isPending || selectedEntryId == null}>
        {allocateMutation.isPending ? "Saving…" : "Record payment"}
      </Button>
    </div>
  );
}

function CreditInflowPanel({
  tx,
  transactionId,
}: {
  tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]>;
  transactionId: string;
}) {
  const [mode, setMode] = useState<"sale" | "allocate">("sale");

  return (
    <div className="space-y-3">
      <div className="flex w-full gap-2 rounded-md border border-border bg-muted/40 p-1">
        <Button
          type="button"
          variant={mode === "sale" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setMode("sale")}
        >
          New sale (lines)
        </Button>
        <Button
          type="button"
          variant={mode === "allocate" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setMode("allocate")}
        >
          Link to sale(s)
        </Button>
      </div>
      {mode === "sale" ? (
        <CreateSaleFromTransactionForm tx={tx} transactionId={transactionId} />
      ) : (
        <AllocateCreditSaleReceiptForm tx={tx} transactionId={transactionId} />
      )}
    </div>
  );
}

type ReceiptAllocationDraft = {
  localId: number;
  entryId?: number;
  amount: string;
  notes: string;
};

function AllocateCreditSaleReceiptForm({
  tx,
  transactionId,
}: {
  tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]>;
  transactionId: string;
}) {
  const bankCredit = Number(tx.amount);
  const alreadyLinked = tx.allocated_payments_total ?? 0;
  const bankRemaining = Math.max(0, bankCredit - alreadyLinked);
  const rowIdRef = useRef(0);

  const { startDate: fromDate, endDate: toDate } = useMemo(() => {
    const d = new Date((tx.execution_date || "").slice(0, 10) + "T12:00:00");
    const start = new Date(d);
    start.setDate(start.getDate() - 120);
    const end = new Date(d);
    end.setDate(end.getDate() + 60);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [tx.execution_date]);

  const { data: entriesRes, isLoading: entriesLoading } = useEntries({
    direction: "input",
    entryType: "sale",
    fromDate,
    toDate,
    includePayments: true,
    limit: 200,
  });
  const rawEntries = entriesRes?.data ?? [];

  const receivableEntries = useMemo(() => {
    return rawEntries.filter((e) => {
      const paid = sumEntryPayments(e);
      return e.amount - paid > 0.02;
    });
  }, [rawEntries]);

  const [rows, setRows] = useState<ReceiptAllocationDraft[]>([]);
  const [paymentDate, setPaymentDate] = useState((tx.execution_date || "").slice(0, 10));

  useEffect(() => {
    rowIdRef.current += 1;
    const firstId = rowIdRef.current;
    setRows([{ localId: firstId, entryId: undefined, amount: "", notes: "" }]);
    setPaymentDate((tx.execution_date || "").slice(0, 10));
  }, [tx.id, tx.execution_date]);

  const usedEntryIds = useMemo(() => {
    const set = new Set<number>();
    for (const r of rows) if (r.entryId != null) set.add(r.entryId);
    return set;
  }, [rows]);

  const mutation = useAllocateReceiptsBulkFromBankTransaction();

  const sumDraft = useMemo(() => {
    let s = 0;
    for (const r of rows) {
      const v = parseFloat(r.amount);
      if (!Number.isNaN(v)) s += v;
    }
    return Math.round(s * 100) / 100;
  }, [rows]);

  const leftAfter = Math.round((bankRemaining - sumDraft) * 100) / 100;

  const updateRow = (localId: number, patch: Partial<Omit<ReceiptAllocationDraft, "localId">>) => {
    setRows((prev) => prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    rowIdRef.current += 1;
    const id = rowIdRef.current;
    setRows((prev) => [...prev, { localId: id, entryId: undefined, amount: "", notes: "" }]);
  };

  const removeRow = (localId: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.localId !== localId)));
  };

  const autoFillRow = (localId: number, entryId: number) => {
    const e = receivableEntries.find((x) => x.id === entryId);
    if (!e) return;
    const paid = sumEntryPayments(e);
    const open = Math.max(0, e.amount - paid);
    const usedInDraft = rows
      .filter((r) => r.localId !== localId && r.entryId != null)
      .reduce((s, r) => {
        const v = parseFloat(r.amount);
        return s + (Number.isNaN(v) ? 0 : v);
      }, 0);
    const capLeft = Math.max(0, bankRemaining - usedInDraft);
    const amt = Math.min(open, capLeft);
    updateRow(localId, { entryId, amount: amt > 0 ? String(amt.toFixed(2)) : "" });
  };

  const submit = () => {
    if (mutation.isPending) return;

    const allocations: BankTransactionAllocateReceiptsBulkPayload["allocations"] = [];
    const seen = new Set<number>();
    for (const r of rows) {
      if (r.entryId == null) {
        toast.error("Select a sale on every row");
        return;
      }
      if (seen.has(r.entryId)) {
        toast.error("Same sale selected twice — merge the rows first");
        return;
      }
      seen.add(r.entryId);
      const amt = parseFloat(r.amount);
      if (Number.isNaN(amt) || amt <= 0) {
        toast.error("Invalid amount on one of the rows");
        return;
      }
      allocations.push({
        entryId: r.entryId,
        amount: amt,
        notes: r.notes.trim() || undefined,
      });
    }

    const body: BankTransactionAllocateReceiptsBulkPayload = {
      allocations,
      paymentDate: paymentDate.length >= 10 ? paymentDate.slice(0, 10) : paymentDate,
    };
    mutation.mutate(
      { id: transactionId, body },
      {
        onSuccess: (data) => {
          toast.success(
            data.fullyAllocated
              ? `Linked ${allocations.length} sale(s); bank line reconciled`
              : `Linked ${allocations.length} sale(s); ${(bankRemaining - sumDraft).toFixed(2)} ${tx.currency} left`
          );
        },
        onError: (err: Error & { message?: string }) =>
          toast.error(err?.message ?? "Failed to allocate receipts"),
      }
    );
  };

  const rowsReady = rows.length > 0 && rows.every((r) => r.entryId != null && parseFloat(r.amount) > 0);

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">Link bank credit to multiple sales</p>
      <p className="text-xs text-muted-foreground">
        Add a row per sale, set the slice amount, then save once. Bank line: {bankCredit.toFixed(2)} {tx.currency}
        {alreadyLinked > 0.001 ? ` · linked ${alreadyLinked.toFixed(2)}` : ""} · this draft sums{" "}
        <span className="font-medium tabular-nums">{sumDraft.toFixed(2)}</span> · leaves{" "}
        <span
          className={
            Math.abs(leftAfter) < 0.01
              ? "font-medium tabular-nums text-green-600"
              : leftAfter < 0
              ? "font-medium tabular-nums text-red-600"
              : "font-medium tabular-nums"
          }
        >
          {leftAfter.toFixed(2)}
        </span>
        . When the sum matches, the line is reconciled (pointer = last row's sale id).
      </p>

      <div className="space-y-2">
        <Label className="text-xs">Payment date</Label>
        <Input
          className="h-9 sm:w-48"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => {
          const available = receivableEntries.filter(
            (e) => e.id === row.entryId || !usedEntryIds.has(e.id)
          );
          const items = available.map((e) => {
            const paid = sumEntryPayments(e);
            const rem = (e.amount - paid).toFixed(2);
            const sid = e.referenceId ?? "—";
            return {
              id: e.id,
              name: `Sale #${sid} · entry #${e.id} · ${e.name.slice(0, 24)} · ${e.entryDate} · open ${rem} €`,
            };
          });
          return (
            <div key={row.localId} className="rounded-md border border-border/80 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Row {idx + 1}</span>
                {rows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => removeRow(row.localId)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sale entry</Label>
                <UnifiedSelector
                  mode="single"
                  type="item"
                  items={items}
                  isLoading={entriesLoading}
                  selectedId={row.entryId}
                  onSelect={(item) => {
                    const id = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
                    if (Number.isNaN(id)) return;
                    autoFillRow(row.localId, id);
                  }}
                  placeholder={entriesLoading ? "Loading…" : "Select sale with open balance…"}
                  searchPlaceholder="Search…"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    className="h-9"
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={row.amount}
                    onChange={(e) => updateRow(row.localId, { amount: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input
                    className="h-9"
                    value={row.notes}
                    onChange={(e) => updateRow(row.localId, { notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addRow}>
          Add sale row
        </Button>
      </div>

      {leftAfter < -0.01 ? (
        <p className="text-xs text-red-600">Draft total exceeds remaining bank amount ({bankRemaining.toFixed(2)}).</p>
      ) : null}

      <Button size="sm" onClick={submit} disabled={mutation.isPending || !rowsReady || leftAfter < -0.01}>
        {mutation.isPending ? "Saving…" : `Record ${rows.length} receipt${rows.length > 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}

function CreateExpenseFromTransactionForm({
  tx,
  transactionId,
}: {
  tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]>;
  transactionId: string;
}) {
  const absAmount = Math.abs(Number(tx.amount));
  const defaultName =
    (tx.counterparty_name?.trim() || tx.label?.trim() || `Bank expense #${tx.id}`).slice(0, 200);
  const defaultVendor = tx.counterparty_name?.trim() || "";
  const defaultDesc = [tx.label, tx.source].filter(Boolean).join(" · ").slice(0, 500) || undefined;

  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORY_NAMES[2]);
  const [amount, setAmount] = useState(String(absAmount.toFixed(2)));
  const [expenseDate, setExpenseDate] = useState((tx.execution_date || "").slice(0, 10));
  const [description, setDescription] = useState(defaultDesc ?? "");
  const [vendor, setVendor] = useState(defaultVendor);
  const [supplierId, setSupplierId] = useState<number | undefined>(undefined);
  const [supplierOrderId, setSupplierOrderId] = useState<number | undefined>(undefined);

  useEffect(() => {
    setName((tx.counterparty_name?.trim() || tx.label?.trim() || `Bank expense #${tx.id}`).slice(0, 200));
    setVendor(tx.counterparty_name?.trim() || "");
    setDescription([tx.label, tx.source].filter(Boolean).join(" · ").slice(0, 500));
    setExpenseDate((tx.execution_date || "").slice(0, 10));
    setAmount(String(Math.abs(Number(tx.amount)).toFixed(2)));
    setSupplierId(undefined);
    setSupplierOrderId(undefined);
  }, [tx.id, tx.execution_date, tx.amount, tx.label, tx.counterparty_name, tx.source]);

  const { data: suppliersRes } = useInventorySuppliers({ limit: 300 });
  const suppliers = suppliersRes?.data ?? [];
  const supplierItems = useMemo(
    () => suppliers.map((s) => ({ id: s.id, name: s.name })),
    [suppliers]
  );

  const { data: ordersRes } = useSupplierOrders({
    limit: 100,
    supplierId: supplierId != null ? String(supplierId) : undefined,
    status: undefined,
  });
  const orders = ordersRes?.data ?? [];
  const orderItems = useMemo(
    () =>
      orders.map((o) => ({
        id: o.id,
        name: `Order #${o.id} · ${o.orderDate ?? "—"} · ${o.status ?? "—"}`,
      })),
    [orders]
  );

  const createMutation = useCreateExpenseFromBankTransaction();

  const submit = () => {
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt < 0) {
      toast.error("Invalid amount");
      return;
    }
    const body: BankTransactionCreateExpensePayload = {
      name: name.trim(),
      category,
      amount: amt,
      expenseDate: expenseDate.length >= 10 ? expenseDate.slice(0, 10) : expenseDate,
      description: description.trim() || undefined,
      vendor: vendor.trim() || undefined,
      supplierId,
      supplierOrderId,
    };
    createMutation.mutate(
      { id: transactionId, body },
      {
        onSuccess: () => toast.success("Expense created and transaction reconciled"),
        onError: (err: Error & { message?: string }) =>
          toast.error(err?.message ?? "Failed to create expense"),
      }
    );
  };

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">Create expense</p>
      <p className="text-xs text-muted-foreground">
        Saves a simple expense and links this bank line. If you pick a supplier without an order, a pending draft supplier order is created automatically.
      </p>
      <div className="space-y-1">
        <Label className="text-xs">Name</Label>
        <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORY_NAMES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Amount</Label>
          <Input
            className="h-9"
            type="number"
            step="0.01"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Expense date</Label>
        <Input
          className="h-9"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Vendor</Label>
        <Input className="h-9" value={vendor} onChange={(e) => setVendor(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <Input className="h-9" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Supplier (optional)</Label>
        <UnifiedSelector
          mode="single"
          type="item"
          items={supplierItems}
          selectedId={supplierId}
          onSelect={(item) => {
            const sid = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
            setSupplierId(Number.isNaN(sid) ? undefined : sid);
            setSupplierOrderId(undefined);
          }}
          placeholder="Select supplier…"
          searchPlaceholder="Search suppliers…"
        />
      </div>
      {supplierId != null ? (
        <div className="space-y-1">
          <Label className="text-xs">Supplier order (optional)</Label>
          <UnifiedSelector
            mode="single"
            type="item"
            items={orderItems}
            selectedId={supplierOrderId}
            onSelect={(item) => {
              const oid = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
              setSupplierOrderId(Number.isNaN(oid) ? undefined : oid);
            }}
            placeholder="Link existing order or leave empty for new draft"
            searchPlaceholder="Search orders…"
          />
        </div>
      ) : null}
      <Button
        size="sm"
        onClick={submit}
        disabled={createMutation.isPending || !name.trim()}
      >
        {createMutation.isPending ? "Saving…" : "Create expense & reconcile"}
      </Button>
    </div>
  );
}

type SaleLineDraft = { localId: number; itemId?: number; quantity: string; unitPrice: string };

function CreateSaleFromTransactionForm({
  tx,
  transactionId,
}: {
  tx: NonNullable<ReturnType<typeof useBankTransaction>["data"]>;
  transactionId: string;
}) {
  const bankCredit = Number(tx.amount);
  const defaultDesc = [tx.label, tx.counterparty_name].filter(Boolean).join(" · ").slice(0, 500);
  const lineIdRef = useRef(0);

  const [saleDate, setSaleDate] = useState((tx.execution_date || "").slice(0, 10));
  const [saleType, setSaleType] = useState<(typeof SALES_TYPE_NAMES)[number]>("other");
  const [description, setDescription] = useState(defaultDesc);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);

  useEffect(() => {
    setSaleDate((tx.execution_date || "").slice(0, 10));
    setDescription([tx.label, tx.counterparty_name].filter(Boolean).join(" · ").slice(0, 500));
    lineIdRef.current += 1;
    const firstId = lineIdRef.current;
    setLines([
      {
        localId: firstId,
        itemId: undefined,
        quantity: "1",
        unitPrice: Number(tx.amount) > 0 ? String(Number(tx.amount).toFixed(2)) : "0",
      },
    ]);
  }, [tx.id, tx.execution_date, tx.amount, tx.label, tx.counterparty_name]);

  const { data: itemsRes } = useItems({ limit: 400, excludeCatalogParents: true });
  const items = itemsRes?.data ?? [];
  const itemSelectorItems = useMemo(
    () => items.map((it) => ({ id: it.id, name: it.name ?? `Item #${it.id}` })),
    [items]
  );

  const preTaxNetHint = useMemo(() => {
    let s = 0;
    for (const row of lines) {
      const q = parseFloat(row.quantity);
      const p = parseFloat(row.unitPrice);
      if (!Number.isNaN(q) && !Number.isNaN(p)) s += q * p;
    }
    return Math.round(s * 100) / 100;
  }, [lines]);

  const createMutation = useCreateSaleFromBankTransaction();
  const blockedByAlloc = (tx.allocated_payments_total ?? 0) > 0.02;

  const updateLine = (localId: number, patch: Partial<Omit<SaleLineDraft, "localId">>) => {
    setLines((prev) => prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  };

  const addLine = () => {
    lineIdRef.current += 1;
    const id = lineIdRef.current;
    setLines((prev) => [...prev, { localId: id, itemId: undefined, quantity: "1", unitPrice: "0" }]);
  };

  const removeLine = (localId: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.localId !== localId)));
  };

  const submit = () => {
    if (blockedByAlloc) {
      toast.error("Clear linked receipts first, or finish in Link to sale(s)");
      return;
    }
    const lineItems: BankTransactionCreateSalePayload["lineItems"] = [];
    for (const row of lines) {
      if (row.itemId == null) {
        toast.error("Select an item on every line");
        return;
      }
      const qty = parseFloat(row.quantity);
      const price = parseFloat(row.unitPrice);
      if (Number.isNaN(qty) || qty <= 0) {
        toast.error("Invalid quantity");
        return;
      }
      if (Number.isNaN(price)) {
        toast.error("Invalid unit price");
        return;
      }
      lineItems.push({ itemId: row.itemId, quantity: qty, unitPrice: price });
    }
    const body: BankTransactionCreateSalePayload = {
      date: saleDate.length >= 10 ? saleDate.slice(0, 10) : saleDate,
      type: saleType,
      description: description.trim() || undefined,
      lineItems,
    };
    createMutation.mutate(
      { id: transactionId, body },
      {
        onSuccess: () => toast.success("Sale created and transaction reconciled"),
        onError: (err: Error & { message?: string }) =>
          toast.error(err?.message ?? "Failed to create sale"),
      }
    );
  };

  const linesReady = lines.length > 0 && lines.every((r) => r.itemId != null);

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">New sale (lines)</p>
      <p className="text-xs text-muted-foreground">
        Add one or more sale lines. The computed sale total (after tax/discount) must match the bank amount{" "}
        <span className="font-medium tabular-nums">
          {bankCredit.toFixed(2)} {tx.currency}
        </span>
        . Pre-tax Σ(qty×unit) hint:{" "}
        <span className="font-medium tabular-nums">{preTaxNetHint.toFixed(2)}</span> (tax rules still apply per line).
      </p>
      {blockedByAlloc ? (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          This bank line already has receipt allocations—create sale is disabled until those are removed.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Sale date</Label>
          <Input
            className="h-9"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sale type</Label>
          <Select value={saleType} onValueChange={(v) => setSaleType(v as (typeof SALES_TYPE_NAMES)[number])}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SALES_TYPE_NAMES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <Input className="h-9" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-3">
        {lines.map((row, idx) => (
          <div key={row.localId} className="rounded-md border border-border/80 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
              {lines.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => removeLine(row.localId)}>
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Item</Label>
              <UnifiedSelector
                mode="single"
                type="item"
                items={itemSelectorItems}
                selectedId={row.itemId}
                onSelect={(item) => {
                  const id = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
                  updateLine(row.localId, { itemId: Number.isNaN(id) ? undefined : id });
                }}
                placeholder="Select item…"
                searchPlaceholder="Search items…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input
                  className="h-9"
                  type="number"
                  step="any"
                  min={0.000001}
                  value={row.quantity}
                  onChange={(e) => updateLine(row.localId, { quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit price (excl. line tax rules)</Label>
                <Input
                  className="h-9"
                  type="number"
                  step="0.01"
                  value={row.unitPrice}
                  onChange={(e) => updateLine(row.localId, { unitPrice: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addLine}>
          Add line
        </Button>
      </div>
      <Button
        size="sm"
        onClick={submit}
        disabled={createMutation.isPending || !linesReady || blockedByAlloc}
      >
        {createMutation.isPending ? "Saving…" : "Create sale & reconcile"}
      </Button>
    </div>
  );
}
