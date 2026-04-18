"use client";

import { useMemo } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { UnifiedSelector } from "@/components/unified-selector";
import { X } from "lucide-react";
import {
  useBalanceAccounts,
  useEntries,
  useExpenses,
  useInventorySuppliers,
  useItems,
  useSales,
} from "@kit/hooks";
import { EXPENSE_CATEGORY_NAMES, SALES_TYPE_NAMES } from "@/shared/zod-schemas";
import type { DraftLine } from "./allocation-types";

type Props = {
  draft: DraftLine;
  txExecutionDate: string;
  update: (patch: Partial<DraftLine>) => void;
  remove: () => void;
  usedExpenseIds: Set<number>;
  usedSaleIds: Set<number>;
  usedEntryIds: Set<number>;
};

function useDateWindow(executionDate: string, daysBefore = 120, daysAfter = 60) {
  return useMemo(() => {
    const d = new Date((executionDate || "").slice(0, 10) + "T12:00:00");
    const start = new Date(d);
    start.setDate(start.getDate() - daysBefore);
    const end = new Date(d);
    end.setDate(end.getDate() + daysAfter);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [executionDate, daysBefore, daysAfter]);
}

export function DraftRow(props: Props) {
  const { draft, update, remove } = props;

  const kindLabel: Record<DraftLine["kind"], string> = {
    balance_movement: "Balance movement",
    payment: "Ledger payment",
    link_expense: "Link existing expense",
    link_sale: "Link existing sale",
    new_expense: "New expense",
    new_sale: "New sale",
  };

  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Draft · {kindLabel[draft.kind]}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Label className="text-xs">Amount</Label>
            <Input
              className="h-8 w-28 text-sm tabular-nums"
              type="number"
              step="0.01"
              value={draft.amount}
              onChange={(e) => update({ amount: e.target.value } as Partial<DraftLine>)}
            />
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={remove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <DraftBody {...props} />
    </div>
  );
}

function DraftBody(props: Props) {
  const { draft } = props;
  switch (draft.kind) {
    case "balance_movement":
      return <BalanceMovementBody {...props} draft={draft} />;
    case "payment":
      return <PaymentBody {...props} draft={draft} />;
    case "link_expense":
      return <LinkExpenseBody {...props} draft={draft} />;
    case "link_sale":
      return <LinkSaleBody {...props} draft={draft} />;
    case "new_expense":
      return <NewExpenseBody {...props} draft={draft} />;
    case "new_sale":
      return <NewSaleBody {...props} draft={draft} />;
  }
}

function BalanceMovementBody({
  draft,
  update,
}: Props & { draft: Extract<DraftLine, { kind: "balance_movement" }> }) {
  const { data: accounts, isLoading } = useBalanceAccounts();
  const list = (accounts ?? []).filter((a) => !a.archived_at);
  const items = list.map((a) => ({ id: a.id, name: `${a.name} · ${a.kind.replace("_", " ")}` }));
  return (
    <div className="space-y-2">
      <UnifiedSelector
        mode="single"
        type="item"
        items={items}
        isLoading={isLoading}
        selectedId={draft.balanceAccountId}
        onSelect={(it) => {
          const id = typeof it.id === "string" ? parseInt(it.id, 10) : it.id;
          update({ balanceAccountId: Number.isNaN(id) ? undefined : id } as Partial<DraftLine>);
        }}
        placeholder="Select balance account…"
        searchPlaceholder="Search accounts…"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          className="h-8 text-sm"
          placeholder="Label (optional)"
          value={draft.label}
          onChange={(e) => update({ label: e.target.value } as Partial<DraftLine>)}
        />
        <Input
          className="h-8 text-sm"
          placeholder="Notes (optional)"
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value } as Partial<DraftLine>)}
        />
      </div>
    </div>
  );
}

