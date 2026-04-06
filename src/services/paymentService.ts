import { mockStore } from './mockStore';
import type { Payment } from '../types';

export interface PaymentIntentPayload {
  propertyId: string;
  amount: number;
}

export const paymentService = {
  async initializePayment(_: PaymentIntentPayload): Promise<{ redirectUrl: string }> {
    return { redirectUrl: '/payment-success' };
  },

  async getPayments(): Promise<Payment[]> {
    return mockStore.getPayments();
  },
};