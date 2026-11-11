import api from '../lib/axios';
import type { RevenueCurrency } from '../utils/moneyMinor';

const base = '/admin/revenue';
const protectedRequest = (challengeId: string) => ({ headers: { 'X-Step-Up-Challenge': challengeId } });
export interface RevenueRange { from: string; to: string }
export interface RevenueFeeLine {
  id: string;
  feeCode: string;
  currency: RevenueCurrency;
  status: string;
  settlementStatus: string;
  grossMinor: number;
  netMinor: number;
  vatMinor: number;
  collected?: boolean;
  paymentReference?: string;
  createdAt?: string;
}
export interface RevenueReport {
  from: string; to: string;
  earned: Array<{ _id: { year: number; month: number; feeCode: string; stream: number; state: string; currency: RevenueCurrency }; feeLines: number; chargedGrossMinor: number; chargedNetMinor: number; chargedVatMinor: number; refundedOrCreditedGrossMinor: number; netAfterAdjustmentsMinor: number; vatAfterAdjustmentsMinor: number; grossAfterAdjustmentsMinor: number }>;
  payerAmounts: Array<{ _id: { year: number; month: number; feeCode: string; stream: number; currency: RevenueCurrency; payer: string; profileType: string; profileStructure: string }; amountMinor: number }>;
  providerCharges: Array<{ _id: { year: number; month: number; currency: RevenueCurrency }; reconciledPayments: number; grossMinor: number; settlementMinor: number; providerChargesMinor: number }>;
  receivables: { deferredFees: Array<{ _id: { feeCode: string; currency: RevenueCurrency; payerType: string; profileType: string }; receivableLines: number; amountMinor: number }>; defaultingSellerFeeRecoveries: Array<{ _id: { currency: RevenueCurrency; state: string }; receivables: number; originalMinor: number; recoveredMinor: number; outstandingMinor: number }> };
  revenueRecognition: unknown;
  adjustmentCoverage: string;
  providerSettlementReconciliation: string;
}
export interface ProductRefund {
  id: string; batchId?: string; productKind: string; sourceType: string; sourceId: string;
  campaignId?: string; sourceEntryId?: string; profileId: string; checkoutId?: string; checkoutItemId?: string; feeLineId?: string;
  currency: RevenueCurrency; netAmountMinor: number; budgetAmountMinor?: number; vatAmountMinor: number; refundAmountMinor: number;
  state: string; providerStatus?: string; providerRefundReference?: string; creditNoteId?: string | null; reason?: string;
  events?: Array<{ state: string; code?: string; reason?: string; at: string }>;
  version: number; createdAt: string; updatedAt: string;
}
export interface ProviderSettlementLine {
  id: string;
  provider: string;
  settlementReference: string;
  paymentId: string;
  paymentReference: string;
  providerTransactionReference: string;
  currency: RevenueCurrency;
  grossMinor: number;
  settlementMinor: number;
  providerChargesMinor: number;
  reconciledAt: string;
}

export interface ProviderSettlementEvent {
  id: string;
  provider: 'monnify';
  eventType: string;
  settlementReference: string;
  state: 'received' | 'verified' | 'applied' | 'held' | 'rejected';
  reconcilable: boolean;
  reconciliationCode: string | null;
  attempts: number;
  receivedAt: string;
  verifiedAt: string | null;
  appliedAt: string | null;
  details: {
    currency?: RevenueCurrency;
    amountMinor?: number;
    transactionCount?: number;
    paymentReferences?: string[];
    reconciliation?: {
      checkedAt: string;
      providerTransactionCount: number;
      matchedInternalPayments: number;
      providerGrossMinor: number;
      providerSettlementMinor: number;
      providerChargesMinor: number;
      discrepancyCount: number;
      discrepancies: Array<{ paymentReference?: string; code: string }>;
      beneficiarySettlement: 'unconfirmed';
    };
  };
}

