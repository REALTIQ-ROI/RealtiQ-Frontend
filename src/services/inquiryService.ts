import api from '../lib/axios';
import type { ApiInquiry, CreateInquiryPayload } from '../types';

type InquiryListPayload = ApiInquiry[] | {
  inquiries: ApiInquiry[];
  pagination?: { page: number; limit: number; total: number; pages: number };
};

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

const parsePageCount = (payload: unknown, fallback: number): number => {
  if (!isRecord(payload) || !isRecord(payload.pagination)) return fallback;
  const pages = payload.pagination.pages;
  return typeof pages === 'number' && Number.isInteger(pages) && pages >= 1 ? pages : fallback;
};

export const inquiryService = {
  async createInquiry(payload: CreateInquiryPayload): Promise<ApiInquiry | { inquiryGroupId: string; inquiry: ApiInquiry }> {
    const { data } = await api.post<ApiInquiry | { inquiryGroupId: string; inquiry: ApiInquiry }>('/inquiries', payload);
    return data;
  },

  async getInquiries(): Promise<ApiInquiry[]> {
    const pageSize = 100;
    const first = await api.get<InquiryListPayload>('/inquiries', {
      params: { page: 1, limit: pageSize },
      headers: { 'Cache-Control': 'no-store' },
    });
    const inquiries = parseInquiries(first.data);
    const pageCount = parsePageCount(first.data, 1);
    for (let page = 2; page <= pageCount; page += 1) {
      const { data } = await api.get<InquiryListPayload>('/inquiries', {
        params: { page, limit: pageSize },
        headers: { 'Cache-Control': 'no-store' },
      });
      inquiries.push(...parseInquiries(data));
    }
    return inquiries;
  },

  async getInquiryById(id: string): Promise<ApiInquiry> {
    const { data } = await api.get<ApiInquiry>(`/inquiries/${encodeURIComponent(id)}`, {
      headers: { 'Cache-Control': 'no-store' },
    });
    return data;
  },

  async updateInquiryStatus(id: string, status: 'open' | 'closed', expectedVersion: number): Promise<ApiInquiry> {
    const { data } = await api.patch<ApiInquiry>(`/inquiries/${encodeURIComponent(id)}`, { status, expectedVersion });
    return data;
  },

  async updateLeadUpdatesConsent(id: string, body: { optIn: boolean; expectedVersion: number }): Promise<ApiInquiry> {
    const { data } = await api.patch<ApiInquiry>(`/inquiries/${encodeURIComponent(id)}/lead-updates-consent`, body, { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },
};
