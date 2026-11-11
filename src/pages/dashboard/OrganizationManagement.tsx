import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import StepUpDialog from '../../components/auth/StepUpDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { organizationManagementService, type OrganizationAuthorityHistoryPage, type OrganizationInvitation, type OrganizationMandate, type OrganizationMandateAction, type OrganizationMember, type OrganizationRole, type OrganizationRoleDefinition, type OrganizationSeatPurchase, type OrganizationSeatPurchaseAuditPage, type OrganizationSeats, type OrganizationSeatPlans, type OrganizationSignatory } from '../../services/organizationManagementService';
import { formatMoneyMinor } from '../../utils/moneyMinor';
import SeatRenewalPreferences from '../../components/billing/SeatRenewalPreferences';

type MutationResult = { member?: OrganizationMember; invitation?: OrganizationInvitation; role?: OrganizationRoleDefinition; mandate?: OrganizationMandate; purchase?: OrganizationSeatPurchase };
const grantableRoles: OrganizationRole[] = ['administrator', 'sales_agent', 'project_editor', 'finance', 'viewer'];
const rolePermissions = [
  'dashboard.read', 'team.manage', 'roles.manage', 'listing.read', 'listing.edit', 'listing.price', 'listing.media',
  'listing.publish', 'listing.boost', 'listing.confirm', 'project.edit', 'enquiry.read', 'enquiry.reply', 'message.read',
  'message.reply', 'negotiation.read', 'negotiation.propose', 'terms.accept', 'viewing.manage', 'document.read',
  'document.share', 'document.request.approve', 'document.issue', 'payment.read', 'payment.initiate', 'payment.manage',
  'escrow.read', 'escrow.claim', 'payout.manage', 'notification.read', 'notification.preferences', 'personalisation.read',
  'personalisation.manage',
] as const;

const seatPurchasePlanLabel = (purchase: OrganizationSeatPurchase) =>
  typeof purchase.plan === 'string' ? purchase.plan : `${purchase.plan.label} · ${purchase.plan.billingPeriod} · ${formatMoneyMinor(purchase.plan.grossMinor ?? purchase.plan.amountMinor, purchase.plan.currency)}`;

