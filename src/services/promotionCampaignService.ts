import api from '../lib/axios';

export interface PromotionCampaign {
  id: string;
  profileId: string;
  propertyId: string;
  placementId: string;
  billingEvent: 'click' | 'enquiry';
  currency: 'NGN' | 'USD';
  bidMinor: number;
  state: string;
  balanceMinor: number | null;
  totalFundedMinor: number | null;
  totalSpentMinor: number | null;
  refundPendingMinor: number | null;
  pauseCode: string | null;
  version: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionEntry {
  id: string;
  campaignId: string;
  kind: string;
  event: string | null;
  amountMinor: number | null;
  budgetMinor: number | null;
  remainingMinor: number | null;
  vatMinor: number | null;
  currency: 'NGN' | 'USD';
  state: string;
  documentsState: string | null;
  recognitionState: string | null;
  occurredAt: string;
  payment?: { id: string; reference: string; state: string; redirectUrl: string | null; reconciliationRequired?: boolean } | null;
}

export interface PromotionFundingResult {
  campaign: PromotionCampaign;
  funding: PromotionEntry;
  payment: { id: string; reference: string; state: string; redirectUrl: string | null; reconciliationRequired?: boolean; errorCode?: string | null };
  idempotent: boolean;
}

export interface EligibleCampaignPlacements {
  state: 'ready' | 'policy_unconfigured' | 'provider_unavailable';
  property?: { id: string; publicReference: string; title: string };
  placements: Array<{ placementId: string; label: string }>;
  billingEvents?: Array<'click' | 'enquiry'>;
  currencyRules: Array<{ currency: 'NGN' | 'USD'; minimumBidMinor: number; state: 'available' | 'unavailable'; reasonCode: string | null }>;
  initialBudgetMinor?: { minimum: number; maximum: number; unit: 'minor'; integerOnly: boolean; additionalLimit: string };
  providerAvailability: { state: 'available' | 'unavailable'; reasonCode: string | null };
  policyRevisions?: { sponsoredPlacements: number; campaignControls: number; revenueTax: number };
  reasonCode?: string;
}

const base = '/profiles/current/promotion-campaigns';
const idPath = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const promotionCampaignService = {
  async eligiblePlacements(propertyId: string): Promise<EligibleCampaignPlacements> {
    const { data } = await api.get<EligibleCampaignPlacements>(`${base}/eligible-placements`, { params: { propertyId } });
    return data;
  },
  async list(params: { state?: string; after?: string; limit?: number } = {}): Promise<{ campaigns: PromotionCampaign[]; nextCursor: string | null }> {
    const { data } = await api.get<{ campaigns: PromotionCampaign[]; nextCursor: string | null }>(base, { params });
    return data;
  },
  async get(id: string): Promise<{ campaign: PromotionCampaign; entries: PromotionEntry[] }> {
    const { data } = await api.get<{ campaign: PromotionCampaign; entries: PromotionEntry[] }>(idPath(id));
    return data;
  },
  async ledger(id: string, params: { before?: string; limit?: number } = {}): Promise<{ entries: PromotionEntry[]; nextCursor: string | null }> {
    const { data } = await api.get<{ entries: PromotionEntry[]; nextCursor: string | null }>(`${idPath(id)}/ledger`, { params });
    return data;
  },
  async create(body: { propertyId: string; placementId: string; billingEvent: 'click' | 'enquiry'; currency: 'NGN' | 'USD'; bidMinor: number; initialBudgetMinor: number; operationKey: string }, challengeId: string): Promise<PromotionFundingResult> {
    const { data } = await api.post<PromotionFundingResult>(base, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },
  async topUp(id: string, body: { budgetMinor: number; operationKey: string }, challengeId: string): Promise<PromotionFundingResult> {
    const { data } = await api.post<PromotionFundingResult>(`${idPath(id)}/top-ups`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },
  async end(id: string, body: { disposition: 'refund' | 'transfer'; targetCampaignId?: string; operationKey: string; expectedVersion: number }, challengeId: string): Promise<{ campaign: PromotionCampaign; refunds: Array<{ id: string; state: string }>; requiresIndependentApproval: boolean; idempotent: boolean; transfer?: unknown }> {
    const { data } = await api.post<{ campaign: PromotionCampaign; refunds: Array<{ id: string; state: string }>; requiresIndependentApproval: boolean; idempotent: boolean; transfer?: unknown }>(`${idPath(id)}/end`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },
};