export interface ProviderSettlementReconciliation {
  id: string;
  settlementReference: string;
  state: 'verified' | 'held';
  providerTransactionCount: number;
  matchedInternalPayments: number;
  providerGrossMinor: number;
  providerSettlementMinor: number;
  providerChargesMinor: number;
  discrepancyCount: number;
  discrepancies: Array<{ paymentReference?: string; code: string }>;
  beneficiarySettlement: 'unconfirmed';
  note: string;
  profileId: string;
}

export const financeRevenueService = {
  async getProviderSettlementEvents(params: RevenueRange & { after?: string; limit?: number }): Promise<{ settlements: ProviderSettlementEvent[]; nextCursor: string | null }> {
    const { data } = await api.get<{ settlements: ProviderSettlementEvent[]; nextCursor: string | null }>(`${base}/provider-settlements`, { params });
    return data;
  },
  async reconcileProviderSettlementEvent(id: string, challengeId: string): Promise<ProviderSettlementReconciliation> {
    const { data } = await api.post<ProviderSettlementReconciliation>(`${base}/provider-settlements/${encodeURIComponent(id)}/reconcile`, {}, protectedRequest(challengeId));
    return data;
  },
  async getFeeLines(params: RevenueRange & { feeCode?: string; currency?: RevenueCurrency; status?: string; limit?: number; after?: string }): Promise<{ feeLines: RevenueFeeLine[]; nextCursor: string | null }> {
    const { data } = await api.get<{ feeLines: RevenueFeeLine[]; nextCursor: string | null }>(`${base}/fee-lines`, { params });
    return data;
  },
  async getReport(range: RevenueRange): Promise<RevenueReport> {
    const { data } = await api.get<RevenueReport>(`${base}/report`, { params: range });
    return data;
  },
  async getReconciliation(range: RevenueRange): Promise<{ from: string; to: string; feeLines: Array<{ currency: RevenueCurrency; status: string; settlementStatus: string; count: number; grossMinor: number; netMinor: number; vatMinor: number }>; paymentsMissingFeeLines: number; providerSettlementReconciliation: string; providerSettlementsPending?: number }> {
    const { data } = await api.get<Awaited<ReturnType<typeof financeRevenueService.getReconciliation>>>(`${base}/reconciliation`, { params: range });
    return data;
  },
  async listProductRefunds(params: { state?: string; after?: string; limit?: number } = {}): Promise<{ refunds: ProductRefund[]; nextCursor: string | null; staffProfileId: string }> {
    const { data } = await api.get<{ refunds: ProductRefund[]; nextCursor: string | null; staffProfileId: string }>(`${base}/product-refunds`, { params });
    return data;
  },
  async decideProductRefund(id: string, body: { decision: 'approve' | 'reject'; reason: string; expectedVersion: number }, challengeId: string): Promise<{ refund?: ProductRefund; refunds?: ProductRefund[]; decision?: string }> {
    const { data } = await api.post<{ refund?: ProductRefund; refunds?: ProductRefund[]; decision?: string }>(`${base}/product-refunds/${encodeURIComponent(id)}/decision`, body, protectedRequest(challengeId));
    return data;
  },
  async reconcileProductRefunds(body: { limit?: number }, challengeId: string): Promise<{ checked: number; completed: number; pending: number; held: number }> {
    const { data } = await api.post<{ checked: number; completed: number; pending: number; held: number }>(`${base}/product-refunds/reconcile`, body, protectedRequest(challengeId));
    return data;
  },
  async reconcileRevenueDocuments(body: { limit?: number }, challengeId: string): Promise<{ checked: number; issued: number; held: number }> {
    const { data } = await api.post<{ checked: number; issued: number; held: number }>(`${base}/documents/reconcile`, body, protectedRequest(challengeId));
    return data;
  },
  async getProviderSettlementLines(params: RevenueRange & { currency?: RevenueCurrency; limit?: number; before?: string }): Promise<{ settlements: ProviderSettlementLine[]; nextCursor: string | null; reconciliationScope: string }> {
    const { data } = await api.get<Awaited<ReturnType<typeof financeRevenueService.getProviderSettlementLines>>>(`${base}/provider-settlement-lines`, { params });
    return data;
  },
};
