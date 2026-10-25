import api from '../lib/axios';

export interface DataProtectionRequestSummary {
  id: string;
  profileId: string;
  requestType: 'access' | 'correction' | 'deletion';
  state: string;
  version: number;
  submittedAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  resultCodes: string[];
  scopes?: string[];
  correctionFields?: string[];
}

export interface DataProtectionRequestPage {
  requests: DataProtectionRequestSummary[];
  nextCursor: string | null;
}

export interface DataProtectionHistoryPage {
  events: Array<Record<string, unknown>>;
  nextCursor: string | null;
}

const base = '/profiles/current/data-protection-requests';

export const dataProtectionService = {
  async list(before?: string): Promise<DataProtectionRequestPage> {
    const { data } = await api.get<DataProtectionRequestPage>(base, {
      params: { limit: 25, ...(before ? { before } : {}) },
    });
    return data;
  },

  async detail(id: string): Promise<DataProtectionRequestSummary> {
    const { data } = await api.get<{ request: DataProtectionRequestSummary }>(`${base}/${encodeURIComponent(id)}`);
    return data.request;
  },

  async history(id: string, before?: string): Promise<DataProtectionHistoryPage> {
    const { data } = await api.get<DataProtectionHistoryPage>(`${base}/${encodeURIComponent(id)}/history`, {
      params: { limit: 25, ...(before ? { before } : {}) },
    });
    return data;
  },

  async execution(id: string): Promise<unknown> {
    const { data } = await api.get<unknown>(`${base}/${encodeURIComponent(id)}/execution`);
    return data;
  },

  async downloadExport(id: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`${base}/${encodeURIComponent(id)}/export/download`, {
      responseType: 'blob',
    });
    return data;
  },
};
