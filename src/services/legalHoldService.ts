import api from '../lib/axios';

export type LegalHoldSubjectKind = 'account' | 'profile' | 'financial_transaction' | 'escrow' | 'dispute' | 'investigation' | 'property' | 'ownership' | 'title_document' | 'kyc_evidence' | 'regulatory_record' | 'litigation_record';
export type LegalHoldCategory = 'account_profile' | 'financial_transaction_escrow' | 'dispute_investigation' | 'property_ownership_title' | 'kyc_identity_evidence' | 'regulatory_litigation';
export type LegalHoldReasonCode = 'regulatory_preservation' | 'litigation_preservation' | 'investigation' | 'dispute' | 'ownership_claim' | 'identity_review' | 'financial_review' | 'other_authorized_basis';
export type LegalHoldReleaseReason = 'resolved' | 'authority_withdrawn' | 'superseded' | 'court_or_regulator_release';

export interface LegalHold {
  id: string;
  subjectKind: LegalHoldSubjectKind;
  subjectId: string;
  holderId: string | null;
  profileId: string | null;
  category: LegalHoldCategory;
  reasonCode: LegalHoldReasonCode;
  issuer: string;
  createdAt: string;
  expiresAt: string | null;
  reviewAt: string | null;
  state: 'active' | 'released';
  releaseActor: string | null;
  releaseReasonCode: LegalHoldReleaseReason | null;
  releasedAt: string | null;
  version: number;
}

export interface LegalHoldCreateInput {
  subjectKind: LegalHoldSubjectKind;
  subjectId: string;
  category: LegalHoldCategory;
  reasonCode: LegalHoldReasonCode;
  operationKey: string;
  expiresAt?: string;
  reviewAt?: string;
}

export const legalHoldService = {
  async list(query: { before?: string; limit?: number; state?: 'active' | 'released'; subjectKind?: LegalHoldSubjectKind } = {}) {
    return (await api.get<{ holds: LegalHold[]; nextCursor: string | null }>('/admin/legal-holds', { params: query })).data;
  },
  async get(id: string) {
    return (await api.get<{ hold: LegalHold }>(`/admin/legal-holds/${encodeURIComponent(id)}`)).data.hold;
  },
  async create(body: LegalHoldCreateInput, challengeId: string) {
    return (await api.post<{ hold: LegalHold }>('/admin/legal-holds', body, { headers: { 'X-Step-Up-Challenge': challengeId } })).data.hold;
  },
  async release(id: string, body: { expectedVersion: number; reasonCode: LegalHoldReleaseReason }, challengeId: string) {
    return (await api.post<{ hold: LegalHold }>(`/admin/legal-holds/${encodeURIComponent(id)}/release`, body, { headers: { 'X-Step-Up-Challenge': challengeId } })).data.hold;
  },
};
