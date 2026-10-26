import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { paymentService } from './paymentService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('paymentService remediation contracts', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });

  it('initializes the server-calculated property payment with a bound challenge', async () => {
    const response = { redirectUrl: 'https://provider.test/session', reference: 'PAY-1' };
    vi.mocked(api.post).mockResolvedValue({ data: response });
    await expect(paymentService.initialize({ propertyId: 'RTQ-PROP-1' }, 'challenge-1')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/payments/initialize', { propertyId: 'RTQ-PROP-1' }, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
    expect(paymentService.getPendingPaymentReference()).toBe('PAY-1');
    expect(paymentService.getPendingPaymentReference('property:RTQ-PROP-1')).toBe('PAY-1');
    expect(paymentService.getPendingPaymentReference('installment:other')).toBeNull();
  });

  it('keeps an ambiguous or terminal reference scoped to its payable resource', async () => {
    const response = { reference: 'PAY-INSTALLMENT', pending: true };
    vi.mocked(api.post).mockResolvedValue({ data: response });
    await paymentService.initialize({ installmentId: 'inst-1', amount: 100 }, 'challenge-1');
    expect(paymentService.getPendingPaymentReference('installment:inst-1')).toBe('PAY-INSTALLMENT');
    expect(paymentService.getPendingPaymentReference('installment:inst-2')).toBeNull();
    paymentService.clearPendingPayment('installment:inst-2');
    expect(paymentService.getPendingPaymentReference('installment:inst-1')).toBe('PAY-INSTALLMENT');
    paymentService.clearPendingPayment('installment:inst-1');
    expect(paymentService.getPendingPaymentReference()).toBeNull();
  });

  it('exports the protected CSV through POST with the exact challenge header and body', async () => {
    const blob = new Blob(['reference,status\nPAY-1,pending'], { type: 'text/csv' });
    vi.mocked(api.post).mockResolvedValue({ data: blob });
    await expect(paymentService.exportPaymentsCsv({ limit: 2000 }, 'challenge-export')).resolves.toBe(blob);
    expect(api.post).toHaveBeenCalledWith('/payments/export.csv', { limit: 2000 }, {
      headers: { 'X-Step-Up-Challenge': 'challenge-export' }, responseType: 'blob',
    });
  });

  it('rejects limits outside the documented protected-export range before request', async () => {
    await expect(paymentService.exportPaymentsCsv({ limit: 2001 }, 'challenge-export')).rejects.toThrow(/1 to 2,000/);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('does not claim or redirect a pending attempt without a provider URL', () => {
    expect(() => paymentService.redirectToCheckout({ reference: 'PAY-PENDING', pending: true })).toThrow(/pending and has no provider redirect URL/);
    expect(paymentService.getPendingPaymentReference()).toBeNull();
  });
});