function PaymentBody({
  draft,
  update,
  txExecutionDate,
  usedEntryIds,
}: Props & { draft: Extract<DraftLine, { kind: "payment" }> }) {
  const amt = parseFloat(draft.amount);
  const isDebit = !Number.isNaN(amt) && amt < 0;
  const { startDate, endDate } = useDateWindow(txExecutionDate);

  const { data: entriesRes, isLoading } = useEntries({
    direction: isDebit ? "output" : "input",
    entryType: isDebit ? undefined : "sale",
    fromDate: startDate,
    toDate: endDate,
    includePayments: true,
    limit: 200,
  });
  const entries = (entriesRes?.data ?? []).filter((e) => {
    const paid = (e.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    return e.amount - paid > 0.02;
  });
  const items = entries
    .filter((e) => e.id === draft.entryId || !usedEntryIds.has(e.id))
    .map((e) => {
      const paid = (e.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const rem = (e.amount - paid).toFixed(2);
      return {
        id: e.id,
        name: `#${e.id} ${e.entryType} · ${e.name.slice(0, 30)} · ${e.entryDate} · left ${rem}`,
      };
    });

  return (
    <div className="space-y-2">
      <UnifiedSelector
        mode="single"
        type="item"
        items={items}
        isLoading={isLoading}
        selectedId={draft.entryId}
        onSelect={(it) => {
          const id = typeof it.id === "string" ? parseInt(it.id, 10) : it.id;
          update({ entryId: Number.isNaN(id) ? undefined : id } as Partial<DraftLine>);
        }}
        placeholder={isLoading ? "Loading…" : "Select ledger line…"}
        searchPlaceholder="Search entries…"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          className="h-8 text-sm"
          type="date"
          value={draft.paymentDate}
          onChange={(e) => update({ paymentDate: e.target.value } as Partial<DraftLine>)}
        />
        <Input
          className="h-8 text-sm"
          placeholder="Notes (optional)"
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value } as Partial<DraftLine>)}
        />
      </div>
    </div>
  );
}

function LinkExpenseBody({
  draft,
  update,
  txExecutionDate,
  usedExpenseIds,
}: Props & { draft: Extract<DraftLine, { kind: "link_expense" }> }) {
  const { startDate, endDate } = useDateWindow(txExecutionDate, 60, 60);
  const { data: expensesRes, isLoading } = useExpenses({ startDate, endDate, limit: 200 });
  const { data: fallbackRes } = useExpenses({ limit: 200 });
  const rows = expensesRes?.data?.length ? expensesRes.data : fallbackRes?.data ?? [];
  const items = rows
    .filter((e) => e.id === draft.expenseId || !usedExpenseIds.has(e.id))
    .map((e) => ({
      id: e.id,
      name: `Expense #${e.id} · ${(e.name ?? "").slice(0, 30)} · ${e.expenseDate} · ${Number(e.amount).toFixed(2)}`,
    }));
  return (
    <div className="space-y-2">
      <UnifiedSelector
        mode="single"
        type="item"
        items={items}
        isLoading={isLoading}
        selectedId={draft.expenseId}
        onSelect={(it) => {
          const id = typeof it.id === "string" ? parseInt(it.id, 10) : it.id;
          update({ expenseId: Number.isNaN(id) ? undefined : id } as Partial<DraftLine>);
        }}
        placeholder="Select expense to link…"
        searchPlaceholder="Search expenses…"
      />
      <Input
        className="h-8 text-sm"
        placeholder="Notes (optional)"
        value={draft.notes}
        onChange={(e) => update({ notes: e.target.value } as Partial<DraftLine>)}
      />
    </div>
  );
}

function LinkSaleBody({
  draft,
  update,
  txExecutionDate,
  usedSaleIds,
}: Props & { draft: Extract<DraftLine, { kind: "link_sale" }> }) {
  const { startDate, endDate } = useDateWindow(txExecutionDate, 60, 60);
  const { data: salesRes, isLoading } = useSales({ startDate, endDate, limit: 200 });
  const { data: fallbackRes } = useSales({ limit: 200 });
  const rows = salesRes?.data?.length ? salesRes.data : fallbackRes?.data ?? [];
  const items = rows
    .filter((s) => s.id === draft.saleId || !usedSaleIds.has(s.id))
    .map((s) => ({
      id: s.id,
      name: `Sale #${s.id} · ${(s.description ?? "—").slice(0, 30)} · ${s.date} · ${Number(s.amount).toFixed(2)}`,
    }));
  return (
    <div className="space-y-2">
      <UnifiedSelector
        mode="single"
        type="item"
        items={items}
        isLoading={isLoading}
        selectedId={draft.saleId}
        onSelect={(it) => {
          const id = typeof it.id === "string" ? parseInt(it.id, 10) : it.id;
          update({ saleId: Number.isNaN(id) ? undefined : id } as Partial<DraftLine>);
        }}
        placeholder="Select sale to link…"
        searchPlaceholder="Search sales…"
      />
      <Input
        className="h-8 text-sm"
        placeholder="Notes (optional)"
        value={draft.notes}
        onChange={(e) => update({ notes: e.target.value } as Partial<DraftLine>)}
      />
    </div>
  );
}

