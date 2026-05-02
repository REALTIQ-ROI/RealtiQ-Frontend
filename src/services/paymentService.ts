import api from '../lib/axios';
import type { ApiPayment, VerifyPaymentResponse } from '../types';

export const paymentService = {
  async getPayments(): Promise<ApiPayment[]> {
    const { data } = await api.get<ApiPayment[]>('/payments');
    return data;
  },

  async getPaymentById(id: string): Promise<ApiPayment> {
    const { data } = await api.get<ApiPayment>(`/payments/${id}`);
    return data;
  },

  async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    const { data } = await api.get<VerifyPaymentResponse>(`/payments/verify/${reference}`);
    return data;
  },
};
