import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseBody, bankTransactionCreateExpenseBodySchema } from '@/shared/zod-schemas';
import type { BankTransactionCreateExpenseBody } from '@/shared/zod-schemas';
import { executeBankTransactionSplit } from '@/lib/bank-transactions/execute-split';
import {
  expenseCategoryNameIsActive,
  invalidExpenseCategoryResponse,
} from '@/lib/metadata-expense-category';

/** Thin wrapper: create a new expense and link it to a debit bank transaction. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bankTxId } = await params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = parseBody(raw, bankTransactionCreateExpenseBodySchema);
    if (!parsed.success) return parsed.response;
    const body: BankTransactionCreateExpenseBody = parsed.data;

    const supabase = supabaseServer();
    if (!(await expenseCategoryNameIsActive(supabase, body.category))) {
      return invalidExpenseCategoryResponse();
    }

    const { data: bankTx } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('id', bankTxId)
      .single();
    if (!bankTx) {
      return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
    }
    if (Number(bankTx.amount) >= 0) {
      return NextResponse.json(
        { error: 'Only debit transactions (negative amount) can create an expense' },
        { status: 400 }
      );
    }

    const allocationAmount = -Math.abs(Number(body.amount));
    const result = await executeBankTransactionSplit(supabase, Number(bankTxId), {
      lines: [{ kind: 'new_expense', amount: allocationAmount, expense: body }],
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message, details: result.error.details },
        { status: result.error.status }
      );
    }

    type ExpenseRow = {
      id: number;
      name: string;
      category: string;
      amount: number;
      expense_date: string;
      supplier_id: number | null;
      supplier_order_id: number | null;
    };
    type SupplierOrderRow = {
      id: number;
      supplier_id: number;
      status: string | null;
      order_date: string;
    };

    const expenseId = result.result.lineResults[0]?.primaryEntityId;
    let expenseRow: ExpenseRow | null = null;
    let supplierOrderRow: SupplierOrderRow | null = null;
    if (expenseId != null) {
      const { data: ex } = await supabase
        .from('expenses')
        .select('id, name, category, amount, expense_date, supplier_id, supplier_order_id')
        .eq('id', expenseId)
        .maybeSingle();
      expenseRow = (ex as ExpenseRow | null) ?? null;
      if (expenseRow && expenseRow.supplier_order_id != null) {
        const { data: so } = await supabase
          .from('supplier_orders')
          .select('id, supplier_id, status, order_date')
          .eq('id', expenseRow.supplier_order_id)
          .maybeSingle();
        supplierOrderRow = (so as SupplierOrderRow | null) ?? null;
      }
    }

    return NextResponse.json(
      {
        bankTransaction: result.result.bankTransaction,
        expense: expenseRow
          ? {
              id: expenseRow.id,
              name: expenseRow.name,
              category: expenseRow.category,
              amount: parseFloat(String(expenseRow.amount)),
              expenseDate: expenseRow.expense_date,
              supplierId: expenseRow.supplier_id ?? undefined,
              supplierOrderId: expenseRow.supplier_order_id ?? undefined,
            }
          : null,
        supplierOrder: supplierOrderRow,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create expense from bank transaction';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
