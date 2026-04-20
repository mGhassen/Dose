"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { DatePicker } from "@kit/ui/date-picker";
import { Badge } from "@kit/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { Clock, MoreVertical, Plus, Edit2, Trash2, Check, ExternalLink, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  usePersonnelHourEntries,
  useCreatePersonnelHourEntry,
  useUpdatePersonnelHourEntry,
  useDeletePersonnelHourEntry,
  useMarkPersonnelHourEntryPaid,
  useVariables,
} from "@kit/hooks";
import { formatCurrency } from "@kit/lib/config";
import { dateToYYYYMMDD } from "@kit/lib";
import { formatDate } from "@kit/lib/date-format";
import type { Personnel, PersonnelHourEntry, PersonnelHourEntryPeriodType } from "@kit/types";
import Link from "next/link";
import { entriesApi, paymentsApi, personnelApi, type Entry } from "@kit/lib";

type PeriodType = PersonnelHourEntryPeriodType;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function inferEndDate(start: string, period: PeriodType): string {
  if (!start) return "";
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return start;
  if (period === "day") return dateToYYYYMMDD(d);
  if (period === "week") return dateToYYYYMMDD(addDays(d, 6));
  return dateToYYYYMMDD(endOfMonth(d));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

interface Props {
  personnel: Personnel;
}

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; entry: PersonnelHourEntry };

