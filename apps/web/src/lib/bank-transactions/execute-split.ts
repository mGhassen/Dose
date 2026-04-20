import type { SupabaseClient } from '@supabase/supabase-js';
import { StockMovementReferenceType } from '@kit/types';
import { executeCreateSaleTransaction } from '@/lib/sales/execute-create-sale-transaction';
import type { BankTransactionSplitInput } from '@/shared/zod-schemas';
import {
  loadBankTxAllocations,
  withAllocationsSummary,
  type AllocationSummary,
} from '@/lib/bank-transactions/allocations-summary';

const ALLOCATABLE_OUTPUT_ENTRY_TYPES = new Set([
  'loan_payment',
  'expense',
  'subscription_payment',
  'leasing_payment',
  'expense_payment',
  'personnel_salary_payment',
]);

const ALLOCATABLE_INPUT_ENTRY_TYPES = new Set(['sale']);

type Line = BankTransactionSplitInput['lines'][number];

type CreatedRef = {
  table: 'payments' | 'balance_movements' | 'expenses' | 'sales' | 'supplier_orders' | 'entries';
  id: number;
  extra?: { saleId?: number };
};

export type SplitError = { status: number; message: string; details?: string };

export type LineResult = {
  kind: Line['kind'];
  /** Allocation row id that was inserted for this line. */
  allocationId: number;
  /**
   * The user-facing primary entity id for this line:
   * - link_expense / new_expense -> expense id
   * - link_sale / new_sale -> sale id
   * - payment -> payment id
   * - balance_movement -> balance_movement id
   */
  primaryEntityId?: number;
};

export type SplitResult = {
  bankTransaction: Record<string, unknown>;
  allocations: AllocationSummary['allocations'];
  /** The subset of allocations that were created by this call. */
  inserted: AllocationSummary['allocations'];
  /** Per-line results in input order. */
  lineResults: LineResult[];
};

export async function executeBankTransactionSplit(
  supabase: SupabaseClient,
  bankTxId: number,
  input: BankTransactionSplitInput
): Promise<{ ok: true; result: SplitResult } | { ok: false; error: SplitError }> {
  const { data: bankTx, error: txErr } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', bankTxId)
    .single();
  if (txErr || !bankTx) {
    return { ok: false, error: { status: 404, message: 'Bank transaction not found' } };
  }

  const bankAmount = Number(bankTx.amount);
  const bankSign = Math.sign(bankAmount) || 1;

  for (const line of input.lines) {
    if (Math.sign(line.amount) !== 0 && Math.sign(line.amount) !== bankSign) {
      return {
        ok: false,
        error: {
          status: 400,
          message: `Allocation sign (${line.amount}) must match bank transaction sign (${bankAmount})`,
        },
      };
    }
  }

  const prior = await loadBankTxAllocations(supabase, bankTxId, bankAmount);
  const incoming = input.lines.reduce((s, l) => s + Number(l.amount), 0);
  const projectedSum = prior.allocated_total + incoming;
  if (Math.abs(projectedSum) > Math.abs(bankAmount) + 0.005) {
    return {
      ok: false,
      error: {
        status: 400,
        message: 'Allocations exceed bank transaction amount',
        details: `Already allocated ${prior.allocated_total.toFixed(2)}, incoming ${incoming.toFixed(2)}, tx ${bankAmount.toFixed(2)}`,
      },
    };
  }

  const created: CreatedRef[] = [];
  const lineResults: LineResult[] = [];

  try {
    for (const line of input.lines) {
      const lineResult = await processLine(supabase, bankTx, line, created);
      lineResults.push(lineResult);
    }
  } catch (e: unknown) {
    await rollback(supabase, created);
    const status = (e as { status?: number })?.status ?? 500;
    const message = e instanceof Error ? e.message : 'Failed to apply split';
    return { ok: false, error: { status, message } };
  }

  const insertedIds = new Set(lineResults.map((r) => r.allocationId));
  const summary = await loadBankTxAllocations(supabase, bankTxId, bankAmount);
  return {
    ok: true,
    result: {
      bankTransaction: withAllocationsSummary(bankTx, summary),
      allocations: summary.allocations,
      inserted: summary.allocations.filter((a) => insertedIds.has(a.id)),
      lineResults,
    },
  };
}

