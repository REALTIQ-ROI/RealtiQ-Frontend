import api from '../lib/axios';

export interface ProfileEvidenceContract {
  version: number;
  formats: string[];
  purposes: string[];
  documentKinds: Record<string, string[]>;
  maxBytes: number;
  policies: Record<string, { state: string; revision?: number }>;
  acceptedInternationalIds: string[];
  individualRoutes: Record<string, string[]>;
  serviceAreaSource: { state: string; endpoint?: string };
  subjects: { fixed: string[]; personFields: string[] };
}

export interface ProfileEvidence {
  id: string;
  profileId: string;
  purpose: string;
  subject: string;
  documentKind: string;
  version: number;
  previousEvidenceId: string | null;
  mimeType: string;
  size: number;
  state: string;
  errorCode: string | null;
  scannedAt: string | null;
  createdAt: string;
}

export interface VerificationCase {
  id: string;
  profileId: string;
  kind: string;
  structure: string;
  draftVersion: number;
  state: string;
  version: number;
  rejectionCodes: string[];
  submittedAt: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
}

export interface VerificationCaseDetail extends VerificationCase {
  reviewDeadlineState?: string;
  reviewDueAt?: string | null;
  escalationDueAt?: string | null;
  escalationEnqueuedAt?: string | null;
  snapshot?: unknown;
  requiredChecks?: unknown[];
  approvalBlockers?: unknown[];
}

export interface VerificationCasePage {
  cases: VerificationCase[];
  nextCursor: string | null;
}

export interface VerificationCaseHistoryPage {
  events: Array<{ id: string; action: string; version: number; at: string; [key: string]: unknown }>;
  nextCursor: string | null;
}

const holderBase = '/profiles/current';
const adminBase = '/admin/verification-cases';

export const verificationCaseService = {
  async getEvidenceContract(): Promise<ProfileEvidenceContract> {
    const { data } = await api.get<ProfileEvidenceContract>(`${holderBase}/onboarding/evidence/contract`);
    return data;
  },

  async listEvidence(query: { limit?: number; before?: string } = {}): Promise<{ evidence: ProfileEvidence[]; nextCursor: string | null }> {
    const { data } = await api.get<{ evidence: ProfileEvidence[]; nextCursor: string | null }>(`${holderBase}/onboarding/evidence`, { params: query });
    return data;
  },

  async uploadEvidence(form: FormData, challengeId: string): Promise<ProfileEvidence> {
    const { data } = await api.post<ProfileEvidence>(`${holderBase}/onboarding/evidence`, form, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async getEvidence(id: string): Promise<ProfileEvidence> {
    const { data } = await api.get<ProfileEvidence>(`${holderBase}/onboarding/evidence/${encodeURIComponent(id)}`);
    return data;
  },

  async getEvidenceContent(id: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`${holderBase}/onboarding/evidence/${encodeURIComponent(id)}/content`, { responseType: 'blob' });
    return data;
  },

  async listHolderCases(query: { limit?: number; before?: string; state?: string } = {}): Promise<VerificationCasePage> {
    const { data } = await api.get<VerificationCasePage>(`${holderBase}/verification-cases`, { params: query });
    return data;
  },

  async getHolderCase(id: string): Promise<VerificationCase> {
    const { data } = await api.get<VerificationCase>(`${holderBase}/verification-cases/${encodeURIComponent(id)}`);
    return data;
  },

  async holderHistory(id: string, before?: string): Promise<VerificationCaseHistoryPage> {
    const { data } = await api.get<VerificationCaseHistoryPage>(`${holderBase}/verification-cases/${encodeURIComponent(id)}/history`, { params: { limit: 25, ...(before ? { before } : {}) } });
    return data;
  },

  async withdrawCase(id: string, body: { expectedVersion: number; action: 'withdraw' }, challengeId: string): Promise<VerificationCase> {
    const { data } = await api.post<VerificationCase>(`${holderBase}/verification-cases/${encodeURIComponent(id)}/state`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async staffQueue(query: { limit?: number; state?: string; cursor?: string } = {}): Promise<VerificationCasePage> {
    const { data } = await api.get<VerificationCasePage>(adminBase, { params: query });
    return data;
  },

  async staffCase(id: string): Promise<VerificationCaseDetail> {
    const { data } = await api.get<VerificationCaseDetail>(`${adminBase}/${encodeURIComponent(id)}`);
    return data;
  },

  async staffHistory(id: string, before?: string): Promise<VerificationCaseHistoryPage> {
    const { data } = await api.get<VerificationCaseHistoryPage>(`${adminBase}/${encodeURIComponent(id)}/history`, { params: { limit: 25, ...(before ? { before } : {}) } });
    return data;
  },

  async staffEvidenceContent(caseId: string, evidenceId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`${adminBase}/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/content`, { responseType: 'blob' });
    return data;
  },

  async claimCase(id: string, body: { expectedVersion: number }, challengeId: string): Promise<VerificationCaseDetail> {
    const { data } = await api.post<VerificationCaseDetail>(`${adminBase}/${encodeURIComponent(id)}/claim`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async decideCase(id: string, body: { expectedVersion: number; decision: 'rejected'; reasonCodes: ['DOCUMENT_UNREADABLE'] }, challengeId: string): Promise<VerificationCaseDetail> {
    const { data } = await api.post<VerificationCaseDetail>(`${adminBase}/${encodeURIComponent(id)}/decision`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },
};
