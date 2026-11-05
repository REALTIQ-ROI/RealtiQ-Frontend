import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { adminAccessService, hasAdminCapability, parseAdminAccessProjection } from './adminAccessService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

const projection = {
  accountId: 'admin-1', role: 'admin', profileId: 'staff-1',
  staffDepartments: ['finance'], departmentAssignments: [{ id: 'finance', label: 'Finance', readOnly: false }],
  effectiveDepartments: ['finance'], capabilities: ['dashboard.read', 'finance.read', 'finance.manage'],
  accessMode: 'departmental', isExecutive: false, isInternalAudit: false, readOnly: false,
  canManageStaff: false, assignableDepartments: [],
};

describe('adminAccessService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the current projection with the selected staff profile header', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { access: projection } } as never);
    await expect(adminAccessService.get('staff-1')).resolves.toEqual(projection);
    expect(api.get).toHaveBeenCalledWith('/admin/access', { headers: { 'X-Profile-ID': 'staff-1' } });
  });

  it('accepts a valid no-assignment projection without granting any frontend capabilities', () => {
    const empty = parseAdminAccessProjection({ ...projection, staffDepartments: [], departmentAssignments: [], effectiveDepartments: [], capabilities: [], accessMode: 'unassigned' });
    expect(empty.capabilities).toEqual([]);
    expect(hasAdminCapability(empty, 'staff.access.manage')).toBe(false);
  });

  it('restricts legacy read-only access to explicitly read-only capabilities', () => {
    const legacy = parseAdminAccessProjection({ ...projection, staffDepartments: ['executive', 'internal_audit'], capabilities: ['dashboard.read', 'policies.read', 'finance.manage'], readOnly: true, isInternalAudit: true });
    expect(hasAdminCapability(legacy, 'policies.read')).toBe(true);
    expect(hasAdminCapability(legacy, 'finance.manage')).toBe(false);
  });
});
