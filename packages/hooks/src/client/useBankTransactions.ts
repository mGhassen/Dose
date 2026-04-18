import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bankTransactionsApi,
  type BankTransactionCreateExpensePayload,
  type BankTransactionCreateSalePayload,
  type BankTransactionAllocatePaymentPayload,
  type BankTransactionSplitPayload,
} from '@kit/lib';
import type { BankTransactionAllocationEntityType } from '@kit/types';

export function useBankTransactions(params?: {
  page?: number;
  limit?: number;
  integration_id?: string;
  from_date?: string;
  to_date?: string;
  reconciled?: 'any' | 'fully' | 'partial' | 'none';
  q?: string;
  min_amount?: string;
  max_amount?: string;
  has_entity_type?: BankTransactionAllocationEntityType;
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

function invalidateAllBankTxRelated(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string
) {
  queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['bank-transactions', id] });
  queryClient.invalidateQueries({ queryKey: ['payments'] });
  queryClient.invalidateQueries({ queryKey: ['entries'] });
  queryClient.invalidateQueries({ queryKey: ['expenses'] });
  queryClient.invalidateQueries({ queryKey: ['sales'] });
  queryClient.invalidateQueries({ queryKey: ['balance-movements'] });
  queryClient.invalidateQueries({ queryKey: ['balance-accounts'] });
  queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
}

export function useSplitBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionSplitPayload }) =>
      bankTransactionsApi.split(id, body),
    onSuccess: (_, variables) => invalidateAllBankTxRelated(queryClient, variables.id),
  });
}

export function useDeleteBankTransactionAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allocationId }: { id: string; allocationId: number }) =>
      bankTransactionsApi.deleteAllocation(id, allocationId),
    onSuccess: (_, variables) => invalidateAllBankTxRelated(queryClient, variables.id),
  });
}

export function useCreateExpenseFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionCreateExpensePayload }) =>
      bankTransactionsApi.createExpenseFromTransaction(id, body),
    onSuccess: (_, variables) => invalidateAllBankTxRelated(queryClient, variables.id),
  });
}

export function useCreateSaleFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionCreateSalePayload }) =>
      bankTransactionsApi.createSaleFromTransaction(id, body),
    onSuccess: (_, variables) => invalidateAllBankTxRelated(queryClient, variables.id),
  });
}

export function useAllocatePaymentFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionAllocatePaymentPayload }) =>
      bankTransactionsApi.allocatePaymentFromTransaction(id, body),
    onSuccess: (_, variables) => invalidateAllBankTxRelated(queryClient, variables.id),
  });
}

export function useAllocateReceiptFromBankTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BankTransactionAllocatePaymentPayload }) =>
      bankTransactionsApi.allocateReceiptFromTransaction(id, body),
    onSuccess: (_, variables) => invalidateAllBankTxRelated(queryClient, variables.id),
  });
}
