import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { revenueFoundationService } from './revenueFoundationService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

describe('Group 04 profile revenue contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests an informational fee quote without a step-up header or a fabricated amount', async () => {
    const body = { feeCode: 'FP-06', mode: 'protected' as const, currency: 'NGN' as const, baseMinor: 12500000, payerRule: 'split' as const, buyerSharePercent: 40 };
    const quote = { ...body, scheduleRevision: 3, netMinor: 1000, vatMinor: 75, grossMinor: 1075 };
    vi.mocked(api.post).mockResolvedValue({ data: { quote } } as never);
    await expect(revenueFoundationService.quoteFee(body)).resolves.toEqual(quote);
    expect(api.post).toHaveBeenCalledWith('/payments/fee-quotes', body);
  });

  it('keeps configured plan catalogue, current entitlement and purchase list profile-scoped', async () => {
    const catalogue = { state: 'configured', catalogueSource: 'unified', revision: 3, plans: [] };
    const current = { profileId: 'profile-1', category: 'developer', entitlement: null, usage: { activeProjects: 0, activeListings: 0, units: 0, additionalSeats: 0, includedHolderSeat: true }, latest: null, publicationAllowedByPlan: false };
    const page = { purchases: [], nextCursor: 'opaque-purchase-id' };
    vi.mocked(api.get).mockResolvedValueOnce({ data: catalogue } as never).mockResolvedValueOnce({ data: current } as never).mockResolvedValueOnce({ data: page } as never);
    await expect(revenueFoundationService.listPublicationPlans()).resolves.toEqual(catalogue);
    await expect(revenueFoundationService.getPublicationPlan()).resolves.toEqual(current);
    await expect(revenueFoundationService.listPublicationPurchases({ before: 'opaque', limit: 25 })).resolves.toEqual(page);
    expect(api.get).toHaveBeenNthCalledWith(1, '/profiles/current/publication-plans');
    expect(api.get).toHaveBeenNthCalledWith(2, '/profiles/current/publication-plan');
    expect(api.get).toHaveBeenNthCalledWith(3, '/profiles/current/publication-plan-purchases', { params: { before: 'opaque', limit: 25 } });
  });

  it('binds the exact purchase body and allows a separate persisted upgrade quote', async () => {
    const quoteBody = { planKey: 'developer-plus', billingPeriod: 'annual' as const, operationKey: 'publication_operation_1' };
    const quote = { id: 'quote-1', changeType: 'upgrade', ...quoteBody };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { quote } } as never).mockResolvedValueOnce({ data: { purchase: { id: 'purchase-1', state: 'pending' } } } as never);
    await revenueFoundationService.quotePublicationChange(quoteBody);
    await revenueFoundationService.purchasePublicationPlan({ ...quoteBody, quoteId: 'quote-1' }, 'challenge-1');
    expect(api.post).toHaveBeenNthCalledWith(1, '/profiles/current/publication-plan-change-quotes', quoteBody);
    expect(api.post).toHaveBeenNthCalledWith(2, '/profiles/current/publication-plan-purchases', { ...quoteBody, quoteId: 'quote-1' }, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('uses exact protected renewal, mandate and invoice requests without provider secrets', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { preference: { id: 'preference-1' } } } as never);
    vi.mocked(api.post).mockResolvedValueOnce({ data: { authorization: { id: 'authorization-1', state: 'pending_activation' }, redirectUrl: null, pending: true } } as never).mockResolvedValueOnce({ data: { payment: { id: 'payment-1', reference: 'ref-1', state: 'pending', redirectUrl: null } } } as never);
    const preference = { kind: 'publication_plan' as const, targetId: 'developer', planKey: 'plan-1', billingPeriod: 'monthly' as const, method: 'manual' as const, autoRenew: false, expectedVersion: 0 };
    await revenueFoundationService.saveRenewalPreference(preference, 'challenge-preference');
    await revenueFoundationService.startDirectDebit({ operationKey: 'mandate_operation_1', consent: true }, 'challenge-mandate');
    await revenueFoundationService.payRevenueDocument('invoice-1', { operationKey: 'invoice_operation_1' }, 'challenge-invoice');
    expect(api.put).toHaveBeenCalledWith('/profiles/current/billing/renewal-preferences', preference, { headers: { 'X-Step-Up-Challenge': 'challenge-preference' } });
    expect(api.post).toHaveBeenNthCalledWith(1, '/profiles/current/billing/payment-authorizations/direct-debit', { operationKey: 'mandate_operation_1', consent: true }, { headers: { 'X-Step-Up-Challenge': 'challenge-mandate' } });
    expect(api.post).toHaveBeenNthCalledWith(2, '/revenue-documents/invoice-1/pay', { operationKey: 'invoice_operation_1' }, { headers: { 'X-Step-Up-Challenge': 'challenge-invoice' } });
  });

  it('starts profile payout setup with the exact private bank fields and request-bound challenge', async () => {
    const body = { expectedVersion: 0, operationKey: 'payout_operation_1', bankCode: 'provider-bank-code', accountNumber: '0123456789' };
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'setup-1', state: 'reconciliation_required', maskedAccountNumber: '******6789' } } as never);
    await revenueFoundationService.startPayoutSetup(body, 'challenge-payout');
    expect(api.post).toHaveBeenCalledWith('/profiles/current/payout-setup', body, { headers: { 'X-Step-Up-Challenge': 'challenge-payout' } });
  });
});
