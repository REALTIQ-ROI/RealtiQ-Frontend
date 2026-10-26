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
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'canceled';
  from?: string;
  to?: string;
  property?: string;
  user?: string;
  reference?: string;
  inspector?: string;
  inspectionRequest?: string;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Validate the documented wallet summary while preserving its optional breakdown value. */
export const parseWalletSummary = (value: unknown): WalletSummary => {
  if (!isRecord(value) || !isRecord(value.breakdown)) {
    throw new Error('The platform wallet response is not available in a supported format.');
  }
  const breakdown = value.breakdown;

  const requiredAmounts = ['totalCredits', 'totalDebits', 'netRevenue', 'availableRevenue'];
  const requiredBreakdownAmounts = ['titleDocumentViews', 'tourPayments', 'other', 'refunds'];
  if (
    !requiredAmounts.every((field) => isFiniteNumber(value[field])) ||
    !Number.isInteger(value.transactionCount) ||
    (value.transactionCount as number) < 0 ||
    !requiredBreakdownAmounts.every((field) => isFiniteNumber(breakdown[field])) ||
    (breakdown.proxyInspectionRevenue !== undefined && !isFiniteNumber(breakdown.proxyInspectionRevenue))
  ) {
    throw new Error('The platform wallet response is missing documented numeric values.');
  }

  return value as unknown as WalletSummary;
};

/** Validate the endpoint-specific, allowlisted transaction projection and its pagination envelope. */
export const parseWalletTransactionsResponse = (value: unknown): WalletTransactionsResponse => {
  const transactionTypes: WalletTransactionType[] = [
    'title_document_view', 'tour_payment', 'platform_fee', 'proxy_inspection_commission',
    'proxy_inspection_buyer_fee', 'proxy_inspection_refund', 'property_analytics_access', 'other',
  ];
  const statuses: WalletTransactionStatus[] = ['pending', 'completed', 'reversed', 'refunded'];
  if (!isRecord(value) || !Array.isArray(value.transactions)) {
    throw new Error('The platform transaction response is not available in a supported format.');
  }

  const validTransactions = value.transactions.every((item) =>
    isRecord(item) &&
    typeof item.id === 'string' && item.id.length > 0 &&
    typeof item.type === 'string' && transactionTypes.includes(item.type as WalletTransactionType) &&
    (item.direction === 'credit' || item.direction === 'debit') &&
    isFiniteNumber(item.amount) &&
    typeof item.paymentReference === 'string' &&
    typeof item.status === 'string' && statuses.includes(item.status as WalletTransactionStatus) &&
    typeof item.createdAt === 'string' && typeof item.updatedAt === 'string' &&
    (item.propertyReference === undefined || typeof item.propertyReference === 'string'),
  );
  if (
    !validTransactions ||
    !Number.isInteger(value.total) || (value.total as number) < 0 ||
    !Number.isInteger(value.page) || (value.page as number) < 1 ||
    !Number.isInteger(value.limit) || (value.limit as number) < 1
  ) {
    throw new Error('The platform transaction response contains invalid documented fields.');
  }

  return value as unknown as WalletTransactionsResponse;
};

export const adminService = {
  async fetchAdminStats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>('/admin/stats');
    return data;
  },

  async getWalletSummary(): Promise<WalletSummary> {
    const { data } = await api.get<WalletSummary>('/admin/wallet');
    return parseWalletSummary(data);
  },

  async listWalletTransactions(filters: WalletTransactionFilters): Promise<WalletTransactionsResponse> {
    const { data } = await api.get<WalletTransactionsResponse>('/admin/wallet/transactions', { params: filters });
    return parseWalletTransactionsResponse(data);
  },
};
