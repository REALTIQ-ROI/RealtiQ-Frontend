import api from '../lib/axios';
import type {
  Installment,
  InstallmentCreatePayload,
  InstallmentPaymentResponse,
  InstallmentPaymentPayload,
  InstallmentPenaltyRecord,
  InstallmentScheduleResponse,
  InstallmentStatus,
  InstallmentPaymentRecord,
} from '../types';

export interface UpdateInstallmentStatusPayload {
  status: InstallmentStatus;
  note?: string;
}

export const installmentService = {
  async createInstallmentPlan(payload: InstallmentCreatePayload): Promise<Installment> {
    const { data } = await api.post<Installment>('/installments', payload);
    return data;
  },

  async getInstallments(): Promise<Installment[]> {
    const { data } = await api.get<Installment[]>('/installments', { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async getInstallmentById(id: string): Promise<Installment> {
    const { data } = await api.get<Installment>(`/installments/${encodeURIComponent(id)}`, { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async initializePayment(id: string, payload: InstallmentPaymentPayload, challengeId: string): Promise<InstallmentPaymentResponse> {
    const { data } = await api.post<InstallmentPaymentResponse>(`/installments/${encodeURIComponent(id)}/initialize-payment`, payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data;
  },

  async updateInstallmentStatus(id: string, payload: UpdateInstallmentStatusPayload, challengeId: string): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/installments/${encodeURIComponent(id)}/admin/status`, payload, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data;
  },

  async getSchedule(id: string): Promise<InstallmentScheduleResponse> {
    const { data } = await api.get<InstallmentScheduleResponse>(`/installments/${encodeURIComponent(id)}/schedule`, { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async satisfyCondition(
    id: string,
    scheduleItemId: string,
    conditionId: string,
    payload: { note: string },
  ): Promise<Installment> {
    const { data } = await api.patch<Installment>(
      `/installments/${encodeURIComponent(id)}/schedule/${encodeURIComponent(scheduleItemId)}/conditions/${encodeURIComponent(conditionId)}/satisfy`,
      payload,
    );
    return data;
  },

  async cancelInstallment(id: string, payload?: { note?: string }): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/installments/${id}/cancel`, payload ?? {});
    return data;
  },

  async getPaymentHistory(id: string): Promise<InstallmentPaymentRecord[]> {
    const { data } = await api.get<InstallmentPaymentRecord[]>(`/installments/${encodeURIComponent(id)}/payment-history`, { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async getPenalties(id: string): Promise<InstallmentPenaltyRecord[]> {
    const { data } = await api.get<InstallmentPenaltyRecord[]>(`/installments/${encodeURIComponent(id)}/penalties`, { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },

  async waivePenalty(id: string, penaltyId: string, payload: { reason: string }, challengeId: string): Promise<{
    installment: Installment;
    penalty: InstallmentPenaltyRecord;
  }> {
    const { data } = await api.patch<{ installment: Installment; penalty: InstallmentPenaltyRecord }>(
      `/installments/${encodeURIComponent(id)}/penalties/${encodeURIComponent(penaltyId)}/waive`,
      payload,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },
};
