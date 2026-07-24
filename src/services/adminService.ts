import api from '../lib/axios';
import type {
  AdminStats,
  WalletSummary,
  WalletTransaction,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../types';

export interface WalletTransactionFilters {
  page?: number;
  limit?: number;
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
  from?: string;
  to?: string;
  property?: string;
  user?: string;
  reference?: string;
  paymentStatus?: string;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
}

export const adminService = {
  async fetchAdminStats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>('/admin/stats');
    return data;
  },

  async getWalletSummary(): Promise<WalletSummary> {
    const { data } = await api.get<WalletSummary>('/admin/wallet');
    return data;
  },

  async listWalletTransactions(filters: WalletTransactionFilters): Promise<WalletTransactionsResponse> {
    const { data } = await api.get<WalletTransactionsResponse>('/admin/wallet/transactions', { params: filters });
    return data;
  },
};
