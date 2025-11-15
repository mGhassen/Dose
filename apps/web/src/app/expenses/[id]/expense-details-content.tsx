"use client";

import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Badge } from "@kit/ui/badge";
import { Edit2, Trash2, Calendar, MoreVertical } from "lucide-react";
import { useMemo } from "react";
import AppLayout from "@/components/app-layout";
import { useExpenseById, useDeleteExpense, useSubscriptions } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { ExpenseCategory } from "@kit/types";

interface ExpenseDetailsContentProps {
  expenseId: string;
}

export default function ExpenseDetailsContent({ expenseId }: ExpenseDetailsContentProps) {
  const router = useRouter();
  const { data: expense, isLoading } = useExpenseById(expenseId);
  const { data: subscriptionsResponse } = useSubscriptions();
  const subscriptions = subscriptionsResponse?.data || [];
  const deleteMutation = useDeleteExpense();
  
  const subscriptionMap = useMemo(() => {
    const map = new Map<number, string>();
    if (subscriptions && Array.isArray(subscriptions)) {
      subscriptions.forEach(sub => map.set(sub.id, sub.name));
    }
    return map;
  }, [subscriptions]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(expenseId));
      toast.success("Expense deleted successfully");
      router.push('/expenses');
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!expense) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Expense Not Found</h1>
            <p className="text-muted-foreground">The expense you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/expenses')}>Back to Expenses</Button>
        </div>
      </AppLayout>
    );
  }

  const categoryLabels: Record<ExpenseCategory, string> = {
    rent: "Rent",
    utilities: "Utilities",
    supplies: "Supplies",
    marketing: "Marketing",
    insurance: "Insurance",
    maintenance: "Maintenance",
    professional_services: "Professional Services",
    other: "Other",
  };


  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{expense.name}</h1>
            <p className="text-muted-foreground">Expense details and information</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/expenses/${expenseId}/edit`)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
            <CardDescription>View and manage expense details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-base font-semibold mt-1">{expense.name}</p>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <div className="mt-1">
                  <Badge variant="outline">
                    {categoryLabels[expense.category] || expense.category}
                  </Badge>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="text-base font-semibold mt-1">{formatCurrency(expense.amount)}</p>
              </div>

              {/* Subscription */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Subscription</label>
                <div className="mt-1">
                  {expense.subscriptionId && subscriptionMap.has(expense.subscriptionId) ? (
                    <Badge variant="outline">
                      {subscriptionMap.get(expense.subscriptionId)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>

              {/* Expense Date */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expense Date</label>
                <p className="text-base mt-1">{formatDate(expense.expenseDate)}</p>
              </div>

              {/* Vendor */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                <p className="text-base mt-1">
                  {expense.vendor || <span className="text-muted-foreground">—</span>}
                </p>
              </div>
            </div>

            {/* Description */}
            {expense.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-base mt-1 whitespace-pre-wrap">{expense.description}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Created:</span> {formatDate(expense.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {formatDate(expense.updatedAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

