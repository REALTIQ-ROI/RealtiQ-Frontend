import type { AxiosRequestConfig } from 'axios';
import api from '../lib/axios';
import type {
  AdminInspectorDetail, AdminInspectorFilters, AdminInspectorListResponse, DisputeResolution,
  InspectionListFilters, InspectorListResponse, KycSubmissionResponse, PaymentInitializationResponse,
  PayoutAccount, ProxyConversationResponse, ProxyEvidence, ProxyInspectionDetail,
  ProxyInspectionDispute, ProxyInspectionReport, ProxyInspectionRequest, ProxyInspectorReview,
  ProxyPaymentVerificationResponse, ProxyRegistrationResponse, PublicInspectorFilters,
  PublicInspectorProfile, ReportSection, ReportRecommendation, RequestListResponse, RequestedService,
} from '../types/proxyNetwork';

const compact = <T extends object>(value: T) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== '' && item !== undefined && item !== null),
);
const config = (signal?: AbortSignal): AxiosRequestConfig => ({ signal });

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
    const { data } = await api.get<ProxyInspectionDetail>(`/proxy-inspections/${id}`, config(signal)); return data;
  },
  async getInspectorTask(id: string, signal?: AbortSignal) {
    const { data } = await api.get<ProxyInspectionDetail>(`/proxy-inspector/tasks/${id}`, config(signal)); return data;
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
  async confirmPrice(id: string) {
    const { data } = await api.post<ProxyInspectionRequest>(`/proxy-inspections/${id}/confirm-price`); return data;
  },
  async initializePayment(id: string) {
    const { data } = await api.post<PaymentInitializationResponse>(`/proxy-inspections/${id}/initialize-payment`); return data;
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
    const { data } = await api.post<ProxyEvidence[]>(`/proxy-inspections/${id}/evidence`, body); return data;
  },
  async getEvidence(id: string, signal?: AbortSignal) {
    const { data } = await api.get<ProxyEvidence[]>(`/proxy-inspections/${id}/evidence`, config(signal)); return data;
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
    const { data } = await api.get<AdminInspectorDetail>(`/admin/proxy-inspectors/${id}`, config(signal)); return data;
  },
  async reviewInspector(id: string, input: { decision: 'approve'; notes: string } | { decision: 'reject'; reason: string }) {
    const { data } = await api.patch(`/admin/proxy-inspectors/${id}/review`, input); return data;
  },
  async suspendInspector(id: string, reason: string) {
    const { data } = await api.patch(`/admin/proxy-inspectors/${id}/suspend`, { reason }); return data;
  },
  async reactivateInspector(id: string, notes: string) {
    const { data } = await api.patch(`/admin/proxy-inspectors/${id}/reactivate`, { notes }); return data;
  },
  async listAdminJobs(filters: InspectionListFilters, signal?: AbortSignal) {
    const { data } = await api.get<RequestListResponse>('/admin/proxy-inspections', { params: compact(filters), signal }); return data;
  },
  async getAdminJob(id: string, signal?: AbortSignal) {
    const { data } = await api.get<ProxyInspectionDetail>(`/admin/proxy-inspections/${id}`, config(signal)); return data;
  },
  async releasePayment(id: string) {
    const { data } = await api.post<{ status: string; transferReference: string }>(`/admin/proxy-inspections/${id}/release-payment`); return data;
  },
  async resolveDispute(id: string, resolution: DisputeResolution, notes: string) {
    const { data } = await api.patch(`/admin/proxy-inspections/${id}/resolve-dispute`, { resolution, notes }); return data;
  },
};
