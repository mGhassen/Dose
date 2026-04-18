import type { BankTransactionSplitLine } from "@kit/lib";

export type DraftKind = BankTransactionSplitLine["kind"];

/** A locally-editable draft allocation row. */
export type DraftLine =
  | {
      localId: number;
      kind: "balance_movement";
      amount: string;
      balanceAccountId?: number;
      label: string;
      notes: string;
    }
  | {
      localId: number;
      kind: "payment";
      amount: string;
      entryId?: number;
      paymentDate: string;
      notes: string;
    }
  | {
      localId: number;
      kind: "link_expense";
      amount: string;
      expenseId?: number;
      notes: string;
    }
  | {
      localId: number;
      kind: "link_sale";
      amount: string;
      saleId?: number;
      notes: string;
    }
  | {
      localId: number;
      kind: "new_expense";
      amount: string;
      name: string;
      category: string;
      expenseDate: string;
      vendor: string;
      description: string;
      supplierId?: number;
      supplierOrderId?: number;
    }
  | {
      localId: number;
      kind: "new_sale";
      amount: string;
      saleDate: string;
      saleType: "on_site" | "delivery" | "takeaway" | "catering" | "other";
      itemId?: number;
      quantity: string;
      unitPrice: string;
      description: string;
    };

export function draftIsReady(draft: DraftLine): boolean {
  const amt = parseFloat(draft.amount);
  if (Number.isNaN(amt) || amt === 0) return false;
  switch (draft.kind) {
    case "balance_movement":
      return draft.balanceAccountId != null;
    case "payment":
      return draft.entryId != null && !!draft.paymentDate;
    case "link_expense":
      return draft.expenseId != null;
    case "link_sale":
      return draft.saleId != null;
    case "new_expense":
      return !!draft.name.trim() && !!draft.category && !!draft.expenseDate;
    case "new_sale":
      return draft.itemId != null && parseFloat(draft.quantity) > 0 && !!draft.saleDate;
  }
}

export function draftToSplitLine(draft: DraftLine): BankTransactionSplitLine | null {
  const amount = parseFloat(draft.amount);
  if (Number.isNaN(amount) || amount === 0) return null;
  switch (draft.kind) {
    case "balance_movement":
      if (draft.balanceAccountId == null) return null;
      return {
        kind: "balance_movement",
        amount,
        balanceAccountId: draft.balanceAccountId,
        label: draft.label.trim() || null,
        notes: draft.notes.trim() || null,
      };
    case "payment":
      if (draft.entryId == null) return null;
      return {
        kind: "payment",
        amount,
        entryId: draft.entryId,
        paymentDate: draft.paymentDate.slice(0, 10),
        notes: draft.notes.trim() || null,
      };
    case "link_expense":
      if (draft.expenseId == null) return null;
      return {
        kind: "link_expense",
        amount,
        expenseId: draft.expenseId,
        notes: draft.notes.trim() || null,
      };
    case "link_sale":
      if (draft.saleId == null) return null;
      return {
        kind: "link_sale",
        amount,
        saleId: draft.saleId,
        notes: draft.notes.trim() || null,
      };
    case "new_expense":
      return {
        kind: "new_expense",
        amount,
        expense: {
          name: draft.name.trim(),
          category: draft.category,
          amount: Math.abs(amount),
          expenseDate: draft.expenseDate.slice(0, 10),
          description: draft.description.trim() || undefined,
          vendor: draft.vendor.trim() || undefined,
          supplierId: draft.supplierId,
          supplierOrderId: draft.supplierOrderId,
        },
      };
    case "new_sale":
      if (draft.itemId == null) return null;
      return {
        kind: "new_sale",
        amount,
        sale: {
          date: draft.saleDate.slice(0, 10),
          type: draft.saleType,
          lineItems: [
            {
              itemId: draft.itemId,
              quantity: parseFloat(draft.quantity) || 0,
              unitPrice: parseFloat(draft.unitPrice) || 0,
            },
          ],
          description: draft.description.trim() || undefined,
        },
      };
  }
}

export function emptyDraftOfKind(
  kind: DraftKind,
  localId: number,
  txExecutionDate: string,
  suggestedAmount: string
): DraftLine {
  const dateIso = (txExecutionDate || "").slice(0, 10);
  switch (kind) {
    case "balance_movement":
      return {
        localId,
        kind,
        amount: suggestedAmount,
        balanceAccountId: undefined,
        label: "",
        notes: "",
      };
    case "payment":
      return {
        localId,
        kind,
        amount: suggestedAmount,
        entryId: undefined,
        paymentDate: dateIso,
        notes: "",
      };
    case "link_expense":
      return { localId, kind, amount: suggestedAmount, expenseId: undefined, notes: "" };
    case "link_sale":
      return { localId, kind, amount: suggestedAmount, saleId: undefined, notes: "" };
    case "new_expense":
      return {
        localId,
        kind,
        amount: suggestedAmount,
        name: "",
        category: "other",
        expenseDate: dateIso,
        vendor: "",
        description: "",
        supplierId: undefined,
        supplierOrderId: undefined,
      };
    case "new_sale":
      return {
        localId,
        kind,
        amount: suggestedAmount,
        saleDate: dateIso,
        saleType: "other",
        itemId: undefined,
        quantity: "1",
        unitPrice: suggestedAmount.replace(/^-/, ""),
        description: "",
      };
  }
}
