import api from '../lib/axios';
import type { ConversationReport, MarketplaceConversation, MarketplaceMessage, ModerationAction, Pagination, ReadReceipt, ReportReason, StagedAttachment } from '../types';

export const messageService = {
  async start(propertyId: string, inquiryId?: string) {
    const { data } = await api.post<{ conversation: MarketplaceConversation }>('/messages/conversations', { propertyId, ...(inquiryId ? { inquiryId } : {}) });
    return data.conversation;
  },
  async inbox(params: { page?: number; limit?: number; status?: string; archived?: boolean } = {}) {
    const { data } = await api.get<{ conversations: MarketplaceConversation[]; pagination: Pagination }>('/messages/conversations', { params });
    return data;
  },
  async detail(id: string) { const { data } = await api.get<{ conversation: MarketplaceConversation }>(`/messages/conversations/${id}`); return data.conversation; },
  async history(id: string, params: { limit?: number; before?: string } = {}) {
    const { data } = await api.get<{ messages: MarketplaceMessage[]; pageInfo: { hasMore: boolean; nextCursor: string | null } }>(`/messages/conversations/${id}/messages`, { params });
    return data;
  },
  async send(id: string, body: { text?: string; attachmentIds?: string[] }) { const { data } = await api.post<{ message: MarketplaceMessage }>(`/messages/conversations/${id}/messages`, body); return data.message; },
  async markRead(id: string, messageId?: string) { const { data } = await api.patch<ReadReceipt>(`/messages/conversations/${id}/read`, messageId ? { messageId } : {}); return data; },
  async update(id: string, body: { archived?: boolean; muted?: boolean; status?: 'open' | 'closed' }) { const { data } = await api.patch<{ conversation: MarketplaceConversation }>(`/messages/conversations/${id}`, body); return data.conversation; },
  async upload(id: string, file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) {
    const form = new FormData(); form.append('file', file);
    const { data } = await api.post<{ attachment: StagedAttachment }>(`/messages/conversations/${id}/attachments`, form, { signal, onUploadProgress: (event) => event.total && onProgress?.(Math.round((event.loaded / event.total) * 100)) });
    return data.attachment;
  },
  async report(id: string, body: { reason: ReportReason; messageId?: string; details?: string }) { const { data } = await api.post<{ report: ConversationReport }>(`/messages/conversations/${id}/reports`, body); return data.report; },
  async moderationQueue(params: { page?: number; limit?: number; status?: string; reason?: string }) { const { data } = await api.get<{ reports: ConversationReport[]; pagination: Pagination }>('/messages/moderation/reports', { params }); return data; },
  async moderate(reportId: string, action: ModerationAction, reason: string) { const { data } = await api.patch<{ report: ConversationReport }>(`/messages/moderation/reports/${reportId}`, { action, reason }); return data.report; },
};
