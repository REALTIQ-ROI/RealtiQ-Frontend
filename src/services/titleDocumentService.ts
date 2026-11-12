import api from '../lib/axios';
import { buildBoundTitleUploadFormData, type TitleUploadStepUpBody } from '../utils/titleUploadStepUp';
import type {
  ManagedTitleDocument,
  PublicTitleDocument,
  TitleDocumentAccessStatus,
  TitleDocumentAnalytics,
  TitleDocumentPolicyMode,
  TitleDocumentType,
  ViewerSession,
} from '../types';

const PENDING_DOCUMENT_ID_KEY = 'realtiq.pendingTitleDocumentId';
const PENDING_PROPERTY_ID_KEY = 'realtiq.pendingTitleDocumentPropertyId';
const PENDING_REFERENCE_KEY = 'realtiq.pendingTitleDocumentReference';
const PENDING_PROFILE_ID_KEY = 'realtiq.pendingTitleDocumentProfileId';

export interface UploadPropertyTitleDocumentInput {
  file: File;
  documentType: TitleDocumentType;
  title: string;
  accessPolicy: {
    enabled: boolean;
    mode: TitleDocumentPolicyMode;
  };
}

export interface InitializeTitleDocumentPaymentResponse {
  existing: boolean;
  purchaseState: string;
  hasAccess: boolean;
  nextAction?: 'redirect_to_provider' | string;
  redirectUrl?: string | null;
  reference?: string | null;
  amountMinor?: number;
  currency?: string;
  expiresAt?: string | null;
  mode?: string;
  access?: Record<string, unknown> | null;
  checkout?: {
    id?: string;
    state?: string;
    jobState?: string;
    paymentState?: string;
    reference?: string;
    amountMinor?: number;
    currency?: string;
    checkoutUrl?: string | null;
    expiresAt?: string | null;
    attempts?: number;
    nextAttemptAt?: string | null;
    errorCode?: string | null;
  } | null;
}

