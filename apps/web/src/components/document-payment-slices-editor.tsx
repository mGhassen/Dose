"use client";

import { useEffect } from "react";
import { Button } from "@kit/ui/button";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { dateToYYYYMMDD } from "@kit/lib";
import type { Payment } from "@kit/lib";
import type { PaymentSliceInput } from "@/shared/zod-schemas";
import { paymentSlicesSumMatchesTotal } from "@/lib/ledger/replace-entry-payments";

export type DocumentPaymentSliceRow = {
  _key: string;
  id?: number;
  amount: string;
  paymentDate: string;
  notes: string;
  bankTransactionId?: number;
  paymentGroupId?: string;
};

function rowKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function paymentRowFromApi(p: Payment): DocumentPaymentSliceRow {
  return {
    _key: String(p.id),
    id: p.id,
    amount: Number(p.amount).toFixed(2),
    paymentDate: (p.paymentDate || "").split("T")[0] || "",
    notes: p.notes ?? "",
    bankTransactionId: p.bankTransactionId,
    paymentGroupId: p.paymentGroupId,
  };
}

export function defaultPaymentSliceRows(total: number, dateStr: string): DocumentPaymentSliceRow[] {
  const d = (dateStr || "").split("T")[0] || dateStr;
  return [{ _key: rowKey(), amount: total.toFixed(2), paymentDate: d, notes: "" }];
}

export function rowsToPaymentSlices(rows: DocumentPaymentSliceRow[]): PaymentSliceInput[] | null {
  const out: PaymentSliceInput[] = [];
  for (const r of rows) {
    const amt = parseFloat(r.amount);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    if (!r.paymentDate?.trim()) return null;
    const slice: PaymentSliceInput = {
      amount: amt,
      paymentDate: r.paymentDate,
      notes: r.notes.trim() || undefined,
    };
    if (r.id != null) slice.id = r.id;
    if (r.bankTransactionId != null) slice.bankTransactionId = r.bankTransactionId;
    if (r.paymentGroupId) slice.paymentGroupId = r.paymentGroupId;
    out.push(slice);
  }
  return out;
}

type Props = {
  total: number;
  defaultDate: string;
  rows: DocumentPaymentSliceRow[];
  onRowsChange: (next: DocumentPaymentSliceRow[]) => void;
};

export function DocumentPaymentSlicesEditor({ total, defaultDate, rows, onRowsChange }: Props) {
  useEffect(() => {
    if (rows.length !== 1) return;
    const nextAmt = total.toFixed(2);
    if (rows[0].amount === nextAmt) return;
    onRowsChange([{ ...rows[0], amount: nextAmt }]);
  }, [total, rows, onRowsChange]);

  const sum = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const sliceAmounts = rows.map((r) => ({ amount: parseFloat(r.amount) || 0 }));
  const rowsFilled =
    rows.length > 0 &&
    rows.every((r) => {
      const a = parseFloat(r.amount);
      return Number.isFinite(a) && a > 0 && String(r.paymentDate || "").trim().length > 0;
    });
  const sumOk = rowsFilled && paymentSlicesSumMatchesTotal(sliceAmounts, total);

  const addSlice = () => {
    const d = (defaultDate || "").split("T")[0] || defaultDate;
    const rest = total - sum;
    const nextAmt = rows.length === 0 ? total : Math.max(0.01, Math.round(rest * 100) / 100);
    onRowsChange([...rows, { _key: rowKey(), amount: nextAmt.toFixed(2), paymentDate: d, notes: "" }]);
  };

  const removeSlice = (key: string) => {
    if (rows.length <= 1) return;
    onRowsChange(rows.filter((r) => r._key !== key));
  };

  const patchRow = (key: string, patch: Partial<DocumentPaymentSliceRow>) => {
    onRowsChange(rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-3 border rounded-md p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-base">Payments</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSlice}>
          <Plus className="h-4 w-4 mr-1" /> Add slice
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Slices must sum to document total ({total.toFixed(2)}). Current sum: {sum.toFixed(2)}
        {!sumOk && rows.length > 0 ? <span className="text-destructive ml-1">— mismatch</span> : null}
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row._key} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="tabular-nums"
                value={row.amount}
                onChange={(e) => patchRow(row._key, { amount: e.target.value })}
                disabled={rows.length === 1}
                title={rows.length === 1 ? "Amount follows document total (add a slice to split)" : undefined}
              />
            </div>
            <div className="col-span-4 space-y-1">
              <Label className="text-xs">Date</Label>
              <DatePicker
                value={row.paymentDate ? new Date(row.paymentDate) : undefined}
                onChange={(d) => patchRow(row._key, { paymentDate: d ? dateToYYYYMMDD(d) : "" })}
                placeholder="Date"
              />
            </div>
            <div className="col-span-4 space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={row.notes} onChange={(e) => patchRow(row._key, { notes: e.target.value })} placeholder="Optional" />
            </div>
            <div className="col-span-1 flex justify-end pb-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={rows.length <= 1}
                onClick={() => removeSlice(row._key)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
