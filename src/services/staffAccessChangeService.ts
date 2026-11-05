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

export interface AdminStaffRecord {
  identityId: string;
  staffProfileId?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  accountStatus?: string | null;
  emailVerified?: boolean | null;
  phoneVerified?: boolean | null;
  /** Display-only server values. This list never grants frontend capabilities. */
  departments?: string[];
  authVersion?: number;
  firstLoginRequired?: boolean;
  invitation?: StaffInvitationSummary | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StaffInvitationSummary {
  id?: string | null;
  status?: string | null;
  expiresAt?: string | null;
  errorCode?: string | null;
}

export interface CreatedAdminStaff extends AdminStaffRecord {
  firstLoginRequired: boolean;
  invitation?: StaffInvitationSummary | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown): string | null | undefined =>
  value === null || typeof value === 'string' ? value : undefined;

const optionalBoolean = (value: unknown): boolean | null | undefined =>
  value === null || typeof value === 'boolean' ? value : undefined;

const parseInvitation = (value: unknown): StaffInvitationSummary | null | undefined => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  return {
    id: optionalString(value.id),
    status: optionalString(value.status),
    expiresAt: optionalString(value.expiresAt),
    errorCode: optionalString(value.errorCode),
  };
};

const parseAdminStaffRecord = (value: unknown): AdminStaffRecord => {
  if (!isRecord(value) || typeof value.identityId !== 'string' || !value.identityId.trim()) {
    throw new Error('The staff directory returned a record without a usable account ID. Refresh the directory or contact support.');
  }

  return {
    identityId: value.identityId,
    staffProfileId: optionalString(value.staffProfileId),
    name: optionalString(value.name),
    email: optionalString(value.email),
    role: optionalString(value.role),
    accountStatus: optionalString(value.accountStatus),
    emailVerified: optionalBoolean(value.emailVerified),
    phoneVerified: optionalBoolean(value.phoneVerified),
    departments: Array.isArray(value.departments) && value.departments.every((department) => typeof department === 'string')
      ? value.departments
      : undefined,
    authVersion: Number.isInteger(value.authVersion) ? value.authVersion as number : undefined,
    firstLoginRequired: optionalBoolean(value.firstLoginRequired) ?? undefined,
    invitation: parseInvitation(value.invitation),
    createdAt: optionalString(value.createdAt),
    updatedAt: optionalString(value.updatedAt),
  };
};

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

/** Validate the documented `{ changes: [...] }` response without trusting arbitrary rows. */
export const parseStaffAccessChanges = (payload: unknown): StaffAccessChange[] => {
  const rows = isRecord(payload) && Array.isArray(payload.changes) ? payload.changes : null;

  if (!rows || !rows.every(isStaffAccessChange)) {
    throw new Error('The staff access changes endpoint returned an unsupported response. Refresh the queue or contact support if this continues.');
  }

  return rows;
};

export const staffAccessChangeService = {
  async list(): Promise<StaffAccessChange[]> {
    const response = (await api.get<unknown>('/admin/staff-access-changes')).data;
    return parseStaffAccessChanges(response);
  },
  async listStaff(options: { q?: string; limit?: number; after?: string; includeUnassigned?: boolean } = {}): Promise<{ staff: AdminStaffRecord[]; nextCursor: string | null }> {
    const { data } = await api.get<unknown>('/admin/staff', { params: { limit: options.limit ?? 25, ...(options.q ? { q: options.q } : {}), ...(options.after ? { after: options.after } : {}), ...(options.includeUnassigned ? { includeUnassigned: true } : {}) } });
    if (!isRecord(data) || !Array.isArray(data.staff) || !(data.nextCursor === null || typeof data.nextCursor === 'string')) {
      throw new Error('The staff directory returned an unsupported response. Refresh the directory or contact support.');
    }
    return {
      staff: data.staff.map(parseAdminStaffRecord),
      nextCursor: data.nextCursor,
    };
  },
  async createStaff(body: { name: string; email: string; departments: StaffDepartment[] }, challengeId: string): Promise<CreatedAdminStaff> {
    const { data, status } = await api.post<unknown>('/admin/staff', body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    if (status !== 201 || !isRecord(data) || !isRecord(data.staff) || data.staff.role !== 'admin') throw new Error('The server did not confirm the Admin staff account. Refresh the directory before trying again.');
    const staff = parseAdminStaffRecord(data.staff);
    if (typeof data.staff.firstLoginRequired !== 'boolean') throw new Error('The server response did not confirm the staff activation state. Refresh the directory before proceeding.');
    return { ...staff, firstLoginRequired: data.staff.firstLoginRequired };
  },
  async resendInvitation(identityId: string, challengeId: string): Promise<CreatedAdminStaff> {
    const path = `/admin/staff/${encodeURIComponent(identityId)}/resend-invitation`;
    const { data, status } = await api.post<unknown>(path, {}, { headers: { 'X-Step-Up-Challenge': challengeId } });
    if (status !== 202 || !isRecord(data) || !isRecord(data.staff) || data.staff.role !== 'admin' || data.staff.identityId !== identityId) throw new Error('The server did not confirm the replacement invitation. Refresh the directory before trying again.');
    const staff = parseAdminStaffRecord(data.staff);
    if (typeof data.staff.firstLoginRequired !== 'boolean') throw new Error('The server response did not confirm the staff activation state. Refresh the directory before proceeding.');
    return { ...staff, firstLoginRequired: data.staff.firstLoginRequired };
  },
  async prepare(body: { targetIdentityId: string; departments: StaffDepartment[] }, challengeId: string) {
    const { data } = await api.post<unknown>('/admin/staff-access-changes', body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    if (!isRecord(data) || !isStaffAccessChange(data.change)) throw new Error('The server did not return a supported staff access change. Refresh the queue before proceeding.');
    return data.change;
  },
  async decide(id: string, body: { decision: 'approved' | 'rejected'; expectedVersion: number }, challengeId: string) {
    const { data } = await api.post<unknown>(`/admin/staff-access-changes/${encodeURIComponent(id)}/decision`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    if (!isRecord(data) || !isStaffAccessChange(data.change)) throw new Error('The server did not confirm the staff access decision. Refresh the queue before proceeding.');
    return data.change;
  },
};