export function ContractorHoursPanel({ personnel }: Props) {
  const personnelId = String(personnel.id);
  const queryClient = useQueryClient();
  const { data: entries = [] } = usePersonnelHourEntries(personnelId);
  const { data: variables = [] } = useVariables();
  const createEntry = useCreatePersonnelHourEntry();
  const updateEntry = useUpdatePersonnelHourEntry();
  const deleteEntry = useDeletePersonnelHourEntry();
  const markPaid = useMarkPersonnelHourEntryPaid();

  const taxVariables = useMemo(
    () => (Array.isArray(variables) ? variables : []).filter((v: any) => v.type === "transaction_tax"),
    [variables]
  );

  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [paymentEntry, setPaymentEntry] = useState<PersonnelHourEntry | null>(null);
  const [ledgerEntry, setLedgerEntry] = useState<Entry | null>(null);
  const [paymentLoadError, setPaymentLoadError] = useState<string | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [newPayDate, setNewPayDate] = useState(() => dateToYYYYMMDD(new Date()));
  const [newPayAmount, setNewPayAmount] = useState("");
  const [clearAllPaymentsConfirmOpen, setClearAllPaymentsConfirmOpen] = useState(false);
  const [clearAllPaymentsPending, setClearAllPaymentsPending] = useState(false);
  const [clearPaymentsFeedback, setClearPaymentsFeedback] = useState<
    { variant: "success" | "destructive"; message: string } | null
  >(null);

  const [form, setForm] = useState({
    periodType: "week" as PeriodType,
    startDate: dateToYYYYMMDD(new Date()),
    endDate: inferEndDate(dateToYYYYMMDD(new Date()), "week"),
    hoursWorked: "",
    hourlyRate: personnel.baseSalary.toString(),
    taxVariableId: "" as string,
    taxRatePercent: "0",
    notes: "",
  });

  const openCreate = () => {
    const today = dateToYYYYMMDD(new Date());
    setForm({
      periodType: "week",
      startDate: today,
      endDate: inferEndDate(today, "week"),
      hoursWorked: "",
      hourlyRate: personnel.baseSalary.toString(),
      taxVariableId: "",
      taxRatePercent: "0",
      notes: "",
    });
    setDialog({ mode: "create" });
  };

  const openEdit = (entry: PersonnelHourEntry) => {
    setForm({
      periodType: entry.periodType,
      startDate: entry.startDate,
      endDate: entry.endDate,
      hoursWorked: entry.hoursWorked.toString(),
      hourlyRate: entry.hourlyRate.toString(),
      taxVariableId: entry.taxVariableId ? String(entry.taxVariableId) : "",
      taxRatePercent: entry.taxRatePercent.toString(),
      notes: entry.notes || "",
    });
    setDialog({ mode: "edit", entry });
  };

  const onPeriodChange = (value: PeriodType) => {
    setForm((prev) => ({
      ...prev,
      periodType: value,
      endDate: inferEndDate(prev.startDate, value),
    }));
  };

  const onStartDateChange = (d: Date | undefined) => {
    const s = d ? dateToYYYYMMDD(d) : "";
    setForm((prev) => ({
      ...prev,
      startDate: s,
      endDate: s ? inferEndDate(s, prev.periodType) : prev.endDate,
    }));
  };

  const onTaxVariableChange = (value: string) => {
    if (value === "__none__") {
      setForm((prev) => ({ ...prev, taxVariableId: "", taxRatePercent: "0" }));
      return;
    }
    const found = taxVariables.find((v: any) => String(v.id) === value);
    setForm((prev) => ({
      ...prev,
      taxVariableId: value,
      taxRatePercent: found ? String(found.value) : prev.taxRatePercent,
    }));
  };

  const hours = parseFloat(form.hoursWorked) || 0;
  const rate = parseFloat(form.hourlyRate) || 0;
  const taxPct = parseFloat(form.taxRatePercent) || 0;
  const gross = round2(hours * rate);
  const tax = round2(gross * (taxPct / 100));
  const net = round2(gross - tax);

  const handleSave = async () => {
    if (!form.startDate || !form.endDate || hours <= 0 || rate < 0) {
      toast.error("Fill in dates, hours and rate");
      return;
    }
    try {
      const payload = {
        periodType: form.periodType,
        startDate: form.startDate,
        endDate: form.endDate,
        hoursWorked: hours,
        hourlyRate: rate,
        taxVariableId: form.taxVariableId ? Number(form.taxVariableId) : undefined,
        taxRatePercent: taxPct,
        notes: form.notes || undefined,
      };
      if (dialog.mode === "create") {
        await createEntry.mutateAsync({
          personnelId,
          data: { personnelId: personnel.id, ...payload },
        });
        toast.success("Hours logged");
      } else if (dialog.mode === "edit") {
        await updateEntry.mutateAsync({
          personnelId,
          entryId: String(dialog.entry.id),
          data: payload,
        });
        toast.success("Entry updated");
      }
      setDialog({ mode: "closed" });
    } catch (error: any) {
      toast.error(error?.message || "Failed to save entry");
    }
  };

  const handleDelete = async (entry: PersonnelHourEntry) => {
    if (!confirm("Delete this entry? If paid, the linked expense will also be removed.")) return;
    try {
      await deleteEntry.mutateAsync({ personnelId, entryId: String(entry.id) });
      toast.success("Entry deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete entry");
    }
  };

  const refreshHourEntries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["personnel", personnelId, "hour-entries"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["entries"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  }, [personnelId, queryClient]);

  const loadLedgerForExpense = useCallback(async (expenseId: number): Promise<Entry | null> => {
    setPaymentLoadError(null);
    const res = await entriesApi.getAll({
      page: 1,
      limit: 10,
      direction: "output",
      entryType: "expense",
      referenceId: expenseId,
      includePayments: true,
    });
    const row = res.data?.[0] ?? null;
    setLedgerEntry(row);
    if (!row) setPaymentLoadError("No ledger entry found for this expense.");
    return row;
  }, []);

  useEffect(() => {
    if (!paymentEntry?.expenseId) {
      setLedgerEntry(null);
      return;
    }
    void loadLedgerForExpense(paymentEntry.expenseId);
  }, [paymentEntry?.expenseId, paymentEntry?.id, loadLedgerForExpense]);

  const openPaymentDialog = (entry: PersonnelHourEntry) => {
    if (!entry.expenseId) {
      toast.error("This entry has no expense yet. Re-log hours or contact support.");
      return;
    }
    const paid = entry.paidAmountGross ?? 0;
    const remaining = round2(entry.amountGross - paid);
    setNewPayDate(dateToYYYYMMDD(new Date()));
    setNewPayAmount(remaining > 0 ? String(remaining) : "");
    setClearPaymentsFeedback(null);
    setPaymentEntry(entry);
  };

  const closePaymentDialog = () => {
    setPaymentEntry(null);
    setLedgerEntry(null);
    setPaymentLoadError(null);
    setClearPaymentsFeedback(null);
    setClearAllPaymentsConfirmOpen(false);
    refreshHourEntries();
  };

  const handleAddPayment = async () => {
    if (!paymentEntry?.expenseId) return;
    const amt = parseFloat(newPayAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      setPaymentBusy(true);
      await markPaid.mutateAsync({
        personnelId,
        entryId: String(paymentEntry.id),
        data: {
          isPaid: true,
          paidDate: newPayDate,
          category: "personnel",
          amount: amt,
        },
      });
      toast.success("Payment added");
      const row = await loadLedgerForExpense(paymentEntry.expenseId);
      const paidPosted = (row?.payments ?? []).reduce((s, p) => s + p.amount, 0);
      const nextRemaining = round2(paymentEntry.amountGross - paidPosted);
      setNewPayAmount(nextRemaining > 0 ? String(nextRemaining) : "");
      refreshHourEntries();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add payment");
    } finally {
      setPaymentBusy(false);
    }
  };

  const executeClearAllPayments = async () => {
    if (!paymentEntry) return;
    setClearPaymentsFeedback(null);
    try {
      setClearAllPaymentsPending(true);
      setPaymentBusy(true);
      await markPaid.mutateAsync({
        personnelId,
        entryId: String(paymentEntry.id),
        data: { isPaid: false, category: "personnel" },
      });
      setClearAllPaymentsConfirmOpen(false);
      setClearPaymentsFeedback({ variant: "success", message: "Payments cleared" });
      const row = paymentEntry.expenseId
        ? await loadLedgerForExpense(paymentEntry.expenseId)
        : null;
      const paidPosted = (row?.payments ?? []).reduce((s, p) => s + p.amount, 0);
      const rem = round2(paymentEntry.amountGross - paidPosted);
      setNewPayAmount(rem > 0 ? String(rem) : "");
      refreshHourEntries();
    } catch (error: any) {
      setClearAllPaymentsConfirmOpen(false);
      setClearPaymentsFeedback({
        variant: "destructive",
        message: error?.message || "Failed to clear payments",
      });
    } finally {
      setClearAllPaymentsPending(false);
      setPaymentBusy(false);
    }
  };

  const handleDeleteOnePayment = async (paymentId: number) => {
    if (!paymentEntry?.expenseId) return;
    if (!confirm("Delete this payment?")) return;
    try {
      setPaymentBusy(true);
      await paymentsApi.delete(String(paymentId));
      await personnelApi.reconcileHourEntryPayments(personnelId, String(paymentEntry.id));
      const row = await loadLedgerForExpense(paymentEntry.expenseId);
      const paidPosted = (row?.payments ?? []).reduce((s, p) => s + p.amount, 0);
      const rem = round2(paymentEntry.amountGross - paidPosted);
      setNewPayAmount(rem > 0 ? String(rem) : "");
      refreshHourEntries();
      toast.success("Payment removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payment");
    } finally {
      setPaymentBusy(false);
    }
  };

  const totals = useMemo(() => {
    const totalHours = entries.reduce((s, e) => s + e.hoursWorked, 0);
    const totalGross = entries.reduce((s, e) => s + e.amountGross, 0);
    const totalPaid = entries.reduce((s, e) => s + (e.paidAmountGross ?? 0), 0);
    const totalUnpaid = round2(totalGross - totalPaid);
    return { totalHours, totalGross, totalPaid, totalUnpaid };
  }, [entries]);

  const periodLabel: Record<PeriodType, string> = {
    day: "Day",
    week: "Week",
    month: "Month",
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 shrink-0 mb-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total hours</p>
          <p className="text-2xl font-bold mt-1">{totals.totalHours.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total gross</p>
          <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totals.totalGross)}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paid</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totals.totalPaid)}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unpaid</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totals.totalUnpaid)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between shrink-0 mb-2">
        <p className="text-sm text-muted-foreground">
          Hourly rate: <span className="font-medium text-foreground">{formatCurrency(personnel.baseSalary)}</span> / hour
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Log hours
        </Button>
      </div>

      <div className="flex-1 min-h-0 rounded-md border overflow-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No hours logged yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Log hours" to add the first entry</p>
          </div>
        ) : (
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 bg-background [&_tr]:border-b shadow-sm">
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Range</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant="outline">{periodLabel[entry.periodType]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(entry.startDate)}
                    {entry.startDate !== entry.endDate && (
                      <>
                        <span className="mx-1">→</span>
                        {formatDate(entry.endDate)}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{entry.hoursWorked.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(entry.hourlyRate)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(entry.amountGross)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(entry.amountTax)}
                    {entry.taxRatePercent > 0 && (
                      <span className="ml-1 text-[10px]">({entry.taxRatePercent}%)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(entry.amountNet)}</TableCell>
                  <TableCell>
                    {(() => {
                      const posted = entry.paidAmountGross ?? 0;
                      const fullyPaid =
                        entry.isPaid ||
                        posted >= round2(entry.amountGross) - 0.01;
                      const partial = posted > 0 && !fullyPaid;
                      return fullyPaid ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="bg-green-500/15 text-green-700">
                            <Check className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                          {entry.expenseId && (
                            <Link href={`/expenses/${entry.expenseId}`} className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      ) : partial ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-800 w-fit">
                            Partial · {formatCurrency(posted)}
                          </Badge>
                          {entry.expenseId && (
                            <Link href={`/expenses/${entry.expenseId}`} className="text-muted-foreground hover:text-foreground w-fit">
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">Unpaid</Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openPaymentDialog(entry)}
                          disabled={markPaid.isPending || paymentBusy || !entry.expenseId}
                        >
                          <Wallet className="mr-2 h-4 w-4" />
                          Payments…
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(entry)} disabled={entry.isPaid}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(entry)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        )}
      </div>

      <Dialog open={dialog.mode !== "closed"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "edit" ? "Edit hours" : "Log hours"}</DialogTitle>
            <DialogDescription>
              Track contractor hours worked over a day, week or month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Period type</Label>
                <Select value={form.periodType} onValueChange={(v) => onPeriodChange(v as PeriodType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hours worked</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={form.hoursWorked}
                  onChange={(e) => setForm((p) => ({ ...p, hoursWorked: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>
                  {form.periodType === "day" ? "Date" : "Start date"}
                </Label>
                <DatePicker
                  value={form.startDate ? new Date(form.startDate) : undefined}
                  onChange={onStartDateChange}
                  placeholder="Pick date"
                />
              </div>
              {form.periodType !== "day" && (
                <div className="space-y-2">
                  <Label>End date</Label>
                  <DatePicker
                    value={form.endDate ? new Date(form.endDate) : undefined}
                    onChange={(d) => setForm((p) => ({ ...p, endDate: d ? dateToYYYYMMDD(d) : "" }))}
                    placeholder="Pick date"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hourly rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={(e) => setForm((p) => ({ ...p, hourlyRate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax</Label>
                <Select value={form.taxVariableId || "__none__"} onValueChange={onTaxVariableChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="No tax" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No tax</SelectItem>
                    {taxVariables.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} ({v.value}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross</span>
                <span className="font-medium tabular-nums">{formatCurrency(gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax {taxPct > 0 ? `(${taxPct}%)` : ""}
                </span>
                <span className="tabular-nums">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-medium">Net</span>
                <span className="font-semibold tabular-nums">{formatCurrency(net)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ mode: "closed" })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createEntry.isPending || updateEntry.isPending}>
              {dialog.mode === "edit" ? "Save changes" : "Log hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!paymentEntry}
        onOpenChange={(open) => {
          if (!open) closePaymentDialog();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {paymentEntry && (
            <>
              <DialogHeader>
                <DialogTitle>Contractor payments</DialogTitle>
                <DialogDescription>
                  {formatDate(paymentEntry.startDate)}
                  {paymentEntry.startDate !== paymentEntry.endDate && (
                    <>
                      {" "}
                      → {formatDate(paymentEntry.endDate)}
                    </>
                  )}
                  {" · "}
                  Gross {formatCurrency(paymentEntry.amountGross)}
                </DialogDescription>
              </DialogHeader>

              {paymentLoadError && (
                <p className="text-sm text-destructive">{paymentLoadError}</p>
              )}

              {clearPaymentsFeedback && (
                <Alert variant={clearPaymentsFeedback.variant}>
                  {clearPaymentsFeedback.variant === "success" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{clearPaymentsFeedback.message}</AlertDescription>
                </Alert>
              )}

              {(() => {
                const gross = paymentEntry.amountGross;
                const posted = (ledgerEntry?.payments ?? []).reduce((s, p) => s + p.amount, 0);
                const remaining = round2(gross - posted);
                const sorted = [...(ledgerEntry?.payments ?? [])].sort(
                  (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
                );
                return (
                  <div className="space-y-4 py-2">
                    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Posted</span>
                        <span className="font-medium tabular-nums">{formatCurrency(posted)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(remaining)}</span>
                      </div>
                    </div>

                    {paymentEntry.expenseId && (
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <Link href={`/expenses/${paymentEntry.expenseId}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open expense
                        </Link>
                      </Button>
                    )}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Payments
                      </p>
                      {sorted.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No payments yet.</p>
                      ) : (
                        <div className="rounded-md border divide-y">
                          {sorted.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                              <div>
                                <span className="tabular-nums font-medium">{formatCurrency(p.amount)}</span>
                                <span className="text-muted-foreground ml-2">{formatDate(p.paymentDate)}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                disabled={paymentBusy}
                                onClick={() => handleDeleteOnePayment(p.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={paymentBusy || sorted.length === 0}
                        onClick={() => setClearAllPaymentsConfirmOpen(true)}
                      >
                        Clear all
                      </Button>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium">Add payment</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <DatePicker
                            value={newPayDate ? new Date(newPayDate) : undefined}
                            onChange={(d) => setNewPayDate(d ? dateToYYYYMMDD(d) : "")}
                            placeholder="Payment date"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newPayAmount}
                            onChange={(e) => setNewPayAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        disabled={
                          paymentBusy ||
                          remaining <= 0 ||
                          !newPayDate ||
                          !Number.isFinite(parseFloat(newPayAmount)) ||
                          parseFloat(newPayAmount) <= 0
                        }
                        onClick={() => void handleAddPayment()}
                      >
                        Add payment
                      </Button>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => closePaymentDialog()}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={clearAllPaymentsConfirmOpen}
        onOpenChange={setClearAllPaymentsConfirmOpen}
        onConfirm={() => void executeClearAllPayments()}
        title="Clear all payments?"
        description="Remove every posted payment for this period. You can add payments again afterward."
        confirmText="Clear all"
        cancelText="Cancel"
        isPending={clearAllPaymentsPending}
        variant="destructive"
      />
    </div>
  );
}
