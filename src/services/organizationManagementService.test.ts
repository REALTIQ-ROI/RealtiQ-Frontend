import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { organizationManagementService } from './organizationManagementService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe('organizationManagementService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads only the current profile roster with bounded paging', async () => {
    const page = { members: [], nextCursor: null };
    vi.mocked(api.get).mockResolvedValue({ data: page } as never);
    await expect(organizationManagementService.listMembers({ limit: 50, after: 'member-1' })).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith('/profiles/current/members', { params: { limit: 50, after: 'member-1' } });
  });

  it('binds a direct member addition to step-up without adding caller permissions', async () => {
    const response = { member: { id: 'membership-1', profileId: 'org-1', identityId: 'identity-1', role: 'viewer', deniedPermissions: [], state: 'active', ownerSeat: false, assignedOnly: false, assignedResources: [], version: 1 } };
    const body = { identityId: 'identity-1', role: 'viewer' as const };
    vi.mocked(api.post).mockResolvedValue({ data: response } as never);
    await expect(organizationManagementService.addMember(body, 'challenge-1')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/members', body, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('keeps invitation tokens out of query parameters and sends the token only in the claim body', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { profileId: 'org-1' } } as never);
    await organizationManagementService.claimInvitation('opaque-token');
    expect(api.post).toHaveBeenCalledWith('/profiles/invitations/claim', { token: 'opaque-token' });
  });

  it('loads server-paginated invitation and role records without changing their cursors', async () => {
    const invitations = { invitations: [], pagination: { page: 2, limit: 20, total: 21, pages: 2 } };
    const roles = { roles: [], nextCursor: 'opaque-role-cursor' };
    vi.mocked(api.get).mockResolvedValueOnce({ data: invitations } as never).mockResolvedValueOnce({ data: roles } as never);

    await expect(organizationManagementService.listInvitations({ page: 2, limit: 20 })).resolves.toEqual(invitations);
    await expect(organizationManagementService.listRoles({ limit: 25, after: 'role-cursor', includeDisabled: true })).resolves.toEqual(roles);
    expect(api.get).toHaveBeenNthCalledWith(1, '/profiles/current/invitations', { params: { page: 2, limit: 20 } });
    expect(api.get).toHaveBeenNthCalledWith(2, '/profiles/current/roles', { params: { limit: 25, after: 'role-cursor', includeDisabled: true } });
  });

  it('submits a custom role revision with its expected version and bound challenge', async () => {
    const body = { name: 'Listing reviewer', permissions: ['listing.read', 'listing.confirm'], expectedVersion: 4 };
    const response = { role: { id: 'role-1', name: body.name, permissions: body.permissions, version: 5 } };
    vi.mocked(api.patch).mockResolvedValue({ data: response } as never);

    await expect(organizationManagementService.updateRole('role-1', body, 'challenge-1')).resolves.toEqual(response);
    expect(api.patch).toHaveBeenCalledWith('/profiles/current/roles/role-1', body, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('sets role state using the exact versioned step-up contract', async () => {
    const body = { enabled: false, expectedVersion: 4 };
    const response = { role: { id: 'role-1', name: 'Listing reviewer', permissions: ['listing.read'], version: 5, disabledAt: '2026-11-07T10:00:00.000Z' } };
    vi.mocked(api.post).mockResolvedValue({ data: response } as never);

    await expect(organizationManagementService.setRoleState('role-1', body, 'challenge-state')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/roles/role-1/state', body, { headers: { 'X-Step-Up-Challenge': 'challenge-state' } });
  });

  it('keeps unconfigured seat plans unavailable and binds seat purchase body to the challenge', async () => {
    const plans = { state: 'unconfigured', plans: [], errorCode: 'FEATURE_POLICY_UNCONFIGURED' };
    const purchase = { purchase: { id: 'purchase-1', profileId: 'org-1', membershipId: 'membership-1', plan: 'returned-plan', reference: 'ref-1', state: 'pending', createdAt: '2026-11-07T10:00:00.000Z' } };
    const body = { membershipId: 'membership-1', planKey: 'returned-plan', operationKey: 'seat_operation_1' };
    vi.mocked(api.get).mockResolvedValue({ data: plans } as never);
    vi.mocked(api.post).mockResolvedValue({ data: purchase } as never);

    await expect(organizationManagementService.listSeatPlans()).resolves.toEqual(plans);
    await expect(organizationManagementService.purchaseSeat(body, 'challenge-2')).resolves.toEqual(purchase);
    expect(api.get).toHaveBeenCalledWith('/profiles/current/seat-plans');
    expect(api.post).toHaveBeenCalledWith('/profiles/current/seat-purchases', body, { headers: { 'X-Step-Up-Challenge': 'challenge-2' } });
  });

  it('reads mandates and signatories using only the selected profile resource routes', async () => {
    const mandates = { mandates: [], nextCursor: null };
    const signatories = { signatories: [], nextCursor: null };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mandates } as never).mockResolvedValueOnce({ data: signatories } as never);
    await expect(organizationManagementService.listMandates({ limit: 50 })).resolves.toEqual(mandates);
    await expect(organizationManagementService.listSignatories({ limit: 50 })).resolves.toEqual(signatories);
    expect(api.get).toHaveBeenNthCalledWith(1, '/profiles/current/mandates', { params: { limit: 50 } });
    expect(api.get).toHaveBeenNthCalledWith(2, '/profiles/current/signatories', { params: { limit: 50 } });
  });

  it('uses the confirmed mandate action and authority-history contracts', async () => {
    const mandate = { id: 'mandate-1', ownerProfileId: 'owner-1', agentProfileId: 'agent-1', resourceKind: 'property', resourceId: 'property-1', type: 'exclusive', permissions: ['listing.read'], state: 'accepted', startsAt: '2026-11-01T00:00:00.000Z', expiresAt: '2027-11-01T00:00:00.000Z', version: 2 };
    const history = { events: [], nextCursor: 'opaque-history-cursor' };
    const body = { expectedVersion: 2 };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { mandate } } as never);
    vi.mocked(api.get).mockResolvedValueOnce({ data: history } as never);

    await expect(organizationManagementService.actOnMandate('mandate-1', 'accept', body, 'challenge-mandate')).resolves.toEqual({ mandate });
    await expect(organizationManagementService.listAuthorityHistory({ limit: 20, before: 'opaque-history-cursor' })).resolves.toEqual(history);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/mandates/mandate-1/accept', body, { headers: { 'X-Step-Up-Challenge': 'challenge-mandate' } });
    expect(api.get).toHaveBeenCalledWith('/profiles/current/authority-history', { params: { limit: 20, before: 'opaque-history-cursor' } });
  });

  it('submits a mandate using only its documented request fields and challenge header', async () => {
    const body = { agentProfileId: 'agent-profile-1', resourceKind: 'project' as const, resourceId: 'project-1', type: 'exclusive' as const, permissions: ['listing.read'], startsAt: '2026-11-07T00:00:00.000Z', expiresAt: '2027-11-07T00:00:00.000Z' };
    const response = { mandate: { id: 'mandate-1', ownerProfileId: 'company-profile-1', ...body, state: 'pending', version: 1 } };
    vi.mocked(api.post).mockResolvedValue({ data: response } as never);

    await expect(organizationManagementService.createMandate(body, 'challenge-create-mandate')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/mandates', body, { headers: { 'X-Step-Up-Challenge': 'challenge-create-mandate' } });
  });

  it('loads purchase details and audit through their selected-profile routes', async () => {
    const purchase = { id: 'purchase-1', profileId: 'org-1', membershipId: 'member-1', plan: 'returned-plan', reference: 'ref-1', state: 'pending', createdAt: '2026-11-07T10:00:00.000Z' };
    const audit = { events: [], nextCursor: null };
    vi.mocked(api.get).mockResolvedValueOnce({ data: { purchase } } as never).mockResolvedValueOnce({ data: audit } as never);

    await expect(organizationManagementService.getSeatPurchase('purchase-1')).resolves.toEqual({ purchase });
    await expect(organizationManagementService.listSeatPurchaseAudit('purchase-1', { limit: 25 })).resolves.toEqual(audit);
    expect(api.get).toHaveBeenNthCalledWith(1, '/profiles/current/seat-purchases/purchase-1');
    expect(api.get).toHaveBeenNthCalledWith(2, '/profiles/current/seat-purchases/purchase-1/audit', { params: { limit: 25 } });
  });

  it('cancels a seat purchase only with the exact empty-body step-up request', async () => {
    const response = { purchase: { id: 'purchase-1', profileId: 'org-1', membershipId: 'member-1', plan: 'returned-plan', reference: 'ref-1', state: 'cancelled', createdAt: '2026-11-07T10:00:00.000Z' } };
    vi.mocked(api.post).mockResolvedValue({ data: response } as never);

    await expect(organizationManagementService.cancelSeatPurchase('purchase-1', 'challenge-cancel')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/seat-purchases/purchase-1/cancel', {}, { headers: { 'X-Step-Up-Challenge': 'challenge-cancel' } });
  });
});
