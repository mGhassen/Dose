export type PaidDisplayStatus = "paid" | "partial" | "unpaid";

/** Compare ledger payments total to invoice/receipt amount (2dp). */
export function ledgerPaidDisplayStatus(amount: number, totalPaidAmount?: number): PaidDisplayStatus {
  const due = Math.round(amount * 100) / 100;
  const paid = Math.round((totalPaidAmount ?? 0) * 100) / 100;
  if (due <= 0) return "paid";
  if (paid >= due - 0.01) return "paid";
  if (paid > 0.01) return "partial";
  return "unpaid";
}
