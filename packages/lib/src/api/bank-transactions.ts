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
  created_at: string;
  updated_at: string;
}

export const bankTransactionsApi = {
  getAll: (params?: PaginationParams & {
    integration_id?: string;
    from_date?: string;
    to_date?: string;
    reconciled?: 'true' | 'false';
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.integration_id) searchParams.append('integration_id', params.integration_id);
    if (params?.from_date) searchParams.append('from_date', params.from_date);
    if (params?.to_date) searchParams.append('to_date', params.to_date);
    if (params?.reconciled) searchParams.append('reconciled', params.reconciled);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<BankTransaction>>('GET', `/api/bank-transactions${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<BankTransaction>('GET', `/api/bank-transactions/${id}`),
  reconcile: (id: string, reconciled_entity_type: string | null, reconciled_entity_id: number | null) =>
    apiRequest<BankTransaction>('PATCH', `/api/bank-transactions/${id}`, {
      reconciled_entity_type,
      reconciled_entity_id,
    }),
};
