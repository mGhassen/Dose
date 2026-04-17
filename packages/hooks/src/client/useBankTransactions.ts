import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankTransactionsApi, type BankTransaction } from '@kit/lib';

export function useBankTransactions(params?: {
  page?: number;
  limit?: number;
  integration_id?: string;
  from_date?: string;
  to_date?: string;
  reconciled?: 'true' | 'false';
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
