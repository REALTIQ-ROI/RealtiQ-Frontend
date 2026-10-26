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

export interface DataProtectionExecution {
  requestId: string;
  state: string;
  version: number;
  completedAt: string | null;
  resultCodes: string[];
  job: null | { state: string; dueAt: string | null; attempts: number; progress: { discovered: number; completed: number; preserved: number; blocked: number; processing: number }; resultCodes: string[]; lastErrorCode: string | null; completedAt: string | null };
  export: unknown | null;
  deletion: null | { counts: { discovered: number; completed: number; preserved: number; blocked: number; held: number; eligible: number; processing: number }; outcomes: Array<{ recordKind: string; category: string; state: string; reasonCode: string; proposedAction: string; count: number }> };
  completionNotice?: { state: string; outcome: string; attempts: number; lastErrorCode: string | null; acceptedAt: string | null };
}

export type DataProtectionScope = 'account_identity' | 'profile_data' | 'verification' | 'documents' | 'communications' | 'transactions' | 'listing_operations';
export type DataProtectionCorrectionField = 'account_name' | 'account_phone' | 'profile_name' | 'profile_details' | 'verification_record' | 'document_metadata' | 'listing_record';
export interface CreateDataProtectionRequestPayload {
  requestType: 'access' | 'correction' | 'deletion';
  scopes: DataProtectionScope[];
  operationKey: string;
  expectedProfileVersion: number;
  correctionFields?: DataProtectionCorrectionField[];
  corrections?: Partial<Record<DataProtectionCorrectionField, string | Record<string, unknown>>>;
}

export interface WithdrawDataProtectionRequestPayload {
  expectedVersion: number;
}

const base = '/profiles/current/data-protection-requests';

export const dataProtectionService = {
  async create(payload: CreateDataProtectionRequestPayload, challengeId: string): Promise<DataProtectionRequestSummary> {
    const { data } = await api.post<{ request: DataProtectionRequestSummary }>(base, payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data.request;
  },
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

  async withdraw(id: string, payload: WithdrawDataProtectionRequestPayload, challengeId: string): Promise<DataProtectionRequestSummary> {
    const { data } = await api.post<{ request: DataProtectionRequestSummary }>(`${base}/${encodeURIComponent(id)}/withdraw`, payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data.request;
  },

  async history(id: string, before?: string): Promise<DataProtectionHistoryPage> {
    const { data } = await api.get<DataProtectionHistoryPage>(`${base}/${encodeURIComponent(id)}/history`, {
      params: { limit: 25, ...(before ? { before } : {}) },
    });
    return data;
  },

  async execution(id: string): Promise<DataProtectionExecution> {
    const { data } = await api.get<DataProtectionExecution>(`${base}/${encodeURIComponent(id)}/execution`);
    return data;
  },

  async adminExecution(id: string): Promise<DataProtectionExecution> {
    const { data } = await api.get<DataProtectionExecution>(`/admin/data-protection-requests/${encodeURIComponent(id)}/execution`);
    return data;
  },

  async downloadExport(id: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`${base}/${encodeURIComponent(id)}/export/download`, {
      responseType: 'blob',
    });
    return data;
  },
};
