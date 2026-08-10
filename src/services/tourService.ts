import api from '../lib/axios';
import type { AddCartItemRequest, Tour, TourMode, TourRequestPayload, TourStatus, TourType } from '../types';

export interface TourRequestResponse {
  tour: Partial<Tour> & { _id: string; status: TourStatus; price?: number };
  redirectUrl?: string;
  reference?: string;
  requiresPayment?: boolean;
  paymentOption?: 'cart';
  cartItem?: Extract<AddCartItemRequest, { itemType: 'paid_virtual_tour' }>;
}

export interface UpdateTourStatusPayload {
  status: TourStatus;
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
    const { data } = await api.post<TourRequestResponse>('/tour', payload);
    return data;
  },

  async getTours(filters?: TourFilters): Promise<Tour[]> {
    const { data } = await api.get<Tour[]>('/tour', { params: filters });
    return data;
  },

  async updateTourStatus(id: string, payload: UpdateTourStatusPayload): Promise<Tour> {
    const { data } = await api.patch<Tour>(`/tour/${id}`, payload);
    return data;
  },
};
