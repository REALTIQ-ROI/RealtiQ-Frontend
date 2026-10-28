import api from '../lib/axios';
import { adminPolicyKeys, type AdminPolicyKey } from './adminPolicyRegistry';

export { adminPolicyKeys };
export type { AdminPolicyKey };

export interface IdentityEmailPolicyValue {
  verificationTtlSeconds: number;
  resetTtlSeconds: number;
  cooldownSeconds: number;
  deliveryAttempts: number;
  retrySeconds: number[];
}

export interface NotificationDeliveryPolicyValue {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  maxAttempts: number;
  retrySeconds: number[];
}

export type AdminPolicyJsonValue =
  | null
  | boolean
  | number
  | string
  | AdminPolicyJsonValue[]
  | { [key: string]: AdminPolicyJsonValue }
  | IdentityEmailPolicyValue
  | NotificationDeliveryPolicyValue;

export type AdminPolicyValue = AdminPolicyJsonValue;

export interface AdminPolicySnapshot {
  key: AdminPolicyKey;
  state: string;
  revision: number;
  value: AdminPolicyValue | null;
  approvedAt?: string;
}

export interface AdminPolicyRevision {
  id: string;
  key: AdminPolicyKey;
  basedOnRevision: number;
  value: AdminPolicyValue;
  reason: string;
  state: string;
  preparedBy: string;
  preparedProfile: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
}

export interface PrepareAdminPolicyRevisionInput {
  value: AdminPolicyValue;
  reason: string;
  expectedRevision: number;
}

export type CompanyManualSource = 'original_document' | 'official_registry' | 'approved_provider';

export interface ApprovedCompanyVerificationPolicy {
  key: 'company_verification';
  state: string;
  revision: number;
  value: AdminPolicyJsonValue | null;
  approvedAt?: string;
}

const allowedManualSources = new Set<CompanyManualSource>([
  'original_document',
  'official_registry',
  'approved_provider',
]);

export const adminPolicyService = {
  async getPolicy(key: AdminPolicyKey): Promise<{ policy: AdminPolicySnapshot }> {
    const { data } = await api.get<{ policy: AdminPolicySnapshot }>(`/admin/policies/${key}`);
    return data;
  },

  async getHistory(
    key: AdminPolicyKey,
    options: { limit?: number; before?: string } = {},
  ): Promise<{ revisions: AdminPolicyRevision[]; nextCursor: string | null }> {
    const { data } = await api.get<{ revisions: AdminPolicyRevision[]; nextCursor: string | null }>(
      `/admin/policies/${key}/history`,
      { params: { limit: options.limit ?? 25, ...(options.before ? { before: options.before } : {}) } },
    );
    return data;
  },

  async prepareRevision(
    key: AdminPolicyKey,
    input: PrepareAdminPolicyRevisionInput,
    challengeId: string,
  ): Promise<AdminPolicyRevision> {
    if (!challengeId.trim()) throw new Error('A step-up challenge is required to prepare a policy revision.');
    const { data } = await api.post<{ revision: AdminPolicyRevision }>(
      `/admin/policies/${key}/revisions`,
      input,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data.revision;
  },

  async decideRevision(
    key: AdminPolicyKey,
    revisionId: string,
    decision: 'approved' | 'rejected',
    challengeId: string,
  ): Promise<AdminPolicyRevision> {
    if (!challengeId.trim()) throw new Error('A step-up challenge is required to decide a policy revision.');
    const { data } = await api.post<{ revision: AdminPolicyRevision }>(
      `/admin/policies/${key}/revisions/${encodeURIComponent(revisionId)}/${decision}`,
      undefined,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data.revision;
  },

  async getCompanyVerificationManualSources(): Promise<{ revision: number; sources: CompanyManualSource[] }> {
    const { data } = await api.get<{ policy: ApprovedCompanyVerificationPolicy }>('/admin/policies/company_verification');
    const policy = data.policy;
    if (policy.state !== 'approved' || !Number.isInteger(policy.revision) || policy.revision < 0) {
      throw new Error('The company verification policy is not currently approved.');
    }
    const configured = typeof policy.value === 'object' && policy.value !== null && !Array.isArray(policy.value)
      ? (policy.value as Record<string, AdminPolicyJsonValue>).manualSources
      : undefined;
    if (!Array.isArray(configured)) throw new Error('The approved company verification policy does not expose manualSources.');
    const sources = configured.filter((value): value is CompanyManualSource => typeof value === 'string' && allowedManualSources.has(value as CompanyManualSource));
    if (sources.length !== configured.length || !sources.length) throw new Error('The approved company verification policy contains no usable manual review sources.');
    return { revision: policy.revision, sources };
  },
};
