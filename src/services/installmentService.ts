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
    const { data } = await api.get<Installment[]>('/installments');
    return data;
  },

  async getInstallmentById(id: string): Promise<Installment> {
    const { data } = await api.get<Installment>(`/installments/${id}`);
    return data;
  },

  async initializePayment(id: string, payload: InstallmentPaymentPayload): Promise<InstallmentPaymentResponse> {
    const { data } = await api.post<InstallmentPaymentResponse>(`/installments/${id}/initialize-payment`, payload);
    return data;
  },

  async updateInstallmentStatus(id: string, payload: UpdateInstallmentStatusPayload): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/installments/${id}/admin/status`, payload);
    return data;
  },

  async getSchedule(id: string): Promise<InstallmentScheduleResponse> {
    const { data } = await api.get<InstallmentScheduleResponse>(`/installments/${id}/schedule`);
    return data;
  },

  async satisfyCondition(
    id: string,
    scheduleItemId: string,
    conditionId: string,
    payload: { note: string },
  ): Promise<Installment> {
    const { data } = await api.patch<Installment>(
      `/installments/${id}/schedule/${scheduleItemId}/conditions/${conditionId}/satisfy`,
      payload,
    );
    return data;
  },

  async cancelInstallment(id: string, payload?: { note?: string }): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/installments/${id}/cancel`, payload ?? {});
    return data;
  },

  async getPaymentHistory(id: string): Promise<InstallmentPaymentRecord[]> {
    const { data } = await api.get<InstallmentPaymentRecord[]>(`/installments/${id}/payment-history`);
    return data;
  },

  async getPenalties(id: string): Promise<InstallmentPenaltyRecord[]> {
    const { data } = await api.get<InstallmentPenaltyRecord[]>(`/installments/${id}/penalties`);
    return data;
  },

  async waivePenalty(id: string, penaltyId: string, payload: { reason: string }): Promise<{
    installment: Installment;
    penalty: InstallmentPenaltyRecord;
  }> {
    const { data } = await api.patch<{ installment: Installment; penalty: InstallmentPenaltyRecord }>(
      `/installments/${id}/penalties/${penaltyId}/waive`,
      payload,
    );
    return data;
  },
};
