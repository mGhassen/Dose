"use client";

import { useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Badge } from "@kit/ui/badge";
import { Separator } from "@kit/ui/separator";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Skeleton } from "@kit/ui/skeleton";
import {
  Edit2,
  Trash2,
  MoreHorizontal,
  X,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Receipt,
  Package,
  ChevronRight,
} from "lucide-react";
import { DatePicker } from "@kit/ui/date-picker";
import { UnifiedSelector } from "@/components/unified-selector";
import {
  useExpenseById,
  useUpdateExpense,
  useDeleteExpense,
  useSubscriptions,
  useInventorySuppliers,
} from "@kit/hooks";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { dateToYYYYMMDD } from "@kit/lib";
import type { ExpenseCategory } from "@kit/types";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  utilities: "Utilities",
  supplies: "Supplies",
  marketing: "Marketing",
  insurance: "Insurance",
  maintenance: "Maintenance",
  professional_services: "Professional Services",
  other: "Other",
};

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export interface ExpenseDetailContentProps {
  expenseId: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function ExpenseDetailContent({
  expenseId,
  onClose,
  onDeleted,
}: ExpenseDetailContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: expense, isLoading } = useExpenseById(expenseId);
  const { data: subscriptionsResponse } = useSubscriptions();
  const subscriptions = subscriptionsResponse?.data || [];
  const { data: suppliersResponse } = useInventorySuppliers({
    limit: 1000,
    supplierType: "vendor",
  });
  const suppliers = suppliersResponse?.data || [];
  const updateExpense = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [formData, setFormData] = useState({
    name: "",
    category: "" as ExpenseCategory | "",
    amount: "",
    subscriptionId: "",
    expenseDate: "",
    description: "",
    vendor: "",
    supplierId: "",
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        category: expense.category,
        amount: expense.amount.toString(),
        subscriptionId: expense.subscriptionId?.toString() || "",
        expenseDate: expense.expenseDate.split("T")[0],
        description: expense.description || "",
        vendor: expense.vendor || "",
        supplierId: expense.supplierId?.toString() || "",
      });
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.category ||
      !formData.amount ||
      !formData.expenseDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await updateExpense.mutateAsync({
        id: expenseId,
        data: {
          name: formData.name,
          category: formData.category as ExpenseCategory,
          amount: parseFloat(formData.amount),
          subscriptionId: formData.subscriptionId
            ? parseInt(formData.subscriptionId)
            : undefined,
          expenseDate: formData.expenseDate,
          description: formData.description || undefined,
          vendor: formData.vendor || undefined,
          supplierId: formData.supplierId
            ? parseInt(formData.supplierId)
            : undefined,
        },
      });
      toast.success("Expense updated successfully");
      setIsEditing(false);
    } catch (error: unknown) {
      toast.error(
        (error as { message?: string })?.message || "Failed to update expense"
      );
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this expense? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(Number(expenseId));
      toast.success("Expense deleted successfully");
      onDeleted();
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="space-y-4 px-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Expense not found</h2>
          <p className="text-sm text-muted-foreground">
            This expense may have been deleted or doesn't exist.
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to expenses
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-6 pb-6 pr-1">
            <div>
              <h2 className="text-lg font-semibold">Edit expense</h2>
              <p className="text-sm text-muted-foreground">
                Update the details below
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Office Rent"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <UnifiedSelector
                  type="category"
                  required
                  items={[
                    { id: "rent", name: "Rent" },
                    { id: "utilities", name: "Utilities" },
                    { id: "supplies", name: "Supplies" },
                    { id: "marketing", name: "Marketing" },
                    { id: "insurance", name: "Insurance" },
                    { id: "maintenance", name: "Maintenance" },
                    { id: "professional_services", name: "Professional Services" },
                    { id: "other", name: "Other" },
                  ]}
                  selectedId={formData.category || undefined}
                  onSelect={(item) =>
                    handleInputChange(
                      "category",
                      item.id === 0 ? "" : String(item.id)
                    )
                  }
                  placeholder="Select category"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Expense date</Label>
                <DatePicker
                  id="expenseDate"
                  value={
                    formData.expenseDate
                      ? new Date(formData.expenseDate)
                      : undefined
                  }
                  onChange={(d) =>
                    handleInputChange("expenseDate", d ? dateToYYYYMMDD(d) : "")
                  }
                  placeholder="Pick a date"
                />
              </div>
              <div className="space-y-2">
                <Label>Subscription</Label>
                <UnifiedSelector
                  type="subscription"
                  items={subscriptions.map((sub: { id: number; name: string; description?: string }) => ({
                    id: sub.id,
                    name: sub.name,
                    description: sub.description,
                  }))}
                  selectedId={
                    formData.subscriptionId
                      ? parseInt(formData.subscriptionId)
                      : undefined
                  }
                  onSelect={(item) =>
                    handleInputChange(
                      "subscriptionId",
                      item.id === 0 ? "" : String(item.id)
                    )
                  }
                  placeholder="Link to subscription (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <UnifiedSelector
                  type="vendor"
                  items={suppliers}
                  selectedId={
                    formData.supplierId
                      ? parseInt(formData.supplierId)
                      : undefined
                  }
                  onSelect={(item) =>
                    handleInputChange(
                      "supplierId",
                      item.id === 0 ? "" : String(item.id)
                    )
                  }
                  placeholder="Select vendor"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Additional notes"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex shrink-0 gap-3 border-t bg-background p-4 -mx-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateExpense.isPending} className="flex-1">
            {updateExpense.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    );
  }

  const subscriptionName =
    expense.subscriptionId && subscriptions.length
      ? subscriptions.find((s: { id: number }) => s.id === expense.subscriptionId)?.name
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 space-y-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDate(expense.expenseDate)} ·{" "}
              {CATEGORY_LABELS[expense.category] || expense.category}
            </p>
            <h2 className="text-lg font-semibold">Expense details</h2>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit expense
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
        <Separator />
      </div>
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-6 pb-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {formatCurrency(expense.amount)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDate(expense.expenseDate)}
                </span>
                <Badge variant="secondary" className="font-normal">
                  {CATEGORY_LABELS[expense.category] || expense.category}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-0">
            <DetailRow icon={Receipt} label="Name">
              {expense.name}
            </DetailRow>
            <Separator />
            <DetailRow icon={Tag} label="Category">
              <Badge variant="outline">
                {CATEGORY_LABELS[expense.category] || expense.category}
              </Badge>
            </DetailRow>
            <Separator />
            <DetailRow icon={DollarSign} label="Amount">
              <span className="tabular-nums">{formatCurrency(expense.amount)}</span>
            </DetailRow>
            <Separator />
            <DetailRow icon={Calendar} label="Expense date">
              {formatDate(expense.expenseDate)}
            </DetailRow>
            <Separator />
            <DetailRow icon={Package} label="Subscription">
              {expense.subscriptionId && subscriptionName ? (
                <Link
                  href={`/subscriptions/${expense.subscriptionId}`}
                  className="group inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {subscriptionName}
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            <Separator />
            <DetailRow icon={Package} label="Vendor">
              {expense.supplierId && suppliers.length ? (
                (() => {
                  const supplier = suppliers.find(
                    (s: { id: number }) => s.id === expense.supplierId
                  );
                  return supplier ? (
                    <Link
                      href={`/inventory-suppliers/${expense.supplierId}`}
                      className="group inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {(supplier as { name: string }).name}
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ) : (
                    expense.vendor || <span className="text-muted-foreground">—</span>
                  );
                })()
              ) : (
                expense.vendor || <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            {expense.description && (
              <>
                <Separator />
                <DetailRow icon={FileText} label="Description">
                  <p className="whitespace-pre-wrap text-foreground/90">
                    {expense.description}
                  </p>
                </DetailRow>
              </>
            )}
          </div>

          <Separator />

          <div className="flex gap-6 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created</span>{" "}
              {formatDate(expense.createdAt)}
            </div>
            <div>
              <span className="font-medium">Updated</span>{" "}
              {formatDate(expense.updatedAt)}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
