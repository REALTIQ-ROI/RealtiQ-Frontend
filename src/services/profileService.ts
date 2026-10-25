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

  async submitSignatory(payload: { identityId: string; authorityEvidenceId: string; expiresAt: string }, challengeId: string): Promise<unknown> {
    const { data } = await api.post<unknown>('/profiles/current/signatories', payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data;
  },
};
