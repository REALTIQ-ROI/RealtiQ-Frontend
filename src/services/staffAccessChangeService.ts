import api from '../lib/axios';

export const staffDepartments = ['executive', 'sales_partnerships', 'customer_support', 'trust_safety', 'legal_verification', 'escrow_operations', 'finance', 'listings_quality', 'third_party_network', 'technical', 'data_market_intelligence', 'marketing_growth', 'compliance_data_protection', 'internal_audit'] as const;
export type StaffDepartment = typeof staffDepartments[number];
export interface StaffAccessChange {
  id: string;
  targetIdentityId: string;
  departments: StaffDepartment[];
  state: string;
  preparedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  version: number;
}

type StaffAccessChangeListPayload = StaffAccessChange[] | { changes: StaffAccessChange[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStaffAccessChange = (value: unknown): value is StaffAccessChange => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' &&
    typeof value.targetIdentityId === 'string' &&
    Array.isArray(value.departments) &&
    value.departments.every((department) => staffDepartments.includes(department as StaffDepartment)) &&
    typeof value.state === 'string' &&
    typeof value.preparedBy === 'string' &&
    (value.reviewedBy === undefined || typeof value.reviewedBy === 'string') &&
    (value.reviewedAt === undefined || typeof value.reviewedAt === 'string') &&
    Number.isInteger(value.version) && (value.version as number) >= 0;
};

/**
 * The handoff describes a bounded bare array. Some deployed responses wrap that
 * same collection in `changes`; support both without accepting arbitrary object
 * shapes or trusting unvalidated rows.
 */
export const parseStaffAccessChanges = (payload: unknown): StaffAccessChange[] => {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.changes)
      ? payload.changes
      : null;

  if (!rows || !rows.every(isStaffAccessChange)) {
    throw new Error('The staff access changes endpoint returned an unsupported response. Refresh the queue or contact support if this continues.');
  }

  return rows;
};

export const staffAccessChangeService = {
  async list(): Promise<StaffAccessChange[]> {
    const response = (await api.get<StaffAccessChangeListPayload>('/admin/staff-access-changes')).data;
    return parseStaffAccessChanges(response);
  },
  async prepare(body: { targetIdentityId: string; departments: StaffDepartment[] }, challengeId: string) {
    return (await api.post<StaffAccessChange>('/admin/staff-access-changes', body, { headers: { 'X-Step-Up-Challenge': challengeId } })).data;
  },
  async decide(id: string, body: { decision: 'approved' | 'rejected'; expectedVersion: number }, challengeId: string) {
    return (await api.post<StaffAccessChange>(`/admin/staff-access-changes/${encodeURIComponent(id)}/decision`, body, { headers: { 'X-Step-Up-Challenge': challengeId } })).data;
  },
};
