import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminService } from '../../../services/adminService';
import AdminWallet from './AdminWallet';

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../../services/adminService', () => ({
  adminService: { getWalletSummary: vi.fn(), listWalletTransactions: vi.fn() },
}));

const walletSummary = {
  totalCredits: 5000,
  totalDebits: 0,
  netRevenue: 5000,
  availableRevenue: 5000,
  transactionCount: 1,
  breakdown: { titleDocumentViews: 5000, tourPayments: 0, other: 0, refunds: 0 },
};

describe('AdminWallet optional aggregate presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getWalletSummary).mockResolvedValue(walletSummary);
    vi.mocked(adminService.listWalletTransactions).mockResolvedValue({ transactions: [], total: 0, page: 1, limit: 25 });
  });

  it('labels an omitted optional revenue aggregate as not reported', async () => {
    render(<MemoryRouter><AdminWallet /></MemoryRouter>);

    await waitFor(() => expect(adminService.getWalletSummary).toHaveBeenCalledTimes(1));
    const metric = await screen.findByText('Property Agent revenue');
    expect(metric.parentElement).toHaveTextContent('Not reported');
    expect(metric.parentElement).not.toHaveTextContent('₦0');
  });

  it('preserves a returned numeric zero for the optional aggregate', async () => {
    vi.mocked(adminService.getWalletSummary).mockResolvedValue({
      ...walletSummary,
      breakdown: { ...walletSummary.breakdown, proxyInspectionRevenue: 0 },
    });
    render(<MemoryRouter><AdminWallet /></MemoryRouter>);

    const metric = await screen.findByText('Property Agent revenue');
    expect(metric.parentElement).toHaveTextContent('₦0');
  });

  it('offers only documented payment status filters after loading', async () => {
    render(<MemoryRouter><AdminWallet /></MemoryRouter>);

    const statusFilter = await screen.findByRole('combobox', { name: 'Payment status' });
    expect(statusFilter).toHaveDisplayValue('All payment states');
    expect(within(statusFilter).getByRole('option', { name: 'Pending' })).toHaveValue('pending');
    expect(within(statusFilter).getByRole('option', { name: 'Paid' })).toHaveValue('paid');
    expect(within(statusFilter).getByRole('option', { name: 'Failed' })).toHaveValue('failed');
    expect(within(statusFilter).getByRole('option', { name: 'Canceled' })).toHaveValue('canceled');
  });
});
