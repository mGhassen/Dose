import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  balanceAccountsApi,
  type BalanceAccountKind,
  type CreateBalanceAccountPayload,
  type UpdateBalanceAccountPayload,
  type CreateBalanceMovementPayload,
  type UpdateBalanceMovementPayload,
  type AllocateBankToBalancePayload,
} from '@kit/lib';

const LIST_KEY = ['balance-accounts'] as const;

export function useBalanceAccounts(params?: {
  includeArchived?: boolean;
  kind?: BalanceAccountKind;
}) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => balanceAccountsApi.list(params),
  });
}

export function useBalanceAccount(id: number | string | null) {
  return useQuery({
    queryKey: [...LIST_KEY, String(id)],
    queryFn: () => balanceAccountsApi.getById(id!),
    enabled: id != null && id !== '',
  });
}

export function useBalanceAccountMovements(id: number | string | null) {
  return useQuery({
    queryKey: [...LIST_KEY, String(id), 'movements'],
    queryFn: () => balanceAccountsApi.listMovements(id!),
    enabled: id != null && id !== '',
  });
}

export function useCreateBalanceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBalanceAccountPayload) => balanceAccountsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateBalanceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateBalanceAccountPayload }) =>
      balanceAccountsApi.update(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: [...LIST_KEY, String(variables.id)] });
    },
  });
}

export function useDeleteBalanceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => balanceAccountsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useCreateBalanceMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: CreateBalanceMovementPayload }) =>
      balanceAccountsApi.createMovement(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: [...LIST_KEY, String(variables.id)] });
      qc.invalidateQueries({ queryKey: [...LIST_KEY, String(variables.id), 'movements'] });
      qc.invalidateQueries({ queryKey: ['bank-transactions'] });
    },
  });
}

export function useUpdateBalanceMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ movementId, data }: { movementId: number | string; data: UpdateBalanceMovementPayload }) =>
      balanceAccountsApi.updateMovement(movementId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteBalanceMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movementId: number | string) => balanceAccountsApi.deleteMovement(movementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['bank-transactions'] });
    },
  });
}

export function useAllocateBankToBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bankTxId, data }: { bankTxId: number | string; data: AllocateBankToBalancePayload }) =>
      balanceAccountsApi.allocateFromBankTransaction(bankTxId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['bank-transactions'] });
      qc.invalidateQueries({ queryKey: ['bank-transactions', String(variables.bankTxId)] });
    },
  });
}
