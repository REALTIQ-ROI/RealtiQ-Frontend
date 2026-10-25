import api from '../lib/axios';
import type { Tour, TourMode, TourRequestPayload, TourStatus, TourType } from '../types';

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

export const tourService = {
  async requestTour(payload: TourRequestPayload): Promise<TourRequestResponse> {
    if ((payload.type as TourType) === 'virtual_paid') throw new Error('Paid live viewing is unavailable until the backend pricing workflow is corrected.');
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
};
