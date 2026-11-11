import api from '../lib/axios';

export interface ProfileEvidenceContract {
  version: number;
  formats: string[];
  purposes: string[];
  documentKinds: Record<string, string[]>;
  maxBytes: number;
  policies: Record<string, { state: string; revision?: number }>;
  // The handoff documents this array but no populated entry DTO. Do not infer
  // country/document fields from the separate Console policy value schema.
  acceptedInternationalIds: unknown[];
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
  contentValidatedAt: string | null;
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

export interface VerificationCasePersonRoute {
  path: string;
  route: 'nigerian' | 'international';
  country: string;
}

export interface VerificationCaseSubmission {
  expectedDraftVersion: number;
  operationKey: string;
  people: VerificationCasePersonRoute[];
  identityRoute?: 'nigerian' | 'international';
  identityCountry?: string;
  identityEvidence?: Array<{ purpose: string; evidenceId: string }>;
}

export interface VerificationCaseHistoryPage {
  events: Array<{ id: string; action: string; version: number; at: string; [key: string]: unknown }>;
  nextCursor: string | null;
}

// Section 02 uses `history`; the earlier chapter 19 response uses `events`.
// Keep the UI's internal page shape while supporting both documented envelopes.
const normalizeHistoryPage = (data: unknown): VerificationCaseHistoryPage => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Verification case history returned an unsupported response. Refresh to try again.');
  }
  const page = data as Record<string, unknown>;
  const events = 'history' in page ? page.history : page.events;
  if (!Array.isArray(events) || !events.every((event) => (
    event && typeof event === 'object' && typeof event.id === 'string' &&
    typeof event.action === 'string' && typeof event.at === 'string' &&
    typeof event.version === 'number' && Number.isInteger(event.version) && event.version >= 0
  )) || (page.nextCursor !== null && typeof page.nextCursor !== 'string')) {
    throw new Error('Verification case history returned an unsupported response. Refresh to try again.');
  }
  return { events, nextCursor: page.nextCursor as string | null };
};

export const verificationDecisionSources = [
  'original_document',
  'official_registry',
  'approved_provider',
] as const;

export type VerificationDecisionSource = (typeof verificationDecisionSources)[number];

export interface VerificationCaseCheck {
  field: string;
  source: VerificationDecisionSource;
  reference: string;
  expiresAt?: string;
  applicability?: 'required' | 'not_applicable';
  jurisdictionStateId?: string;
  issuerName?: string;
}

export interface VerificationCaseDecision {
  expectedVersion: number;
  decision: 'approved' | 'rejected';
  checks?: VerificationCaseCheck[];
  reasonCodes?: string[];
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

  async retryEvidence(id: string, body: { expectedVersion: number }, challengeId: string): Promise<ProfileEvidence> {
    const { data } = await api.post<ProfileEvidence>(
      `${holderBase}/onboarding/evidence/${encodeURIComponent(id)}/retry`,
      body,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },

  async deleteEvidence(id: string, body: { expectedVersion: number }, challengeId: string): Promise<ProfileEvidence> {
    const { data } = await api.delete<ProfileEvidence>(
      `${holderBase}/onboarding/evidence/${encodeURIComponent(id)}`,
      { data: body, headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },

  async listHolderCases(query: { limit?: number; before?: string; state?: string } = {}): Promise<VerificationCasePage> {
    const { data } = await api.get<VerificationCasePage>(`${holderBase}/verification-cases`, { params: query });
    return data;
  },

  async createHolderCase(body: VerificationCaseSubmission, challengeId: string): Promise<VerificationCase> {
    const { data } = await api.post<VerificationCase>(`${holderBase}/verification-cases`, body, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data;
  },

  async getHolderCase(id: string): Promise<VerificationCase> {
    const { data } = await api.get<VerificationCase>(`${holderBase}/verification-cases/${encodeURIComponent(id)}`);
    return data;
  },

  async holderHistory(id: string, before?: string): Promise<VerificationCaseHistoryPage> {
    const { data } = await api.get<unknown>(`${holderBase}/verification-cases/${encodeURIComponent(id)}/history`, { params: { limit: 25, ...(before ? { before } : {}) } });
    return normalizeHistoryPage(data);
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
    const { data } = await api.get<unknown>(`${adminBase}/${encodeURIComponent(id)}/history`, { params: { limit: 25, ...(before ? { before } : {}) } });
    return normalizeHistoryPage(data);
  },

  async staffEvidenceContent(caseId: string, evidenceId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`${adminBase}/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/content`, { responseType: 'blob' });
    return data;
  },

  async claimCase(id: string, body: { expectedVersion: number }, challengeId: string): Promise<VerificationCaseDetail> {
    const { data } = await api.post<VerificationCaseDetail>(`${adminBase}/${encodeURIComponent(id)}/claim`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async decideCase(id: string, body: VerificationCaseDecision, challengeId: string): Promise<VerificationCaseDetail> {
    const { data } = await api.post<VerificationCaseDetail>(`${adminBase}/${encodeURIComponent(id)}/decision`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },
};
