import api from '../lib/axios';
import type {
  ManagedTitleDocument,
  PaidAccessMode,
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
  redirectUrl?: string;
  reference?: string;
  price?: number;
  mode?: PaidAccessMode;
  access: {
    id: string;
    mode: PaidAccessMode;
    status: 'payment_pending' | 'active' | 'consumed' | string;
    viewCount: number;
  };
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
}

const normalizeProtectedContentPath = (contentUrl: string): string => {
  if (/^https?:\/\//i.test(contentUrl)) {
    throw new Error('The protected viewer returned an invalid content route.');
  }
  if (contentUrl.startsWith('/api/')) return contentUrl.slice(4);
  return contentUrl;
};

export const titleDocumentService = {
  persistPendingPayment(documentId: string, propertyId: string, reference?: string): void {
    sessionStorage.setItem(PENDING_DOCUMENT_ID_KEY, documentId);
    sessionStorage.setItem(PENDING_PROPERTY_ID_KEY, propertyId);
    if (reference) sessionStorage.setItem(PENDING_REFERENCE_KEY, reference);
  },

  getPendingPayment(): { documentId: string | null; propertyId: string | null; reference: string | null } {
    return {
      documentId: sessionStorage.getItem(PENDING_DOCUMENT_ID_KEY),
      propertyId: sessionStorage.getItem(PENDING_PROPERTY_ID_KEY),
      reference: sessionStorage.getItem(PENDING_REFERENCE_KEY),
    };
  },

  clearPendingPayment(): void {
    sessionStorage.removeItem(PENDING_DOCUMENT_ID_KEY);
    sessionStorage.removeItem(PENDING_PROPERTY_ID_KEY);
    sessionStorage.removeItem(PENDING_REFERENCE_KEY);
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

  async upload(propertyId: string, input: UploadPropertyTitleDocumentInput): Promise<UploadPropertyTitleDocumentResponse> {
    const form = new FormData();
    form.append('file', input.file);
    form.append('documentType', input.documentType);
    form.append('title', input.title.trim());
    form.append('accessPolicy', JSON.stringify(input.accessPolicy));
    const { data } = await api.post<UploadPropertyTitleDocumentResponse>(
      `/properties/${propertyId}/title-documents`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  async updatePolicy(
    documentId: string,
    mode: TitleDocumentPolicyMode,
  ): Promise<{ documentId: string; accessPolicy: { enabled: boolean; mode: TitleDocumentPolicyMode; price: number } }> {
    const accessPolicy = { enabled: mode !== 'private', mode };
    const { data } = await api.patch<{
      documentId: string;
      accessPolicy: { enabled: boolean; mode: TitleDocumentPolicyMode; price: number };
    }>(`/title-documents/${documentId}/access-policy`, { accessPolicy });
    return data;
  },

  async analytics(documentId: string): Promise<TitleDocumentAnalytics> {
    const { data } = await api.get<{ analytics: TitleDocumentAnalytics }>(
      `/title-documents/${documentId}/analytics`,
    );
    return data.analytics;
  },

  async initializePayment(documentId: string, email?: string): Promise<InitializeTitleDocumentPaymentResponse> {
    const { data } = await api.post<InitializeTitleDocumentPaymentResponse>(
      `/title-documents/${documentId}/initialize-view-payment`,
      email ? { email } : {},
      { withCredentials: true },
    );
    return data;
  },

  async accessStatus(documentId: string): Promise<TitleDocumentAccessStatus> {
    const { data } = await api.get<TitleDocumentAccessStatus>(
      `/title-documents/${documentId}/access-status`,
      { withCredentials: true },
    );
    return data;
  },

  async openViewer(documentId: string): Promise<ViewerSession> {
    const { data } = await api.post<ViewerSession>(
      `/title-documents/${documentId}/open-viewer`,
      undefined,
      { withCredentials: true },
    );
    return data;
  },

  async fetchViewerContent(contentUrl: string): Promise<{ blob: Blob; contentType: string }> {
    const { data, headers } = await api.get<Blob>(normalizeProtectedContentPath(contentUrl), {
      responseType: 'blob',
      withCredentials: true,
    });
    return {
      blob: data,
      contentType: String(headers['content-type'] || data.type || 'application/octet-stream'),
    };
  },
};
