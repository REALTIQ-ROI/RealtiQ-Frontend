import api from '../lib/axios';
import type { ApiInquiry, CreateInquiryPayload } from '../types';

type InquiryListPayload = ApiInquiry[] | { inquiries: ApiInquiry[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseInquiries = (payload: unknown): ApiInquiry[] => {
  const inquiries = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.inquiries)
      ? payload.inquiries
      : null;

  if (!inquiries) {
    throw new Error('The inquiries endpoint returned an unsupported response. Refresh the page or contact support if this continues.');
  }

  return inquiries as ApiInquiry[];
};

export const inquiryService = {
  async createInquiry(payload: CreateInquiryPayload): Promise<ApiInquiry> {
    const { data } = await api.post<ApiInquiry>('/inquiries', payload);
    return data;
  },

  async getInquiries(): Promise<ApiInquiry[]> {
    const { data } = await api.get<InquiryListPayload>('/inquiries');
    return parseInquiries(data);
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
