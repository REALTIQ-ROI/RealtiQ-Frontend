import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { fxAgreementService } from './fxAgreementService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('fxAgreementService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a buyer proposal without a client-computed rate', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { agreement: { id: 'agreement-1', status: 'proposed' }, idempotent: false } });
    const body = { propertyId: 'property-1', payableAmountMinor: 25_000_000_00, operationKey: 'proposal_12345678' };
    await fxAgreementService.propose(body);
    expect(api.post).toHaveBeenCalledWith('/payments/fx-confirmations', body);
    await expect(fxAgreementService.propose({ ...body, payableAmountMinor: 10001 })).rejects.toThrow(/whole naira/);
  });

  it('loads current agreements and confirms by server version without step-up', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { agreements: [{ id: 'agreement-1', status: 'proposed' }] } });
    vi.mocked(api.post).mockResolvedValue({ data: { agreement: { id: 'agreement-1', status: 'confirmed' } } });
    await expect(fxAgreementService.list({ propertyId: 'property-1', limit: 50 })).resolves.toHaveLength(1);
    expect(api.get).toHaveBeenCalledWith('/payments/fx-confirmations', { params: { propertyId: 'property-1', limit: 50 } });
    await fxAgreementService.confirm('agreement-1', 1);
    expect(api.post).toHaveBeenCalledWith('/payments/fx-confirmations/agreement-1/confirm', { expectedVersion: 1 });
  });

  it('binds an installment proposal to the exact payable schedule item and USD cents', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { agreement: { id: 'installment-fx' }, idempotent: false } });
    const body = { installmentId: 'installment-1', scheduleItemId: 'item-1', listedAmountMinor: 12500, payableAmountMinor: 20_000_000, operationKey: 'installment_fx_123' };
    await fxAgreementService.propose(body);
    expect(api.post).toHaveBeenCalledWith('/payments/fx-confirmations', body);
    await expect(fxAgreementService.propose({ ...body, listedAmountMinor: 0 })).rejects.toThrow(/current payable/);
  });
});
