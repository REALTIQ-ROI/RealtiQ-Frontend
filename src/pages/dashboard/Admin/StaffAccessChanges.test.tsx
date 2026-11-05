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
  createStaff: vi.fn(),
  resendInvitation: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({ busy: false, challenge: null, error: null, begin: mocks.begin, complete: mocks.complete, cancel: mocks.cancel }) }));
vi.mock('../../../services/staffAccessChangeService', () => ({
  staffDepartments: ['executive', 'sales_partnerships', 'customer_support', 'trust_safety', 'legal_verification', 'escrow_operations', 'finance', 'listings_quality', 'third_party_network', 'technical', 'data_market_intelligence', 'marketing_growth', 'compliance_data_protection', 'internal_audit'],
  staffAccessChangeService: { list: mocks.list, listStaff: mocks.listStaff, prepare: mocks.prepare, decide: mocks.decide, createStaff: mocks.createStaff, resendInvitation: mocks.resendInvitation },
}));

const access = {
  isExecutive: true, readOnly: false, canManageStaff: true,
  isInternalAudit: false, staffDepartments: ['executive'],
  capabilities: ['staff.access.manage'],
  assignableDepartments: [
    { id: 'finance', label: 'Finance', readOnly: false },
    { id: 'internal_audit', label: 'Internal Audit (read-only)', readOnly: true },
  ],
};

