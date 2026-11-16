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

const escrowStorageKeys = (profileId?: string | null) => profileId
  ? { id: `realtiq.pendingEscrowId:${profileId}`, reference: `realtiq.pendingEscrowReference:${profileId}` }
  : null;

const normalizeEscrowId = (escrow: Escrow): Escrow => {
  if (typeof escrow._id === 'string' && escrow._id.trim()) return escrow;
  return typeof escrow.id === 'string' && escrow.id.trim()
    ? { ...escrow, _id: escrow.id }
    : escrow;
};

export const escrowService = {
  async create(payload: CreateEscrowPayload): Promise<Escrow> { return (await api.post<Escrow>('/escrow', payload)).data; },
  async list(): Promise<Escrow[]> { return (await api.get<Escrow[]>('/escrow', { headers: { 'Cache-Control': 'no-store' } })).data.map(normalizeEscrowId); },
  async get(id: string): Promise<Escrow> { return normalizeEscrowId((await api.get<Escrow>(`/escrow/${encodeURIComponent(id)}`, { headers: { 'Cache-Control': 'no-store' } })).data); },
  async initializePayment(id: string, challengeId: string, profileId: string): Promise<InitializeEscrowPaymentResponse> {
    try {
      const data = (await api.post<InitializeEscrowPaymentResponse>(`/escrow/${encodeURIComponent(id)}/initialize-payment`, {}, {
        headers: { 'X-Step-Up-Challenge': challengeId },
      })).data;
      const keys = escrowStorageKeys(profileId);
      if (keys) {
        sessionStorage.setItem(keys.id, data.escrowId || id);
        sessionStorage.setItem(keys.reference, data.reference);
      }
      return data;
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.reference) {
        const keys = escrowStorageKeys(profileId);
        if (keys) {
          sessionStorage.setItem(keys.id, id);
          sessionStorage.setItem(keys.reference, raw.reference);
        }
      }
      throw raw;
    }
  },
  async satisfyRule(id: string, ruleId: string, note?: string): Promise<SatisfyEscrowRuleResponse> { return (await api.patch<SatisfyEscrowRuleResponse>(`/escrow/${id}/rules/${ruleId}/satisfy`, { note: note?.trim() || undefined })).data; },
  async requestRelease(id: string, note: string | undefined, challengeId: string): Promise<Escrow> {
    const body = note?.trim() ? { note: note.trim() } : {};
    return (await api.post<Escrow>(`/escrow/${id}/request-release`, body, { headers: { 'X-Step-Up-Challenge': challengeId } })).data;
  },
  async approveRelease(id: string, note: string | undefined, challengeId: string): Promise<Escrow> {
    const body = note?.trim() ? { note: note.trim() } : {};
    return (await api.patch<Escrow>(`/escrow/${id}/approve-release`, body, { headers: { 'X-Step-Up-Challenge': challengeId } })).data;
  },
  async cancel(id: string, note: string, challengeId: string): Promise<Escrow> {
    return (await api.patch<Escrow>(`/escrow/${id}/cancel`, { note: note.trim() }, { headers: { 'X-Step-Up-Challenge': challengeId } })).data;
  },
  async dispute(id: string, payload: CreateEscrowDisputePayload, challengeId: string): Promise<EscrowDispute> {
    return (await api.patch<EscrowDispute>(`/escrow/${id}/dispute`, payload, { headers: { 'X-Step-Up-Challenge': challengeId } })).data;
  },
  async requestRefundDetails(id: string, message?: string): Promise<RefundChatResponse> { return (await api.post<RefundChatResponse>(`/escrow/${id}/refund-chat/request-details`, message?.trim() ? { message: message.trim() } : {})).data; },
  async getRefundChat(id: string): Promise<RefundChatResponse> { return (await api.get<RefundChatResponse>(`/escrow/${encodeURIComponent(id)}/refund-chat`, { headers: { 'Cache-Control': 'no-store' } })).data; },
  async sendRefundMessage(id: string, message: string): Promise<RefundMessage> { return (await api.post<RefundMessage>(`/escrow/${id}/refund-chat/messages`, { message: message.trim() })).data; },
  async saveRefundDetails(id: string, details: RefundDetailsPayload, challengeId: string): Promise<RefundAccountDetailsResponse> {
    return (await api.post<RefundAccountDetailsResponse>(`/escrow/${id}/refund-account-details`, details, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    })).data;
  },
  async processRefund(id: string, challengeId: string): Promise<{ data: ProcessRefundResponse; status: number }> {
    const response = await api.post<ProcessRefundResponse>(`/admin/escrows/${id}/process-refund`, {}, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return { data: response.data, status: response.status };
  },
  async listAdminDisputes(query: EscrowDisputeListQuery = {}): Promise<EscrowDisputeListResponse> {
    return (await api.get<EscrowDisputeListResponse>('/admin/escrow-disputes', { params: query, headers: { 'Cache-Control': 'no-store' } })).data;
  },
  async getAdminDispute(id: string): Promise<AdminEscrowDisputeDetail> {
    return (await api.get<AdminEscrowDisputeDetail>(`/admin/escrow-disputes/${encodeURIComponent(id)}`, { headers: { 'Cache-Control': 'no-store' } })).data;
  },
  async resolveAdminDispute(id: string, payload: ResolveEscrowDisputePayload, challengeId: string): Promise<{ data: ResolveEscrowDisputeResponse; status: number }> {
    const response = await api.patch<ResolveEscrowDisputeResponse>(`/admin/escrow-disputes/${id}/resolve`, payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return { data: response.data, status: response.status };
  },
  async getPayoutAccount(): Promise<PayoutAccount> {
    return (await api.get<PayoutAccount>('/escrow/payout-account', { headers: { 'Cache-Control': 'no-store' } })).data;
  },
  async savePayoutAccount(payload: PayoutAccountPayload, challengeId: string): Promise<PayoutAccount> {
    return (await api.put<PayoutAccount>('/escrow/payout-account', payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    })).data;
  },
  redirectToPayment(result: InitializeEscrowPaymentResponse, profileId: string): void {
    if (!result.redirectUrl) throw new Error('This escrow payment is pending without a provider URL. Check its reference before taking another action.');
    const keys = escrowStorageKeys(profileId);
    if (!keys) throw new Error('Select the buyer profile that owns this escrow before continuing to checkout.');
    sessionStorage.setItem(keys.id, result.escrowId);
    sessionStorage.setItem(keys.reference, result.reference);
    window.location.href = result.redirectUrl;
  },
  getPendingId(profileId?: string | null): string | null { const keys = escrowStorageKeys(profileId); return keys ? sessionStorage.getItem(keys.id) : null; },
  getPendingReference(profileId?: string | null): string | null { const keys = escrowStorageKeys(profileId); return keys ? sessionStorage.getItem(keys.reference) : null; },
  clearPending(profileId?: string | null): void { const keys = escrowStorageKeys(profileId); if (keys) { sessionStorage.removeItem(keys.id); sessionStorage.removeItem(keys.reference); } },
};

export const escrowErrorDetails = (error: unknown) => error instanceof ApiRequestError ? error : new ApiRequestError(error instanceof Error ? error.message : 'Escrow request failed.');
