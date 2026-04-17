import { apiRequest } from './api';
import type { PaginatedResponse, PaginationParams } from '@kit/types';

export interface BankTransaction {
  id: number;
  account_id: string;
  integration_id: number | null;
  source_id: string;
  bank_account_id: string | null;
  execution_date: string;
  amount: number;
  currency: string;
  label: string | null;
  source: string | null;
  counterparty_name: string | null;
  counterparty_id: string | null;
  balance_after: number | null;
  state: string | null;
  reconciled_entity_type: string | null;
  reconciled_entity_id: number | null;
  /** Sum of `payments.amount` linked via `bank_transaction_id` (split allocations). */
  allocated_payments_total?: number;
  created_at: string;
  updated_at: string;
}

/** POST /api/bank-transactions/:id/create-expense body. */
export interface BankTransactionCreateExpensePayload {
  name: string;
  category: string;
  amount: number;
  expenseDate: string;
  description?: string;
  vendor?: string;
  supplierId?: number;
  supplierOrderId?: number;
  expenseType?: 'expense' | 'subscription' | 'leasing' | 'loan' | 'personnel' | 'other';
}

export interface BankTransactionCreateExpenseResponse {
  bankTransaction: BankTransaction;
  expense: {
    id: number;
    name: string;
    category: string;
    amount: number;
    expenseDate: string;
    supplierId?: number;
    supplierOrderId?: number;
  };
  supplierOrder: { id: number; supplier_id: number; status: string | null; order_date: string } | null;
}

/** POST /api/bank-transactions/:id/create-sale — same shape as POST /api/sales (transaction payload). */
export type BankTransactionCreateSalePayload = {
  date: string;
  type: 'on_site' | 'delivery' | 'takeaway' | 'catering' | 'other';
  lineItems: Array<{
    itemId?: number;
    quantity: number;
    unitId?: number;
    unitPrice: number;
    unitCost?: number;
    taxRatePercent?: number;
    parentLineIndex?: number;
  }>;
  discount?: { type: 'percent' | 'amount'; value: number };
  description?: string;
};

export interface BankTransactionCreateSaleResponse {
  bankTransaction: BankTransaction;
  saleId: number;
}

export interface BankTransactionAllocatePaymentPayload {
  entryId: number;
  amount: number;
  paymentDate: string;
  notes?: string;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer';
}

export interface BankTransactionAllocatePaymentResponse {
  payment: {
    id: number;
    entryId: number;
    amount: number;
    paymentDate: string;
    bankTransactionId?: number;
  };
  bankTransaction: BankTransaction;
}

export interface BankTransactionAllocateReceiptsBulkPayload {
  allocations: Array<{ entryId: number; amount: number; notes?: string }>;
  paymentDate: string;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer';
}

export interface BankTransactionAllocateReceiptsBulkResponse {
  payments: Array<{
    id: number;
    entryId: number;
    amount: number;
    paymentDate: string;
    bankTransactionId?: number;
  }>;
  bankTransaction: BankTransaction;
  fullyAllocated: boolean;
}

export const bankTransactionsApi = {
  getAll: (params?: PaginationParams & {
    integration_id?: string;
    from_date?: string;
    to_date?: string;
    reconciled?: 'true' | 'false';
    q?: string;
    min_amount?: string;
    max_amount?: string;
    reconciled_entity_type?: string;
    sort_by?: 'execution_date' | 'amount' | 'label' | 'counterparty_name';
    sort_order?: 'asc' | 'desc';
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.integration_id) searchParams.append('integration_id', params.integration_id);
    if (params?.from_date) searchParams.append('from_date', params.from_date);
    if (params?.to_date) searchParams.append('to_date', params.to_date);
    if (params?.reconciled) searchParams.append('reconciled', params.reconciled);
    if (params?.q) searchParams.append('q', params.q);
    if (params?.min_amount) searchParams.append('min_amount', params.min_amount);
    if (params?.max_amount) searchParams.append('max_amount', params.max_amount);
    if (params?.reconciled_entity_type) searchParams.append('reconciled_entity_type', params.reconciled_entity_type);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.sort_order) searchParams.append('sort_order', params.sort_order);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<BankTransaction>>('GET', `/api/bank-transactions${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<BankTransaction>('GET', `/api/bank-transactions/${id}`),
  reconcile: (id: string, reconciled_entity_type: string | null, reconciled_entity_id: number | null) =>
    apiRequest<BankTransaction>('PATCH', `/api/bank-transactions/${id}`, {
      reconciled_entity_type,
      reconciled_entity_id,
    }),
  createExpenseFromTransaction: (id: string, body: BankTransactionCreateExpensePayload) =>
    apiRequest<BankTransactionCreateExpenseResponse>('POST', `/api/bank-transactions/${id}/create-expense`, body),
  createSaleFromTransaction: (id: string, body: BankTransactionCreateSalePayload) =>
    apiRequest<BankTransactionCreateSaleResponse>('POST', `/api/bank-transactions/${id}/create-sale`, body),
  allocatePaymentFromTransaction: (id: string, body: BankTransactionAllocatePaymentPayload) =>
    apiRequest<BankTransactionAllocatePaymentResponse>('POST', `/api/bank-transactions/${id}/allocate-payment`, body),
  /** Credit: record payment on a sale input entry; same body as allocate-payment. */
  allocateReceiptFromTransaction: (id: string, body: BankTransactionAllocatePaymentPayload) =>
    apiRequest<BankTransactionAllocatePaymentResponse>('POST', `/api/bank-transactions/${id}/allocate-receipt`, body),
  /** Credit: record several sale receipts in one all-or-nothing call. */
  allocateReceiptsBulkFromTransaction: (id: string, body: BankTransactionAllocateReceiptsBulkPayload) =>
    apiRequest<BankTransactionAllocateReceiptsBulkResponse>('POST', `/api/bank-transactions/${id}/allocate-receipt`, body),
};
