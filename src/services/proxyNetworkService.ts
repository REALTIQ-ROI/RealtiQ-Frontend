import type { AxiosRequestConfig } from 'axios';
import api from '../lib/axios';
import type {
  AdminInspectorDetail, AdminInspectorFilters, AdminInspectorListResponse, DisputeResolution,
  InspectionListFilters, InspectorListResponse, KycSubmissionResponse, PaymentInitializationResponse,
  PayoutAccount, PayoutAccountVerification, ProxyConversationResponse, ProxyEvidence, ProxyInspectionDetail,
  ProxyInspectionDispute, ProxyInspectionReport, ProxyInspectionRequest, ProxyInspectorReview,
  ProxyPaymentVerificationResponse, ProxyRegistrationResponse, PublicInspectorFilters,
  PublicInspectorProfile, ReportSection, ReportRecommendation, RequestListResponse, RequestedService,
  AdminKycContentAccess,
} from '../types/proxyNetwork';

const compact = <T extends object>(value: T) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== '' && item !== undefined && item !== null),
);
const config = (signal?: AbortSignal): AxiosRequestConfig => ({ signal });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const normalizeAdminInspectorDocumentPath = (contentAccess: AdminKycContentAccess): string => {
  if (contentAccess.status !== 'protected_route' || contentAccess.method !== 'GET') {
    throw new Error('This document is not available through a protected viewer route.');
  }
  const path = contentAccess.path;
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('The protected document route is invalid.');
  }
  const parsed = new URL(path, 'https://realtiq.invalid');
  if (parsed.origin !== 'https://realtiq.invalid' || parsed.search || parsed.hash) {
    throw new Error('The protected document route is invalid.');
  }
  const match = parsed.pathname.match(/^\/(?:api\/)?documents\/private-migrations\/legacy-files\/([A-Za-z0-9_-]{1,128})\/content$/);
  if (!match) throw new Error('The protected document route is invalid.');
  return `/documents/private-migrations/legacy-files/${match[1]}/content`;
};

/** Evidence responses contain short-lived private URLs, so validate identity and access data at the boundary. */
export const parseProxyEvidenceList = (value: unknown): ProxyEvidence[] => {
  if (!Array.isArray(value) || value.some((item) =>
    !isRecord(item) ||
    typeof item.id !== 'string' || item.id.length === 0 ||
    typeof item.type !== 'string' ||
    typeof item.category !== 'string' ||
    typeof item.accessUrl !== 'string' || item.accessUrl.length === 0 ||
    (item.mimeType !== undefined && typeof item.mimeType !== 'string') ||
    (item.fileSize !== undefined && (typeof item.fileSize !== 'number' || !Number.isFinite(item.fileSize))) ||
    (item.caption !== undefined && item.caption !== null && typeof item.caption !== 'string') ||
    (item.uploadedAt !== undefined && typeof item.uploadedAt !== 'string')
  )) {
    throw new Error('Private evidence response is not available in a supported format.');
  }
  return value as ProxyEvidence[];
};

export const parseProxyInspectionDetail = (value: unknown): ProxyInspectionDetail => {
  if (
    !isRecord(value) ||
    !isRecord(value.request) ||
    typeof value.request._id !== 'string' ||
    !('serviceEscrow' in value) ||
    (value.serviceEscrow !== null && !isRecord(value.serviceEscrow)) ||
    !('report' in value) ||
    (value.report !== null && !isRecord(value.report)) ||
    !('dispute' in value) ||
    (value.dispute !== null && !isRecord(value.dispute)) ||
    !Array.isArray(value.evidence)
  ) {
    throw new Error('Property Agent job detail is not available in a supported format.');
  }
  return { ...value, evidence: parseProxyEvidenceList(value.evidence) } as unknown as ProxyInspectionDetail;
};

