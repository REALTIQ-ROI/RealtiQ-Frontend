import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrganizationManagement from './OrganizationManagement';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useBoundStepUp: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  cancel: vi.fn(),
  listMembers: vi.fn(),
  listInvitations: vi.fn(),
  listRoles: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  setRoleState: vi.fn(),
  listMandates: vi.fn(),
  createMandate: vi.fn(),
  actOnMandate: vi.fn(),
  listAuthorityHistory: vi.fn(),
  listSignatories: vi.fn(),
  listSeatPlans: vi.fn(),
  getSeats: vi.fn(),
  listSeatPurchases: vi.fn(),
  getSeatPurchase: vi.fn(),
  listSeatPurchaseAudit: vi.fn(),
  purchaseSeat: vi.fn(),
  renewSeat: vi.fn(),
  cancelSeatPurchase: vi.fn(),
  reconcileSeatPurchase: vi.fn(),
  addMember: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
  issueInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  claimInvitation: vi.fn(),
  refreshProfiles: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: mocks.useBoundStepUp }));
vi.mock('../../components/layout/BuyerPortalLayout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../components/auth/StepUpDialog', () => ({ default: () => null }));
vi.mock('../../services/organizationManagementService', () => ({
  organizationManagementService: {
    listMembers: mocks.listMembers,
    listInvitations: mocks.listInvitations,
    listRoles: mocks.listRoles,
    createRole: mocks.createRole,
    updateRole: mocks.updateRole,
    setRoleState: mocks.setRoleState,
    listMandates: mocks.listMandates,
    createMandate: mocks.createMandate,
    actOnMandate: mocks.actOnMandate,
    listAuthorityHistory: mocks.listAuthorityHistory,
    listSignatories: mocks.listSignatories,
    listSeatPlans: mocks.listSeatPlans,
    getSeats: mocks.getSeats,
    listSeatPurchases: mocks.listSeatPurchases,
    getSeatPurchase: mocks.getSeatPurchase,
    listSeatPurchaseAudit: mocks.listSeatPurchaseAudit,
    purchaseSeat: mocks.purchaseSeat,
    renewSeat: mocks.renewSeat,
    cancelSeatPurchase: mocks.cancelSeatPurchase,
    reconcileSeatPurchase: mocks.reconcileSeatPurchase,
    addMember: mocks.addMember,
    updateMember: mocks.updateMember,
    removeMember: mocks.removeMember,
    issueInvitation: mocks.issueInvitation,
    cancelInvitation: mocks.cancelInvitation,
    claimInvitation: mocks.claimInvitation,
  },
}));

describe('OrganizationManagement policy and authority UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('activeProfileId', 'company-profile-1');
    mocks.useAuth.mockReturnValue({
      activeProfile: { id: 'company-profile-1', structure: 'company', permissions: ['dashboard.read', 'team.manage', 'roles.manage'] },
      refreshProfiles: mocks.refreshProfiles,
    });
    mocks.useBoundStepUp.mockReturnValue({ challenge: null, busy: false, error: null, begin: mocks.begin, complete: mocks.complete, cancel: mocks.cancel });
    mocks.listMembers.mockResolvedValue({ members: [], nextCursor: null });
    mocks.listInvitations.mockResolvedValue({ invitations: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    mocks.listRoles.mockResolvedValue({ roles: [], nextCursor: null });
    mocks.listMandates.mockResolvedValue({ mandates: [], nextCursor: null });
    mocks.listSignatories.mockResolvedValue({ signatories: [], nextCursor: null });
    mocks.listAuthorityHistory.mockResolvedValue({ events: [], nextCursor: null });
    mocks.listSeatPlans.mockResolvedValue({ state: 'unconfigured', plans: [], errorCode: 'FEATURE_POLICY_UNCONFIGURED' });
    mocks.getSeats.mockResolvedValue({ profileId: 'company-profile-1', includedHolderSeat: true, paidSeats: [], counts: { paidActive: 0, paidPending: 0, totalMembers: 1 } });
    mocks.listSeatPurchases.mockResolvedValue({ purchases: [], nextCursor: null });
    mocks.begin.mockResolvedValue(true);
  });

  it('keeps invitation creation disabled without a readiness endpoint and respects unconfigured seat plans', async () => {
    render(<OrganizationManagement />);

    expect(await screen.findByText(/Invitation availability is unconfirmed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send invitation with authenticator/ })).toBeDisabled();
    expect(await screen.findByText(/Additional seats are unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with authenticator/ })).not.toBeInTheDocument();
  });

  it('uses the returned role version for an authenticator-bound state change', async () => {
    mocks.listRoles.mockResolvedValue({ roles: [{ id: 'role-1', name: 'Listings reviewer', permissions: ['listing.read'], version: 7 }], nextCursor: null });
    render(<OrganizationManagement />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Disable role with authenticator' }));

    await waitFor(() => expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/profiles/current/roles/role-1/state',
      body: { enabled: false, expectedVersion: 7 },
    })));
  });

  it('uses only the current mandate version and documented action path', async () => {
    mocks.listMandates.mockResolvedValue({ mandates: [{ id: 'mandate-1', ownerProfileId: 'company-profile-1', agentProfileId: 'agent-profile-1', resourceKind: 'property', resourceId: 'property-1', type: 'exclusive', permissions: ['listing.read'], state: 'pending', startsAt: '2026-11-01T00:00:00.000Z', expiresAt: '2027-11-01T00:00:00.000Z', version: 3 }], nextCursor: null });
    render(<OrganizationManagement />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Accept with authenticator' }));

    await waitFor(() => expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/profiles/current/mandates/mandate-1/accept',
      body: { expectedVersion: 3 },
    })));
  });
});
