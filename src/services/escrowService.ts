import api, { ApiRequestError } from '../lib/axios';
import type {
  AdminEscrowDisputeDetail,
  CreateEscrowDisputePayload,
  CreateEscrowPayload,
  Escrow,
  EscrowDispute,
  EscrowDisputeListQuery,
  EscrowDisputeListResponse,
  InitializeEscrowPaymentResponse,
  PayoutAccount,
  PayoutAccountPayload,
  ProcessRefundResponse,
  RefundAccountDetailsResponse,
  RefundChatResponse,
  RefundDetailsPayload,
  RefundMessage,
  ResolveEscrowDisputePayload,
  ResolveEscrowDisputeResponse,
  SatisfyEscrowRuleResponse,
} from '../types/escrow';

const ESCROW_ID_KEY = 'realtiq.pendingEscrowId';
const ESCROW_REFERENCE_KEY = 'realtiq.pendingEscrowReference';

export const escrowService = {
  async create(payload: CreateEscrowPayload): Promise<Escrow> { return (await api.post<Escrow>('/escrow', payload)).data; },
  async list(): Promise<Escrow[]> { return (await api.get<Escrow[]>('/escrow')).data; },
  async get(id: string): Promise<Escrow> { return (await api.get<Escrow>(`/escrow/${id}`)).data; },
  async initializePayment(id: string): Promise<InitializeEscrowPaymentResponse> {
    const data = (await api.post<InitializeEscrowPaymentResponse>(`/escrow/${id}/initialize-payment`)).data;
    sessionStorage.setItem(ESCROW_ID_KEY, data.escrowId);
    sessionStorage.setItem(ESCROW_REFERENCE_KEY, data.reference);
    return data;
  },
  async satisfyRule(id: string, ruleId: string, note?: string): Promise<SatisfyEscrowRuleResponse> { return (await api.patch<SatisfyEscrowRuleResponse>(`/escrow/${id}/rules/${ruleId}/satisfy`, { note: note?.trim() || undefined })).data; },
  async requestRelease(id: string, note?: string): Promise<Escrow> { return (await api.post<Escrow>(`/escrow/${id}/request-release`, { note: note?.trim() || undefined })).data; },
  async approveRelease(id: string, note?: string): Promise<Escrow> { return (await api.patch<Escrow>(`/escrow/${id}/approve-release`, { note: note?.trim() || undefined })).data; },
  async cancel(id: string, note: string): Promise<Escrow> { return (await api.patch<Escrow>(`/escrow/${id}/cancel`, { note: note.trim() })).data; },
  async dispute(id: string, payload: CreateEscrowDisputePayload): Promise<EscrowDispute> {
    return (await api.patch<EscrowDispute>(`/escrow/${id}/dispute`, payload)).data;
  },
  async requestRefundDetails(id: string, message?: string): Promise<RefundChatResponse> { return (await api.post<RefundChatResponse>(`/escrow/${id}/refund-chat/request-details`, message?.trim() ? { message: message.trim() } : {})).data; },
  async getRefundChat(id: string): Promise<RefundChatResponse> { return (await api.get<RefundChatResponse>(`/escrow/${id}/refund-chat`)).data; },
  async sendRefundMessage(id: string, message: string): Promise<RefundMessage> { return (await api.post<RefundMessage>(`/escrow/${id}/refund-chat/messages`, { message: message.trim() })).data; },
  async saveRefundDetails(id: string, details: RefundDetailsPayload): Promise<RefundAccountDetailsResponse> {
    return (await api.post<RefundAccountDetailsResponse>(`/escrow/${id}/refund-account-details`, details)).data;
  },
  async processRefund(id: string): Promise<{ data: ProcessRefundResponse; status: number }> {
    const response = await api.post<ProcessRefundResponse>(`/admin/escrows/${id}/process-refund`, {});
    return { data: response.data, status: response.status };
  },
  async listAdminDisputes(query: EscrowDisputeListQuery = {}): Promise<EscrowDisputeListResponse> {
    return (await api.get<EscrowDisputeListResponse>('/admin/escrow-disputes', { params: query })).data;
  },
  async getAdminDispute(id: string): Promise<AdminEscrowDisputeDetail> {
    return (await api.get<AdminEscrowDisputeDetail>(`/admin/escrow-disputes/${id}`)).data;
  },
  async resolveAdminDispute(id: string, payload: ResolveEscrowDisputePayload): Promise<{ data: ResolveEscrowDisputeResponse; status: number }> {
    const response = await api.patch<ResolveEscrowDisputeResponse>(`/admin/escrow-disputes/${id}/resolve`, payload);
    return { data: response.data, status: response.status };
  },
  async getPayoutAccount(): Promise<PayoutAccount> {
    return (await api.get<PayoutAccount>('/escrow/payout-account')).data;
  },
  async savePayoutAccount(payload: PayoutAccountPayload): Promise<PayoutAccount> {
    return (await api.put<PayoutAccount>('/escrow/payout-account', payload)).data;
  },
  redirectToPayment(result: InitializeEscrowPaymentResponse): void {
    sessionStorage.setItem(ESCROW_ID_KEY, result.escrowId);
    sessionStorage.setItem(ESCROW_REFERENCE_KEY, result.reference);
    window.location.href = result.redirectUrl;
  },
  getPendingId: () => sessionStorage.getItem(ESCROW_ID_KEY),
  getPendingReference: () => sessionStorage.getItem(ESCROW_REFERENCE_KEY),
  clearPending(): void { sessionStorage.removeItem(ESCROW_ID_KEY); sessionStorage.removeItem(ESCROW_REFERENCE_KEY); },
};

export const escrowErrorDetails = (error: unknown) => error instanceof ApiRequestError ? error : new ApiRequestError(error instanceof Error ? error.message : 'Escrow request failed.');