export interface InspectorRegistrationInput {
  name: string; email: string; password: string; phone: string; professionalType: string;
  professionalTitle?: string; yearsOfExperience?: number; bio?: string;
  location: { country: string; state: string; city: string; coordinates?: { lat?: number; lng?: number } };
  serviceAreas: string[]; specialties: string[]; profileImage?: File;
}
export interface KycInput {
  fullLegalName: string; phone: string; address: string; nationalId: string;
  idDocument: File; selfie: File; professionalDocuments: File[]; professionalDocumentLabels: string[];
}
export interface ReportInput {
  inspectionDate?: string; sections?: ReportSection[]; visibleDefects?: string[]; positiveObservations?: string[];
  neighbourhoodComments?: string; roadAccessComments?: string; utilityComments?: string;
  locationConfirmed?: boolean; recommendation?: ReportRecommendation; summary?: string;
  declarationAccepted: boolean; signedByName?: string;
}
export interface ReviewInput { rating: number; professionalism?: number; accuracy?: number; communication?: number; timeliness?: number; comment?: string }
export type AdminInspectorReviewInput =
  | { decision: 'approve'; notes: string }
  | { decision: 'reject'; reason: string };

export const proxyQueryKeys = {
  publicInspectors: (filters: PublicInspectorFilters) => ['proxy', 'public-list', compact(filters)] as const,
  publicInspector: (id: string) => ['proxy', 'public-detail', id] as const,
  payout: ['proxy', 'payout'] as const,
  requests: (scope: string, filters: InspectionListFilters) => ['proxy', scope, 'list', compact(filters)] as const,
  detail: (id: string) => ['proxy', 'detail', id] as const,
  conversation: (id: string) => ['proxy', 'conversation', id] as const,
  evidence: (id: string) => ['proxy', 'evidence', id] as const,
  report: (id: string) => ['proxy', 'report', id] as const,
  adminInspectors: (filters: AdminInspectorFilters) => ['proxy', 'admin-inspectors', compact(filters)] as const,
  adminInspector: (id: string) => ['proxy', 'admin-inspector', id] as const,
  adminJobs: (filters: InspectionListFilters) => ['proxy', 'admin-jobs', compact(filters)] as const,
  adminJob: (id: string) => ['proxy', 'admin-job', id] as const,
  adminStats: ['admin', 'stats'] as const,
  adminWallet: ['admin', 'wallet'] as const,
  adminWalletTransactions: (filters: object) => ['admin', 'wallet-transactions', compact(filters)] as const,
};

const registrationForm = (input: InspectorRegistrationInput) => {
  const data = new FormData();
  data.append('name', input.name); data.append('email', input.email); data.append('password', input.password);
  data.append('phone', input.phone); data.append('professionalType', input.professionalType);
  if (input.professionalTitle) data.append('professionalTitle', input.professionalTitle);
  if (input.yearsOfExperience != null) data.append('yearsOfExperience', String(input.yearsOfExperience));
  if (input.bio) data.append('bio', input.bio);
  data.append('location', JSON.stringify(input.location));
  data.append('serviceAreas', JSON.stringify(input.serviceAreas));
  data.append('specialties', JSON.stringify(input.specialties));
  if (input.profileImage) data.append('profileImage', input.profileImage);
  return data;
};
const kycForm = (input: KycInput) => {
  const data = new FormData();
  data.append('fullLegalName', input.fullLegalName); data.append('phone', input.phone);
  data.append('address', input.address); data.append('nationalId', input.nationalId);
  data.append('idDocument', input.idDocument); data.append('selfie', input.selfie);
  input.professionalDocuments.forEach((file) => data.append('professionalDocuments', file));
  data.append('professionalDocumentLabels', JSON.stringify(input.professionalDocumentLabels));
  return data;
};

