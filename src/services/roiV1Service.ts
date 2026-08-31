import api from '../lib/axios';
import type { CreateRoiEstimateInput, RoiEstimateResponse, RoiHistoryQuery, RoiHistoryResponse } from '../types/roiV1';

export const roiV1Service = {
  async createEstimate(input: CreateRoiEstimateInput, idempotencyKey: string, signal?: AbortSignal): Promise<RoiEstimateResponse> {
    const { data } = await api.post<RoiEstimateResponse>('/roi/v1/estimates', input, {
      signal,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return data;
  },
  async getEstimate(reference: string, signal?: AbortSignal): Promise<RoiEstimateResponse> {
    const { data } = await api.get<RoiEstimateResponse>(`/roi/v1/estimates/${encodeURIComponent(reference)}`, { signal });
    return data;
  },
  async getPropertyHistory(propertyReference: string, query: RoiHistoryQuery, signal?: AbortSignal): Promise<RoiHistoryResponse> {
    const { data } = await api.get<RoiHistoryResponse>(`/roi/v1/properties/${encodeURIComponent(propertyReference)}/estimates`, { params: query, signal });
    return data;
  },
};