export interface TitleDocumentAccessRequest {
  id: string;
  documentId: string;
  propertyId?: string;
  projectId?: string | null;
  state: 'pending' | 'approved' | 'declined' | 'revoked' | 'expired' | string;
  requestedAt: string;
  decidedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
  downloadsAllowed: boolean;
  version: number;
}
export interface TitleDocumentAccessRequestsPage {
  requests: TitleDocumentAccessRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface UploadPropertyTitleDocumentResponse {
  document: {
    _id: string;
    publicReference?: string;
    documentType: TitleDocumentType;
    title: string;
    titleVerificationId?: string;
  };
  verification?: {
    verificationId: string;
    document: string;
    documentType: TitleDocumentType;
    status: string;
    verificationVersion: number;
    previousVerification?: string;
  };
  verificationExisting?: boolean;
  riskDetected?: boolean;
  nextAction?: string;
}

const normalizeProtectedContentPath = (contentUrl: string): string => {
  if (typeof contentUrl !== 'string') {
    throw new Error('The protected viewer returned an invalid content route.');
  }
  const parsed = new URL(contentUrl, window.location.origin);
  const apiOrigin = new URL(api.defaults?.baseURL ?? '/api', window.location.origin).origin;
  if (![window.location.origin, apiOrigin].includes(parsed.origin) || parsed.search || parsed.hash) {
    throw new Error('The protected viewer returned an invalid content route.');
  }
  const route = parsed.pathname.match(/^\/(?:api\/)?title-document-viewer\/([^/]+)\/content$/);
  if (!route) throw new Error('The protected viewer returned an invalid content route.');
  return `/title-document-viewer/${route[1]}/content`;
};

export const titleDocumentService = {
  persistPendingPayment(documentId: string, propertyId: string, reference?: string, profileId?: string): void {
    // These are short-lived return-flow identifiers, not payment/session credentials.
    sessionStorage.setItem(PENDING_DOCUMENT_ID_KEY, documentId);
    sessionStorage.setItem(PENDING_PROPERTY_ID_KEY, propertyId);
    if (reference) sessionStorage.setItem(PENDING_REFERENCE_KEY, reference);
    else sessionStorage.removeItem(PENDING_REFERENCE_KEY);
    if (profileId) sessionStorage.setItem(PENDING_PROFILE_ID_KEY, profileId);
    else sessionStorage.removeItem(PENDING_PROFILE_ID_KEY);
  },

  getPendingPayment(): { documentId: string | null; propertyId: string | null; reference: string | null; profileId: string | null } {
    return {
      documentId: sessionStorage.getItem(PENDING_DOCUMENT_ID_KEY),
      propertyId: sessionStorage.getItem(PENDING_PROPERTY_ID_KEY),
      reference: sessionStorage.getItem(PENDING_REFERENCE_KEY),
      profileId: sessionStorage.getItem(PENDING_PROFILE_ID_KEY),
    };
  },

  clearPendingPayment(): void {
    sessionStorage.removeItem(PENDING_DOCUMENT_ID_KEY);
    sessionStorage.removeItem(PENDING_PROPERTY_ID_KEY);
    sessionStorage.removeItem(PENDING_REFERENCE_KEY);
    sessionStorage.removeItem(PENDING_PROFILE_ID_KEY);
  },

  async listPublic(propertyId: string): Promise<PublicTitleDocument[]> {
    const { data } = await api.get<PublicTitleDocument[]>(`/properties/${propertyId}/title-documents`);
    return data;
  },

  async listManaged(propertyId: string): Promise<ManagedTitleDocument[]> {
    const { data } = await api.get<{ documents: ManagedTitleDocument[] }>(
      `/properties/${propertyId}/title-documents/manage`,
    );
    return data.documents;
  },

  async upload(propertyId: string, input: UploadPropertyTitleDocumentInput, challengeId: string, boundBody: TitleUploadStepUpBody): Promise<UploadPropertyTitleDocumentResponse> {
    const form = buildBoundTitleUploadFormData(input.file, boundBody);
    const { data } = await api.post<UploadPropertyTitleDocumentResponse>(
      `/documents/properties/${encodeURIComponent(propertyId)}/title-upload`,
      form,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },

  async updatePolicy(
    documentId: string,
    body: { accessPolicy: { enabled: boolean; mode: TitleDocumentPolicyMode; buyerPassEnabled?: boolean }; expectedVersion: number },
    challengeId: string,
  ): Promise<{ documentId: string; version: number; accessPolicy: { enabled: boolean; mode: TitleDocumentPolicyMode; price?: number; buyerPassEnabled?: boolean } }> {
    const { data } = await api.patch<{
      documentId: string;
      version: number;
      accessPolicy: { enabled: boolean; mode: TitleDocumentPolicyMode; price?: number; buyerPassEnabled?: boolean };
    }>(`/title-documents/${encodeURIComponent(documentId)}/access-policy`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async analytics(documentId: string): Promise<TitleDocumentAnalytics> {
    const { data } = await api.get<{ analytics: TitleDocumentAnalytics }>(
      `/title-documents/${documentId}/analytics`,
    );
    return data.analytics;
  },

  async requestAccess(documentId: string): Promise<TitleDocumentAccessRequest> {
    const { data } = await api.post<{ request: TitleDocumentAccessRequest }>(`/documents/${encodeURIComponent(documentId)}/access-requests`, {});
    return data.request;
  },

  async listAccessRequests(propertyId: string, params: { page?: number; limit?: number } = {}): Promise<TitleDocumentAccessRequestsPage> {
    const { data } = await api.get<TitleDocumentAccessRequestsPage>('/documents/access-requests', { params: { propertyId, page: params.page ?? 1, limit: params.limit ?? 50 }, headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async decideAccessRequest(documentId: string, body: { requestId: string; decision: 'approve' | 'decline' | 'revoke'; expectedVersion: number }, challengeId: string): Promise<TitleDocumentAccessRequest> {
    const { data } = await api.post<{ request: TitleDocumentAccessRequest }>(`/documents/${encodeURIComponent(documentId)}/grant`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data.request;
  },

  async initializePayment(documentId: string, challengeId: string): Promise<InitializeTitleDocumentPaymentResponse> {
    const { data } = await api.post<InitializeTitleDocumentPaymentResponse>(
      `/title-documents/${encodeURIComponent(documentId)}/initialize-view-payment`,
      {},
      { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } },
    );
    return data;
  },

  async accessStatus(documentId: string): Promise<TitleDocumentAccessStatus> {
    const { data } = await api.get<TitleDocumentAccessStatus>(
      `/title-documents/${documentId}/access-status`,
      { headers: { 'Cache-Control': 'no-store' } },
    );
    return data;
  },

  async openViewer(documentId: string): Promise<ViewerSession> {
    const { data } = await api.post<ViewerSession>(
      `/title-documents/${documentId}/open-viewer`,
      {},
      { headers: { 'Cache-Control': 'no-store' } },
    );
    return data;
  },

  async endViewer(sessionToken: string): Promise<void> {
    await api.post(`/title-document-viewer/${encodeURIComponent(sessionToken)}/end`, {}, { headers: { 'Cache-Control': 'no-store' } });
  },

  async fetchViewerContent(contentUrl: string): Promise<{ blob: Blob; contentType: string; documentVersionId: string | null; submissionVersion: number | null; contentSha256: string | null }> {
    const { data, headers } = await api.get<Blob>(normalizeProtectedContentPath(contentUrl), {
      responseType: 'blob',
      headers: { 'Cache-Control': 'no-store' },
    });
    const documentVersionId = typeof headers['x-document-version-id'] === 'string' ? headers['x-document-version-id'] : null;
    const submissionVersion = Number.isInteger(Number(headers['x-document-submission-version'])) ? Number(headers['x-document-submission-version']) : null;
    const contentSha256 = typeof headers['x-document-content-sha256'] === 'string' ? String(headers['x-document-content-sha256']).toLowerCase() : null;
    if (!documentVersionId || submissionVersion === null || !contentSha256 || !/^[a-f0-9]{64}$/.test(contentSha256)) throw new Error('The protected viewer did not return current document-version verification details.');
    return {
      blob: data,
      contentType: String(headers['content-type'] || data.type || 'application/octet-stream'),
      documentVersionId,
      submissionVersion,
      contentSha256,
    };
  },
};