function NewExpenseBody({
  draft,
  update,
}: Props & { draft: Extract<DraftLine, { kind: "new_expense" }> }) {
  const { data: suppliersRes } = useInventorySuppliers({ limit: 300 });
  const suppliers = (suppliersRes?.data ?? []).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-2">
      <Input
        className="h-8 text-sm"
        placeholder="Name"
        value={draft.name}
        onChange={(e) => update({ name: e.target.value } as Partial<DraftLine>)}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={draft.category}
          onValueChange={(v) => update({ category: v } as Partial<DraftLine>)}
        >
          <SelectTrigger className="h-8 text-sm">
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
        <Input
          className="h-8 text-sm"
          type="date"
          value={draft.expenseDate}
          onChange={(e) => update({ expenseDate: e.target.value } as Partial<DraftLine>)}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          className="h-8 text-sm"
          placeholder="Vendor (optional)"
          value={draft.vendor}
          onChange={(e) => update({ vendor: e.target.value } as Partial<DraftLine>)}
        />
        <Input
          className="h-8 text-sm"
          placeholder="Description (optional)"
          value={draft.description}
          onChange={(e) => update({ description: e.target.value } as Partial<DraftLine>)}
        />
      </div>
      <UnifiedSelector
        mode="single"
        type="item"
        items={suppliers}
        selectedId={draft.supplierId}
        onSelect={(it) => {
          const id = typeof it.id === "string" ? parseInt(it.id, 10) : it.id;
          update({
            supplierId: Number.isNaN(id) ? undefined : id,
            supplierOrderId: undefined,
          } as Partial<DraftLine>);
        }}
        placeholder="Supplier (optional)"
        searchPlaceholder="Search suppliers…"
      />
    </div>
  );
}

function NewSaleBody({
  draft,
  update,
}: Props & { draft: Extract<DraftLine, { kind: "new_sale" }> }) {
  const { data: itemsRes } = useItems({ limit: 400, excludeCatalogParents: true });
  const items = (itemsRes?.data ?? []).map((it) => ({ id: it.id, name: it.name ?? `Item #${it.id}` }));

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          className="h-8 text-sm"
          type="date"
          value={draft.saleDate}
          onChange={(e) => update({ saleDate: e.target.value } as Partial<DraftLine>)}
        />
        <Select
          value={draft.saleType}
          onValueChange={(v) =>
            update({ saleType: v as (typeof SALES_TYPE_NAMES)[number] } as Partial<DraftLine>)
          }
        >
          <SelectTrigger className="h-8 text-sm">
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
      <UnifiedSelector
        mode="single"
        type="item"
        items={items}
        selectedId={draft.itemId}
        onSelect={(it) => {
          const id = typeof it.id === "string" ? parseInt(it.id, 10) : it.id;
          update({ itemId: Number.isNaN(id) ? undefined : id } as Partial<DraftLine>);
        }}
        placeholder="Select item…"
        searchPlaceholder="Search items…"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          className="h-8 text-sm"
          type="number"
          step="any"
          min={0.000001}
          placeholder="Quantity"
          value={draft.quantity}
          onChange={(e) => update({ quantity: e.target.value } as Partial<DraftLine>)}
        />
        <Input
          className="h-8 text-sm"
          type="number"
          step="0.01"
          placeholder="Unit price"
          value={draft.unitPrice}
          onChange={(e) => update({ unitPrice: e.target.value } as Partial<DraftLine>)}
        />
      </div>
      <Input
        className="h-8 text-sm"
        placeholder="Description (optional)"
        value={draft.description}
        onChange={(e) => update({ description: e.target.value } as Partial<DraftLine>)}
      />
    </div>
  );
}
