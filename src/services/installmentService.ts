import api from '../lib/axios';
import type {
  Installment,
  InstallmentCreatePayload,
  InstallmentPaymentPayload,
  InstallmentStatus,
} from '../types';

export interface InstallmentPaymentResponse {
  redirectUrl: string;
  reference: string;
  amount: number;
}

export interface UpdateInstallmentStatusPayload {
  status: InstallmentStatus;
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

  async initializePayment(id: string, payload?: InstallmentPaymentPayload): Promise<InstallmentPaymentResponse> {
    const { data } = await api.post<InstallmentPaymentResponse>(`/installments/${id}/pay`, payload ?? {});
    return data;
  },

  async updateInstallmentStatus(id: string, payload: UpdateInstallmentStatusPayload): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/installments/${id}/status`, payload);
    return data;
  },
};
