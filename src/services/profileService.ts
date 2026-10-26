import api from '../lib/axios';

export interface AccountProfileSummary {
  id: string;
  kind: string;
  structure: string;
  name: string;
  status: string;
  verification?: { status: string; reviewedAt?: string | null };
  visibility?: string;
  followable?: boolean;
  version: number;
  permissions: unknown;
  unreadCount?: number;
}

export interface ProfileOnboardingDraft {
  profileId: string;
  kind: string;
  structure: string;
  version: number;
  state: 'draft';
  values: Record<string, unknown>;
  readiness: unknown;
  fields: unknown[];
  updatedAt: string;
}

export type CreateProfileKind =
  | 'buyer'
  | 'owner'
  | 'agency'
  | 'developer'
  | 'legal_partner'
  | 'engineering_survey_partner'
  | 'inspection_partner'
  | 'valuation_partner'
  | 'buyers_agent'
  | 'sellers_agent';
export type ProfileStructure = 'individual' | 'company' | 'cooperative';

interface ProfileListResponse {
  profiles: AccountProfileSummary[];
  nextCursor: string | null;
}

export const profileService = {
  async list(): Promise<ProfileListResponse> {
    const profiles: AccountProfileSummary[] = [];
    let after: string | null = null;
    const seen = new Set<string>();
    do {
      const response = await api.get<ProfileListResponse>('/profiles', {
        params: { limit: 100, ...(after ? { after } : {}) },
      });
      const data: ProfileListResponse = response.data;
      profiles.push(...data.profiles);
      after = data.nextCursor;
      if (after && seen.has(after)) throw new Error('Profile list pagination did not advance.');
      if (after) seen.add(after);
    } while (after);
    return { profiles, nextCursor: null };
  },
  async current(profileId: string): Promise<{ profile: AccountProfileSummary }> {
    const { data } = await api.get<{ profile: AccountProfileSummary }>('/profiles/current', {
      headers: { 'X-Profile-ID': profileId },
    });
    return data;
  },

  async create(payload: { kind: CreateProfileKind; structure: ProfileStructure; name: string; operationKey: string }): Promise<{ profile: AccountProfileSummary }> {
    const { data } = await api.post<{ profile: AccountProfileSummary }>('/profiles', payload);
    return data;
  },

  async getOnboarding(): Promise<ProfileOnboardingDraft> {
    const { data } = await api.get<ProfileOnboardingDraft>('/profiles/current/onboarding');
    return data;
  },

  async submitSignatory(payload: { identityId: string; authorityEvidenceId: string; expiresAt: string }, challengeId: string): Promise<unknown> {
    const { data } = await api.post<unknown>('/profiles/current/signatories', payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data;
  },

  async updatePrivacy(payload: { visibility: 'private' | 'public'; followable: boolean; expectedVersion: number }, challengeId: string): Promise<{ profile: AccountProfileSummary }> {
    const { data } = await api.patch<{ profile: AccountProfileSummary }>('/profiles/current/privacy', payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data;
  },
};
