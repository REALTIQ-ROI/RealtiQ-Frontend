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

export const staffAccessChangeService = {
  async list() { return (await api.get<StaffAccessChange[]>('/admin/staff-access-changes')).data; },
  async prepare(body: { targetIdentityId: string; departments: StaffDepartment[] }, challengeId: string) {
    return (await api.post<StaffAccessChange>('/admin/staff-access-changes', body, { headers: { 'X-Step-Up-Challenge': challengeId } })).data;
  },
  async decide(id: string, body: { decision: 'approved' | 'rejected'; expectedVersion: number }, challengeId: string) {
    return (await api.post<StaffAccessChange>(`/admin/staff-access-changes/${encodeURIComponent(id)}/decision`, body, { headers: { 'X-Step-Up-Challenge': challengeId } })).data;
  },
};