describe('StaffAccessChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ adminAccess: { ...access, profileId: 'exec-profile' }, activeProfile: { id: 'exec-profile' }, user: { _id: 'executive-1', role: 'admin' } });
    mocks.list.mockResolvedValue([]);
    mocks.listStaff.mockResolvedValue({ staff: [
      { identityId: 'executive-1', name: 'Executive', email: 'exec@example.test', role: 'admin', departments: ['executive'] },
      { identityId: 'target-1', name: 'Ada Example', email: 'ada@example.test', role: 'admin', accountStatus: 'active', emailVerified: true, phoneVerified: false, departments: ['finance'] },
      { identityId: 'buyer-1', name: 'Buyer Example', email: 'buyer@example.test', role: 'buyer', departments: [] },
    ], nextCursor: null });
    mocks.begin.mockResolvedValue(true);
    mocks.complete.mockResolvedValue({ ok: true, value: { id: 'change-1', targetIdentityId: 'target-1', departments: ['finance'], state: 'prepared', preparedBy: 'executive-1', version: 0 } });
  });

  it('loads the staff directory and excludes the current identity and ineligible targets', async () => {
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Staff access' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.listStaff).toHaveBeenCalledWith({ limit: 25, includeUnassigned: true }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toContain('Ada Example · ada@example.test');
    expect(options.map((option) => option.textContent)).not.toContain('Executive · exec@example.test');
    expect(options.map((option) => option.textContent)).not.toContain('Buyer Example · buyer@example.test');
  });

  it('binds the exact selected account and server-assignable departments to the prepare challenge', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Staff access' });
    await user.selectOptions(screen.getByLabelText('Admin account to update'), 'target-1');
    expect(screen.getAllByLabelText('Finance')[1]).toBeChecked();
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
    await user.selectOptions(screen.getByLabelText('Admin account to update'), 'target-1');
    await user.click(screen.getAllByLabelText('Finance')[1]);
    await user.click(screen.getAllByLabelText(/Internal Audit \(read-only\)/)[1]);
    await user.click(screen.getByRole('button', { name: 'Prepare with authenticator' }));
    await waitFor(() => expect(mocks.begin).toHaveBeenCalledOnce());
    expect(mocks.begin.mock.calls[0][0].body.departments).toEqual(['internal_audit']);
  });

  it('requires an explicit removal action instead of interpreting an empty selection as a removal', async () => {
    mocks.listStaff.mockResolvedValueOnce({ staff: [
      { identityId: 'target-1', name: 'Ada Example', email: 'ada@example.test', role: 'admin', departments: [] },
    ], nextCursor: null });
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Staff access' });
    fireEvent.change(screen.getByLabelText('Admin account to update'), { target: { value: 'target-1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Prepare with authenticator' }));
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it('creates Admin staff using the departments returned by the active Executive projection', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Staff access' });
    await user.type(screen.getByLabelText('Full name'), 'New Admin');
    await user.type(screen.getByLabelText('Email address'), 'new-admin@example.test');
    await user.click(screen.getAllByLabelText('Finance')[0]);
    await user.click(screen.getByRole('button', { name: 'Create with authenticator' }));
    await waitFor(() => expect(mocks.begin).toHaveBeenCalledOnce());
    expect(mocks.begin.mock.calls[0][0]).toMatchObject({
      method: 'POST', path: '/api/admin/staff',
      body: { name: 'New Admin', email: 'new-admin@example.test', departments: ['finance'] },
    });
  });

  it('offers resend only for accounts requiring first login and binds the empty request body', async () => {
    mocks.listStaff.mockResolvedValueOnce({ staff: [
      { identityId: 'target-1', name: 'Ada Example', email: 'ada@example.test', role: 'admin', firstLoginRequired: true, invitation: { status: 'held' } },
      { identityId: 'target-2', name: 'Morgan Example', email: 'morgan@example.test', role: 'admin', firstLoginRequired: false },
    ], nextCursor: null });
    const user = userEvent.setup();
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Staff access' });
    const resendButtons = await screen.findAllByRole('button', { name: 'Resend invitation with authenticator' });
    expect(resendButtons).toHaveLength(1);
    await user.click(resendButtons[0]);
    await waitFor(() => expect(mocks.begin).toHaveBeenCalledOnce());
    expect(mocks.begin.mock.calls[0][0]).toMatchObject({
      method: 'POST', path: '/api/admin/staff/target-1/resend-invitation', body: {},
    });
  });

  it('shows the server invitation state and passes its opaque pagination cursor unchanged', async () => {
    const first = { identityId: 'target-1', name: 'Ada Example', email: 'ada@example.test', role: 'admin', departments: ['finance'], firstLoginRequired: true, invitation: { status: 'activation_pending', expiresAt: '2026-11-06T12:00:00.000Z' } };
    const second = { identityId: 'target-2', name: 'Grace Example', email: 'grace@example.test', role: 'admin', departments: ['technical'], firstLoginRequired: false, invitation: null };
    mocks.listStaff.mockReset().mockResolvedValueOnce({ staff: [first], nextCursor: 'opaque-cursor' }).mockResolvedValueOnce({ staff: [first, second], nextCursor: null });
    const user = userEvent.setup();
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    const ada = await screen.findByText('Ada Example');
    expect(ada.closest('li')).toHaveTextContent('Invitation: activation pending');
    await user.click(screen.getByRole('button', { name: 'Load more staff' }));
    expect(await screen.findByText('Grace Example')).toBeInTheDocument();
    expect(mocks.listStaff).toHaveBeenLastCalledWith({ limit: 25, after: 'opaque-cursor', includeUnassigned: true });
    expect(screen.getAllByText('Ada Example')).toHaveLength(1);
  });

  it('shows readable names and emails instead of account IDs in pending changes and review details', async () => {
    mocks.list.mockResolvedValueOnce([{
      id: 'change-reference', targetIdentityId: 'target-1', departments: ['finance'], state: 'prepared', preparedBy: 'executive-1', version: 0,
    }]);
    const user = userEvent.setup();
    const { container } = render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    const changeButton = await screen.findByRole('button', { name: /Ada Example \(ada@example\.test\)/ });
    await user.click(changeButton);
    expect(screen.getAllByText('Ada Example (ada@example.test)')).toHaveLength(2);
    expect(screen.getByText('Executive (exec@example.test)')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('target-1');
    expect(container).not.toHaveTextContent('executive-1');
    expect(container).not.toHaveTextContent('change-reference');
  });

  it('does not expose staff-management controls without the server-issued Executive access projection', async () => {
    mocks.useAuth.mockReturnValue({
      adminAccess: { ...access, isExecutive: false, canManageStaff: false, profileId: 'finance-profile', capabilities: ['staff.access.read'] },
      activeProfile: { id: 'finance-profile' }, user: { _id: 'finance-1', role: 'admin' },
    });
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Staff management unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create with authenticator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prepare with authenticator' })).not.toBeInTheDocument();
  });

  it('keeps staff management read-only for Internal Audit even if a capability is unexpectedly present', async () => {
    mocks.useAuth.mockReturnValue({
      adminAccess: { ...access, isExecutive: false, isInternalAudit: true, readOnly: true, canManageStaff: true, profileId: 'audit-profile', staffDepartments: ['internal_audit'], capabilities: ['staff.access.manage'] },
      activeProfile: { id: 'audit-profile' }, user: { _id: 'audit-1', role: 'admin' },
    });
    render(<MemoryRouter><StaffAccessChanges /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Staff management unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create with authenticator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prepare with authenticator' })).not.toBeInTheDocument();
  });
});
