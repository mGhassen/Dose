import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bankTransactionsApi,
  type BankTransaction,
  type BankTransactionCreateExpensePayload,
  type BankTransactionCreateSalePayload,
  type BankTransactionAllocatePaymentPayload,
  type BankTransactionAllocateReceiptsBulkPayload,
} from '@kit/lib';

export function useBankTransactions(params?: {
  page?: number;
  limit?: number;
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
}) {
  return useQuery({
    queryKey: ['bank-transactions', params],
    queryFn: () => bankTransactionsApi.getAll(params),
  });
}

export function useBankTransaction(id: string | null) {
  return useQuery({
    queryKey: ['bank-transactions', id],
    queryFn: () => bankTransactionsApi.getById(id!),
    enabled: !!id,
  });
}

export function useReconcileBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reconciled_entity_type,
      reconciled_entity_id,
    }: {
      id: string;
      reconciled_entity_type: string | null;
      reconciled_entity_id: number | null;
    }) => bankTransactionsApi.reconcile(id, reconciled_entity_type, reconciled_entity_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useCreateExpenseFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionCreateExpensePayload }) =>
      bankTransactionsApi.createExpenseFromTransaction(id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useCreateSaleFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionCreateSalePayload }) =>
      bankTransactionsApi.createSaleFromTransaction(id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useAllocatePaymentFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionAllocatePaymentPayload }) =>
      bankTransactionsApi.allocatePaymentFromTransaction(id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useAllocateReceiptFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionAllocatePaymentPayload }) =>
      bankTransactionsApi.allocateReceiptFromTransaction(id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export function useAllocateReceiptsBulkFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionAllocateReceiptsBulkPayload }) =>
      bankTransactionsApi.allocateReceiptsBulkFromTransaction(id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}