export const proxyNetworkService = {
  registrationForm,
  kycForm,
  async register(input: InspectorRegistrationInput, signal?: AbortSignal) {
    const { data } = await api.post<ProxyRegistrationResponse>('/proxy-inspectors/register', registrationForm(input), config(signal));
    return data;
  },
  async submitKyc(input: KycInput, signal?: AbortSignal) {
    const { data } = await api.post<KycSubmissionResponse>('/proxy-inspectors/kyc', kycForm(input), config(signal));
    return data;
  },
  async getPayoutAccount(signal?: AbortSignal) {
    const { data } = await api.get<PayoutAccount | null>('/proxy-inspectors/payout-account', config(signal)); return data;
  },
  async verifyPayoutAccount(accountNumber: string, bankCode: string) {
    const { data } = await api.post<PayoutAccountVerification>('/proxy-inspectors/payout-account/verify', { accountNumber, bankCode }); return data;
  },
  async savePayoutAccount(accountNumber: string, bankCode: string) {
    const { data } = await api.put<PayoutAccount>('/proxy-inspectors/payout-account', { accountNumber, bankCode }); return data;
  },
  async listPublicInspectors(filters: PublicInspectorFilters, signal?: AbortSignal) {
    const { data } = await api.get<InspectorListResponse>('/proxy-inspectors', { params: compact(filters), signal }); return data;
  },
  async listPublicInspectorFacetProfiles(signal?: AbortSignal) {
    const first = await this.listPublicInspectors({ page: 1, limit: 100 }, signal);
    const pageSize = Math.max(1, first.limit);
    const pageCount = Math.ceil(first.total / pageSize);
    if (pageCount <= 1) return first.inspectors;
    const remaining = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        this.listPublicInspectors({ page: index + 2, limit: pageSize }, signal),
      ),
    );
    return [...first.inspectors, ...remaining.flatMap((page) => page.inspectors)];
  },
  async getPublicInspector(id: string, signal?: AbortSignal) {
    const { data } = await api.get<PublicInspectorProfile>(`/proxy-inspectors/${id}`, config(signal)); return data;
  },
  async createRequest(payload: { propertyId: string; inspectorId: string; requestedServices: RequestedService[]; customRequirements?: string; preferredDate?: string }) {
    const { data } = await api.post<ProxyInspectionRequest>('/proxy-inspections', compact(payload)); return data;
  },
  async listRequests(filters: InspectionListFilters, signal?: AbortSignal) {
    const { data } = await api.get<RequestListResponse>('/proxy-inspections', { params: compact(filters), signal }); return data;
  },
  async listInspectorTasks(filters: InspectionListFilters, signal?: AbortSignal) {
    const { data } = await api.get<RequestListResponse>('/proxy-inspector/tasks', { params: compact(filters), signal }); return data;
  },
  async getDetail(id: string, signal?: AbortSignal) {
    const { data } = await api.get<unknown>(`/proxy-inspections/${id}`, config(signal)); return parseProxyInspectionDetail(data);
  },
  async getInspectorTask(id: string, signal?: AbortSignal) {
    const { data } = await api.get<unknown>(`/proxy-inspector/tasks/${id}`, config(signal)); return parseProxyInspectionDetail(data);
  },
  async getConversation(id: string, signal?: AbortSignal) {
    const { data } = await api.get<ProxyConversationResponse>(`/proxy-inspections/${id}/conversation`, config(signal)); return data;
  },
  async sendMessage(id: string, text: string) {
    const { data } = await api.post(`/proxy-inspections/${id}/messages`, { text }); return data;
  },
  async proposePrice(id: string, amount: number) {
    const { data } = await api.post<ProxyInspectionRequest>(`/proxy-inspections/${id}/propose-price`, { amount }); return data;
  },
  async confirmPrice(id: string, challengeId: string, body: Record<string, never>) {
    const { data } = await api.post<ProxyInspectionRequest>(`/proxy-inspections/${id}/confirm-price`, body, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    }); return data;
  },
  async initializePayment(id: string, challengeId: string, body: Record<string, never>) {
    const { data } = await api.post<PaymentInitializationResponse>(`/proxy-inspections/${id}/initialize-payment`, body, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    }); return data;
  },
  async verifyPayment(reference: string) {
    const { data } = await api.get<ProxyPaymentVerificationResponse>(`/payments/verify/${reference}`); return data;
  },
  async schedule(id: string, scheduledAt: string) {
    const { data } = await api.patch<ProxyInspectionRequest>(`/proxy-inspections/${id}/schedule`, { scheduledAt }); return data;
  },
  async start(id: string) {
    const { data } = await api.post<ProxyInspectionRequest>(`/proxy-inspections/${id}/start`); return data;
  },
  async uploadEvidence(id: string, files: File[], captions: string[]) {
    const body = new FormData();
    files.forEach((file) => body.append('evidence', file));
    captions.forEach((caption) => body.append('captions', caption));
    const { data } = await api.post<unknown>(`/proxy-inspections/${id}/evidence`, body); return data;
  },
  async getEvidence(id: string, signal?: AbortSignal) {
    const { data } = await api.get<unknown>(`/proxy-inspections/${id}/evidence`, config(signal)); return parseProxyEvidenceList(data);
  },
  async saveReport(id: string, input: ReportInput, update = false) {
    const request = update ? api.patch : api.put;
    const { data } = await request<ProxyInspectionReport>(`/proxy-inspections/${id}/report`, input); return data;
  },
  async getReport(id: string, signal?: AbortSignal) {
    const { data } = await api.get<ProxyInspectionReport>(`/proxy-inspections/${id}/report`, config(signal)); return data;
  },
  async submitCompletion(id: string) {
    const { data } = await api.post<ProxyInspectionRequest>(`/proxy-inspections/${id}/submit-completion`); return data;
  },
  async confirmCompletion(id: string) {
    const { data } = await api.post<ProxyInspectionRequest>(`/proxy-inspections/${id}/confirm-completion`); return data;
  },
  async dispute(id: string, reason: string, description?: string) {
    const { data } = await api.post<ProxyInspectionDispute>(`/proxy-inspections/${id}/dispute`, compact({ reason, description })); return data;
  },
  async review(id: string, input: ReviewInput) {
    const { data } = await api.post<ProxyInspectorReview>(`/proxy-inspections/${id}/review`, compact(input)); return data;
  },
  async listAdminInspectors(filters: AdminInspectorFilters, signal?: AbortSignal) {
    const { data } = await api.get<AdminInspectorListResponse>('/admin/proxy-inspectors', { params: compact(filters), signal }); return data;
  },
  async listAdminInspectorFacetProfiles(signal?: AbortSignal) {
    const first = await this.listAdminInspectors({ page: 1, limit: 100 }, signal);
    const pageSize = Math.max(1, first.limit);
    const pageCount = Math.ceil(first.total / pageSize);
    if (pageCount <= 1) return first.inspectors;
    const remaining = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        this.listAdminInspectors({ page: index + 2, limit: pageSize }, signal),
      ),
    );
    return [...first.inspectors, ...remaining.flatMap((page) => page.inspectors)];
  },
  async getAdminInspector(id: string, signal?: AbortSignal) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Property Agent profile ID is missing. Return to the review queue and reopen the record.');
    }
    const { data } = await api.get<AdminInspectorDetail>(`/admin/proxy-inspectors/${encodeURIComponent(id)}`, config(signal)); return data;
  },
  async fetchAdminInspectorDocument(contentAccess: AdminKycContentAccess, signal?: AbortSignal) {
    const path = normalizeAdminInspectorDocumentPath(contentAccess);
    const { data, headers } = await api.get<Blob>(path, { ...config(signal), responseType: 'blob' });
    return {
      blob: data,
      contentType: String(headers['content-type'] || data.type || 'application/octet-stream'),
    };
  },
  async reviewInspector(id: string, challengeId: string, input: AdminInspectorReviewInput) {
    const { data } = await api.patch(`/admin/proxy-inspectors/${id}/review`, input, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    }); return data;
  },
  async suspendInspector(id: string, challengeId: string, reason: string) {
    const { data } = await api.patch(`/admin/proxy-inspectors/${id}/suspend`, { reason }, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    }); return data;
  },
  async reactivateInspector(id: string, challengeId: string, notes: string) {
    const { data } = await api.patch(`/admin/proxy-inspectors/${id}/reactivate`, { notes }, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    }); return data;
  },
  async listAdminJobs(filters: InspectionListFilters, signal?: AbortSignal) {
    const { data } = await api.get<RequestListResponse>('/admin/proxy-inspections', { params: compact(filters), signal }); return data;
  },
  async getAdminJob(id: string, signal?: AbortSignal) {
    const { data } = await api.get<unknown>(`/admin/proxy-inspections/${id}`, config(signal)); return parseProxyInspectionDetail(data);
  },
  async releasePayment(id: string, challengeId: string, body: Record<string, never>) {
    const { data } = await api.post<{ status: string; transferReference: string }>(`/admin/proxy-inspections/${id}/release-payment`, body, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    }); return data;
  },
  async resolveDispute(id: string, challengeId: string, body: { resolution: DisputeResolution; notes: string }) {
    const { data } = await api.patch(`/admin/proxy-inspections/${id}/resolve-dispute`, body, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    }); return data;
  },
};
