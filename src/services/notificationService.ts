import api from '../lib/axios';

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
