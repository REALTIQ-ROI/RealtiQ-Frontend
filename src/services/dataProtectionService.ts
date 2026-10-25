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
};