async function rollback(supabase: SupabaseClient, created: CreatedRef[]) {
  for (const ref of [...created].reverse()) {
    if (ref.table === 'sales' && ref.extra?.saleId != null) {
      const saleId = ref.extra.saleId;
      const { data: entries } = await supabase
        .from('entries')
        .select('id')
        .eq('reference_id', saleId)
        .eq('entry_type', 'sale');
      for (const e of entries ?? []) {
        await supabase.from('payments').delete().eq('entry_id', e.id);
        await supabase.from('entries').delete().eq('id', e.id);
      }
      await supabase
        .from('stock_movements')
        .delete()
        .eq('reference_type', StockMovementReferenceType.SALE)
        .eq('reference_id', saleId);
      await supabase.from('sales').delete().eq('id', saleId);
      continue;
    }
    await supabase.from(ref.table).delete().eq('id', ref.id);
  }
}

async function insertAllocation(
  supabase: SupabaseClient,
  bankTx: { id: number; account_id: string },
  entityType: 'payment' | 'balance_movement' | 'expense' | 'sale' | 'entry',
  entityId: number,
  amount: number,
  label: string | null,
  notes: string | null
) {
  const { data, error } = await supabase
    .from('bank_transaction_allocations')
    .insert({
      account_id: bankTx.account_id,
      bank_transaction_id: bankTx.id,
      entity_type: entityType,
      entity_id: entityId,
      amount,
      label,
      notes,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw Object.assign(new Error(error?.message ?? 'Failed to insert allocation'), {
      status: 400,
    });
  }
  return data as { id: number };
}

/**
 * Insert a payments row against the given entry, enforcing that total paid does not
 * exceed entry.amount. Pushes a rollback ref for the created payment row.
 */
async function bookPaymentForEntry(
  supabase: SupabaseClient,
  entry: { id: number; amount: number | string },
  absAmount: number,
  paymentDate: string,
  notes: string | null,
  created: CreatedRef[]
): Promise<number> {
  const entryAmount = parseFloat(String(entry.amount));
  const { data: existingPay } = await supabase
    .from('payments')
    .select('amount')
    .eq('entry_id', entry.id);
  const paid = (existingPay ?? []).reduce(
    (s, p) => s + parseFloat(String((p as { amount: string | number }).amount)),
    0
  );
  if (paid + absAmount > entryAmount + 0.02) {
    throw Object.assign(
      new Error(
        `Payment exceeds remaining balance on entry (entry ${entryAmount.toFixed(2)}, already paid ${paid.toFixed(2)})`
      ),
      { status: 400 }
    );
  }

  const dateStr = paymentDate.split('T')[0] || paymentDate;
  const { data: paymentRow, error: payInsErr } = await supabase
    .from('payments')
    .insert({
      entry_id: entry.id,
      payment_date: dateStr,
      amount: absAmount,
      is_paid: true,
      paid_date: dateStr,
      notes,
    })
    .select('id')
    .single();
  if (payInsErr || !paymentRow) {
    throw Object.assign(new Error(`Failed to create payment: ${payInsErr?.message}`), { status: 500 });
  }
  created.push({ table: 'payments', id: paymentRow.id });
  return paymentRow.id as number;
}

async function processLine(
  supabase: SupabaseClient,
  bankTx: {
    id: number;
    account_id: string;
    amount: number | string;
    execution_date: string;
    label: string | null;
  },
  line: Line,
  created: CreatedRef[]
): Promise<LineResult> {
  const bankTxIdNum = Number(bankTx.id);
  const txDate = (bankTx.execution_date || '').split('T')[0] || bankTx.execution_date;

  switch (line.kind) {
    case 'balance_movement': {
      const { data: balAccount, error: balErr } = await supabase
        .from('balance_accounts')
        .select('id, account_id, archived_at')
        .eq('id', line.balanceAccountId)
        .maybeSingle();
      if (balErr || !balAccount) throw Object.assign(new Error('Balance account not found'), { status: 404 });
      if (balAccount.account_id !== bankTx.account_id) {
        throw Object.assign(new Error('Balance account does not belong to this workspace'), { status: 403 });
      }
      if (balAccount.archived_at) {
        throw Object.assign(new Error('Balance account is archived'), { status: 400 });
      }

      const { data: movement, error: movErr } = await supabase
        .from('balance_movements')
        .insert({
          account_id: bankTx.account_id,
          balance_account_id: balAccount.id,
          occurred_on: bankTx.execution_date,
          amount: line.amount,
          label: line.label ?? bankTx.label ?? null,
          notes: line.notes ?? null,
        })
        .select('id')
        .single();
      if (movErr || !movement) {
        throw Object.assign(new Error(`Failed to create balance movement: ${movErr?.message}`), { status: 500 });
      }
      created.push({ table: 'balance_movements', id: movement.id });

      const alloc = await insertAllocation(
        supabase,
        bankTx,
        'balance_movement',
        movement.id,
        line.amount,
        line.label ?? null,
        line.notes ?? null
      );
      return { kind: 'balance_movement', allocationId: alloc.id, primaryEntityId: movement.id };
    }

    case 'payment': {
      const { data: entry, error: entErr } = await supabase
        .from('entries')
        .select('id, direction, entry_type, amount')
        .eq('id', line.entryId)
        .single();
      if (entErr || !entry) throw Object.assign(new Error('Entry not found'), { status: 404 });

      const expectedDirection = Number(bankTx.amount) < 0 ? 'output' : 'input';
      const allowedTypes =
        expectedDirection === 'output' ? ALLOCATABLE_OUTPUT_ENTRY_TYPES : ALLOCATABLE_INPUT_ENTRY_TYPES;
      if (entry.direction !== expectedDirection) {
        throw Object.assign(
          new Error(`Entry direction "${entry.direction}" does not match bank transaction direction`),
          { status: 400 }
        );
      }
      if (!allowedTypes.has(entry.entry_type)) {
        throw Object.assign(
          new Error(`Entry type "${entry.entry_type}" cannot be allocated from bank here`),
          { status: 400 }
        );
      }

      const paymentId = await bookPaymentForEntry(
        supabase,
        entry,
        Math.abs(line.amount),
        line.paymentDate,
        line.notes ?? null,
        created
      );
      if (line.paymentMethod) {
        await supabase
          .from('payments')
          .update({ payment_method: line.paymentMethod })
          .eq('id', paymentId);
      }

      const alloc = await insertAllocation(
        supabase,
        bankTx,
        'payment',
        paymentId,
        line.amount,
        null,
        line.notes ?? null
      );
      return { kind: 'payment', allocationId: alloc.id, primaryEntityId: paymentId };
    }

    case 'link_expense': {
      const { data: exp, error: expErr } = await supabase
        .from('expenses')
        .select('id')
        .eq('id', line.expenseId)
        .maybeSingle();
      if (expErr || !exp) throw Object.assign(new Error('Expense not found'), { status: 404 });

      const { data: entry, error: entErr } = await supabase
        .from('entries')
        .select('id, amount')
        .eq('reference_id', exp.id)
        .eq('entry_type', 'expense')
        .maybeSingle();
      if (entErr || !entry) {
        throw Object.assign(new Error('Ledger entry for this expense not found'), { status: 404 });
      }

      const paymentId = await bookPaymentForEntry(
        supabase,
        entry,
        Math.abs(line.amount),
        txDate,
        line.notes ?? null,
        created
      );

      const alloc = await insertAllocation(
        supabase,
        bankTx,
        'payment',
        paymentId,
        line.amount,
        `expense #${exp.id}`,
        line.notes ?? null
      );
      return { kind: 'link_expense', allocationId: alloc.id, primaryEntityId: exp.id };
    }

    case 'link_sale': {
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .select('id')
        .eq('id', line.saleId)
        .maybeSingle();
      if (saleErr || !sale) throw Object.assign(new Error('Sale not found'), { status: 404 });

      const { data: entry, error: entErr } = await supabase
        .from('entries')
        .select('id, amount')
        .eq('reference_id', sale.id)
        .eq('entry_type', 'sale')
        .maybeSingle();
      if (entErr || !entry) {
        throw Object.assign(new Error('Ledger entry for this sale not found'), { status: 404 });
      }

      const paymentId = await bookPaymentForEntry(
        supabase,
        entry,
        Math.abs(line.amount),
        txDate,
        line.notes ?? null,
        created
      );

      const alloc = await insertAllocation(
        supabase,
        bankTx,
        'payment',
        paymentId,
        line.amount,
        `sale #${sale.id}`,
        line.notes ?? null
      );
      return { kind: 'link_sale', allocationId: alloc.id, primaryEntityId: sale.id };
    }

    case 'new_expense': {
      const b = line.expense;
      let supplierOrderId: number | null = b.supplierOrderId ?? null;
      let resolvedSupplierId: number | null = b.supplierId ?? null;

      if (supplierOrderId != null) {
        const { data: ord } = await supabase
          .from('supplier_orders')
          .select('id, supplier_id')
          .eq('id', supplierOrderId)
          .maybeSingle();
        if (!ord) throw Object.assign(new Error('Supplier order not found'), { status: 404 });
        if (resolvedSupplierId == null) {
          resolvedSupplierId = ord.supplier_id;
        } else if (ord.supplier_id !== resolvedSupplierId) {
          throw Object.assign(
            new Error('supplierOrderId does not belong to the given supplierId'),
            { status: 400 }
          );
        }
        const { data: existingExpense } = await supabase
          .from('expenses')
          .select('id')
          .eq('supplier_order_id', supplierOrderId)
          .maybeSingle();
        if (existingExpense) {
          throw Object.assign(new Error('This supplier order is already linked to an expense'), { status: 409 });
        }
      } else if (resolvedSupplierId != null) {
        const orderDate = (b.expenseDate || '').split('T')[0] || b.expenseDate;
        const { data: newOrder, error: orderErr } = await supabase
          .from('supplier_orders')
          .insert({
            supplier_id: resolvedSupplierId,
            order_date: orderDate,
            status: 'pending',
            notes: `Draft order from bank transaction #${bankTxIdNum}`,
            total_amount: null,
          })
          .select('id')
          .single();
        if (orderErr || !newOrder) {
          throw Object.assign(new Error(`Failed to create supplier order: ${orderErr?.message}`), { status: 500 });
        }
        created.push({ table: 'supplier_orders', id: newOrder.id });
        supplierOrderId = newOrder.id;
      }

      const { data: expenseRow, error: expErr } = await supabase
        .from('expenses')
        .insert({
          name: b.name,
          category: b.category,
          amount: b.amount,
          expense_type: b.expenseType ?? 'expense',
          expense_date: b.expenseDate,
          start_date: b.expenseDate,
          description: b.description ?? null,
          vendor: b.vendor ?? null,
          supplier_id: resolvedSupplierId,
          supplier_order_id: supplierOrderId,
          is_active: true,
        })
        .select('id')
        .single();
      if (expErr || !expenseRow) {
        throw Object.assign(new Error(`Failed to create expense: ${expErr?.message}`), { status: 500 });
      }
      created.push({ table: 'expenses', id: expenseRow.id });

      const { data: entryRow, error: entryErr } = await supabase
        .from('entries')
        .insert({
          direction: 'output',
          entry_type: 'expense',
          name: b.name,
          amount: b.amount,
          description: b.description,
          category: b.category,
          vendor: b.vendor,
          supplier_id: resolvedSupplierId,
          entry_date: b.expenseDate,
          reference_id: expenseRow.id,
          is_active: true,
        })
        .select('id, amount')
        .single();
      if (entryErr || !entryRow) {
        throw Object.assign(new Error(`Failed to create ledger entry: ${entryErr?.message}`), { status: 500 });
      }
      created.push({ table: 'entries', id: entryRow.id });

      const paymentId = await bookPaymentForEntry(
        supabase,
        entryRow,
        Math.abs(line.amount),
        txDate,
        null,
        created
      );

      const alloc = await insertAllocation(
        supabase,
        bankTx,
        'payment',
        paymentId,
        line.amount,
        `expense #${expenseRow.id}`,
        null
      );
      return { kind: 'new_expense', allocationId: alloc.id, primaryEntityId: expenseRow.id };
    }

    case 'new_sale': {
      const dateStr = line.sale.date.split('T')[0] || line.sale.date;
      const sale = await executeCreateSaleTransaction(
        supabase,
        {
          date: dateStr,
          type: line.sale.type,
          lineItems: line.sale.lineItems,
          discount: line.sale.discount,
          description: line.sale.description,
        },
        { buildPaymentSlices: () => [] }
      );
      created.push({ table: 'sales', id: sale.id, extra: { saleId: sale.id } });

      const { data: saleEntry, error: saleEntryErr } = await supabase
        .from('entries')
        .select('id, amount')
        .eq('reference_id', sale.id)
        .eq('entry_type', 'sale')
        .maybeSingle();
      if (saleEntryErr || !saleEntry) {
        throw Object.assign(new Error('Ledger entry for new sale not found'), { status: 500 });
      }

      const paymentId = await bookPaymentForEntry(
        supabase,
        saleEntry,
        Math.abs(line.amount),
        txDate,
        null,
        created
      );

      const alloc = await insertAllocation(
        supabase,
        bankTx,
        'payment',
        paymentId,
        line.amount,
        `sale #${sale.id}`,
        null
      );
      return { kind: 'new_sale', allocationId: alloc.id, primaryEntityId: sale.id };
    }
  }
}
