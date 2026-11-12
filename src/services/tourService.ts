import api from '../lib/axios';
import type { Tour, TourAvailability, TourCalendarEnvelope, TourCalendarScopeKind, TourCalendarSlot, TourMode, TourRequestPayload, TourStatus, TourType, TourVideoSession } from '../types';

export interface TourRequestResponse {
  tour: Tour;
}

export interface UpdateTourStatusPayload {
  status: Exclude<TourStatus, 'cancelled'>;
  expectedVersion: number;
}

export interface TourFilters {
  status?: TourStatus;
  type?: TourType;
  mode?: TourMode;
  page?: number;
  limit?: number;
}

export interface TourCalendarScope {
  scopeKind: TourCalendarScopeKind;
  resourceId?: string;
  projectId?: string;
  staffIdentityId?: string;
}

export interface TourCalendarUpdate {
  scopeKind: TourCalendarScopeKind;
  resourceId?: string;
  projectId?: string;
  expectedVersion: number;
  liveGuidedEnabled: boolean;
  slots: TourCalendarSlot[];
}

export interface TourAvailabilityQuery {
  propertyId: string;
  type?: 'private_showing' | 'show_home' | 'live_guided_video_tour';
  from: string;
  to: string;
  page?: number;
  limit?: number;
}

export interface TourUpdatePayload {
  expectedVersion: number;
  status?: Exclude<TourStatus, 'cancelled'>;
  assignedToIdentityId?: string | null;
  calendarId?: string;
  calendarVersion?: number;
  slotId?: string;
  scheduledAt?: string;
}

export interface ViewingAssignee {
  identityId: string;
  displayName: string;
  role: 'administrator' | 'sales_agent' | 'project_editor' | 'finance' | 'viewer' | 'custom' | string;
  assignmentEligible: boolean;
}

export const tourService = {
  async requestTour(payload: TourRequestPayload): Promise<TourRequestResponse> {
    if (!['private_showing', 'show_home', 'live_guided_video_tour'].includes(payload.type as string)) {
      throw new Error('Only a current server-returned viewing slot can be booked. Open House is walk-in and paid tours are unavailable.');
    }
    const { data } = await api.post<TourRequestResponse>('/tour', payload);
    return data;
  },

  async getTours(filters?: TourFilters): Promise<{ tours: Tour[]; resultCount: number; page: number; pageCount: number }> {
    const { data, headers } = await api.get<Tour[]>('/tour', { params: filters });
    return {
      tours: data,
      resultCount: Number(headers['x-result-count'] ?? data.length),
      page: Number(headers['x-page'] ?? filters?.page ?? 1),
      pageCount: Number(headers['x-page-count'] ?? (data.length ? 1 : 0)),
    };
  },

  async updateTourStatus(id: string, payload: UpdateTourStatusPayload): Promise<Tour> {
    const { data } = await api.patch<Tour>(`/tour/${id}`, payload);
    return data;
  },

  async updateTour(id: string, payload: TourUpdatePayload): Promise<Tour> {
    const { data } = await api.patch<Tour>(`/tour/${encodeURIComponent(id)}`, payload);
    return data;
  },

  async getCalendar(scope: TourCalendarScope): Promise<TourCalendarEnvelope> {
    const { data } = await api.get<TourCalendarEnvelope>('/tour/calendar', { params: scope, headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async listViewingAssignees(params: { limit?: number; after?: string } = {}): Promise<{ assignees: ViewingAssignee[]; nextCursor: string | null }> {
    const { data } = await api.get<{ assignees: ViewingAssignee[]; nextCursor: string | null }>('/profiles/current/viewing-assignees', { params: { limit: params.limit ?? 25, ...(params.after ? { after: params.after } : {}) }, headers: { 'Cache-Control': 'no-store' } });
    return { assignees: data.assignees ?? [], nextCursor: data.nextCursor ?? null };
  },

  async saveCalendar(body: TourCalendarUpdate): Promise<TourCalendarEnvelope> {
    const { data } = await api.put<TourCalendarEnvelope>('/tour/calendar', body);
    return data;
  },

  async removeCalendarOverride(body: { scopeKind: Exclude<TourCalendarScopeKind, 'profile'>; resourceId: string; projectId?: string; expectedVersion: number }): Promise<TourCalendarEnvelope> {
    const { data } = await api.delete<TourCalendarEnvelope>('/tour/calendar', { data: body });
    return data;
  },

  async getAvailability(query: TourAvailabilityQuery): Promise<TourAvailability> {
    const { data } = await api.get<TourAvailability>('/tour/availability', { params: query, headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async getVideoSession(id: string): Promise<TourVideoSession> {
    const { data } = await api.get<TourVideoSession>(`/tour/${encodeURIComponent(id)}/video-session`, { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async getJoinUrl(id: string, joinPath?: string | null): Promise<string> {
    const expectedPath = `/api/tour/${encodeURIComponent(id)}/video-session/join`;
    if (joinPath !== expectedPath) throw new Error('The server has not confirmed that the participant join route is available.');
    const { data } = await api.get<{ joinUrl: string }>(`/tour/${encodeURIComponent(id)}/video-session/join`, { headers: { 'Cache-Control': 'no-store' } });
    const url = new URL(data.joinUrl);
    if (url.protocol !== 'https:') {
      throw new Error('The server returned an invalid live-video join address.');
    }
    return data.joinUrl;
  },

  async reconcileVideoSession(id: string, body: { meetingId: string; expectedVersion: number }, challengeId: string): Promise<TourVideoSession> {
    const { data } = await api.post<TourVideoSession>(`/tour/${encodeURIComponent(id)}/video-session/reconcile`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },
};
