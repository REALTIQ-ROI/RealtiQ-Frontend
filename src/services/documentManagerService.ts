import api from '../lib/axios';

export type ManagedDocumentState = 'draft' | 'approval_pending' | 'approved' | 'issuing' | 'issued' | 'signed' | 'acknowledged' | 'archived';

export interface DocumentTemplateDto {
  id: string;
  issuerProfileId: string;
  title: string;
  documentType: string;
  body: string;
  requiresWetInk: boolean;
  state: 'active' | 'archived' | string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedDocumentDto {
  id: string;
  issuerProfileId: string;
  issuerIdentityId?: string;
  recipientProfileIds: string[];
  templateId?: string | null;
  templateVersion?: number | null;
  previousDocumentId?: string | null;
  title: string;
  documentType: string;
  requiresWetInk: boolean;
  state: ManagedDocumentState | string;
  version: number;
  reference?: string | null;
  issuedAt?: string | null;
  contentHash?: string | null;
  signatures?: Array<{ profileId: string; method: string; at: string }>;
  approvedAt?: string | null;
  archivedAt?: string | null;
  contentPath?: string | null;
  qrVerificationUrl?: string | null;
  myResponse?: { profileId: string; state: 'pending' | 'acknowledged' | 'typed_signature' | string; acknowledged: boolean; signed: boolean; respondedAt: string | null } | null;
  recipientResponses?: Array<{ profileId: string; state: 'pending' | 'acknowledged' | 'typed_signature' | string; acknowledged: boolean; signed: boolean; respondedAt: string | null }>;
  issuance?: { state: 'not_issued' | 'issued' | 'recoverable' | string; recoverable: boolean; errorCode?: string | null };
  body?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentManagerReadiness {
  authority: { state: 'authorized' | 'not_authorized' | string; reasonCode?: string | null; signatory?: { state: 'not_required' | 'required' | 'authorized' | 'unavailable' | string; reasonCode?: string | null } };
  qrSigning: { state: 'configured' | 'unavailable' | string; reasonCode?: string | null };
  verificationOrigin: { state: 'configured' | 'unavailable' | string; reasonCode?: string | null };
  privateEnvelope: { state: 'configured' | 'unavailable' | string; reasonCode?: string | null };
  privateStorage: { state: 'configured' | 'unavailable' | string; reasonCode?: string | null };
  maxIssuedBytes?: number;
  issuance: { state: 'ready' | 'unavailable' | string; usableNow: boolean; reasonCodes?: string[] };
}

export interface DocumentManagerPage<T> {
  items: T[];
  nextCursor: string | null;
}

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export const documentManagerService = {
  async getReadiness(): Promise<DocumentManagerReadiness> {
    const { data } = await api.get<DocumentManagerReadiness>('/document-manager/readiness', noStore);
    return data;
  },
  async listTemplates(params: { state?: 'active' | 'archived'; limit?: number; after?: string } = {}): Promise<DocumentManagerPage<DocumentTemplateDto>> {
    const { data } = await api.get<{ templates: DocumentTemplateDto[]; nextCursor: string | null }>('/document-manager/templates', { ...noStore, params });
    return { items: data.templates, nextCursor: data.nextCursor ?? null };
  },
  async createTemplate(body: { title: string; documentType: string; body: string; requiresWetInk?: boolean }): Promise<DocumentTemplateDto> {
    const { data } = await api.post<{ template: DocumentTemplateDto }>('/document-manager/templates', body);
    return data.template;
  },
  async updateTemplate(id: string, body: { expectedVersion: number; title?: string; documentType?: string; body?: string; requiresWetInk?: boolean; state?: 'archived' }): Promise<DocumentTemplateDto> {
    const { data } = await api.patch<{ template: DocumentTemplateDto }>(`/document-manager/templates/${encodeURIComponent(id)}`, body);
    return data.template;
  },
  async listDocuments(params: { state?: ManagedDocumentState | string; limit?: number; after?: string } = {}): Promise<DocumentManagerPage<ManagedDocumentDto>> {
    const { data } = await api.get<{ documents: ManagedDocumentDto[]; nextCursor: string | null }>('/document-manager/documents', { ...noStore, params });
    return { items: data.documents, nextCursor: data.nextCursor ?? null };
  },
  async getDocument(id: string): Promise<ManagedDocumentDto> {
    const { data } = await api.get<{ document: ManagedDocumentDto }>(`/document-manager/documents/${encodeURIComponent(id)}`, noStore);
    return data.document;
  },
  async createDocument(body: { templateId?: string; title?: string; documentType?: string; body?: string; recipientProfileIds?: string[]; mergeValues?: Record<string, string>; requiresWetInk?: boolean; previousDocumentId?: string }): Promise<ManagedDocumentDto> {
    const { data } = await api.post<{ document: ManagedDocumentDto }>('/document-manager/documents', body);
    return data.document;
  },
  async updateDocument(id: string, body: { expectedVersion: number; title?: string; documentType?: string; body?: string; recipientProfileIds?: string[]; requiresWetInk?: boolean }): Promise<ManagedDocumentDto> {
    const { data } = await api.patch<{ document: ManagedDocumentDto }>(`/document-manager/documents/${encodeURIComponent(id)}`, body);
    return data.document;
  },
  async submit(id: string, body: { expectedVersion: number }): Promise<ManagedDocumentDto> {
    const { data } = await api.post<{ document: ManagedDocumentDto }>(`/document-manager/documents/${encodeURIComponent(id)}/submit`, body);
    return data.document;
  },
  async approve(id: string, body: { expectedVersion: number }, challengeId: string): Promise<ManagedDocumentDto> {
    const { data } = await api.post<{ document: ManagedDocumentDto }>(`/document-manager/documents/${encodeURIComponent(id)}/approve`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data.document;
  },
  async issue(id: string, body: { expectedVersion: number }, challengeId: string): Promise<ManagedDocumentDto> {
    const { data } = await api.post<{ document: ManagedDocumentDto }>(`/document-manager/documents/${encodeURIComponent(id)}/issue`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data.document;
  },
  async sign(id: string, body: { expectedVersion: number; typedName: string }, challengeId: string): Promise<ManagedDocumentDto> {
    const { data } = await api.post<{ document: ManagedDocumentDto }>(`/document-manager/documents/${encodeURIComponent(id)}/sign`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data.document;
  },
  async acknowledge(id: string, body: { expectedVersion: number }): Promise<ManagedDocumentDto> {
    const { data } = await api.post<{ document: ManagedDocumentDto }>(`/document-manager/documents/${encodeURIComponent(id)}/acknowledge`, body);
    return data.document;
  },
  async archive(id: string, body: { expectedVersion: number }, challengeId: string): Promise<ManagedDocumentDto> {
    const { data } = await api.post<{ document: ManagedDocumentDto }>(`/document-manager/documents/${encodeURIComponent(id)}/archive`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data.document;
  },
  async getContent(id: string): Promise<Blob> {
    const { data, headers } = await api.get<Blob>(`/document-manager/documents/${encodeURIComponent(id)}/content`, { ...noStore, responseType: 'blob' });
    if (!String(headers['content-type'] ?? '').toLowerCase().includes('application/pdf')) throw new Error('The document service returned an unsupported protected content type.');
    return data;
  },
  async getHistory(id: string, params: { limit?: number; after?: string } = {}): Promise<{ events: Array<{ action: string; actorProfileId: string; at: string; version: number }>; views: Array<{ profileId: string; action: string; viewedAt: string }>; nextCursor: string | null }> {
    const { data } = await api.get('/document-manager/documents/' + encodeURIComponent(id) + '/history', { ...noStore, params });
    return data;
  },
};
