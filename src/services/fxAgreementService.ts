import api from '../lib/axios';

export interface FxAgreement {
  id: string;
  propertyId: string;
  buyerProfileId: string;
  sellerProfileId: string;
  installmentId?: string;
  scheduleItemId?: string;
  listedCurrency: 'USD';
  listedAmountMinor: number;
  payableCurrency: 'NGN';
  payableAmountMinor: number;
  rateNgnPerUsd: number;
  status: string;
  version: number;
  buyerConfirmedAt: string | null;
  sellerConfirmedAt: string | null;
  consumedAt: string | null;
  expiresAt: string;
}

export type FxProposal =
  | { propertyId: string; payableAmountMinor: number; operationKey: string }
  | { installmentId: string; scheduleItemId: string; listedAmountMinor: number; payableAmountMinor: number; operationKey: string };

const validateProposal = (body: FxProposal) => {
  if (!Number.isSafeInteger(body.payableAmountMinor) || body.payableAmountMinor <= 0 || body.payableAmountMinor % 100 !== 0) {
    throw new Error('Enter a positive whole naira amount.');
  }
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(body.operationKey)) throw new Error('The FX proposal key is invalid.');
  if ('installmentId' in body && (!body.scheduleItemId || !Number.isSafeInteger(body.listedAmountMinor) || body.listedAmountMinor <= 0)) {
    throw new Error('Choose a current payable installment schedule item.');
  }
};

export const fxAgreementService = {
  async propose(body: FxProposal): Promise<{ agreement: FxAgreement; idempotent: boolean }> {
    validateProposal(body);
    const { data } = await api.post<{ agreement: FxAgreement; idempotent: boolean }>('/payments/fx-confirmations', body);
    return data;
  },
  async list(params: { propertyId?: string; installmentId?: string; limit?: number }): Promise<FxAgreement[]> {
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)) throw new Error('Choose an FX agreement limit from 1 to 100.');
    const { data } = await api.get<{ agreements: FxAgreement[] }>('/payments/fx-confirmations', { params });
    return data.agreements;
  },
  async get(id: string): Promise<FxAgreement> {
    const { data } = await api.get<{ agreement: FxAgreement }>(`/payments/fx-confirmations/${encodeURIComponent(id)}`);
    return data.agreement;
  },
  async confirm(id: string, expectedVersion: number): Promise<FxAgreement> {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw new Error('Reload the agreement before confirming.');
    const { data } = await api.post<{ agreement: FxAgreement }>(`/payments/fx-confirmations/${encodeURIComponent(id)}/confirm`, { expectedVersion });
    return data.agreement;
  },
};
