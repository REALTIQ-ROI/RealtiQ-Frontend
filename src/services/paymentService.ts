import api, { ApiRequestError } from '../lib/axios';
import type { ApiPayment, VerifyPaymentResponse } from '../types';

const PENDING_PAYMENT_REFERENCE_KEY = 'realtiq.pendingPaymentReference';
const PENDING_PAYMENT_PROPERTY_KEY = 'realtiq.pendingPaymentPropertyId';
const PENDING_PAYMENT_RESOURCE_KEY = 'realtiq.pendingPaymentResourceKey';

export type PaymentInitializationRequest =
  | { propertyId: string }
  | { installmentId: string; amount: number; scheduleItemId?: string }
  | { escrowId: string };

export interface InitializePaymentResponse {
  redirectUrl?: string;
  reference: string;
  pending?: boolean;
  status?: string;
  reconciliationRequired?: boolean;
  paymentId?: string;
  escrowId?: string;
}

const persistPendingPayment = (reference: string, propertyId?: string, resourceKey?: string) => {
  sessionStorage.setItem(PENDING_PAYMENT_REFERENCE_KEY, reference);
  if (propertyId) {
    sessionStorage.setItem(PENDING_PAYMENT_PROPERTY_KEY, propertyId);
  }
  if (resourceKey) sessionStorage.setItem(PENDING_PAYMENT_RESOURCE_KEY, resourceKey);
};

const resourceKeyFor = (body: PaymentInitializationRequest): string => {
  if ('propertyId' in body) return `property:${body.propertyId}`;
  if ('installmentId' in body) return `installment:${body.installmentId}`;
  return `escrow:${body.escrowId}`;
};

export const paymentService = {
  persistPaymentReference(reference: string, propertyId?: string, resourceKey?: string): void {
    persistPendingPayment(reference, propertyId, resourceKey ?? (propertyId ? `property:${propertyId}` : undefined));
  },

  persistPendingPaymentProperty(propertyId: string): void {
    if (propertyId) {
      sessionStorage.setItem(PENDING_PAYMENT_PROPERTY_KEY, propertyId);
    }
  },

  getPendingPaymentReference(resourceKey?: string): string | null {
    if (resourceKey && sessionStorage.getItem(PENDING_PAYMENT_RESOURCE_KEY) !== resourceKey) return null;
    return sessionStorage.getItem(PENDING_PAYMENT_REFERENCE_KEY);
  },

  getPendingPaymentResourceKey(): string | null {
    return sessionStorage.getItem(PENDING_PAYMENT_RESOURCE_KEY);
  },

  getPendingPaymentPropertyId(): string | null {
    return sessionStorage.getItem(PENDING_PAYMENT_PROPERTY_KEY);
  },

  clearPendingPayment(resourceKey?: string): void {
    if (resourceKey && sessionStorage.getItem(PENDING_PAYMENT_RESOURCE_KEY) !== resourceKey) return;
    sessionStorage.removeItem(PENDING_PAYMENT_REFERENCE_KEY);
    sessionStorage.removeItem(PENDING_PAYMENT_PROPERTY_KEY);
    sessionStorage.removeItem(PENDING_PAYMENT_RESOURCE_KEY);
  },

  redirectToCheckout({ redirectUrl, reference }: InitializePaymentResponse, propertyId?: string, resourceKey?: string): void {
    if (!redirectUrl) throw new Error('The payment attempt is pending and has no provider redirect URL. Check its status before taking another action.');
    persistPendingPayment(reference, propertyId, resourceKey ?? (propertyId ? `property:${propertyId}` : undefined));
    window.location.href = redirectUrl;
  },

  async initialize(body: PaymentInitializationRequest, challengeId: string): Promise<InitializePaymentResponse> {
    const resourceKey = resourceKeyFor(body);
    const propertyId = 'propertyId' in body ? body.propertyId : undefined;
    try {
      const { data } = await api.post<InitializePaymentResponse>('/payments/initialize', body, {
        headers: { 'X-Step-Up-Challenge': challengeId },
      });
      if (data.reference) persistPendingPayment(data.reference, propertyId, resourceKey);
      return data;
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.reference) persistPendingPayment(raw.reference, propertyId, resourceKey);
      throw raw;
    }
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
    const { data } = await api.get<VerifyPaymentResponse>(`/payments/verify/${encodeURIComponent(reference)}`, { withCredentials: true });
    return data;
  },

  async exportPaymentsCsv(body: { limit?: number }, challengeId: string): Promise<Blob> {
    const { data } = await api.post<Blob>('/payments/export.csv', body, {
      headers: { 'X-Step-Up-Challenge': challengeId },
      responseType: 'blob',
    });
    return data;
  },

  async cancelPayment(id: string, body: { reason?: string }, challengeId: string): Promise<{ message: string; payment: ApiPayment; alreadyCanceled: boolean }> {
    const { data } = await api.patch<{ message: string; payment: ApiPayment; alreadyCanceled: boolean }>(
      `/admin/payments/${encodeURIComponent(id)}/cancel`, body,
      { headers: { 'X-Step-Up-Challenge': challengeId } },
    );
    return data;
  },

};
