import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { adminService } from './adminService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

describe('adminService wallet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the platform ledger summary route', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        totalCredits: 5000,
        totalDebits: 0,
        netRevenue: 5000,
        availableRevenue: 5000,
        transactionCount: 1,
        breakdown: { titleDocumentViews: 5000, tourPayments: 0, other: 0, refunds: 0 },
      },
    });
    await adminService.getWalletSummary();
    expect(api.get).toHaveBeenCalledWith('/admin/wallet');
  });

  it('passes all supported shareable ledger filters as query parameters', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { transactions: [], total: 0, page: 2, limit: 25 } });
    const filters = {
      page: 2,
      limit: 25,
      type: 'title_document_view' as const,
      status: 'completed' as const,
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
      property: 'prop1',
      user: 'user1',
      reference: 'RTQ-DOC-PAY-1',
      paymentStatus: 'paid',
    };
    await adminService.listWalletTransactions(filters);
    expect(api.get).toHaveBeenCalledWith('/admin/wallet/transactions', { params: filters });
  });
});
