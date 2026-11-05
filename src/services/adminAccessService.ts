import api from '../lib/axios';

export interface AdminDepartmentAssignment {
  id: string;
  label: string;
  readOnly: boolean;
}

export interface AdminAccessProjection {
  accountId: string;
  role: 'admin';
  profileId: string;
  staffDepartments: string[];
  departmentAssignments: AdminDepartmentAssignment[];
  effectiveDepartments: string[];
  capabilities: string[];
  accessMode: string;
  isExecutive: boolean;
  isInternalAudit: boolean;
  readOnly: boolean;
  canManageStaff: boolean;
  assignableDepartments: AdminDepartmentAssignment[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const parseDepartments = (value: unknown): AdminDepartmentAssignment[] | null => {
  if (!Array.isArray(value)) return null;
  const valid = value.every((item) => isRecord(item) &&
    typeof item.id === 'string' && typeof item.label === 'string' && typeof item.readOnly === 'boolean');
  return valid ? value as AdminDepartmentAssignment[] : null;
};

export const parseAdminAccessProjection = (value: unknown): AdminAccessProjection => {
  const access = isRecord(value) && isRecord(value.access) ? value.access : value;
  if (!isRecord(access)) throw new Error('The admin access response is not available in a supported format.');
  const departmentAssignments = parseDepartments(access.departmentAssignments);
  const assignableDepartments = parseDepartments(access.assignableDepartments);
  if (
    typeof access.accountId !== 'string' ||
    access.role !== 'admin' ||
    typeof access.profileId !== 'string' ||
    !isStringArray(access.staffDepartments) ||
    !departmentAssignments ||
    !isStringArray(access.effectiveDepartments) ||
    !isStringArray(access.capabilities) ||
    typeof access.accessMode !== 'string' ||
    typeof access.isExecutive !== 'boolean' ||
    typeof access.isInternalAudit !== 'boolean' ||
    typeof access.readOnly !== 'boolean' ||
    typeof access.canManageStaff !== 'boolean' ||
    !assignableDepartments
  ) {
    throw new Error('The admin access response is missing required server-issued access fields.');
  }
  return access as unknown as AdminAccessProjection;
};

const readOnlyCapabilities = new Set(['dashboard.read', 'audit.read', 'policies.read', 'locations.read', 'listing_freshness.read', 'notification_delivery.read']);

export const isAdminAccessReadOnly = (access: AdminAccessProjection | null | undefined): boolean =>
  Boolean(access && (access.readOnly || access.isInternalAudit ||
    (access.staffDepartments.includes('executive') && access.staffDepartments.includes('internal_audit'))));

export const hasAdminCapability = (access: AdminAccessProjection | null | undefined, capability: string): boolean =>
  Boolean(access?.capabilities.includes(capability) &&
    (!isAdminAccessReadOnly(access) || readOnlyCapabilities.has(capability)));

export const hasAnyAdminCapability = (access: AdminAccessProjection | null | undefined, capabilities: readonly string[]): boolean =>
  capabilities.some((capability) => hasAdminCapability(access, capability));

export const canManageAdminStaff = (access: AdminAccessProjection | null | undefined): boolean =>
  Boolean(access?.isExecutive && !isAdminAccessReadOnly(access) && access.canManageStaff && hasAdminCapability(access, 'staff.access.manage'));

export const adminAccessService = {
  async get(profileId: string): Promise<AdminAccessProjection> {
    const { data } = await api.get<unknown>('/admin/access', { headers: { 'X-Profile-ID': profileId } });
    return parseAdminAccessProjection(data);
  },
};
