import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { escrowService } from '../../services/escrowService';
import type { Escrow } from '../../types/escrow';
import BuyerRefundAccountForm from './BuyerRefundAccountForm';
import SellerPayoutAccountSettings from './SellerPayoutAccountSettings';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useAsync', () => ({ useAsync: vi.fn() }));
vi.mock('../../services/escrowService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/escrowService')>();
  return { ...original, escrowService: { ...original.escrowService, saveRefundDetails: vi.fn(), savePayoutAccount: vi.fn() } };
});

const escrow: Escrow = {
  _id: 'e1',
  amount: 75_000_000,
  status: 'refund_pending',
  refundStatus: 'needs_account_details',
  createdAt: '2026-07-25T12:00:00.000Z',
  buyer: { _id: 'b1', name: 'Ada Buyer', email: 'ada@example.com', role: 'buyer' },
};

describe('escrow-owned account forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets only the escrow buyer submit refund details and clears the full account number', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { _id: 'b1', role: 'buyer' } } as ReturnType<typeof useAuth>);
    vi.mocked(escrowService.saveRefundDetails).mockResolvedValue({
      accountName: 'ADA BUYER',
      maskedAccountNumber: '******6789',
      bankName: 'GTBank',
      submittedAt: '2026-07-25T12:00:00.000Z',
    });
    render(<BuyerRefundAccountForm escrow={escrow} onChanged={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Account number'), '0123456789');
    await userEvent.type(screen.getByLabelText('Bank code'), '058');
    await userEvent.type(screen.getByLabelText('Bank name'), 'GTBank');
    await userEvent.click(screen.getByRole('button', { name: 'Submit refund account' }));
    expect(escrowService.saveRefundDetails).toHaveBeenCalledWith('e1', {
      accountNumber: '0123456789',
      bankCode: '058',
      bankName: 'GTBank',
    });
    expect(await screen.findByText('******6789')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('0123456789')).not.toBeInTheDocument();
  });

  it('keeps only masked seller payout data after configuration', async () => {
    const execute = vi.fn().mockResolvedValue(null);
    vi.mocked(useAsync).mockReturnValue({ data: { configured: false }, loading: false, error: null, execute });
    vi.mocked(escrowService.savePayoutAccount).mockResolvedValue({
      configured: true,
      maskedAccountNumber: '******6789',
      bankName: 'GTBank',
      verifiedAccountName: 'TUNDE SELLER',
      verifiedAt: '2026-07-25T12:00:00.000Z',
    });
    render(<SellerPayoutAccountSettings />);
    await userEvent.type(screen.getByLabelText('Account number'), '0123456789');
    await userEvent.type(screen.getByLabelText('Bank code'), '058');
    await userEvent.type(screen.getByLabelText('Bank name'), 'GTBank');
    await userEvent.click(screen.getByRole('button', { name: 'Configure payout account' }));
    expect(escrowService.savePayoutAccount).toHaveBeenCalledWith({
      accountNumber: '0123456789',
      bankCode: '058',
      bankName: 'GTBank',
    });
    expect(screen.getByLabelText('Account number')).toHaveValue('');
    expect(localStorage.getItem('accountNumber')).toBeNull();
  });
});
