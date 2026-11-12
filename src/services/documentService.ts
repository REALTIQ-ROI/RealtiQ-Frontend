import api from '../lib/axios';
import { buildBoundTitleUploadFormData, type TitleUploadStepUpBody } from '../utils/titleUploadStepUp';
import type { TitleDocumentRecord, TitleDocumentType, TitleVerification } from '../types';

export interface UploadTitleDocumentInput {
  propertyId: string;
  documentType?: TitleDocumentType;
  title?: string;
  file: File;
}

export interface ListPropertyDocumentsParams {
  propertyId?: string;
  category?: 'title_document' | 'property_document' | 'general';
}

export interface TitleAssetUploadResponse {
  titleDocumentAsset: {
    assetId: string;
    mimeType: string;
    originalFileName: string;
    fileSizeBytes: number;
    expiresAt: string;
  };
}

export interface TitleDocumentUploadResponse {
  document: TitleDocumentRecord;
  verification?: TitleVerification;
  verificationExisting?: boolean;
  riskDetected?: boolean;
}

export interface ProjectSurveyDocument extends TitleDocumentRecord {
  id?: string;
  projectId?: string;
  publicReference?: string;
  submissionState?: string;
  isCurrentVersion?: boolean;
  versionId?: string;
  previousDocumentId?: string | null;
  replacementReference?: string | null;
  contentValidation?: { state: string; validatedAt?: string | null; errorCode?: string | null };
  accessMode?: string;
  verificationStatus?: string;
  version?: number;
  submissionVersion?: number;
  accessPolicy?: { enabled?: boolean; mode?: string };
}

export interface ProjectSurveyDocumentVersion {
  documentId: string;
  versionId: string;
  submissionVersion: number;
  contentHash: string;
  current: boolean;
}

export interface ProjectSurveyGrant extends ProjectDocumentAccessRequest {
  documentHash?: string;
  documentVersion?: number;
}

export interface ProjectSurveyAccessStatus {
  hasAccess: boolean;
  mode?: string;
  paymentRequired: boolean;
  requestState?: string;
  canRequest: boolean;
  expiresAt?: string | null;
  documentVersion?: ProjectSurveyDocumentVersion;
  grant?: ProjectSurveyGrant | null;
}

export interface ProjectDocumentAccessRequest {
  id: string;
  documentId: string;
  projectId?: string | null;
  state: string;
  requestedAt: string;
  decidedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
  downloadsAllowed: boolean;
  version: number;
}

export interface ProjectSurveyUploadResult {
  document: ProjectSurveyDocument;
  projectVersion: number;
  publicationRevalidationRequired: boolean;
}

export interface ProjectSurveyViewerSession {
  sessionToken: string;
  contentUrl: string;
  expiresAt: string;
  documentVersion: number;
  watermark: unknown;
  controls: unknown;
}

export interface ProjectSurveyViewerContent {
  blob: Blob;
  contentType: string;
  documentVersionId: string;
  submissionVersion: number;
  contentSha256: string;
}

const privateNoStore = { headers: { 'Cache-Control': 'no-store' } };

