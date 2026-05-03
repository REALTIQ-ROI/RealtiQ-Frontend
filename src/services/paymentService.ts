import api from '../lib/axios';
import type { ApiPayment, VerifyPaymentResponse } from '../types';

const PENDING_PAYMENT_REFERENCE_KEY = 'realtiq.pendingPaymentReference';
const PENDING_PAYMENT_PROPERTY_KEY = 'realtiq.pendingPaymentPropertyId';

export interface InitializePaymentResponse {
  redirectUrl: string;
  reference: string;
}

const persistPendingPayment = (reference: string, propertyId?: string) => {
  sessionStorage.setItem(PENDING_PAYMENT_REFERENCE_KEY, reference);
  if (propertyId) {
    sessionStorage.setItem(PENDING_PAYMENT_PROPERTY_KEY, propertyId);
  }
};

export const paymentService = {
  persistPaymentReference(reference: string, propertyId?: string): void {
    persistPendingPayment(reference, propertyId);
  },

  persistPendingPaymentProperty(propertyId: string): void {
    if (propertyId) {
      sessionStorage.setItem(PENDING_PAYMENT_PROPERTY_KEY, propertyId);
    }
  },

  getPendingPaymentReference(): string | null {
    return sessionStorage.getItem(PENDING_PAYMENT_REFERENCE_KEY);
  },

  getPendingPaymentPropertyId(): string | null {
    return sessionStorage.getItem(PENDING_PAYMENT_PROPERTY_KEY);
  },

  clearPendingPayment(): void {
    sessionStorage.removeItem(PENDING_PAYMENT_REFERENCE_KEY);
    sessionStorage.removeItem(PENDING_PAYMENT_PROPERTY_KEY);
  },

  async initializePayment(propertyId: string): Promise<InitializePaymentResponse> {
    if (!propertyId) {
      throw new Error('Missing property ID.');
    }

    const { data } = await api.post<InitializePaymentResponse>('/payments/initialize', { propertyId });
    persistPendingPayment(data.reference, propertyId);
    return data;
  },

  redirectToCheckout({ redirectUrl, reference }: InitializePaymentResponse, propertyId?: string): void {
    persistPendingPayment(reference, propertyId);
    window.location.href = redirectUrl;
  },

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
