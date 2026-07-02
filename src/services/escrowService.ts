import api, { ApiRequestError } from '../lib/axios';
import type { CreateEscrowPayload, Escrow, InitializeEscrowPaymentResponse, ProcessRefundResponse, RefundChatResponse, RefundDetails, RefundDetailsPayload, RefundMessage } from '../types/escrow';

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
  async satisfyRule(id: string, ruleId: string, note?: string): Promise<Escrow> { return (await api.patch<Escrow>(`/escrow/${id}/rules/${ruleId}/satisfy`, { note: note?.trim() || undefined })).data; },
  async requestRelease(id: string, note?: string): Promise<Escrow> { return (await api.post<Escrow>(`/escrow/${id}/request-release`, { note: note?.trim() || undefined })).data; },
  async approveRelease(id: string, note?: string): Promise<Escrow> { return (await api.patch<Escrow>(`/escrow/${id}/approve-release`, { note: note?.trim() || undefined })).data; },
  async cancel(id: string, note: string): Promise<Escrow> { return (await api.patch<Escrow>(`/escrow/${id}/cancel`, { note: note.trim() })).data; },
  async dispute(id: string, note: string, metadata: Record<string, unknown> = {}): Promise<Escrow> { return (await api.patch<Escrow>(`/escrow/${id}/dispute`, { note: note.trim(), metadata })).data; },
  async requestRefundDetails(id: string, message?: string): Promise<RefundChatResponse> { return (await api.post<RefundChatResponse>(`/escrow/${id}/refund-chat/request-details`, message?.trim() ? { message: message.trim() } : {})).data; },
  async getRefundChat(id: string): Promise<RefundChatResponse> { return (await api.get<RefundChatResponse>(`/escrow/${id}/refund-chat`)).data; },
  async sendRefundMessage(id: string, message: string): Promise<RefundMessage> { return (await api.post<RefundMessage>(`/escrow/${id}/refund-chat/messages`, { message: message.trim() })).data; },
  async saveRefundDetails(id: string, details: RefundDetailsPayload): Promise<RefundDetails> { return (await api.patch<RefundDetails>(`/escrow/${id}/refund-details`, details)).data; },
  async processRefund(id: string): Promise<{ data: ProcessRefundResponse; status: number }> { const response = await api.post<ProcessRefundResponse>(`/escrow/${id}/process-refund`, {}); return { data: response.data, status: response.status }; },
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
