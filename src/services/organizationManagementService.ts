import api from '../lib/axios';
import type { RenewalAvailability } from './renewalAvailability';

export type OrganizationRole = 'administrator' | 'sales_agent' | 'project_editor' | 'finance' | 'viewer' | 'custom';
export interface OrganizationMember {
  id: string;
  profileId: string;
  identityId: string;
  role: OrganizationRole | string;
  customRoleId?: string;
  deniedPermissions: string[];
  state: string;
  ownerSeat: boolean;
  assignedOnly: boolean;
  assignedResources: Array<{ kind: 'property' | 'project' | 'enquiry' | 'conversation'; id: string }>;
  negotiationLimit?: { amount: number; currency: string };
  expiresAt?: string;
  version: number;
}

export interface OrganizationMembersPage {
  members: OrganizationMember[];
  nextCursor: string | null;
}

export interface OrganizationInvitation {
  id: string;
  profileId: string;
  state: string;
  version: number;
  expiresAt: string;
  acceptedAt?: string;
  membershipId?: string;
  delivery: { state: string; attempts: number; code: string };
}

export interface OrganizationInvitationsPage {
  invitations: OrganizationInvitation[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface OrganizationRoleDefinition {
  id: string;
  name: string;
  permissions: string[];
  version: number;
  disabledAt?: string | null;
}

export interface OrganizationRolesPage {
  roles: OrganizationRoleDefinition[];
  nextCursor: string | null;
}

export interface OrganizationMandate {
  id: string;
  ownerProfileId: string;
  agentProfileId: string;
  resourceKind: string;
  resourceId: string;
  type: 'sole' | 'exclusive' | 'open';
  permissions: string[];
  state: string;
  startsAt: string;
  expiresAt: string;
  version: number;
}

export interface OrganizationMandatesPage {
  mandates: OrganizationMandate[];
  nextCursor: string | null;
}

export type OrganizationMandateAction = 'accept' | 'decline' | 'revoke';

export interface OrganizationAuthorityHistoryPage {
  events: Array<Record<string, unknown>>;
  nextCursor: string | null;
}

export interface OrganizationSeatPurchaseAuditPage {
  events: Array<Record<string, unknown>>;
  nextCursor: string | null;
}

export interface OrganizationSignatory {
  id: string;
  profileId: string;
  identityId: string;
  state: string;
  expiresAt: string;
  reviewedAt?: string | null;
  version: number;
}

export interface OrganizationSignatoriesPage {
  signatories: OrganizationSignatory[];
  nextCursor: string | null;
}

export interface OrganizationSeatPlans {
  state: 'configured' | 'unconfigured' | 'unavailable' | string;
  catalogueSource?: 'unified';
  revision?: number;
  taxPolicyRevision?: number;
  currency?: 'NGN' | 'USD';
  plans: OrganizationSeatPlan[];
  renewalAvailability?: RenewalAvailability;
  errorCode?: string;
}

export interface OrganizationSeatTerm {
  period: 'monthly' | 'annual';
  amountMinor: number;
  currency: 'NGN' | 'USD';
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  vatRatePercent: number;
  vatPolicyRevision: number;
}

export interface OrganizationSeatPlan {
  key: string;
  label: string;
  terms: OrganizationSeatTerm[];
  policyRevision: number;
}

export interface OrganizationSeats {
  profileId: string;
  includedHolderSeat: boolean;
  paidSeats: Array<{
    membershipId: string;
    identityId: string;
    role: string;
    state: string;
    acceptedAt?: string | null;
    membershipExpiresAt?: string | null;
    entitlement: { source: string; startsAt: string; expiresAt: string; active: boolean } | null;
    pendingPurchase: { plan: string; state: string; reference: string; createdAt: string } | null;
    version: number;
  }>;
  counts: { paidActive: number; paidPending: number; totalMembers: number };
}

export interface OrganizationSeatPurchase {
  id: string;
  profileId: string;
  membershipId: string;
  plan: { key: string; label: string; amountMinor: number; netMinor?: number; vatMinor?: number; grossMinor?: number; billingPeriod: 'monthly' | 'annual'; currency: 'NGN' | 'USD'; policyRevision: number } | string;
  reference: string;
  state: string;
  entitlementId?: string | null;
  paidAt?: string | null;
  fulfilledAt?: string | null;
  refundedMinor?: number;
  createdAt: string;
  redirectUrl?: string;
}

export interface OrganizationSeatPurchasesPage {
  purchases: OrganizationSeatPurchase[];
  nextCursor: string | null;
}

export interface OrganizationMemberGrant {
  role: OrganizationRole;
  customRoleId?: string;
  deniedPermissions?: string[];
  assignedOnly?: boolean;
  assignedResources?: Array<{ kind: 'property' | 'project' | 'enquiry' | 'conversation'; id: string }>;
  negotiationLimit?: { amount: number; currency: string };
  expiresAt?: string;
}

const base = '/profiles/current';
const challenge = (challengeId: string) => ({ headers: { 'X-Step-Up-Challenge': challengeId } });

export const organizationManagementService = {
  async listMembers(params: { limit?: number; after?: string } = {}): Promise<OrganizationMembersPage> {
    const { data } = await api.get<OrganizationMembersPage>(`${base}/members`, { params });
    return data;
  },
  async listInvitations(params: { page?: number; limit?: number } = {}): Promise<OrganizationInvitationsPage> {
    const { data } = await api.get<OrganizationInvitationsPage>(`${base}/invitations`, { params });
    return data;
  },
  async listRoles(params: { limit?: number; after?: string; includeDisabled?: boolean } = {}): Promise<OrganizationRolesPage> {
    const { data } = await api.get<OrganizationRolesPage>(`${base}/roles`, { params });
    return data;
  },
  async createRole(body: { name: string; permissions: string[] }, challengeId: string): Promise<{ role: OrganizationRoleDefinition }> {
    const { data } = await api.post<{ role: OrganizationRoleDefinition }>(`${base}/roles`, body, challenge(challengeId));
    return data;
  },
  async updateRole(id: string, body: { name: string; permissions: string[]; expectedVersion: number }, challengeId: string): Promise<{ role: OrganizationRoleDefinition }> {
    const { data } = await api.patch<{ role: OrganizationRoleDefinition }>(`${base}/roles/${encodeURIComponent(id)}`, body, challenge(challengeId));
    return data;
  },
  async setRoleState(id: string, body: { enabled: boolean; expectedVersion: number }, challengeId: string): Promise<{ role: OrganizationRoleDefinition }> {
    const { data } = await api.post<{ role: OrganizationRoleDefinition }>(`${base}/roles/${encodeURIComponent(id)}/state`, body, challenge(challengeId));
    return data;
  },
  async listMandates(params: { limit?: number; after?: string } = {}): Promise<OrganizationMandatesPage> {
    const { data } = await api.get<OrganizationMandatesPage>(`${base}/mandates`, { params });
    return data;
  },
  async createMandate(body: {
    agentProfileId: string;
    resourceKind: 'property' | 'project';
    resourceId: string;
    type: 'sole' | 'exclusive' | 'open';
    permissions: string[];
    startsAt: string;
    expiresAt: string;
  }, challengeId: string): Promise<{ mandate: OrganizationMandate }> {
    const { data } = await api.post<{ mandate: OrganizationMandate }>(`${base}/mandates`, body, challenge(challengeId));
    return data;
  },
  async actOnMandate(id: string, action: OrganizationMandateAction, body: { expectedVersion: number; conflictDeclared?: boolean }, challengeId: string): Promise<{ mandate: OrganizationMandate }> {
    const { data } = await api.post<{ mandate: OrganizationMandate }>(`${base}/mandates/${encodeURIComponent(id)}/${action}`, body, challenge(challengeId));
    return data;
  },
  async listAuthorityHistory(params: { limit?: number; before?: string } = {}): Promise<OrganizationAuthorityHistoryPage> {
    const { data } = await api.get<OrganizationAuthorityHistoryPage>(`${base}/authority-history`, { params });
    return data;
  },
  async listSignatories(params: { limit?: number; after?: string } = {}): Promise<OrganizationSignatoriesPage> {
    const { data } = await api.get<OrganizationSignatoriesPage>(`${base}/signatories`, { params });
    return data;
  },
  async listSeatPlans(): Promise<OrganizationSeatPlans> {
    const { data } = await api.get<OrganizationSeatPlans>(`${base}/seat-plans`);
    return data;
  },
  async getSeats(): Promise<OrganizationSeats> {
    const { data } = await api.get<OrganizationSeats>(`${base}/seats`);
    return data;
  },
  async listSeatPurchases(params: { limit?: number; before?: string } = {}): Promise<OrganizationSeatPurchasesPage> {
    const { data } = await api.get<OrganizationSeatPurchasesPage>(`${base}/seat-purchases`, { params });
    return data;
  },
  async getSeatPurchase(id: string): Promise<{ purchase: OrganizationSeatPurchase }> {
    const { data } = await api.get<OrganizationSeatPurchase | { purchase: OrganizationSeatPurchase }>(`${base}/seat-purchases/${encodeURIComponent(id)}`);
    return 'purchase' in data ? data : { purchase: data };
  },
  async listSeatPurchaseAudit(id: string, params: { limit?: number; before?: string } = {}): Promise<OrganizationSeatPurchaseAuditPage> {
    const { data } = await api.get<OrganizationSeatPurchaseAuditPage>(`${base}/seat-purchases/${encodeURIComponent(id)}/audit`, { params });
    return data;
  },
  async purchaseSeat(body: { membershipId: string; planKey: string; billingPeriod: 'monthly' | 'annual'; operationKey: string; saveAuthorizationForRenewal?: boolean }, challengeId: string): Promise<{ purchase: OrganizationSeatPurchase }> {
    const { data } = await api.post<{ purchase: OrganizationSeatPurchase }>(`${base}/seat-purchases`, body, challenge(challengeId));
    return data;
  },
  async renewSeat(membershipId: string, body: { planKey: string; billingPeriod: 'monthly' | 'annual'; operationKey: string }, challengeId: string): Promise<{ purchase: OrganizationSeatPurchase }> {
    const { data } = await api.post<{ purchase: OrganizationSeatPurchase }>(`${base}/seats/${encodeURIComponent(membershipId)}/renew`, body, challenge(challengeId));
    return data;
  },
  async cancelSeatPurchase(id: string, challengeId: string): Promise<{ purchase: OrganizationSeatPurchase }> {
    const { data } = await api.post<{ purchase: OrganizationSeatPurchase }>(`${base}/seat-purchases/${encodeURIComponent(id)}/cancel`, {}, challenge(challengeId));
    return data;
  },
  async reconcileSeatPurchase(id: string, challengeId: string): Promise<{ purchase: OrganizationSeatPurchase; providerStatus?: unknown }> {
    const { data } = await api.post<{ purchase: OrganizationSeatPurchase; providerStatus?: unknown }>(`${base}/seat-purchases/${encodeURIComponent(id)}/reconcile`, {}, challenge(challengeId));
    return data;
  },
  async addMember(body: { identityId: string } & OrganizationMemberGrant, challengeId: string): Promise<{ member: OrganizationMember }> {
    const { data } = await api.post<{ member: OrganizationMember }>(`${base}/members`, body, challenge(challengeId));
    return data;
  },
  async updateMember(id: string, body: { expectedVersion: number } & Partial<OrganizationMemberGrant>, challengeId: string): Promise<{ member: OrganizationMember }> {
    const { data } = await api.patch<{ member: OrganizationMember }>(`${base}/members/${encodeURIComponent(id)}`, body, challenge(challengeId));
    return data;
  },
  async removeMember(id: string, expectedVersion: number, challengeId: string): Promise<{ member: OrganizationMember }> {
    const { data } = await api.post<{ member: OrganizationMember }>(`${base}/members/${encodeURIComponent(id)}/remove`, { expectedVersion }, challenge(challengeId));
    return data;
  },
  async issueInvitation(body: { email: string; grant: OrganizationMemberGrant; operationKey: string }, challengeId: string): Promise<{ invitation: OrganizationInvitation }> {
    const { data } = await api.post<{ invitation: OrganizationInvitation }>(`${base}/invitations`, body, challenge(challengeId));
    return data;
  },
  async cancelInvitation(id: string, expectedVersion: number, challengeId: string): Promise<{ invitation: OrganizationInvitation }> {
    const { data } = await api.delete<{ invitation: OrganizationInvitation }>(`${base}/invitations/${encodeURIComponent(id)}`, {
      data: { expectedVersion }, ...challenge(challengeId),
    });
    return data;
  },
  async claimInvitation(token: string): Promise<unknown> {
    const { data } = await api.post<unknown>('/profiles/invitations/claim', { token });
    return data;
  },
};
