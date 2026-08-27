import api from '../lib/axios';
import type { NotificationCategory, NotificationPreferences, NotificationPreferenceValues, Pagination, RealtiqNotification } from '../types';

export interface RecentPropertiesDigestPayload {
  daysBack: number;
  limit: number;
}

export interface RecentPropertiesDigestResponse {
  message: string;
  recipientCount: number;
  propertyCount: number;
}

export const notificationService = {
  async list(params: { page?: number; limit?: number; category?: NotificationCategory; read?: boolean } = {}) { const { data } = await api.get<{ notifications: RealtiqNotification[]; pagination: Pagination }>('/notifications', { params }); return data; },
  async unreadCount() { const { data } = await api.get<{ unreadCount: number }>('/notifications/unread-count'); return data.unreadCount; },
  async markRead(id: string) { const { data } = await api.patch<{ notification: RealtiqNotification }>(`/notifications/${id}/read`); return data.notification; },
  async readAll() { const { data } = await api.patch<{ modifiedCount: number; readAt: string }>('/notifications/read-all'); return data; },
  async archive(id: string) { const { data } = await api.delete<{ notification: RealtiqNotification }>(`/notifications/${id}`); return data.notification; },
  async getPreferences() { const { data } = await api.get<{ preferences: NotificationPreferences; mandatoryCategories: string[] }>('/notifications/preferences'); return data; },
  async updatePreferences(values: NotificationPreferenceValues) { const { data } = await api.patch<{ preferences: NotificationPreferences; mandatoryCategories: string[] }>('/notifications/preferences', values); return data; },
  async sendRecentPropertiesDigest(
    payload: RecentPropertiesDigestPayload,
  ): Promise<RecentPropertiesDigestResponse> {
    const { data } = await api.post<RecentPropertiesDigestResponse>(
      '/notifications/recent-properties/digest',
      payload,
    );
    return data;
  },
};
