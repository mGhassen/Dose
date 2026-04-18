"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import {
  useAllLoanSchedules,
  useLoans,
  useEntries,
  useCreatePayment,
  useDeletePayment,
  useMetadataEnum,
} from "@kit/hooks";
import type { LoanScheduleEntry, Loan } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { DatePicker } from "@kit/ui/date-picker";
import { UnifiedSelector } from "@/components/unified-selector";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { dateToYYYYMMDD } from "@kit/lib";
import { Calendar, MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ScheduleRow = LoanScheduleEntry & {
  loanName?: string;
  loanNumber?: string;
};

export default function LoansOutputContent() {
  const router = useRouter();
  const [isLoanSelectDialogOpen, setIsLoanSelectDialogOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | number | undefined>(undefined);

  const [managingSchedule, setManagingSchedule] = useState<ScheduleRow | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date>(() => new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.toISOString().split("T")[0];

  const { data: allSchedules = [], isLoading, refetch: refetchSchedules } = useAllLoanSchedules(
    "2000-01",
    currentMonth
  );
  const { data: loans } = useLoans();
  const { data: entriesData, refetch: refetchEntries } = useEntries({
    direction: "output",
    entryType: "loan_payment",
    includePayments: true,
    limit: 5000,
  });
  const { data: paymentMethodValues = [] } = useMetadataEnum("PaymentMethod");
  const paymentMethodItems = paymentMethodValues.map((ev) => ({
    id: ev.name,
    name: ev.label ?? ev.name,
  }));

  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const allEntries = entriesData?.data || [];
  const entryByScheduleId = useMemo(() => {
    const m = new Map<number, typeof allEntries[number]>();
    for (const e of allEntries) {
      if (e.scheduleEntryId != null && !m.has(e.scheduleEntryId)) m.set(e.scheduleEntryId, e);
    }
    return m;
  }, [allEntries]);

  const schedules = useMemo<ScheduleRow[]>(
    () =>
      (allSchedules as ScheduleRow[])
        .filter((s) => s.paymentDate <= today)
        .sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1)),
    [allSchedules, today]
  );

  const managedEntry = managingSchedule ? entryByScheduleId.get(managingSchedule.id) : undefined;
  const managedPayments = managedEntry?.payments || [];
  const managedTotalPaid = managedPayments
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);
  const managedRemaining = managingSchedule
    ? Math.max(0, managingSchedule.totalPayment - managedTotalPaid)
    : 0;

  const refreshAll = () => {
    refetchSchedules();
    refetchEntries();
  };

  const handleAddPayment = async () => {
    if (!managingSchedule) return;
    const amountInput = document.getElementById("mp-amount") as HTMLInputElement | null;
    const notesInput = document.getElementById("mp-notes") as HTMLInputElement | null;
    const amount = parseFloat(amountInput?.value || "0");
    if (!(amount > 0)) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    try {
      let entryId = managedEntry?.id;
      if (!entryId) {
        const checkRes = await fetch(
          `/api/entries?direction=output&entryType=loan_payment&referenceId=${managingSchedule.loanId}&scheduleEntryId=${managingSchedule.id}&limit=1`
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.data?.length) entryId = checkData.data[0].id;
        }
      }

      if (!entryId) {
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            direction: "output",
            entryType: "loan_payment",
            name: `Loan Payment - Month ${managingSchedule.month}`,
            amount: managingSchedule.totalPayment,
            description: `Principal: ${managingSchedule.principalPayment}, Interest: ${managingSchedule.interestPayment}`,
            entryDate: managingSchedule.paymentDate,
            dueDate: managingSchedule.paymentDate,
            referenceId: managingSchedule.loanId,
            scheduleEntryId: managingSchedule.id,
            isActive: true,
          }),
        });
        if (!res.ok) throw new Error("Failed to create entry");
        const data = await res.json();
        entryId = data.id;
      }

      const paidDateStr = dateToYYYYMMDD(paymentDate);
      await createPayment.mutateAsync({
        entryId: entryId!,
        paymentDate: paidDateStr,
        amount,
        isPaid: true,
        paidDate: paidDateStr,
        paymentMethod: paymentMethod || undefined,
        notes: notesInput?.value || undefined,
      });
      if (amountInput) amountInput.value = "";
      if (notesInput) notesInput.value = "";
      refreshAll();
      toast.success("Payment recorded");
    } catch (error: any) {
      if (error instanceof Error && (error.name === "AbortError" || (error as any).isAbortError)) {
        refreshAll();
        toast.success("Payment recorded");
        return;
      }
      toast.error(error?.message || "Failed to record payment");
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      await deletePayment.mutateAsync(paymentId.toString());
      setPaymentToDelete(null);
      refreshAll();
      toast.success("Payment deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payment");
    }
  };

  const handleInsert = () => setIsLoanSelectDialogOpen(true);
  const handleLoanSelect = () => {
    if (selectedLoanId) router.push(`/loans/${String(selectedLoanId)}/schedule`);
  };

  const columns: ColumnDef<ScheduleRow>[] = useMemo(
    () => [
      {
        accessorKey: "loanName",
        header: "Loan",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.loanName || "—"}</div>
            {row.original.loanNumber && (
              <div className="text-sm text-muted-foreground mt-1">{row.original.loanNumber}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "month",
        header: "Month",
        cell: ({ row }) => `#${row.original.month}`,
      },
      {
        accessorKey: "paymentDate",
        header: "Payment Date",
        cell: ({ row }) => formatDate(row.original.paymentDate),
      },
      {
        accessorKey: "totalPayment",
        header: "Total Payment",
        cell: ({ row }) => formatCurrency(row.original.totalPayment),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original;
          if (s.isPaid) return <Badge variant="default">Paid</Badge>;
          const isPastDue = s.paymentDate < today;
          return (
            <Badge variant={isPastDue ? "destructive" : "secondary"}>
              {isPastDue ? "Past Due" : "Pending"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={() => {
                  setManagingSchedule(row.original);
                  setPaymentDate(new Date());
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Manage Payment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/loans/${row.original.loanId}/schedule`)}>
                View Schedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [today, router]
  );

  const totalDue = schedules.reduce((sum, s) => sum + s.totalPayment, 0);
  const paidCount = schedules.filter((s) => s.isPaid).length;
  const pastDueCount = schedules.filter((s) => !s.isPaid).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loan Payments</h1>
            <p className="text-muted-foreground mt-2">Past loan payment schedules</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/loans/output/timeline")}>
              <Calendar className="h-4 w-4 mr-2" />
              View Timeline
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">Past Schedules</div>
            <div className="mt-2 text-2xl font-bold">{schedules.length}</div>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Due</div>
            <div className="mt-2 text-2xl font-bold">{formatCurrency(totalDue)}</div>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">Paid / Past Due</div>
            <div className="mt-2 text-2xl font-bold">
              {paidCount} / {pastDueCount}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
          title=""
          description=""
          onInsert={handleInsert}
          data={schedules}
          columns={columns}
          loading={isLoading}
          onRowClick={(s) => router.push(`/loans/${s.loanId}/schedule`)}
          filterColumns={[
            { value: "loanName", label: "Loan" },
            { value: "paymentDate", label: "Payment Date" },
            { value: "totalPayment", label: "Total Payment" },
          ]}
          sortColumns={[
            { value: "loanName", label: "Loan", type: "character varying" },
            { value: "paymentDate", label: "Payment Date", type: "date" },
            { value: "totalPayment", label: "Total Payment", type: "numeric" },
            { value: "month", label: "Month", type: "numeric" },
          ]}
          localStoragePrefix="loans-output"
          searchFields={["loanName", "loanNumber"]}
        />
      </div>

      <Dialog open={isLoanSelectDialogOpen} onOpenChange={setIsLoanSelectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Loan</DialogTitle>
            <DialogDescription>
              Choose a loan to view its schedule and make payments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <UnifiedSelector
              id="loan-select"
              label="Loan"
              required
              type="loan"
              items={loans?.map((loan: Loan) => ({
                ...loan,
                name: `${loan.name} (${loan.loanNumber}) - ${formatCurrency(loan.principalAmount)}`,
              })) ?? []}
              selectedId={selectedLoanId || undefined}
              onSelect={(item) => setSelectedLoanId(item.id === 0 ? undefined : item.id)}
              placeholder="Choose a loan..."
              getDisplayName={(item) =>
                item.name ?? `${(item as Loan).name} (${(item as Loan).loanNumber}) - ${formatCurrency((item as Loan).principalAmount)}`
              }
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsLoanSelectDialogOpen(false);
                setSelectedLoanId(undefined);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleLoanSelect} disabled={!selectedLoanId}>
              View Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingSchedule} onOpenChange={(o) => !o && setManagingSchedule(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Payment</DialogTitle>
            <DialogDescription>
              {managingSchedule && (
                <>
                  {managingSchedule.loanName} · Month {managingSchedule.month} ·{" "}
                  {formatDate(managingSchedule.paymentDate)}
                  <br />
                  Due: {formatCurrency(managingSchedule.totalPayment)} · Paid:{" "}
                  {formatCurrency(managedTotalPaid)} · Remaining: {formatCurrency(managedRemaining)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {managedPayments.length > 0 && (
              <div className="space-y-2">
                <Label>Existing Payments</Label>
                <div className="border rounded-md divide-y">
                  {managedPayments.map((payment) => (
                    <div key={payment.id} className="p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                          <span className="text-sm text-muted-foreground">
                            on {formatDate(payment.paymentDate)}
                          </span>
                          {payment.paymentMethod && (
                            <span className="text-sm text-muted-foreground">
                              ({payment.paymentMethod.replace("_", " ")})
                            </span>
                          )}
                          {payment.notes && (
                            <span className="text-sm text-muted-foreground">- {payment.notes}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPaymentToDelete(payment.id)}
                        disabled={deletePayment.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {managedRemaining > 0 && (
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">Add Payment</Label>
                <div className="space-y-2">
                  <Label htmlFor="mp-date">Payment Date</Label>
                  <DatePicker
                    id="mp-date"
                    value={paymentDate}
                    onChange={(d) => setPaymentDate(d ?? new Date())}
                    placeholder="Pick a date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp-amount">Amount</Label>
                  <Input
                    id="mp-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={managedRemaining}
                    defaultValue={managedRemaining.toString()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max: {formatCurrency(managedRemaining)}
                  </p>
                </div>
                <UnifiedSelector
                  label="Payment Method"
                  type="method"
                  id="mp-method"
                  items={paymentMethodItems}
                  selectedId={paymentMethod || undefined}
                  onSelect={(item) =>
                    setPaymentMethod(item.id === 0 ? "bank_transfer" : String(item.id))
                  }
                  placeholder="Select payment method"
                />
                <div className="space-y-2">
                  <Label htmlFor="mp-notes">Notes (optional)</Label>
                  <Input id="mp-notes" type="text" placeholder="Reference, check number, etc." />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingSchedule(null)}>
              Close
            </Button>
            {managedRemaining > 0 && (
              <Button onClick={handleAddPayment} disabled={createPayment.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={paymentToDelete != null}
        onOpenChange={(open) => !open && setPaymentToDelete(null)}
        onConfirm={() => paymentToDelete != null && handleDeletePayment(paymentToDelete)}
        title="Delete payment"
        description="Are you sure you want to delete this payment?"
        confirmText="Delete"
        cancelText="Cancel"
        isPending={deletePayment.isPending}
        variant="destructive"
      />
    </div>
  );
}
