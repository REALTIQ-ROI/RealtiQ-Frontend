import api from '../lib/axios';
import type {
  PropertyTitleVerificationSummary,
  PublicRegistryRecord,
  RegistryDocumentMatchResult,
  RegistryIntegrity,
  RegistryPublicKey,
  RegistrySnapshot,
  RegistrySnapshotManifest,
  TitleDocumentType,
  TitleRiskFlag,
  TitleVerification,
  TitleVerificationLog,
  TitleVerificationStatus,
} from '../types';

export interface SubmitTitleVerificationInput {
  propertyId: string;
  documentId: string;
  documentType: TitleDocumentType;
  metadata?: Record<string, unknown>;
}

export interface ListTitleVerificationsParams {
  status?: TitleVerificationStatus | 'all';
  propertyId?: string;
  limit?: number;
}

export interface ReviewTitleVerificationInput {
  decision: 'approve' | 'reject';
  reviewNotes?: string;
  rejectionReason?: string;
}

export interface SubmitTitleVerificationResponse {
  existing: boolean;
  verification: TitleVerification;
}

export interface TitleVerificationDetailsResponse {
  verification: TitleVerification;
  logs?: TitleVerificationLog[];
}

export interface TitleVerificationConflictDetails {
  verificationId?: string;
  riskFlags?: TitleRiskFlag[];
}

export const titleVerificationService = {
  async submitTitleVerification(input: SubmitTitleVerificationInput): Promise<SubmitTitleVerificationResponse> {
    const { data } = await api.post<SubmitTitleVerificationResponse>('/title-verifications', input);
    return data;
  },

  async listTitleVerifications(params?: ListTitleVerificationsParams): Promise<{ verifications: TitleVerification[] }> {
    const cleanParams = { ...params };
    if (cleanParams.status === 'all') delete cleanParams.status;
    const { data } = await api.get<{ verifications: TitleVerification[] }>('/title-verifications', {
      params: cleanParams,
    });
    return data;
  },

  async getTitleVerification(id: string): Promise<TitleVerificationDetailsResponse> {
    const { data } = await api.get<TitleVerificationDetailsResponse>(`/title-verifications/${id}`);
    return data;
  },

  async reviewTitleVerification(id: string, input: ReviewTitleVerificationInput, challengeId: string, authToken?: string | null): Promise<{ verification: TitleVerification }> {
    if (!challengeId.trim()) throw new Error('A step-up challenge is required to review title verification.');
    const url = `/title-verifications/${id}/review`;
    const headers = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'X-Step-Up-Challenge': challengeId,
    };
    const { data } = await api.patch<{ verification: TitleVerification }>(url, input, { headers });
    return data;
  },

  async retryTitleVerificationExternalAnchor(id: string, challengeId: string): Promise<{ verification: TitleVerification }> {
    if (!challengeId.trim()) throw new Error('A step-up challenge is required to retry external anchoring.');
    const { data } = await api.post<{ verification: TitleVerification }>(
      `/title-verifications/${id}/retry-anchor`, {},
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },

  async revokeTitleVerification(id: string, input: { revocationReason: string }, challengeId: string): Promise<{ verification: TitleVerification }> {
    if (!challengeId.trim()) throw new Error('A step-up challenge is required to revoke title verification.');
    const { data } = await api.patch<{ verification: TitleVerification }>(
      `/title-verifications/${id}/revoke`, input,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },

  async verifyTitleVerificationDocument(id: string, file: File): Promise<RegistryDocumentMatchResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<RegistryDocumentMatchResult>(`/title-verifications/${id}/verify-document`, form);
    return data;
  },

  async getPropertyTitleVerification(propertyId: string): Promise<{ titleVerification: PropertyTitleVerificationSummary }> {
    const { data } = await api.get<{ titleVerification: PropertyTitleVerificationSummary }>(
      `/properties/${propertyId}/title-verification`,
    );
    return data;
  },

  async getPublicRegistryRecord(publicVerificationId: string): Promise<{ record: PublicRegistryRecord }> {
    const { data } = await api.get<{ record: PublicRegistryRecord }>(
      `/title-registry/${encodeURIComponent(publicVerificationId)}`,
    );
    return data;
  },

  async getRegistryIntegrity(publicVerificationId: string): Promise<RegistryIntegrity> {
    const { data } = await api.get<RegistryIntegrity>(
      `/title-registry/${encodeURIComponent(publicVerificationId)}/integrity`,
    );
    return data;
  },

  async verifyRegistryDocument(publicVerificationId: string, file: File): Promise<RegistryDocumentMatchResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<RegistryDocumentMatchResult>(
      `/title-registry/${encodeURIComponent(publicVerificationId)}/verify-document`,
      form,
    );
    return data;
  },

  async getRegistryPublicKey(): Promise<RegistryPublicKey> {
    const { data } = await api.get<RegistryPublicKey>('/title-registry/public-key');
    return data;
  },

  async getRegistrySnapshot(snapshotDate: string): Promise<RegistrySnapshot> {
    const { data } = await api.get<RegistrySnapshot>(`/title-registry/snapshots/${snapshotDate}`);
    return data;
  },

  async getRegistrySnapshotManifest(snapshotDate: string): Promise<RegistrySnapshotManifest> {
    const { data } = await api.get<RegistrySnapshotManifest>(`/title-registry/snapshots/${snapshotDate}/manifest`);
    return data;
  },

  async requestRegistryExternalAnchor(publicVerificationId: string, challengeId: string): Promise<{ record: PublicRegistryRecord }> {
    if (!challengeId.trim()) throw new Error('A step-up challenge is required to request external anchoring.');
    const { data } = await api.post<{ record: PublicRegistryRecord }>(
      `/title-registry/${encodeURIComponent(publicVerificationId)}/request-external-anchor`,
      {},
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },
};
