import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { financeRevenueService } from './financeRevenueService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('Finance revenue routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the selected staff API client and server aggregation for a bounded report period', async () => {
    const range = { from: '2026-11-01T00:00:00.000Z', to: '2026-11-09T00:00:00.000Z' };
    vi.mocked(api.get).mockResolvedValue({ data: { earned: [], feeLines: [], nextCursor: null } } as never);
    await financeRevenueService.getReport(range);
    await financeRevenueService.getFeeLines({ ...range, limit: 50 });
    expect(api.get).toHaveBeenNthCalledWith(1, '/admin/revenue/report', { params: range });
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/revenue/fee-lines', { params: { ...range, limit: 50 } });
  });

  it('binds refund decisions to their version and sends no amount or provider choice', async () => {
    const body = { decision: 'approve' as const, reason: 'Evidence reviewed', expectedVersion: 3 };
    vi.mocked(api.post).mockResolvedValue({ data: { refund: { id: 'refund-1', state: 'initializing' } } } as never);
    await financeRevenueService.decideProductRefund('refund-1', body, 'challenge-1');
    expect(api.post).toHaveBeenCalledWith('/admin/revenue/product-refunds/refund-1/decision', body, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('pages merchant settlement evidence with the server cursor and bounded period', async () => {
    const range = { from: '2026-11-01T00:00:00.000Z', to: '2026-11-09T00:00:00.000Z' };
    vi.mocked(api.get).mockResolvedValue({ data: { settlements: [], nextCursor: null, reconciliationScope: 'merchant_level_only;beneficiary_split_settlement_unconfirmed' } } as never);
    await financeRevenueService.getProviderSettlementLines({ ...range, limit: 50, before: 'opaque-cursor' });
    expect(api.get).toHaveBeenCalledWith('/admin/revenue/provider-settlement-lines', { params: { ...range, limit: 50, before: 'opaque-cursor' } });
  });

  it('pages webhook settlement events and binds a selected event reconciliation to an empty body', async () => {
    const range = { from: '2026-11-01T00:00:00.000Z', to: '2026-11-09T00:00:00.000Z' };
    vi.mocked(api.get).mockResolvedValue({ data: { settlements: [], nextCursor: null } });
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'event-1', state: 'held', beneficiarySettlement: 'unconfirmed' } });
    await financeRevenueService.getProviderSettlementEvents({ ...range, after: 'opaque-event-id', limit: 50 });
    await financeRevenueService.reconcileProviderSettlementEvent('event-1', 'challenge-1');
    expect(api.get).toHaveBeenCalledWith('/admin/revenue/provider-settlements', { params: { ...range, after: 'opaque-event-id', limit: 50 } });
    expect(api.post).toHaveBeenCalledWith('/admin/revenue/provider-settlements/event-1/reconcile', {}, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('reconciles old refund references and document issuance with exact empty bodies', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { checked: 1, completed: 0, pending: 1, held: 0 } } as never);
    await financeRevenueService.reconcileProductRefunds({}, 'refund-challenge');
    await financeRevenueService.reconcileRevenueDocuments({}, 'document-challenge');
    expect(api.post).toHaveBeenNthCalledWith(1, '/admin/revenue/product-refunds/reconcile', {}, { headers: { 'X-Step-Up-Challenge': 'refund-challenge' } });
    expect(api.post).toHaveBeenNthCalledWith(2, '/admin/revenue/documents/reconcile', {}, { headers: { 'X-Step-Up-Challenge': 'document-challenge' } });
  });
});
