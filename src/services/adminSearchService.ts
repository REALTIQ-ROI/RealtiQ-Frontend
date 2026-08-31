import api from '../lib/axios';
import type { AdminSearchQuery, AdminSearchResponse } from '../types/adminSearch';

export const adminSearchService = {
  async search(query: AdminSearchQuery, signal?: AbortSignal): Promise<AdminSearchResponse> {
    const params = { q: query.q, page: query.page, limit: query.limit, ...(query.type ? { type: query.type } : {}) };
    const { data } = await api.get<AdminSearchResponse>('/admin/search', { params, signal });
    return data;
  },
};
