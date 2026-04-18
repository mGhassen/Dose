import { apiRequest } from './api';
import type { BankTransaction } from './bank-transactions';

export type BalanceAccountKind = 'capital' | 'partner_account' | 'cash' | 'other';

export interface BalanceAccount {
  id: number;
  account_id: string;
  name: string;
  kind: BalanceAccountKind;
  currency: string;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  balance?: number;
  movements_count?: number;
}

export interface BalanceMovement {
  id: number;
  account_id: string;
  balance_account_id: number;
  occurred_on: string;
  amount: number;
  label: string | null;
  notes: string | null;
  bank_transaction_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBalanceAccountPayload {
  name: string;
  kind: BalanceAccountKind;
  currency?: string;
  notes?: string | null;
}

export interface UpdateBalanceAccountPayload {
  name?: string;
  kind?: BalanceAccountKind;
  currency?: string;
  notes?: string | null;
  archived_at?: string | null;
}

export interface CreateBalanceMovementPayload {
  occurred_on: string;
  amount: number;
  label?: string | null;
  notes?: string | null;
  bank_transaction_id?: number | null;
}

export interface UpdateBalanceMovementPayload {
  occurred_on?: string;
  amount?: number;
  label?: string | null;
  notes?: string | null;
  bank_transaction_id?: number | null;
}

export interface AllocateBankToBalancePayload {
  balance_account_id: number;
  label?: string | null;
  notes?: string | null;
}

export interface AllocateBankToBalanceResponse {
  bankTransaction: BankTransaction;
  movement: BalanceMovement;
}

export const balanceAccountsApi = {
  list: (params?: { includeArchived?: boolean; kind?: BalanceAccountKind }) => {
    const qs = new URLSearchParams();
    if (params?.includeArchived) qs.append('includeArchived', '1');
    if (params?.kind) qs.append('kind', params.kind);
    const query = qs.toString();
    return apiRequest<BalanceAccount[]>(
      'GET',
      `/api/balance-accounts${query ? `?${query}` : ''}`
    );
  },
  getById: (id: number | string) =>
    apiRequest<BalanceAccount>('GET', `/api/balance-accounts/${id}`),
  create: (data: CreateBalanceAccountPayload) =>
    apiRequest<BalanceAccount>('POST', '/api/balance-accounts', data),
  update: (id: number | string, data: UpdateBalanceAccountPayload) =>
    apiRequest<BalanceAccount>('PATCH', `/api/balance-accounts/${id}`, data),
  remove: (id: number | string) =>
    apiRequest<void | { softDeleted: true; movementsCount: number }>(
      'DELETE',
      `/api/balance-accounts/${id}`
    ),
  listMovements: (id: number | string) =>
    apiRequest<BalanceMovement[]>('GET', `/api/balance-accounts/${id}/movements`),
  createMovement: (id: number | string, data: CreateBalanceMovementPayload) =>
    apiRequest<BalanceMovement>(
      'POST',
      `/api/balance-accounts/${id}/movements`,
      data
    ),
  updateMovement: (movementId: number | string, data: UpdateBalanceMovementPayload) =>
    apiRequest<BalanceMovement>('PATCH', `/api/balance-movements/${movementId}`, data),
  deleteMovement: (movementId: number | string) =>
    apiRequest<void>('DELETE', `/api/balance-movements/${movementId}`),
  allocateFromBankTransaction: (bankTxId: number | string, data: AllocateBankToBalancePayload) =>
    apiRequest<AllocateBankToBalanceResponse>(
      'POST',
      `/api/bank-transactions/${bankTxId}/allocate-balance`,
      data
    ),
};
