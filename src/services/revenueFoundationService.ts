import api from '../lib/axios';
import type { RevenueCurrency } from '../utils/moneyMinor';
import type { RenewalAvailability } from './renewalAvailability';

const profileBase = '/profiles/current';
const stepUp = (challengeId: string) => ({ headers: { 'X-Step-Up-Challenge': challengeId } });
const resource = (id: string) => encodeURIComponent(id);

export interface FeeQuoteRequest {
  feeCode: string;
  currency: RevenueCurrency;
  baseMinor: number;
  quantity?: number;
  mode?: 'standard' | 'protected' | 'upfront' | 'deferred';
  payerRule?: 'buyer' | 'seller' | 'split';
  buyerSharePercent?: number;
}
export interface FeeQuote extends FeeQuoteRequest {
  scheduleRevision: number;
  stream: number;
  route: string;
  quantity: number;
  basis: string;
  netMinor: number;
  vatTreatment: string;
  vatMinor: number;
  grossMinor: number;
  payerAmounts: Partial<Record<'buyer' | 'seller', number>>;
  effectiveFrom: string;
  ratePercent?: number;
  bands?: Array<{ upToMinor: number | null; ratePercent: number }>;
}

export interface BillingTerm {
  period: 'monthly' | 'annual';
  amountMinor: number;
  currency: RevenueCurrency;
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  vatRatePercent: number;
  vatPolicyRevision: number;
}
export interface PublicationPlan {
  key: string;
  label: string;
  profileType: 'developer' | 'agency' | 'partner';
  terms: BillingTerm[];
  entitlements: { activeProjects: number; activeListings: number; units: number; includedSeats: number; promotionCreditsMinor: number };
  policyRevision: number;
}
export interface PublicationCatalogue {
  state: 'configured' | 'unconfigured' | 'unavailable';
  catalogueSource: 'unified';
  revision?: number;
  taxPolicyRevision?: number;
  currency?: RevenueCurrency;
  category?: 'developer' | 'agency' | 'partner';
  plans: PublicationPlan[];
  renewalAvailability?: RenewalAvailability;
  errorCode?: string;
}
export interface PublicationEntitlement {
  profileId: string;
  category: string;
  entitlement: Record<string, unknown> | null;
  usage: { activeProjects: number; activeListings: number; units: number; additionalSeats: number; includedHolderSeat: boolean };
  latest: Record<string, unknown> | null;
  publicationAllowedByPlan: boolean;
}
export interface PublicationPurchase {
  id: string;
  profileId: string;
  category: string;
  plan: { key: string; label: string; profileType: string; billingPeriod: 'monthly' | 'annual'; entitlements: PublicationPlan['entitlements']; amountMinor: number; netMinor?: number; vatMinor?: number; grossMinor?: number; currency: RevenueCurrency; policyRevision: number };
  reference: string;
  state: string;
  redirectUrl?: string | null;
  quoteId?: string | null;
  createdAt: string;
  paidAt?: string | null;
  fulfilledAt?: string | null;
}
export interface PublicationChangeQuote {
  id: string;
  changeType: 'upgrade';
  planKey: string;
  billingPeriod: 'monthly' | 'annual';
  currency: RevenueCurrency;
  currentRemainingMinor: number;
  targetRemainingMinor: number;
  amountDueMinor: number;
  vatMinor: number;
  grossDueMinor: number;
  vatRatePercent: number;
  vatPolicyRevision: number;
  periodEndsAt: string;
  policyRevision: number;
}
export interface PaymentAuthorization {
  id: string;
  provider: 'paystack';
  method: 'saved_card' | 'direct_debit';
  providerReference: string;
  card?: Record<string, unknown>;
  reusable: boolean;
  state: string;
  consentAt: string;
  lastUsedAt: string | null;
  createdAt: string;
}
export interface RenewalPreference {
  id: string;
  profileId: string;
  kind: 'publication_plan' | 'seat';
  targetKey: string;
  membershipId: string | null;
  category: string | null;
  planKey: string;
  billingPeriod: 'monthly' | 'annual';
  method: 'manual' | 'saved_card' | 'transfer_invoice' | 'direct_debit';
  authorizationId: string | null;
  autoRenew: boolean;
  state: string;
  suspensionCode: string | null;
  nextExecutionAt: string | null;
  lastAttemptId: string | null;
  lastAttempt: { id: string; state: string; errorCode: string | null; amountMinor: number; currency: RevenueCurrency; reference: string; paidAt: string | null } | null;
  version: number;
  updatedAt: string;
}
export interface RenewalPreferenceInput {
  kind: 'publication_plan' | 'seat';
  targetId: string;
  planKey: string;
  billingPeriod: 'monthly' | 'annual';
  method: RenewalPreference['method'];
  authorizationId?: string;
  autoRenew: boolean;
  expectedVersion: number;
}
export interface RevenueDocument {
  id: string;
  kind: 'invoice' | 'receipt' | 'credit_note';
  number: string;
  state: string;
  supplier: unknown;
  purchaser: unknown;
  paymentReference?: string;
  feeCode?: string;
  propertyId?: string;
  unitId?: string;
  currency: RevenueCurrency;
  netMinor: number;
  vatMinor: number;
  vatRatePercent: number;
  grossMinor: number;
  issuedAt: string;
  dueAt?: string | null;
  paidAt?: string | null;
  qrVerificationUrl?: string;
}
export interface PayoutSetupState {
  profileId: string;
  policy: { state: string; revision?: number; provider?: string; currency?: RevenueCurrency; defaultSplitPercentage?: number; approvedUntil?: string; errorCode?: string };
  providerActivation: { available: boolean; errorCode?: string };
  setup: null | { id: string; version: number; state: string; current: boolean; provider: string; currency: RevenueCurrency; bankName: string; maskedAccountNumber: string; verifiedAccountName?: string; accountNameMatched: boolean; splitSettlementReady: boolean; failureCode?: string | null };
  ready: boolean;
}
export interface PayoutSetupRecord extends NonNullable<PayoutSetupState['setup']> {
  profileId?: string;
  bankCode?: string;
  splitPercentage?: number;
  policyRevision?: number;
  approvedUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const revenueFoundationService = {
  async quoteFee(body: FeeQuoteRequest): Promise<FeeQuote> {
    const { data } = await api.post<{ quote: FeeQuote }>('/payments/fee-quotes', body);
    return data.quote;
  },
  async listPublicationPlans(): Promise<PublicationCatalogue> {
    const { data } = await api.get<PublicationCatalogue>(`${profileBase}/publication-plans`);
    return data;
  },
  async getPublicationPlan(): Promise<PublicationEntitlement> {
    const { data } = await api.get<PublicationEntitlement>(`${profileBase}/publication-plan`);
    return data;
  },
  async listPublicationPurchases(params: { before?: string; limit?: number } = {}): Promise<{ purchases: PublicationPurchase[]; nextCursor: string | null }> {
    const { data } = await api.get<{ purchases: PublicationPurchase[]; nextCursor: string | null }>(`${profileBase}/publication-plan-purchases`, { params });
    return data;
  },
  async getPublicationPurchase(id: string): Promise<PublicationPurchase> {
    const { data } = await api.get<PublicationPurchase | { purchase: PublicationPurchase }>(`${profileBase}/publication-plan-purchases/${resource(id)}`);
    return 'purchase' in data ? data.purchase : data;
  },
  async listPublicationPurchaseAudit(id: string, params: { before?: string; limit?: number } = {}): Promise<{ events: Array<Record<string, unknown>>; nextCursor: string | null }> {
    const { data } = await api.get<{ events: Array<Record<string, unknown>>; nextCursor: string | null }>(`${profileBase}/publication-plan-purchases/${resource(id)}/audit`, { params });
    return data;
  },
  async quotePublicationChange(body: { planKey: string; billingPeriod: 'monthly' | 'annual'; operationKey: string }): Promise<PublicationChangeQuote> {
    const { data } = await api.post<{ quote: PublicationChangeQuote }>(`${profileBase}/publication-plan-change-quotes`, body);
    return data.quote;
  },
  async purchasePublicationPlan(body: { planKey: string; billingPeriod: 'monthly' | 'annual'; operationKey: string; quoteId?: string; saveAuthorizationForRenewal?: boolean }, challengeId: string): Promise<PublicationPurchase> {
    const { data } = await api.post<{ purchase: PublicationPurchase }>(`${profileBase}/publication-plan-purchases`, body, stepUp(challengeId));
    return data.purchase;
  },
  async cancelPublicationPurchase(id: string, challengeId: string): Promise<PublicationPurchase> {
    const { data } = await api.post<{ purchase: PublicationPurchase }>(`${profileBase}/publication-plan-purchases/${resource(id)}/cancel`, {}, stepUp(challengeId));
    return data.purchase;
  },
  async reconcilePublicationPurchase(id: string, challengeId: string): Promise<PublicationPurchase> {
    const { data } = await api.post<{ purchase: PublicationPurchase }>(`${profileBase}/publication-plan-purchases/${resource(id)}/reconcile`, {}, stepUp(challengeId));
    return data.purchase;
  },
  async listPaymentAuthorizations(): Promise<PaymentAuthorization[]> {
    const { data } = await api.get<{ authorizations: PaymentAuthorization[] }>(`${profileBase}/billing/payment-authorizations`);
    return data.authorizations;
  },
  async startDirectDebit(body: { operationKey: string; consent: true }, challengeId: string): Promise<{ authorization: PaymentAuthorization; redirectUrl: string | null; pending?: boolean }> {
    const { data } = await api.post<{ authorization: PaymentAuthorization; redirectUrl: string | null; pending?: boolean }>(`${profileBase}/billing/payment-authorizations/direct-debit`, body, stepUp(challengeId));
    return data;
  },
  async revokePaymentAuthorization(id: string, challengeId: string): Promise<PaymentAuthorization> {
    const { data } = await api.post<{ authorization: PaymentAuthorization }>(`${profileBase}/billing/payment-authorizations/${resource(id)}/revoke`, {}, stepUp(challengeId));
    return data.authorization;
  },
  async listRenewalPreferences(): Promise<RenewalPreference[]> {
    const { data } = await api.get<{ preferences: RenewalPreference[] }>(`${profileBase}/billing/renewal-preferences`);
    return data.preferences;
  },
  async saveRenewalPreference(body: RenewalPreferenceInput, challengeId: string): Promise<RenewalPreference> {
    const { data } = await api.put<{ preference: RenewalPreference }>(`${profileBase}/billing/renewal-preferences`, body, stepUp(challengeId));
    return data.preference;
  },
  async disableRenewalPreference(id: string, challengeId: string): Promise<RenewalPreference> {
    const { data } = await api.post<{ preference: RenewalPreference }>(`${profileBase}/billing/renewal-preferences/${resource(id)}/disable`, {}, stepUp(challengeId));
    return data.preference;
  },
  async listRevenueDocuments(params: { before?: string; limit?: number } = {}): Promise<{ documents: RevenueDocument[]; nextCursor: string | null }> {
    const { data } = await api.get<{ documents: RevenueDocument[]; nextCursor: string | null }>('/revenue-documents', { params });
    return data;
  },
  async getRevenueDocument(id: string): Promise<RevenueDocument> {
    const { data } = await api.get<{ document: RevenueDocument }>(`/revenue-documents/${resource(id)}`);
    return data.document;
  },
  async payRevenueDocument(id: string, body: { operationKey: string }, challengeId: string): Promise<{ id: string; reference: string; state: string; redirectUrl: string | null }> {
    const { data } = await api.post<{ payment: { id: string; reference: string; state: string; redirectUrl: string | null } }>(`/revenue-documents/${resource(id)}/pay`, body, stepUp(challengeId));
    return data.payment;
  },
  async getPayoutSetup(): Promise<PayoutSetupState> {
    const { data } = await api.get<PayoutSetupState>(`${profileBase}/payout-setup`);
    return data;
  },
  async getPayoutSetupHistory(params: { before?: string; limit?: number } = {}): Promise<{ events: Array<{ id: string; setupId: string; version: number; action: string; code: string | null; actorId: string; at: string }>; nextCursor: string | null }> {
    const { data } = await api.get<Awaited<ReturnType<typeof revenueFoundationService.getPayoutSetupHistory>>>(`${profileBase}/payout-setup/history`, { params });
    return data;
  },
  async startPayoutSetup(body: { expectedVersion: number; operationKey: string; bankCode: string; accountNumber: string }, challengeId: string): Promise<PayoutSetupRecord> {
    const { data } = await api.post<PayoutSetupRecord>(`${profileBase}/payout-setup`, body, stepUp(challengeId));
    return data;
  },
  async reconcilePayoutSetup(id: string, challengeId: string): Promise<PayoutSetupRecord> {
    const { data } = await api.post<PayoutSetupRecord>(`${profileBase}/payout-setup/${resource(id)}/reconcile`, {}, stepUp(challengeId));
    return data;
  },
  async revokePayoutSetup(body: { expectedVersion: number; reasonCode: string }, challengeId: string): Promise<PayoutSetupRecord> {
    const { data } = await api.post<PayoutSetupRecord>(`${profileBase}/payout-setup/revoke`, body, stepUp(challengeId));
    return data;
  },
};
