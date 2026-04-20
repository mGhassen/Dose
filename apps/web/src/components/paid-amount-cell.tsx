"use client";

import { formatCurrency } from "@kit/lib/config";
import {
  ledgerPaidDisplayStatus,
  type PaidDisplayStatus,
} from "@/lib/transactions/paid-display-status";

const paidAmountClass: Record<PaidDisplayStatus, string> = {
  paid:
    "text-green-600 underline decoration-green-600 decoration-dotted decoration-2 underline-offset-[3px]",
  partial:
    "text-blue-600 underline decoration-blue-600 decoration-dotted decoration-2 underline-offset-[3px]",
  unpaid:
    "text-red-600 underline decoration-red-600 decoration-dotted decoration-2 underline-offset-[3px]",
};

export function PaidAmountCell({
  amount,
  totalPaidAmount,
}: {
  amount: number;
  totalPaidAmount?: number;
}) {
  const status = ledgerPaidDisplayStatus(amount, totalPaidAmount);
  return (
    <span className={`tabular-nums ${paidAmountClass[status]}`}>{formatCurrency(amount)}</span>
  );
}
