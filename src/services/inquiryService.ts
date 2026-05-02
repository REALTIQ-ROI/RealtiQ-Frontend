import api from '../lib/axios';
import type { ApiInquiry, CreateInquiryPayload } from '../types';

export const inquiryService = {
  async createInquiry(payload: CreateInquiryPayload): Promise<ApiInquiry> {
    const { data } = await api.post<ApiInquiry>('/inquiries', payload);
    return data;
  },

  async getInquiries(): Promise<ApiInquiry[]> {
    const { data } = await api.get<ApiInquiry[]>('/inquiries');
    return data;
  },

  async getInquiryById(id: string): Promise<ApiInquiry> {
    const { data } = await api.get<ApiInquiry>(`/inquiries/${id}`);
    return data;
  },

  async updateInquiryStatus(id: string, status: 'open' | 'closed'): Promise<ApiInquiry> {
    const { data } = await api.patch<ApiInquiry>(`/inquiries/${id}`, { status });
    return data;
  },
};
