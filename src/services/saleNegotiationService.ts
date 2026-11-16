import api from '../lib/axios';

export type SalePaymentType = 'Outright Purchase' | 'Instalment Plan' | 'Mortgage Accepted';
export type SaleFeePayer = 'buyer' | 'seller' | 'split';

export interface SaleProposalScheduleItem {
  amountMinor: number;
  dueAt: string;
}

export interface SaleEscrowCondition {
  type: string;
  description: string;
  required: boolean;
  scope: 'unit' | 'transaction' | 'shared_milestone';
  visibleToProfiles: string[];
  sharedMilestoneKey?: string;
}

export interface SaleProposalTerms {
  priceMinor: number;
  currency: string;
  paymentType: SalePaymentType;
  initialPaymentMinor?: number;
  schedule?: SaleProposalScheduleItem[];
  escrowAmountMinor?: number;
  escrowConditions?: SaleEscrowCondition[];
  feePayer?: SaleFeePayer;
  buyerSharePercent?: number;
  refundTerms?: string | null;
  cancellationTerms?: string | null;
  latePaymentTerms?: string | null;
  defaultTerms?: string | null;
}

export interface SaleProposalItem {
  propertyId: string;
  terms: SaleProposalTerms;
}

export interface SaleProposal {
  id: string;
  revision: number;
  state: string;
  proposerProfileId: string;
  items: SaleProposalItem[];
  acceptances: Array<string | { profileId?: string; acceptedByProfileId?: string; acceptedAt?: string }>;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleTermsVersion {
  id?: string;
  versionId?: string;
  termsVersionId?: string;
  version?: number;
  acceptedAt?: string;
  items?: SaleProposalItem[];
  [key: string]: unknown;
}

export interface SaleNegotiation {
  id: string;
  conversationId?: string;
  buyerProfileId: string;
  sellerProfileId: string;
  projectId?: string | null;
  propertyIds: string[];
  requestedUnitTypes?: Array<{ unitTypeId: string; quantity: number; [key: string]: unknown }>;
  allocatedUnitTypes?: boolean;
  status: string;
  version: number;
  currentProposal: SaleProposal | null;
  currentTermsVersion: SaleTermsVersion | null;
  termsHistory: SaleTermsVersion[];
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  [key: string]: unknown;
}

export interface SaleNegotiationList {
  negotiations: SaleNegotiation[];
  pageInfo: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface SaleCheckout {
  id: string;
  negotiationId: string;
  termsVersionId: string;
  paymentId?: string;
  reference: string;
  state: 'reserved' | 'initializing' | 'outcome_unknown' | 'initialized' | 'paid' | 'reversed_held' | 'failed' | 'cancelled' | string;
  currency: string;
  amountMinor: number;
  totalPrincipalMinor: number;
  totalBuyerFeeMinor: number;
  totalSellerFeeMinor: number;
  redirectUrl?: string | null;
  allocations: Array<{
    propertyId: string;
    unitIdentifier?: string | null;
    duePrincipalMinor: number;
    buyerFeeMinor: number;
    sellerFeeMinor: number;
    protectedMinor: number;
  }>;
  providerStateAt?: string | null;
  fulfilledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleCheckoutInitialization {
  checkout?: SaleCheckout;
  reused?: boolean;
  reference?: string;
  reconciliationRequired?: boolean;
  state?: string;
}

export interface SaleReceipt {
  id: string;
  checkoutId: string;
  paymentId: string;
  propertyId: string | null;
  kind: 'unit' | 'summary';
  receiptNumber: string;
  currency: string;
  allocatedPrincipalMinor: number;
  allocatedBuyerFeeMinor: number;
  allocatedTotalMinor: number;
  sourcePaymentReference: string;
  issuedAt: string;
}

export interface SaleUnitDrop {
  expectedVersion: number;
  propertyId?: string;
  unitTypeId?: string;
  operationKey: string;
  reason: string;
}

export const saleNegotiationService = {
  async create(body: { propertyIds: string[] } | { projectId: string; unitTypeQuantities: Array<{ unitTypeId: string; quantity: number }> }): Promise<SaleNegotiation> {
    const { data } = await api.post<SaleNegotiation>('/sale-negotiations', body);
    return data;
  },

  async list(params: { limit?: number; after?: string; status?: string } = {}): Promise<SaleNegotiationList> {
    const { data } = await api.get<SaleNegotiationList>('/sale-negotiations', { params, headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async get(id: string): Promise<SaleNegotiation> {
    const { data } = await api.get<SaleNegotiation>(`/sale-negotiations/${encodeURIComponent(id)}`, { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async allocate(id: string, body: { expectedVersion: number; allocations: Array<{ unitTypeId: string; propertyIds: string[] }> }, challengeId: string): Promise<SaleNegotiation> {
    const { data } = await api.post<SaleNegotiation>(`/sale-negotiations/${encodeURIComponent(id)}/allocations`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async propose(id: string, body: { expectedVersion: number; bundleDiscountClause?: string; items: SaleProposalItem[] }, challengeId: string): Promise<SaleNegotiation> {
    const { data } = await api.post<SaleNegotiation>(`/sale-negotiations/${encodeURIComponent(id)}/proposals`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async accept(id: string, body: { expectedVersion: number; proposalId: string }, challengeId: string): Promise<SaleNegotiation> {
    const { data } = await api.post<SaleNegotiation>(`/sale-negotiations/${encodeURIComponent(id)}/proposals/accept`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async reject(id: string, body: { expectedVersion: number; proposalId: string; reason: string }, challengeId: string): Promise<SaleNegotiation> {
    const { data } = await api.post<SaleNegotiation>(`/sale-negotiations/${encodeURIComponent(id)}/proposals/reject`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async checkout(id: string, termsVersionId: string, body: { idempotencyKey: string }, challengeId: string): Promise<SaleCheckoutInitialization> {
    const { data } = await api.post<SaleCheckoutInitialization>(`/sale-negotiations/${encodeURIComponent(id)}/terms/${encodeURIComponent(termsVersionId)}/checkout`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async getCheckout(id: string): Promise<SaleCheckout | null> {
    const { data } = await api.get<{ checkout: SaleCheckout | null }>(`/sale-negotiations/${encodeURIComponent(id)}/checkout`, { headers: { 'Cache-Control': 'no-store' } });
    return data.checkout;
  },

  async getReceipts(id: string): Promise<SaleReceipt[]> {
    const { data } = await api.get<{ receipts: SaleReceipt[] }>(`/sale-negotiations/${encodeURIComponent(id)}/receipts`, { headers: { 'Cache-Control': 'no-store' } });
    return data.receipts;
  },

  async dropUnit(id: string, body: SaleUnitDrop, challengeId: string): Promise<Record<string, unknown>> {
    const { data } = await api.post<Record<string, unknown>>(`/sale-negotiations/${encodeURIComponent(id)}/unit-drops`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },
};