const OrganizationManagement = () => {
  const { activeProfile, refreshProfiles } = useAuth();
  // The current organization API contract has no profile-scoped invitation-policy readiness read.
  const invitationAvailabilityConfirmed = false;
  const permissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const canManage = Boolean(activeProfile && ['company', 'cooperative'].includes(activeProfile.structure) && permissions.includes('team.manage'));
  const canManageRoles = canManage && permissions.includes('roles.manage');
  const canReadOrganization = Boolean(activeProfile && ['company', 'cooperative'].includes(activeProfile.structure) && permissions.includes('dashboard.read'));
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [issuedInvitations, setIssuedInvitations] = useState<OrganizationInvitation[]>([]);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [invitationsTotalPages, setInvitationsTotalPages] = useState(1);
  const [roles, setRoles] = useState<OrganizationRoleDefinition[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, { name: string; permissions: string[] }>>({});
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [mandates, setMandates] = useState<OrganizationMandate[]>([]);
  const [authorityHistory, setAuthorityHistory] = useState<OrganizationAuthorityHistoryPage>({ events: [], nextCursor: null });
  const [signatories, setSignatories] = useState<OrganizationSignatory[]>([]);
  const [seatPlans, setSeatPlans] = useState<OrganizationSeatPlans | null>(null);
  const [seats, setSeats] = useState<OrganizationSeats | null>(null);
  const [seatPurchases, setSeatPurchases] = useState<OrganizationSeatPurchase[]>([]);
  const [seatPurchasesCursor, setSeatPurchasesCursor] = useState<string | null>(null);
  const [selectedSeatPurchaseId, setSelectedSeatPurchaseId] = useState('');
  const [selectedSeatPurchase, setSelectedSeatPurchase] = useState<OrganizationSeatPurchase | null>(null);
  const [selectedPurchaseAudit, setSelectedPurchaseAudit] = useState<OrganizationSeatPurchaseAuditPage>({ events: [], nextCursor: null });
  const [purchaseDetailLoading, setPurchaseDetailLoading] = useState(false);
  const [purchaseDetailError, setPurchaseDetailError] = useState('');
  const [purchaseAuditLoading, setPurchaseAuditLoading] = useState(false);
  const [purchaseAuditError, setPurchaseAuditError] = useState('');
  const [selectedSeatMember, setSelectedSeatMember] = useState('');
  const [selectedSeatPlan, setSelectedSeatPlan] = useState('');
  const [selectedSeatPeriod, setSelectedSeatPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [seatAction, setSeatAction] = useState<'purchase' | 'renew'>('purchase');
  const [saveSeatAuthorization, setSaveSeatAuthorization] = useState(false);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [extrasError, setExtrasError] = useState('');
  const [identityId, setIdentityId] = useState('');
  const [memberRole, setMemberRole] = useState('viewer');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const stepUp = useBoundStepUp<MutationResult>();
  const profileId = activeProfile?.id;
  const seatOperationStorageKey = profileId ? `realtiq.seatPurchaseOperation:${profileId}` : '';
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;
  const seatOperationRef = useRef<{ signature: string; key: string } | null>(null);
  const invitationOperationRef = useRef<{ signature: string; key: string } | null>(null);
  const purchaseDetailRequestRef = useRef(0);
  const selectedSeatPurchaseIdRef = useRef('');
  const isCurrentProfile = useCallback((expectedProfileId: string | undefined) => Boolean(expectedProfileId &&
    profileIdRef.current === expectedProfileId && localStorage.getItem('activeProfileId') === expectedProfileId), []);

  const loadMembers = useCallback(async (after?: string) => {
    if (!canManage) return;
    setLoading(true);
    setError('');
    try {
      const page = await organizationManagementService.listMembers({ limit: 50, ...(after ? { after } : {}) });
      if (!isCurrentProfile(profileId)) return;
      setMembers((current) => after ? [...current, ...page.members] : page.members);
      setCursor(page.nextCursor);
      setMemberRoleDrafts((current) => ({ ...current, ...Object.fromEntries(page.members.map((member) => [member.id, member.role === 'custom' && member.customRoleId ? `custom:${member.customRoleId}` : member.role])) }));
    } catch (raw) {
      if (isCurrentProfile(profileId)) setError(raw instanceof Error ? raw.message : 'Unable to load organization members.');
    } finally {
      if (isCurrentProfile(profileId)) setLoading(false);
    }
  }, [canManage, isCurrentProfile, profileId]);

  const loadInvitations = useCallback(async (pageNumber = 1) => {
    if (!canManage) return;
    setLoadingExtras(true);
    setExtrasError('');
    try {
      const result = await organizationManagementService.listInvitations({ page: pageNumber, limit: 20 });
      if (!isCurrentProfile(profileId)) return;
      setIssuedInvitations(result.invitations);
      setInvitationsPage(result.pagination.page);
      setInvitationsTotalPages(result.pagination.pages);
    } catch (raw) {
      if (isCurrentProfile(profileId)) setExtrasError(raw instanceof Error ? raw.message : 'Unable to load current invitations.');
    } finally { if (isCurrentProfile(profileId)) setLoadingExtras(false); }
  }, [canManage, isCurrentProfile, profileId]);

  const loadRoles = useCallback(async () => {
    if (!canManageRoles) return;
    setLoadingExtras(true);
    setExtrasError('');
    try {
      const result = await organizationManagementService.listRoles({ limit: 100, includeDisabled: true });
      if (!isCurrentProfile(profileId)) return;
      setRoles(result.roles);
      setRoleDrafts(Object.fromEntries(result.roles.map((role) => [role.id, { name: role.name, permissions: [...role.permissions] }])));
    } catch (raw) {
      if (isCurrentProfile(profileId)) setExtrasError(raw instanceof Error ? raw.message : 'Unable to load organization roles.');
    } finally { if (isCurrentProfile(profileId)) setLoadingExtras(false); }
  }, [canManageRoles, isCurrentProfile, profileId]);

  const loadOrganizationContext = useCallback(async () => {
    if (!profileId) return;
    setLoadingExtras(true);
    setExtrasError('');
    try {
      const [mandateResult, signatoryResult, authorityResult, planResult, seatResult, purchaseResult] = await Promise.allSettled([
        canReadOrganization ? organizationManagementService.listMandates({ limit: 50 }) : Promise.resolve(null),
        canManage ? organizationManagementService.listSignatories({ limit: 50 }) : Promise.resolve(null),
        canManage ? organizationManagementService.listAuthorityHistory({ limit: 25 }) : Promise.resolve(null),
        canReadOrganization ? organizationManagementService.listSeatPlans() : Promise.resolve(null),
        canReadOrganization ? organizationManagementService.getSeats() : Promise.resolve(null),
        canReadOrganization ? organizationManagementService.listSeatPurchases({ limit: 25 }) : Promise.resolve(null),
      ]);
      if (!isCurrentProfile(profileId)) return;
      if (mandateResult.status === 'fulfilled' && mandateResult.value) setMandates(mandateResult.value.mandates);
      if (signatoryResult.status === 'fulfilled' && signatoryResult.value) setSignatories(signatoryResult.value.signatories);
      if (authorityResult.status === 'fulfilled' && authorityResult.value) setAuthorityHistory(authorityResult.value);
      if (planResult.status === 'fulfilled') setSeatPlans(planResult.value);
      if (seatResult.status === 'fulfilled') setSeats(seatResult.value);
      if (purchaseResult.status === 'fulfilled' && purchaseResult.value) {
        setSeatPurchases(purchaseResult.value.purchases);
        setSeatPurchasesCursor(purchaseResult.value.nextCursor);
      }
      if (seatResult.status === 'fulfilled' && seatResult.value?.paidSeats.length) setSelectedSeatMember((current) => current || seatResult.value!.paidSeats[0].membershipId);
      if (planResult.status === 'fulfilled' && planResult.value?.plans.length) {
        const firstPlanKey = planResult.value.plans.find((plan) => plan.key && plan.terms.length)?.key;
        if (firstPlanKey) setSelectedSeatPlan((current) => current || firstPlanKey);
      }
      const failures = [mandateResult, signatoryResult, authorityResult, planResult, seatResult, purchaseResult]
        .filter((item): item is PromiseRejectedResult => item.status === 'rejected')
        .map((item) => item.reason instanceof Error ? item.reason.message : 'Some organization records could not be loaded.');
      setExtrasError(failures.join(' '));
    } finally { if (isCurrentProfile(profileId)) setLoadingExtras(false); }
  }, [canManage, canReadOrganization, isCurrentProfile, profileId]);

  useEffect(() => {
    setMembers([]); setCursor(null); setIssuedInvitations([]); setRoles([]); setMandates([]); setAuthorityHistory({ events: [], nextCursor: null }); setSignatories([]);
    setSeatPlans(null); setSeats(null); setSeatPurchases([]); setSeatPurchasesCursor(null); setMemberRoleDrafts({}); setRoleDrafts({});
    setSelectedSeatMember(''); setSelectedSeatPlan(''); setSelectedSeatPeriod('monthly'); setSaveSeatAuthorization(false); setSelectedSeatPurchaseId(''); selectedSeatPurchaseIdRef.current = ''; purchaseDetailRequestRef.current += 1;
    setSelectedSeatPurchase(null); setSelectedPurchaseAudit({ events: [], nextCursor: null }); setPurchaseDetailError(''); setPurchaseAuditError(''); setPurchaseDetailLoading(false); setPurchaseAuditLoading(false);
    seatOperationRef.current = null;
    invitationOperationRef.current = null;
    void loadMembers();
    void loadInvitations();
    void loadRoles();
    void loadOrganizationContext();
  }, [profileId, loadMembers, loadInvitations, loadRoles, loadOrganizationContext]);

  const beginAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!identityId.trim() || !canManage || stepUp.busy || stepUp.challenge) return;
    const roleGrant = memberRole.startsWith('custom:')
      ? { role: 'custom' as const, customRoleId: memberRole.slice('custom:'.length) }
      : { role: memberRole as OrganizationRole };
    const body = { identityId: identityId.trim(), ...roleGrant };
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/members', body, label: 'Add an organization member', execute: (challengeId, exactBody) => organizationManagementService.addMember(exactBody, challengeId) });
  };

  const beginChangeRole = async (member: OrganizationMember) => {
    const role = memberRoleDrafts[member.id];
    const unchanged = role === (member.role === 'custom' && member.customRoleId ? `custom:${member.customRoleId}` : member.role);
    if (!role || unchanged || member.ownerSeat || !canManage || stepUp.busy || stepUp.challenge) return;
    const roleGrant = role.startsWith('custom:')
      ? { role: 'custom' as const, customRoleId: role.slice('custom:'.length) }
      : { role: role as OrganizationRole };
    const body = { expectedVersion: member.version, ...roleGrant };
    await stepUp.begin({ method: 'PATCH', path: `/api/profiles/current/members/${encodeURIComponent(member.id)}`, body, label: `Change member role for ${member.identityId}`, execute: (challengeId, exactBody) => organizationManagementService.updateMember(member.id, exactBody, challengeId) });
  };

  const beginRemove = async (member: OrganizationMember) => {
    if (member.ownerSeat || !canManage || stepUp.busy || stepUp.challenge) return;
    if (!window.confirm(`Remove membership for ${member.identityId}? The server will recheck the current seat, role and version.`)) return;
    const body = { expectedVersion: member.version };
    await stepUp.begin({ method: 'POST', path: `/api/profiles/current/members/${encodeURIComponent(member.id)}/remove`, body, label: `Remove organization member ${member.identityId}`, execute: (challengeId) => organizationManagementService.removeMember(member.id, body.expectedVersion, challengeId) });
  };

  const beginIssueInvitation = async (event: FormEvent) => {
    event.preventDefault();
    if (!invitationAvailabilityConfirmed) return;
    if (!inviteEmail.trim() || !canManage || stepUp.busy || stepUp.challenge) return;
    const grant = inviteRole.startsWith('custom:')
      ? { role: 'custom' as const, customRoleId: inviteRole.slice('custom:'.length) }
      : { role: inviteRole as OrganizationRole };
    const signature = JSON.stringify({ email: inviteEmail.trim(), grant, profileId });
    if (invitationOperationRef.current?.signature !== signature) invitationOperationRef.current = { signature, key: `org_invite_${crypto.randomUUID()}` };
    const body = { email: inviteEmail.trim(), grant, operationKey: invitationOperationRef.current.key };
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/invitations', body, label: 'Invite a member to this organization', execute: (challengeId, exactBody) => organizationManagementService.issueInvitation(exactBody, challengeId) });
  };

  const beginCreateRole = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageRoles || !newRoleName.trim() || !newRolePermissions.length || stepUp.busy || stepUp.challenge) return;
    const body = { name: newRoleName.trim(), permissions: [...newRolePermissions] };
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/roles', body, label: 'Create organization role', execute: (challengeId, exactBody) => organizationManagementService.createRole(exactBody, challengeId) });
  };

  const beginSaveRole = async (role: OrganizationRoleDefinition) => {
    const draft = roleDrafts[role.id];
    if (!canManageRoles || !draft || !draft.name.trim() || !draft.permissions.length || (draft.name === role.name && JSON.stringify(draft.permissions) === JSON.stringify(role.permissions)) || stepUp.busy || stepUp.challenge) return;
    const body = { name: draft.name.trim(), permissions: [...draft.permissions], expectedVersion: role.version };
    await stepUp.begin({ method: 'PATCH', path: `/api/profiles/current/roles/${encodeURIComponent(role.id)}`, body, label: 'Update organization role', execute: (challengeId, exactBody) => organizationManagementService.updateRole(role.id, exactBody, challengeId) });
  };

  const beginSetRoleState = async (role: OrganizationRoleDefinition, enabled: boolean) => {
    if (!canManageRoles || stepUp.busy || stepUp.challenge) return;
    const body = { enabled, expectedVersion: role.version };
    await stepUp.begin({ method: 'POST', path: `/api/profiles/current/roles/${encodeURIComponent(role.id)}/state`, body, label: `${enabled ? 'Enable' : 'Disable'} organization role`, execute: (challengeId, exactBody) => organizationManagementService.setRoleState(role.id, exactBody, challengeId) });
  };

  const beginMandateAction = async (mandate: OrganizationMandate, action: OrganizationMandateAction) => {
    if (!canManage || stepUp.busy || stepUp.challenge) return;
    const body = { expectedVersion: mandate.version };
    await stepUp.begin({ method: 'POST', path: `/api/profiles/current/mandates/${encodeURIComponent(mandate.id)}/${action}`, body, label: `${action.replaceAll('-', ' ')} agent mandate`, execute: (challengeId, exactBody) => organizationManagementService.actOnMandate(mandate.id, action, exactBody, challengeId) });
  };

  const beginSeatPurchase = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || seatPlans?.state !== 'configured' || !seats || !selectedSeatMember || !selectedSeatPlan || stepUp.busy || stepUp.challenge) return;
    const selectedPlan = seatPlans.plans.find((plan) => plan.key === selectedSeatPlan);
    if (!selectedPlan?.terms.some((term) => term.period === selectedSeatPeriod)) { setExtrasError('Choose a current plan and billing period returned by the server.'); return; }
    const unresolved = seatPurchases.find((purchase) => purchase.membershipId === selectedSeatMember && ['initializing', 'pending', 'outcome_unknown', 'review_required'].includes(purchase.state));
    if (unresolved) { setExtrasError(`A seat purchase is already ${unresolved.state.replaceAll('_', ' ')}. Reconcile that purchase before starting another.`); return; }
    const signature = JSON.stringify({ profileId, seatAction, selectedSeatMember, selectedSeatPlan, selectedSeatPeriod, saveSeatAuthorization: seatAction === 'purchase' && saveSeatAuthorization });
    const stored = seatOperationStorageKey ? sessionStorage.getItem(seatOperationStorageKey) : null;
    let prior: { signature: string; key: string } | null = null;
    if (stored) {
      try { const parsed = JSON.parse(stored) as { signature?: unknown; key?: unknown }; if (typeof parsed.signature === 'string' && typeof parsed.key === 'string') prior = { signature: parsed.signature, key: parsed.key }; }
      catch { setExtrasError('A saved seat payment attempt could not be read. Refresh the purchase list and contact support before starting another.'); return; }
    }
    if (stored && !prior) { setExtrasError('A saved seat payment attempt is incomplete. Review the purchase list and contact support before starting another.'); return; }
    if (prior && prior.signature !== signature) { setExtrasError('A prior seat payment request has an unresolved outcome. Reconcile that purchase before changing the member or plan.'); return; }
    if (seatOperationRef.current?.signature !== signature) seatOperationRef.current = prior ?? { signature, key: `seat_${crypto.randomUUID()}` };
    if (seatAction === 'purchase') {
      const body = { membershipId: selectedSeatMember, planKey: selectedSeatPlan, billingPeriod: selectedSeatPeriod, operationKey: seatOperationRef.current.key, ...(saveSeatAuthorization ? { saveAuthorizationForRenewal: true } : {}) };
      await stepUp.begin({ method: 'POST', path: '/api/profiles/current/seat-purchases', body, label: 'Purchase a team seat', execute: (challengeId, exactBody) => { if (seatOperationStorageKey) sessionStorage.setItem(seatOperationStorageKey, JSON.stringify({ signature, key: exactBody.operationKey })); return organizationManagementService.purchaseSeat(exactBody, challengeId); } });
    } else {
      const body = { planKey: selectedSeatPlan, billingPeriod: selectedSeatPeriod, operationKey: seatOperationRef.current.key };
      await stepUp.begin({ method: 'POST', path: `/api/profiles/current/seats/${encodeURIComponent(selectedSeatMember)}/renew`, body, label: 'Renew a team seat', execute: (challengeId, exactBody) => { if (seatOperationStorageKey) sessionStorage.setItem(seatOperationStorageKey, JSON.stringify({ signature, key: exactBody.operationKey })); return organizationManagementService.renewSeat(selectedSeatMember, exactBody, challengeId); } });
    }
  };

  const beginReconcilePurchase = async (purchase: OrganizationSeatPurchase) => {
    if (!canManage || stepUp.busy || stepUp.challenge) return;
    await stepUp.begin({ method: 'POST', path: `/api/profiles/current/seat-purchases/${encodeURIComponent(purchase.id)}/reconcile`, body: {}, label: 'Check seat payment status', execute: (challengeId) => organizationManagementService.reconcileSeatPurchase(purchase.id, challengeId) });
  };

  const beginCancelSeatPurchase = async (purchase: OrganizationSeatPurchase) => {
    if (!canManage || stepUp.busy || stepUp.challenge) return;
    if (!window.confirm('Ask the server to cancel this seat purchase? The server will decide whether it is still cancellable. Cancellation does not mean a refund.')) return;
    await stepUp.begin({ method: 'POST', path: `/api/profiles/current/seat-purchases/${encodeURIComponent(purchase.id)}/cancel`, body: {}, label: 'Cancel a team seat purchase', execute: (challengeId) => organizationManagementService.cancelSeatPurchase(purchase.id, challengeId) });
  };

  const loadMoreSeatPurchases = async () => {
    if (!seatPurchasesCursor || !isCurrentProfile(profileId)) return;
    setLoadingExtras(true); setExtrasError('');
    try {
      const result = await organizationManagementService.listSeatPurchases({ limit: 25, before: seatPurchasesCursor });
      if (!isCurrentProfile(profileId)) return;
      setSeatPurchases((current) => [...current, ...result.purchases.filter((purchase) => !current.some((item) => item.id === purchase.id))]);
      setSeatPurchasesCursor(result.nextCursor);
    } catch (raw) {
      if (isCurrentProfile(profileId)) setExtrasError(raw instanceof Error ? raw.message : 'Unable to load more seat purchases.');
    } finally { if (isCurrentProfile(profileId)) setLoadingExtras(false); }
  };

  const loadMoreAuthorityHistory = async () => {
    if (!authorityHistory.nextCursor || !isCurrentProfile(profileId)) return;
    setLoadingExtras(true); setExtrasError('');
    try {
      const result = await organizationManagementService.listAuthorityHistory({ limit: 25, before: authorityHistory.nextCursor });
      if (!isCurrentProfile(profileId)) return;
      setAuthorityHistory((current) => ({ events: [...current.events, ...result.events], nextCursor: result.nextCursor }));
    } catch (raw) {
      if (isCurrentProfile(profileId)) setExtrasError(raw instanceof Error ? raw.message : 'Unable to load more authority history.');
    } finally { if (isCurrentProfile(profileId)) setLoadingExtras(false); }
  };

  const openSeatPurchaseDetails = async (purchaseId: string) => {
    if (!isCurrentProfile(profileId)) return;
    const requestId = ++purchaseDetailRequestRef.current;
    selectedSeatPurchaseIdRef.current = purchaseId;
    setSelectedSeatPurchaseId(purchaseId); setSelectedSeatPurchase(null); setSelectedPurchaseAudit({ events: [], nextCursor: null });
    setPurchaseDetailError(''); setPurchaseAuditError(''); setPurchaseDetailLoading(true); setPurchaseAuditLoading(true);
    const [detailResult, auditResult] = await Promise.allSettled([
      organizationManagementService.getSeatPurchase(purchaseId),
      organizationManagementService.listSeatPurchaseAudit(purchaseId, { limit: 25 }),
    ]);
    if (requestId !== purchaseDetailRequestRef.current || selectedSeatPurchaseIdRef.current !== purchaseId || !isCurrentProfile(profileId)) return;
    if (detailResult.status === 'fulfilled') setSelectedSeatPurchase(detailResult.value.purchase);
    else setPurchaseDetailError(detailResult.reason instanceof Error ? detailResult.reason.message : 'Unable to load this purchase.');
    if (auditResult.status === 'fulfilled') setSelectedPurchaseAudit(auditResult.value);
    else setPurchaseAuditError(auditResult.reason instanceof Error ? auditResult.reason.message : 'Unable to load purchase history.');
    setPurchaseDetailLoading(false); setPurchaseAuditLoading(false);
  };

  const loadMorePurchaseAudit = async () => {
    const purchaseId = selectedSeatPurchaseId;
    const before = selectedPurchaseAudit.nextCursor;
    if (!purchaseId || !before || !isCurrentProfile(profileId)) return;
    const requestId = purchaseDetailRequestRef.current;
    setPurchaseAuditLoading(true); setPurchaseAuditError('');
    try {
      const result = await organizationManagementService.listSeatPurchaseAudit(purchaseId, { limit: 25, before });
      if (requestId !== purchaseDetailRequestRef.current || selectedSeatPurchaseIdRef.current !== purchaseId || !isCurrentProfile(profileId)) return;
      setSelectedPurchaseAudit((current) => ({ events: [...current.events, ...result.events], nextCursor: result.nextCursor }));
    } catch (raw) {
      if (requestId === purchaseDetailRequestRef.current && isCurrentProfile(profileId)) setPurchaseAuditError(raw instanceof Error ? raw.message : 'Unable to load more purchase history.');
    } finally {
      if (requestId === purchaseDetailRequestRef.current && isCurrentProfile(profileId)) setPurchaseAuditLoading(false);
    }
  };

  const beginCancelInvitation = async (invitation: OrganizationInvitation) => {
    if (!canManage || stepUp.busy || stepUp.challenge) return;
    const body = { expectedVersion: invitation.version };
    await stepUp.begin({ method: 'DELETE', path: `/api/profiles/current/invitations/${encodeURIComponent(invitation.id)}`, body, label: 'Cancel organization invitation', execute: (challengeId, exactBody) => organizationManagementService.cancelInvitation(invitation.id, exactBody.expectedVersion, challengeId) });
  };

  const completeMutation = async (code: string) => {
    setWorking(true);
    try {
      const result = await stepUp.complete(code);
      if (!result.ok) {
        setError(result.error ?? 'The organization change failed. Refresh current server state before reviewing it again.');
        return false;
      }
      if (result.value.member) {
        setMembers((current) => current.some((item) => item.id === result.value.member!.id)
          ? current.map((item) => item.id === result.value.member!.id ? result.value.member! : item)
          : [result.value.member!, ...current]);
        setIdentityId('');
      }
      if (result.value.invitation) {
        const invitation = result.value.invitation;
        setIssuedInvitations((current) => [invitation, ...current.filter((item) => item.id !== invitation.id)]);
        setInviteEmail('');
        invitationOperationRef.current = null;
      }
      if (result.value.role) {
        if (!roles.some((role) => role.id === result.value.role!.id)) { setNewRoleName(''); setNewRolePermissions([]); }
        await loadRoles();
      }
      if (result.value.mandate) {
        setMandates((current) => current.some((item) => item.id === result.value.mandate!.id)
          ? current.map((item) => item.id === result.value.mandate!.id ? result.value.mandate! : item)
          : [result.value.mandate!, ...current]);
        await loadOrganizationContext();
      }
      if (result.value.purchase) {
        if (['paid', 'cancelled', 'failed', 'reversed'].includes(result.value.purchase.state)) { seatOperationRef.current = null; if (seatOperationStorageKey) sessionStorage.removeItem(seatOperationStorageKey); }
        setNotice(`The server returned seat purchase state “${result.value.purchase.state}”. A payment redirect or request acceptance does not activate access; the server confirms entitlement separately.`);
        await loadOrganizationContext();
      } else {
        setNotice('The organization change was accepted. Review the refreshed server state below.');
      }
      await loadMembers();
      await loadInvitations(invitationsPage);
      return true;
    } finally {
      setWorking(false);
    }
  };

  const claimInvitation = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteToken.trim() || working) return;
    setWorking(true); setError(''); setNotice('');
    try {
      await organizationManagementService.claimInvitation(inviteToken.trim());
      setInviteToken('');
      await refreshProfiles();
      setNotice('The invitation claim was accepted. Refresh the profile switcher to use any newly granted organization access.');
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to claim this invitation. Check that it is current and belongs to the signed-in identity.');
    } finally { setWorking(false); }
  };

  const roleOptions = [
    ...grantableRoles.map((role) => ({ value: role, label: role.replaceAll('_', ' ') })),
    ...roles.filter((role) => !role.disabledAt).map((role) => ({ value: `custom:${role.id}`, label: `${role.name} (custom)` })),
  ];
  const renderedSeatPlans = seatPlans?.plans ?? [];
  const seatPlanKeys = renderedSeatPlans.filter((plan) => plan.key && plan.terms.length).map((plan) => plan.key);
  const selectedSeatTerms = renderedSeatPlans.find((plan) => plan.key === selectedSeatPlan)?.terms ?? [];
  const selectableSeatMembers = members.filter((member) => !member.ownerSeat);

  return <BuyerPortalLayout pageEyebrow="Organization" pageTitle="Team and invitations" pageSubtitle="Manage current organization memberships and invitations using the active profile's server-granted authority.">
    <div className="space-y-6">
      {error ? <ErrorState message={error} onRetry={() => void loadMembers()} /> : null}
      {extrasError ? <ErrorState message={extrasError} onRetry={() => { void loadInvitations(invitationsPage); void loadRoles(); void loadOrganizationContext(); }} /> : null}
      {notice ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
      <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
        <h3 className="text-lg font-bold">Claim an invitation</h3>
        <p className="mt-1 text-sm text-secondary">Paste the invitation token from the invitation message. It is submitted in the request body and is not added to the URL or saved after submission.</p>
        <form onSubmit={(event) => void claimInvitation(event)} className="mt-3 flex flex-wrap gap-2"><label className="sr-only" htmlFor="organization-invite-token">Invitation token</label><input id="organization-invite-token" type="password" autoComplete="off" value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} className="min-w-64 flex-1 rounded-lg border p-2 text-sm" placeholder="Invitation token" /><Button type="submit" disabled={!inviteToken.trim() || working}>{working ? 'Checking…' : 'Claim invitation'}</Button></form>
      </section>

      {canManage ? <>
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-outline-variant/10 bg-white p-5">
            <h3 className="text-lg font-bold">Add an existing identity</h3>
            <p className="mt-1 text-xs text-secondary">Add an identity already known to the organization. The server checks current grants and seat limits.</p>
            <form onSubmit={(event) => void beginAddMember(event)} className="mt-3 space-y-3">
              <label className="block text-xs font-bold">Identity ID<input required value={identityId} onChange={(event) => setIdentityId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
              <label className="block text-xs font-bold">Role<select value={memberRole} onChange={(event) => setMemberRole(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
              <Button type="submit" disabled={!identityId.trim() || stepUp.busy || Boolean(stepUp.challenge)}>Add member with authenticator</Button>
            </form>
          </div>
          <div className="rounded-xl border border-outline-variant/10 bg-white p-5">
            <h3 className="text-lg font-bold">Invite by email</h3>
            <p className="mt-1 text-xs text-secondary">The invitation token is delivered out of band. This page does not display or store it. A queued request does not confirm delivery.</p>
            <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Invitation availability is unconfirmed. The current API contract has no profile-scoped invitation-policy status route, so this form stays disabled until the server can report whether invitation policy and delivery configuration are ready.</p>
            <form onSubmit={(event) => void beginIssueInvitation(event)} className="mt-3 space-y-3">
              <label className="block text-xs font-bold">Email address<input disabled={!invitationAvailabilityConfirmed} required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal disabled:cursor-not-allowed disabled:bg-surface-container-low" /></label>
              <label className="block text-xs font-bold">Role<select disabled={!invitationAvailabilityConfirmed} value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal disabled:cursor-not-allowed disabled:bg-surface-container-low">{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
              <Button type="submit" disabled={!invitationAvailabilityConfirmed || !inviteEmail.trim() || stepUp.busy || Boolean(stepUp.challenge)}>Send invitation with authenticator</Button>
            </form>
            <div className="mt-4 border-t pt-3">
              <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold">Current invitations</h4><Button type="button" variant="secondary" disabled={loadingExtras} onClick={() => void loadInvitations(invitationsPage)}>Refresh</Button></div>
              {loadingExtras && !issuedInvitations.length ? <LoadingState label="Loading invitations…" /> : null}
              <ul className="mt-2 space-y-2">{issuedInvitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3 text-xs"><span><strong>{invitation.state.replaceAll('_', ' ')}</strong> · delivery request {invitation.delivery.state.replaceAll('_', ' ')} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>{!['accepted', 'cancelled', 'expired'].includes(invitation.state) ? <Button type="button" variant="secondary" onClick={() => void beginCancelInvitation(invitation)} disabled={stepUp.busy || Boolean(stepUp.challenge)}>Cancel invitation</Button> : null}</li>)}</ul>
              {!loadingExtras && !issuedInvitations.length ? <p className="mt-2 text-xs text-secondary">No invitations were returned for this page.</p> : null}
              <div className="mt-3 flex items-center justify-between"><Button type="button" variant="ghost" disabled={loadingExtras || invitationsPage <= 1} onClick={() => void loadInvitations(invitationsPage - 1)}>Previous</Button><span className="text-xs text-secondary">Page {invitationsPage} of {invitationsTotalPages}</span><Button type="button" variant="ghost" disabled={loadingExtras || invitationsPage >= invitationsTotalPages} onClick={() => void loadInvitations(invitationsPage + 1)}>Next</Button></div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Current roster</h3><p className="text-xs text-secondary">Effective roles and permissions remain controlled by the server. The included holder seat cannot be changed or removed.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={() => void loadMembers()}>Refresh roster</Button></div>
          {loading && !members.length ? <LoadingState label="Loading organization members…" /> : null}
          <div className="mt-4 space-y-2">{members.map((member) => {
            const currentRole = member.role === 'custom' && member.customRoleId ? `custom:${member.customRoleId}` : member.role;
            const draftRole = memberRoleDrafts[member.id] ?? currentRole;
            const options = roleOptions.some((item) => item.value === currentRole) ? roleOptions : [...roleOptions, { value: currentRole, label: 'Current custom role (not in current role list)' }];
            return <article key={member.id} className="grid gap-3 rounded-lg border border-outline-variant/15 p-3 md:grid-cols-[minmax(0,1fr)_auto]"><div><p className="break-all font-semibold">{member.identityId}{member.ownerSeat ? <span className="ml-2 rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-800">Holder seat</span> : null}</p><p className="mt-1 text-xs text-secondary">{member.role.replaceAll('_', ' ')} · {member.state} · version {member.version}{member.assignedOnly ? ' · assigned resources only' : ''}</p><p className="mt-1 text-[11px] text-secondary">{member.assignedResources.length ? member.assignedResources.map((resource) => `${resource.kind}:${resource.id}`).join(', ') : 'No assigned resource restriction returned'}</p>{member.deniedPermissions.length ? <p className="mt-1 text-[11px] text-secondary">Denied permissions: {member.deniedPermissions.join(', ')}</p> : null}</div>{member.ownerSeat ? <p className="text-xs text-secondary">The included holder seat cannot be altered or removed.</p> : <div className="flex flex-wrap items-center gap-2">{canManage ? <><select aria-label={`Role for ${member.identityId}`} value={draftRole} onChange={(event) => setMemberRoleDrafts((current) => ({ ...current, [member.id]: event.target.value }))} className="rounded-lg border p-2 text-xs">{options.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><Button type="button" variant="secondary" disabled={draftRole === currentRole || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginChangeRole(member)}>Save role</Button><Button type="button" variant="ghost" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginRemove(member)}>Remove</Button></> : null}</div>}</article>;
          })}{!loading && !members.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No organization members were returned for this profile.</p> : null}</div>
          {cursor ? <Button type="button" variant="secondary" className="mt-4" disabled={loading} onClick={() => void loadMembers(cursor)}>Load more members</Button> : null}
        </section>
      </> : <section className="rounded-xl border border-outline-variant/10 bg-white p-5"><h3 className="font-bold">Organization management is unavailable for this active profile</h3><p className="mt-1 text-sm text-secondary">Select an authorized company/cooperative profile with the server-granted `team.manage` permission. No account-level role hint grants organization authority.</p></section>}

      {canManageRoles ? <section className="rounded-xl border border-outline-variant/10 bg-white p-5" aria-labelledby="organization-roles-heading">
        <div className="flex items-center justify-between gap-3"><div><h3 id="organization-roles-heading" className="text-lg font-bold">Custom roles</h3><p className="mt-1 text-sm text-secondary">Choose only permissions supported by the current organization contract. The server checks that your own authority covers each grant.</p></div><Button type="button" variant="secondary" disabled={loadingExtras} onClick={() => void loadRoles()}>Refresh roles</Button></div>
        <form onSubmit={(event) => void beginCreateRole(event)} className="mt-4 rounded-lg bg-surface-container-low p-4"><label className="block text-xs font-bold">Role name<input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm font-normal" /></label><fieldset className="mt-3"><legend className="text-xs font-bold">Permissions</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rolePermissions.map((permission) => <label key={permission} className="flex gap-2 text-xs"><input type="checkbox" checked={newRolePermissions.includes(permission)} onChange={(event) => setNewRolePermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))} /><span>{permission}</span></label>)}</div></fieldset><Button type="submit" className="mt-3" disabled={!newRoleName.trim() || !newRolePermissions.length || stepUp.busy || Boolean(stepUp.challenge)}>Create role with authenticator</Button></form>
        <div className="mt-4 space-y-3">{roles.map((role) => { const draft = roleDrafts[role.id] ?? { name: role.name, permissions: role.permissions }; const isDisabled = Boolean(role.disabledAt); return <article key={role.id} className="rounded-lg border border-outline-variant/15 p-4"><label className="block text-xs font-bold">Role name<input value={draft.name} onChange={(event) => setRoleDrafts((current) => ({ ...current, [role.id]: { ...draft, name: event.target.value } }))} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label><p className="mt-2 text-xs text-secondary">Version {role.version} · {isDisabled ? `Disabled${role.disabledAt ? ` since ${new Date(role.disabledAt).toLocaleDateString()}` : ''}` : 'No disabled timestamp returned'}</p><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rolePermissions.map((permission) => <label key={permission} className="flex gap-2 text-xs"><input type="checkbox" checked={draft.permissions.includes(permission)} onChange={(event) => setRoleDrafts((current) => ({ ...current, [role.id]: { ...draft, permissions: event.target.checked ? [...draft.permissions, permission] : draft.permissions.filter((item) => item !== permission) } }))} /><span>{permission}</span></label>)}</div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={!draft.name.trim() || !draft.permissions.length || (draft.name === role.name && JSON.stringify(draft.permissions) === JSON.stringify(role.permissions)) || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginSaveRole(role)}>Save role with authenticator</Button><Button type="button" variant="ghost" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginSetRoleState(role, isDisabled)}>{isDisabled ? 'Enable role' : 'Disable role'} with authenticator</Button></div></article>; })}{!roles.length && !loadingExtras ? <p className="text-sm text-secondary">No role definitions were returned.</p> : null}</div>
      </section> : null}

      {canReadOrganization ? <section className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-outline-variant/10 bg-white p-5" aria-labelledby="mandates-heading"><h3 id="mandates-heading" className="text-lg font-bold">Agent mandates</h3><p className="mt-1 text-sm text-secondary">The server checks current owner/agent authority and accepts only current, resource-specific mandates. The request schema does not publish its resource permission allowlist, so mandate creation stays unavailable here.</p><ul className="mt-4 space-y-2">{mandates.map((mandate) => <li key={mandate.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><p className="font-semibold">{mandate.type.replaceAll('_', ' ')} mandate · {mandate.state.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-secondary">{mandate.resourceKind} · {mandate.resourceId} · starts {new Date(mandate.startsAt).toLocaleDateString()} · expires {new Date(mandate.expiresAt).toLocaleDateString()} · version {mandate.version}</p><p className="mt-1 text-xs">Permissions: {mandate.permissions.join(', ') || 'None returned'}</p>{canManage ? <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginMandateAction(mandate, 'accept')}>Accept with authenticator</Button><Button type="button" variant="ghost" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginMandateAction(mandate, 'decline')}>Decline with authenticator</Button><Button type="button" variant="ghost" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginMandateAction(mandate, 'revoke')}>Revoke with authenticator</Button></div> : null}</li>)}</ul>{!mandates.length ? <p className="mt-3 text-sm text-secondary">No mandates were returned for this profile.</p> : null}<Button type="button" variant="secondary" className="mt-3" disabled={loadingExtras} onClick={() => void loadOrganizationContext()}>Refresh authority records</Button><div className="mt-5 border-t pt-4"><h4 className="font-semibold">Authority history</h4><p className="mt-1 text-xs text-secondary">{authorityHistory.events.length} event(s) returned. The local contract does not define event fields, so details are not inferred.</p>{authorityHistory.nextCursor ? <Button type="button" variant="secondary" className="mt-3" disabled={loadingExtras} onClick={() => void loadMoreAuthorityHistory()}>Load more authority history</Button> : null}</div></section>
        <section className="rounded-xl border border-outline-variant/10 bg-white p-5" aria-labelledby="signatories-heading"><h3 id="signatories-heading" className="text-lg font-bold">Signatory requests</h3><p className="mt-1 text-sm text-secondary">Submission does not grant authority; independent staff review and current evidence are required.</p><ul className="mt-4 space-y-2">{signatories.map((signatory) => <li key={signatory.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><p className="font-semibold">{signatory.state.replaceAll('_', ' ')}</p><p className="mt-1 break-all text-xs text-secondary">Member identity {signatory.identityId} · expires {new Date(signatory.expiresAt).toLocaleDateString()}{signatory.reviewedAt ? ` · reviewed ${new Date(signatory.reviewedAt).toLocaleDateString()}` : ''} · version {signatory.version}</p></li>)}</ul>{!signatories.length ? <p className="mt-3 text-sm text-secondary">No signatory records were returned.</p> : null}</section>
      </section> : null}

      {canReadOrganization ? <section className="rounded-xl border border-outline-variant/10 bg-white p-5" aria-labelledby="seats-heading">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="seats-heading" className="text-lg font-bold">Team seats</h3><p className="mt-1 text-sm text-secondary">The holder seat is included. Paid seat access changes only after the server confirms the provider payment and entitlement.</p></div><Button type="button" variant="secondary" disabled={loadingExtras} onClick={() => void loadOrganizationContext()}>Refresh seat status</Button></div>
        {seatPlans?.state === 'unconfigured' ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Additional seats are unavailable because the server reports {seatPlans.errorCode ?? 'an unconfigured seat policy'}. No plan or price has been assumed.</p> : null}
        {seatPlans?.state === 'configured' ? <>
          <p className="mt-3 text-sm">Included holder seat: {seats?.includedHolderSeat ? 'Yes' : 'Not confirmed'} · paid active {seats?.counts.paidActive ?? '—'} · paid pending {seats?.counts.paidPending ?? '—'} · members {seats?.counts.totalMembers ?? '—'} · catalogue revision {seatPlans.revision ?? 'not returned'}</p>
          {seatPlans.renewalAvailability ? <div className="mt-2 text-sm"><p role="status">Renewal methods: {seatPlans.renewalAvailability.state.replaceAll('_', ' ')}. Manual renewal is {seatPlans.renewalAvailability.manual.available ? 'available' : 'unavailable'}.</p>{seatPlans.renewalAvailability.methods.map((item) => <p key={item.method}>{item.method.replaceAll('_', ' ')}: available{item.requiresActiveAuthorization ? ' with an active authorization' : ''}</p>)}{seatPlans.renewalAvailability.unavailableMethods.map((item) => <p key={item.method} className="text-secondary">{item.method.replaceAll('_', ' ')}: {item.reasonCode}</p>)}</div> : <p role="status" className="mt-2 text-sm">Renewal method availability was not returned. Refresh before setting a renewal preference.</p>}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {renderedSeatPlans.map((plan) => <article key={plan.key} className="rounded-lg bg-surface-container-low p-3 text-sm">
              <p className="font-semibold">{plan.label}</p>
              {plan.terms.map((term) => <p key={term.period}>{term.period}: {formatMoneyMinor(term.grossMinor, term.currency)} gross · {formatMoneyMinor(term.netMinor, term.currency)} net · {formatMoneyMinor(term.vatMinor, term.currency)} VAT</p>)}
            </article>)}
          </div>
          {!seatPlanKeys.length ? <p className="mt-3 text-xs text-amber-900">No purchasable seat terms were returned by the current catalogue.</p> :
            <form onSubmit={(event) => void beginSeatPurchase(event)} className="mt-4 grid gap-3 rounded-lg border border-outline-variant/15 p-4 sm:grid-cols-2">
              <label className="text-xs font-bold">Seat member<select value={selectedSeatMember} onChange={(event) => setSelectedSeatMember(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="">Choose a member</option>{selectableSeatMembers.map((member) => <option key={member.id} value={member.id}>{member.role.replaceAll('_', ' ')} · {member.identityId}</option>)}</select></label>
              <label className="text-xs font-bold">Plan<select value={selectedSeatPlan} onChange={(event) => setSelectedSeatPlan(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="">Choose a returned plan</option>{renderedSeatPlans.map((plan) => <option key={plan.key} value={plan.key}>{plan.label}</option>)}</select></label>
              <label className="text-xs font-bold">Billing period<select value={selectedSeatPeriod} onChange={(event) => setSelectedSeatPeriod(event.target.value as 'monthly' | 'annual')} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{selectedSeatTerms.map((term) => <option key={term.period} value={term.period}>{term.period} · {formatMoneyMinor(term.grossMinor, term.currency)}</option>)}</select></label>
              <label className="text-xs font-bold">Action<select value={seatAction} onChange={(event) => setSeatAction(event.target.value as 'purchase' | 'renew')} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="purchase">Purchase seat</option><option value="renew">Renew seat</option></select></label>
              {seatAction === 'purchase' && seatPlans.renewalAvailability?.unavailableMethods.some((item) => item.method === 'saved_card' && item.reasonCode === 'PAYMENT_AUTHORIZATION_REQUIRED') ? <label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={saveSeatAuthorization} onChange={(event) => setSaveSeatAuthorization(event.target.checked)} />Save the payment authorization for future seat renewals during this purchase</label> : null}
              <Button type="submit" className="sm:col-span-2" disabled={!canManage || !selectedSeatMember || !selectedSeatPlan || !selectedSeatTerms.some((term) => term.period === selectedSeatPeriod) || stepUp.busy || Boolean(stepUp.challenge)}>Continue with authenticator</Button>
              <p className="text-xs text-secondary sm:col-span-2">The selected price is a server catalogue term. Access begins only after the backend confirms payment and entitlement.</p>
            </form>}
        </> : seatPlans ? <p className="mt-3 text-sm text-secondary">Seat purchases are unavailable: {seatPlans.errorCode ?? seatPlans.state}. Refresh after the configuration is resolved.</p> : <p className="mt-3 text-sm text-secondary">Seat plan state has not loaded.</p>}
        {seatPlans?.renewalAvailability && seats ? <SeatRenewalPreferences key={profileId} plans={seatPlans} seats={seats} canManage={canManage} /> : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="font-semibold">Current paid seats</h4>
            <ul className="mt-2 space-y-2">{seats?.paidSeats.map((seat) => <li key={seat.membershipId} className="rounded-lg bg-surface-container-low p-3 text-xs">{seat.role.replaceAll('_', ' ')} · {seat.state.replaceAll('_', ' ')}{seat.entitlement ? ` · entitlement ${seat.entitlement.active ? 'active' : 'inactive'} through ${new Date(seat.entitlement.expiresAt).toLocaleDateString()}` : ''}{seat.pendingPurchase ? ` · purchase ${seat.pendingPurchase.state.replaceAll('_', ' ')}` : ''}</li>)}</ul>
            {seats && !seats.paidSeats.length ? <p className="mt-2 text-xs text-secondary">No paid seats were returned.</p> : null}
          </div>
          <div>
            <h4 className="font-semibold">Recent seat purchases</h4>
            <ul className="mt-2 space-y-2">{seatPurchases.map((purchase) => <li key={purchase.id} className="rounded-lg bg-surface-container-low p-3 text-xs">
              <p className="font-semibold">{purchase.state.replaceAll('_', ' ')}</p>
              <p className="mt-1">{seatPurchasePlanLabel(purchase)} · reference {purchase.reference} · created {new Date(purchase.createdAt).toLocaleDateString()}</p>
              {purchase.paidAt ? <p>Paid {new Date(purchase.paidAt).toLocaleDateString()}</p> : null}
              {purchase.redirectUrl && /^https?:\/\//i.test(purchase.redirectUrl) ? <a className="mt-2 inline-block underline" href={purchase.redirectUrl} target="_blank" rel="noreferrer">Continue to payment provider</a> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={purchaseDetailLoading && selectedSeatPurchaseId === purchase.id} onClick={() => void openSeatPurchaseDetails(purchase.id)}>View purchase and audit</Button>
                <Button type="button" variant="secondary" disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginReconcilePurchase(purchase)}>Reconcile payment with authenticator</Button>
                <Button type="button" variant="ghost" disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginCancelSeatPurchase(purchase)}>Request cancellation with authenticator</Button>
              </div>
              {selectedSeatPurchaseId === purchase.id ? <div className="mt-3 rounded border border-outline-variant/20 bg-white p-3" aria-label="Seat purchase detail and audit">
                {purchaseDetailLoading ? <LoadingState label="Loading purchase details…" /> : null}
                {purchaseDetailError ? <p role="alert" className="text-error">{purchaseDetailError}</p> : null}
                {selectedSeatPurchase ? <div className="space-y-1"><h5 className="font-semibold">Server purchase record</h5><p>Status: {selectedSeatPurchase.state.replaceAll('_', ' ')}</p><p>Plan: {seatPurchasePlanLabel(selectedSeatPurchase)}</p><p>Reference: {selectedSeatPurchase.reference}</p><p>Created: {new Date(selectedSeatPurchase.createdAt).toLocaleString()}</p>{selectedSeatPurchase.paidAt ? <p>Paid: {new Date(selectedSeatPurchase.paidAt).toLocaleString()}</p> : null}{selectedSeatPurchase.fulfilledAt ? <p>Fulfilled: {new Date(selectedSeatPurchase.fulfilledAt).toLocaleString()}</p> : null}</div> : null}
                <div className="mt-3 border-t pt-3"><h5 className="font-semibold">Purchase audit</h5>{purchaseAuditLoading ? <LoadingState label="Loading purchase audit…" /> : null}{purchaseAuditError ? <p role="alert" className="text-error">{purchaseAuditError}</p> : null}<p className="text-secondary">{selectedPurchaseAudit.events.length} audit event(s) returned. Event fields are not defined in the local API contract, so details are not inferred.</p>{selectedPurchaseAudit.nextCursor ? <Button type="button" variant="ghost" className="mt-2" disabled={purchaseAuditLoading} onClick={() => void loadMorePurchaseAudit()}>Load more audit events</Button> : null}</div>
              </div> : null}
            </li>)}</ul>
            {!seatPurchases.length ? <p className="mt-2 text-xs text-secondary">No seat purchases were returned.</p> : null}
            {seatPurchasesCursor ? <Button type="button" variant="secondary" className="mt-3" disabled={loadingExtras} onClick={() => void loadMoreSeatPurchases()}>Load more seat purchases</Button> : null}
          </div>
        </div>
      </section> : null}
      <StepUpDialog challenge={stepUp.challenge} busy={working || stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={completeMutation} />
    </div>
  </BuyerPortalLayout>;
};

export default OrganizationManagement;
