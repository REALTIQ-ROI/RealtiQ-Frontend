import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import StepUpDialog from '../../components/auth/StepUpDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { organizationManagementService, type OrganizationInvitation, type OrganizationMember, type OrganizationRole } from '../../services/organizationManagementService';

type MutationResult = { member?: OrganizationMember; invitation?: OrganizationInvitation };
const grantableRoles: OrganizationRole[] = ['administrator', 'sales_agent', 'project_editor', 'finance', 'viewer'];

const OrganizationManagement = () => {
  const { activeProfile, refreshProfiles } = useAuth();
  const permissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const canManage = Boolean(activeProfile && ['company', 'cooperative'].includes(activeProfile.structure) && permissions.includes('team.manage'));
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [issuedInvitations, setIssuedInvitations] = useState<OrganizationInvitation[]>([]);
  const [identityId, setIdentityId] = useState('');
  const [memberRole, setMemberRole] = useState<OrganizationRole>('viewer');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('viewer');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [roleDrafts, setRoleDrafts] = useState<Record<string, OrganizationRole>>({});
  const stepUp = useBoundStepUp<MutationResult>();
  const profileId = activeProfile?.id;

  const loadMembers = useCallback(async (after?: string) => {
    if (!canManage) return;
    setLoading(true);
    setError('');
    try {
      const page = await organizationManagementService.listMembers({ limit: 50, ...(after ? { after } : {}) });
      setMembers((current) => after ? [...current, ...page.members] : page.members);
      setCursor(page.nextCursor);
      setRoleDrafts((current) => ({ ...current, ...Object.fromEntries(page.members.map((member) => [member.id, member.role as OrganizationRole])) }));
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load organization members.');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { void loadMembers(); }, [loadMembers, profileId]);

  const beginAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!identityId.trim() || !canManage || stepUp.busy || stepUp.challenge) return;
    const body = { identityId: identityId.trim(), role: memberRole };
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/members', body, label: 'Add an organization member', execute: (challengeId, exactBody) => organizationManagementService.addMember(exactBody, challengeId) });
  };

  const beginChangeRole = async (member: OrganizationMember) => {
    const role = roleDrafts[member.id];
    if (!role || role === member.role || member.ownerSeat || !canManage || stepUp.busy || stepUp.challenge) return;
    const body = { expectedVersion: member.version, role };
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
    if (!inviteEmail.trim() || !canManage || stepUp.busy || stepUp.challenge) return;
    const body = { email: inviteEmail.trim(), grant: { role: inviteRole }, operationKey: `org_invite_${crypto.randomUUID()}` };
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/invitations', body, label: 'Invite a member to this organization', execute: (challengeId, exactBody) => organizationManagementService.issueInvitation(exactBody, challengeId) });
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
      if (!result.ok) { setError(result.error ?? 'The organization change failed. Refresh current server state before reviewing it again.'); return false; }
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
      }
      setNotice('The server accepted the organization change.');
      await loadMembers();
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

  const canManageRoles = useMemo(() => permissions.includes('roles.manage'), [permissions]);

  return <BuyerPortalLayout pageEyebrow="Organization" pageTitle="Team and invitations" pageSubtitle="Manage current organization memberships and invitations using the active profile's server-granted authority.">
    <div className="space-y-6">
      {error ? <ErrorState message={error} onRetry={() => void loadMembers()} /> : null}
      {notice ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
      <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
        <h3 className="text-lg font-bold">Claim an invitation</h3>
        <p className="mt-1 text-sm text-secondary">Paste the invitation token from the invitation message. It is submitted in the request body and is not added to the URL or saved after submission.</p>
        <form onSubmit={(event) => void claimInvitation(event)} className="mt-3 flex flex-wrap gap-2"><label className="sr-only" htmlFor="organization-invite-token">Invitation token</label><input id="organization-invite-token" type="password" autoComplete="off" value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} className="min-w-64 flex-1 rounded-lg border p-2 text-sm" placeholder="Invitation token" /><Button type="submit" disabled={!inviteToken.trim() || working}>{working ? 'Checking…' : 'Claim invitation'}</Button></form>
      </section>

      {canManage ? <>
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-outline-variant/10 bg-white p-5"><h3 className="text-lg font-bold">Add an existing identity</h3><p className="mt-1 text-xs text-secondary">This adds an identity that is already known to the organization administrator. The server checks current grants and seat limits.</p><form onSubmit={(event) => void beginAddMember(event)} className="mt-3 space-y-3"><label className="block text-xs font-bold">Identity ID<input required value={identityId} onChange={(event) => setIdentityId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label><label className="block text-xs font-bold">Role<select value={memberRole} onChange={(event) => setMemberRole(event.target.value as OrganizationRole)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{grantableRoles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label><Button type="submit" disabled={!identityId.trim() || stepUp.busy || Boolean(stepUp.challenge)}>Add member with authenticator</Button></form></div>
          <div className="rounded-xl border border-outline-variant/10 bg-white p-5"><h3 className="text-lg font-bold">Invite by email</h3><p className="mt-1 text-xs text-secondary">The invitation token is delivered out of band. This interface never displays or stores it.</p><form onSubmit={(event) => void beginIssueInvitation(event)} className="mt-3 space-y-3"><label className="block text-xs font-bold">Email address<input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label><label className="block text-xs font-bold">Role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as OrganizationRole)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{grantableRoles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label><Button type="submit" disabled={!inviteEmail.trim() || stepUp.busy || Boolean(stepUp.challenge)}>Send invitation with authenticator</Button></form>{issuedInvitations.length ? <div className="mt-4 border-t pt-3"><h4 className="text-sm font-bold">Invitations issued in this session</h4><ul className="mt-2 space-y-2">{issuedInvitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3 text-xs"><span>{invitation.id} · {invitation.state} · delivery {invitation.delivery.state} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>{!['accepted', 'cancelled', 'expired'].includes(invitation.state) ? <Button type="button" variant="secondary" onClick={() => void beginCancelInvitation(invitation)} disabled={stepUp.busy || Boolean(stepUp.challenge)}>Cancel invitation</Button> : null}</li>)}</ul><p className="mt-2 text-[11px] text-secondary">This response-backed list is held only in this page session. The handoff does not define the invitation-list response envelope.</p></div> : null}</div>
        </section>

        <section className="rounded-xl border border-outline-variant/10 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Current roster</h3><p className="text-xs text-secondary">Roles and permissions are bounded by the current profile grant; the server rechecks assignment and seat rules.</p>{!canManageRoles ? <p className="mt-1 text-xs text-secondary">This profile does not currently report `roles.manage`; role definitions are unavailable here.</p> : null}</div><Button type="button" variant="secondary" disabled={loading} onClick={() => void loadMembers()}>Refresh roster</Button></div>{loading && !members.length ? <LoadingState label="Loading organization members…" /> : null}<div className="mt-4 space-y-2">{members.map((member) => <article key={member.id} className="grid gap-3 rounded-lg border border-outline-variant/15 p-3 md:grid-cols-[minmax(0,1fr)_auto]"><div><p className="break-all font-semibold">{member.identityId}{member.ownerSeat ? <span className="ml-2 rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-800">Holder seat</span> : null}</p><p className="mt-1 text-xs text-secondary">{member.role.replaceAll('_', ' ')} · {member.state} · version {member.version}{member.assignedOnly ? ' · assigned resources only' : ''}</p><p className="mt-1 text-[11px] text-secondary">{member.assignedResources.length ? member.assignedResources.map((resource) => `${resource.kind}:${resource.id}`).join(', ') : 'No assigned resource restriction returned'}</p>{member.deniedPermissions.length ? <p className="mt-1 text-[11px] text-secondary">Denied permissions: {member.deniedPermissions.join(', ')}</p> : null}</div>{member.ownerSeat ? <p className="text-xs text-secondary">The included holder seat cannot be altered or removed.</p> : <div className="flex flex-wrap items-center gap-2"><select aria-label={`Role for ${member.identityId}`} value={roleDrafts[member.id] ?? member.role} onChange={(event) => setRoleDrafts((current) => ({ ...current, [member.id]: event.target.value as OrganizationRole }))} className="rounded-lg border p-2 text-xs">{grantableRoles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select><Button type="button" variant="secondary" disabled={(roleDrafts[member.id] ?? member.role) === member.role || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginChangeRole(member)}>Save role</Button><Button type="button" variant="ghost" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginRemove(member)}>Remove</Button></div>}</article>)}{!loading && !members.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No organization members are available in this current profile.</p> : null}</div>{cursor ? <Button type="button" variant="secondary" className="mt-4" disabled={loading} onClick={() => void loadMembers(cursor)}>Load more members</Button> : null}</section>
      </> : <section className="rounded-xl border border-outline-variant/10 bg-white p-5"><h3 className="font-bold">Organization management is unavailable for this active profile</h3><p className="mt-1 text-sm text-secondary">Select an authorized company/cooperative profile with the server-granted `team.manage` permission. No account-level role hint grants organization authority.</p></section>}
      <StepUpDialog challenge={stepUp.challenge} busy={working || stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={completeMutation} />
    </div>
  </BuyerPortalLayout>;
};

export default OrganizationManagement;
