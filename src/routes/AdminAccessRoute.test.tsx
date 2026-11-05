import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAccessRoute, AdminCapabilityRoute } from './AdminAccessRoute';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), refresh: vi.fn(), logout: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));

const baseAccess = {
  accountId: 'admin-1', role: 'admin', profileId: 'staff-1',
  staffDepartments: ['finance'], departmentAssignments: [], effectiveDepartments: ['finance'],
  capabilities: ['dashboard.read', 'finance.read'], accessMode: 'departmental',
  isExecutive: false, isInternalAudit: false, readOnly: false, canManageStaff: false, assignableDepartments: [],
};

describe('Admin Console access routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refresh.mockResolvedValue(baseAccess);
    mocks.useAuth.mockReturnValue({
      activeProfile: { id: 'staff-1' }, adminAccess: baseAccess, adminAccessError: null,
      adminAccessLoading: false, refreshAdminAccess: mocks.refresh, logout: mocks.logout,
    });
  });

  it('revalidates access with the active staff profile and gates a deep link by capability', async () => {
    render(<MemoryRouter initialEntries={['/finance']}><Routes><Route element={<AdminAccessRoute />}><Route path="/finance" element={<AdminCapabilityRoute capability="finance.read"><p>Finance workspace</p></AdminCapabilityRoute>} /></Route></Routes></MemoryRouter>);
    expect(await screen.findByText('Finance workspace')).toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledWith('staff-1');
  });

  it('does not render a page for a missing capability even when the user is an admin', async () => {
    mocks.useAuth.mockReturnValue({
      activeProfile: { id: 'staff-1' }, adminAccess: baseAccess, adminAccessError: null,
      adminAccessLoading: false, refreshAdminAccess: mocks.refresh, logout: mocks.logout,
    });
    render(<MemoryRouter initialEntries={['/staff']}><Routes><Route element={<AdminAccessRoute />}><Route path="/staff" element={<AdminCapabilityRoute capability="staff.access.manage"><p>Staff tools</p></AdminCapabilityRoute>} /></Route></Routes></MemoryRouter>);
    expect(await screen.findByText('This Admin Console section is unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Staff tools')).not.toBeInTheDocument();
  });

  it('shows the access-not-assigned state and no self-management page when the server returns empty arrays', async () => {
    const unassigned = { ...baseAccess, staffDepartments: [], departmentAssignments: [], effectiveDepartments: [], capabilities: [] };
    mocks.useAuth.mockReturnValue({
      activeProfile: { id: 'staff-1' }, adminAccess: unassigned, adminAccessError: null,
      adminAccessLoading: false, refreshAdminAccess: mocks.refresh, logout: mocks.logout,
    });
    render(<MemoryRouter initialEntries={['/staff']}><Routes><Route element={<AdminAccessRoute />}><Route path="/staff" element={<p>Staff tools</p>} /></Route></Routes></MemoryRouter>);
    expect(await screen.findByText('Staff access is not assigned')).toBeInTheDocument();
    expect(screen.queryByText('Staff tools')).not.toBeInTheDocument();
  });
});
