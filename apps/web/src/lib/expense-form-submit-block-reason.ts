import {
  rowsToPaymentSlices,
  type DocumentPaymentSliceRow,
} from "@/components/document-payment-slices-editor";
import { paymentSlicesSumMatchesTotal } from "@/lib/ledger/replace-entry-payments";

export function expenseFormSubmitBlockReason(params: {
  name: string;
  category: string;
  expenseDate: string;
  lineItems: Array<{ quantity: string; unitPrice: string }>;
  total: number;
  paymentRows: DocumentPaymentSliceRow[];
}): string | null {
  const { name, category, expenseDate, lineItems, total, paymentRows } = params;
  if (!name?.trim()) return "Enter a name for this expense.";
  if (!category) return "Select a category.";
  if (!expenseDate?.trim()) return "Select an expense date.";

  for (let i = 0; i < lineItems.length; i++) {
    const line = lineItems[i];
    const qty = parseFloat(line.quantity);
    const price = parseFloat(line.unitPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      return `Line ${i + 1}: enter a positive quantity and a unit price (≥ 0).`;
    }
  }

  if (total <= 0) return "Total must be greater than zero.";

  const slices = rowsToPaymentSlices(paymentRows);
  if (!slices) return "Each payment needs a positive amount and a date.";
  if (!paymentSlicesSumMatchesTotal(slices, total)) {
    return `Payment amounts must sum to the document total (${total.toFixed(2)}).`;
  }
  return null;
}
