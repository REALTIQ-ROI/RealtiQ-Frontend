import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffAccessChanges from './StaffAccessChanges';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  list: vi.fn(),
  listStaff: vi.fn(),
  prepare: vi.fn(),
  decide: vi.fn(),
  fetchUsers: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({ busy: false, challenge: null, error: null, begin: mocks.begin, complete: mocks.complete, cancel: mocks.cancel }) }));
vi.mock('../../../services/userService', () => ({ userService: { fetchUsers: mocks.fetchUsers } }));
vi.mock('../../../services/staffAccessChangeService', () => ({
  staffAccessChangeService: { list: mocks.list, listStaff: mocks.listStaff, prepare: mocks.prepare, decide: mocks.decide },
}));

const access = {
  isExecutive: true, readOnly: false, canManageStaff: true,
  capabilities: ['staff.access.manage'],
  assignableDepartments: [
    { id: 'finance', label: 'Finance', readOnly: false },
    { id: 'internal_audit', label: 'Internal Audit (read-only)', readOnly: true },
  ],
};

describe('StaffAccessChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ adminAccess: access, user: { _id: 'executive-1', role: 'admin' } });
    mocks.list.mockResolvedValue([]);
    mocks.listStaff.mockResolvedValue({ staff: [], nextCursor: null });
    mocks.fetchUsers.mockResolvedValue([
      { _id: 'executive-1', name: 'Executive', email: 'exec@example.test', role: 'admin', accountStatus: 'active', emailVerified: true, phoneVerified: true },
      { _id: 'target-1', name: 'Ada Example', email: 'ada@example.test', role: 'buyer', accountStatus: 'active', emailVerified: true, phoneVerified: true },
      { _id: 'target-2', name: 'Unverified Example', email: 'unverified@example.test', role: 'buyer', accountStatus: 'active', emailVerified: true, phoneVerified: false },
    ]);
    mocks.begin.mockResolvedValue(true);
    mocks.complete.mockResolvedValue({ ok: true, value: { id: 'change-1', targetIdentityId: 'target-1', departments: ['finance'], state: 'prepared', preparedBy: 'executive-1', version: 0 } });
  });

  it('loads the staff directory and excludes the current identity and ineligible targets', async () => {
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Staff access' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.listStaff).toHaveBeenCalledWith({ limit: 25 }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toContain('Ada Example · ada@example.test');
    expect(options.map((option) => option.textContent)).not.toContain('Executive · exec@example.test');
    expect(options.map((option) => option.textContent)).not.toContain('Unverified Example · unverified@example.test');
  });

  it('binds the exact selected account and server-assignable departments to the prepare challenge', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Staff access' });
    await user.selectOptions(screen.getByLabelText('Account to update'), 'target-1');
    await user.click(screen.getByLabelText('Finance'));
    await user.click(screen.getByRole('button', { name: 'Prepare with authenticator' }));

    await waitFor(() => expect(mocks.begin).toHaveBeenCalledOnce());
    const action = mocks.begin.mock.calls[0][0];
    expect(action).toMatchObject({ method: 'POST', path: '/api/admin/staff-access-changes', body: { targetIdentityId: 'target-1', departments: ['finance'] } });
    expect(action.execute).toBeTypeOf('function');
  });

  it('keeps Internal Audit as a standalone read-only assignment', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Staff access' });
    await user.selectOptions(screen.getByLabelText('Account to update'), 'target-1');
    await user.click(screen.getByLabelText('Finance'));
    await user.click(screen.getByLabelText(/Internal Audit \(read-only\)/));
    await user.click(screen.getByRole('button', { name: 'Prepare with authenticator' }));
    await waitFor(() => expect(mocks.begin).toHaveBeenCalledOnce());
    expect(mocks.begin.mock.calls[0][0].body.departments).toEqual(['internal_audit']);
  });

  it('requires an explicit removal action instead of interpreting an empty selection as a removal', async () => {
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Staff access' });
    fireEvent.change(screen.getByLabelText('Account to update'), { target: { value: 'target-1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Prepare with authenticator' }));
    expect(mocks.begin).not.toHaveBeenCalled();
  });
});
