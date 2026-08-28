import api from '../lib/axios';
import type { AppealStatus, Pagination, TrustAppeal, TrustDecision } from '../types/phase45';
import { phase45Cache } from '../features/phase45/cache';

export const trustService = {
  async mine(force = false) { if (!force) { const cached = phase45Cache.get<TrustDecision>('trust', 'me'); if (cached) return cached; } const { data } = await api.get<{ trust: TrustDecision }>('/trust/v1/me'); return phase45Cache.set('trust', 'me', data.trust); },
  async appeals(force = false) { if (!force) { const cached = phase45Cache.get<TrustAppeal[]>('appeals', 'mine'); if (cached) return cached; } const { data } = await api.get<{ appeals: TrustAppeal[] }>('/trust/v1/appeals'); return phase45Cache.set('appeals', 'mine', data.appeals); },
  async createAppeal(decisionReference: string, reason: string) { const { data } = await api.post<{ appeal: TrustAppeal }>('/trust/v1/appeals', { decisionReference, reason }); phase45Cache.remove('appeals', 'mine'); phase45Cache.remove('trust', 'me'); return data.appeal; },
  async adminQueue(query: { page?: number; limit?: number; status?: AppealStatus | '' }) { const key = JSON.stringify(query); const { data } = await api.get<{ appeals: TrustAppeal[]; pagination: Pagination }>('/trust/v1/admin/appeals', { params: query }); return phase45Cache.set('admin', `queue:${key}`, data); },
  async resolveAppeal(id: string, action: Exclude<AppealStatus, 'open'>, reason: string) { const { data } = await api.patch<{ appeal: TrustAppeal }>(`/trust/v1/admin/appeals/${id}`, { action, reason }); phase45Cache.clear(); return data.appeal; },
  async recompute(userId: string) { const { data } = await api.post<{ trust: TrustDecision }>(`/trust/v1/admin/users/${userId}/recompute`); phase45Cache.clear(); return data.trust; },
};
