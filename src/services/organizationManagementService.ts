import api from '../lib/axios';

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