export const sha256FileHex = async (file: File): Promise<string> => {
  if (!globalThis.crypto?.subtle) throw new Error('Secure file verification is unavailable in this browser. Choose a supported browser before uploading.');
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const documentService = {
  async uploadTitleAsset(file: File, onProgress?: (percent: number) => void): Promise<TitleAssetUploadResponse> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<TitleAssetUploadResponse>('/documents/title-asset-upload', form, {
      onUploadProgress: (event) => {
        if (event.total && onProgress) onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return data;
  },

  async uploadTitleDocument(input: UploadTitleDocumentInput, challengeId: string, boundBody: TitleUploadStepUpBody): Promise<TitleDocumentUploadResponse> {
    const form = buildBoundTitleUploadFormData(input.file, boundBody);
    const { data } = await api.post<TitleDocumentUploadResponse>(
      `/documents/properties/${encodeURIComponent(input.propertyId)}/title-upload`,
      form,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },

  async listPropertyDocuments(params: ListPropertyDocumentsParams): Promise<{ documents: TitleDocumentRecord[] }> {
    const { data } = await api.get<{ documents: TitleDocumentRecord[] }>('/documents', { ...privateNoStore, params });
    return data;
  },

  async listProjectRegisteredSurveys(projectId: string, params: { page?: number; limit?: number } = {}): Promise<{ documents: ProjectSurveyDocument[]; pagination?: { page: number; limit: number; total: number; pages: number } }> {
    const { data } = await api.get('/documents', { ...privateNoStore, params: { projectId, category: 'registered_survey', page: params.page ?? 1, limit: params.limit ?? 50 } });
    return data;
  },

  async uploadProjectRegisteredSurvey(projectId: string, file: File, fields: { expectedProjectVersion?: string; accessPolicy?: string; __stepUpFileSha256: string }, challengeId: string): Promise<ProjectSurveyUploadResult> {
    const form = new FormData();
    form.append('file', file);
    if (fields.expectedProjectVersion !== undefined) form.append('expectedProjectVersion', fields.expectedProjectVersion);
    if (fields.accessPolicy !== undefined) form.append('accessPolicy', fields.accessPolicy);
    form.append('__stepUpFileSha256', fields.__stepUpFileSha256);
    const { data } = await api.post<ProjectSurveyUploadResult>(`/documents/projects/${encodeURIComponent(projectId)}/registered-survey`, form, {
      headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' },
    });
    return data;
  },

  async projectSurveyAccessStatus(documentId: string): Promise<ProjectSurveyAccessStatus> {
    const { data } = await api.get<ProjectSurveyAccessStatus>(`/documents/${encodeURIComponent(documentId)}/access-status`, privateNoStore);
    return data;
  },

  async requestProjectSurveyAccess(documentId: string): Promise<ProjectDocumentAccessRequest> {
    const { data } = await api.post<{ request: ProjectDocumentAccessRequest }>(`/documents/${encodeURIComponent(documentId)}/access-requests`, {}, privateNoStore);
    return data.request;
  },

  async listProjectSurveyAccessRequests(projectId: string, params: { page?: number; limit?: number } = {}): Promise<{ requests: ProjectDocumentAccessRequest[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const { data } = await api.get('/documents/access-requests', { ...privateNoStore, params: { projectId, page: params.page ?? 1, limit: params.limit ?? 50 } });
    return data;
  },

  async decideProjectSurveyAccess(documentId: string, body: { requestId: string; decision: 'approve' | 'decline' | 'revoke'; expectedVersion: number; downloadsAllowed?: boolean; expiresAt?: string }, challengeId: string): Promise<ProjectDocumentAccessRequest> {
    const { data } = await api.post<{ request: ProjectDocumentAccessRequest }>(`/documents/${encodeURIComponent(documentId)}/grant`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } });
    return data.request;
  },

  async openProjectSurveyViewer(documentId: string): Promise<ProjectSurveyViewerSession> {
    const { data } = await api.post<ProjectSurveyViewerSession>(`/documents/${encodeURIComponent(documentId)}/open-viewer`, {}, privateNoStore);
    return data;
  },

  async getAuthorizedViewerContent(endpoint: string): Promise<ProjectSurveyViewerContent> {
    if (typeof endpoint !== 'string' || !endpoint.trim()) throw new Error('The server did not return an authorized document viewer route.');
    const url = new URL(endpoint, window.location.origin);
    const apiOrigin = new URL(api.defaults?.baseURL ?? '/api', window.location.origin).origin;
    if (![window.location.origin, apiOrigin].includes(url.origin) || url.search || url.hash || !/^\/(?:api\/)?title-document-viewer\/[^/]+\/content$/.test(url.pathname)) throw new Error('The document viewer returned an unsupported protected route.');
    const apiPath = `${url.pathname.slice('/api'.length)}${url.search}`;
    const { data, headers } = await api.get<Blob>(apiPath, { ...privateNoStore, responseType: 'blob' });
    const contentType = String(headers['content-type'] ?? data.type ?? 'application/octet-stream').split(';')[0].trim().toLowerCase();
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(contentType)) throw new Error('The authorized viewer returned an unsupported document format.');
    const documentVersionId = String(headers['x-document-version-id'] ?? '');
    const submissionVersion = Number(headers['x-document-submission-version']);
    const contentSha256 = String(headers['x-document-content-sha256'] ?? '').toLowerCase();
    if (!documentVersionId || !Number.isInteger(submissionVersion) || !/^[a-f0-9]{64}$/.test(contentSha256)) throw new Error('The protected viewer did not return the required current-version verification details.');
    return { blob: data, contentType, documentVersionId, submissionVersion, contentSha256 };
  },

  async getDocument(id: string): Promise<{ document: ProjectSurveyDocument }> {
    const { data } = await api.get<{ document: ProjectSurveyDocument }>(`/documents/${encodeURIComponent(id)}`, privateNoStore);
    return data;
  },
};
