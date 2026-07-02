import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostPaymentRedirect from './PostPaymentRedirect';
import { escrowService } from '../../services/escrowService';
import { paymentService } from '../../services/paymentService';

vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('../../services/paymentService', () => ({ paymentService: { getPendingPaymentReference: vi.fn(), verifyPayment: vi.fn(), clearPendingPayment: vi.fn() } }));
vi.mock('../../services/escrowService', () => ({ escrowService: { getPendingId: vi.fn(), getPendingReference: vi.fn(), get: vi.fn(), clearPending: vi.fn() } }));

describe('PostPaymentRedirect', () => {
  beforeEach(() => {
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({ verified: true, payment: { _id: 'pay1', status: 'paid', reference: 'ref1' } });
    vi.mocked(escrowService.getPendingId).mockReturnValue('e1'); vi.mocked(escrowService.getPendingReference).mockReturnValue('ref1');
    vi.mocked(escrowService.get).mockResolvedValue({ _id: 'e1', amount: 10, status: 'locked', createdAt: '', logs: [], rules: [] });
  });
  it('shows escrow-specific success and does not claim property purchase completion', async () => {
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=ref1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Payment secured in escrow' })).toBeInTheDocument();
    expect(screen.getByText(/not yet a completed property purchase/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Escrow' })).toHaveAttribute('href', '/dashboard/buyer/escrows/e1');
    expect(escrowService.clearPending).toHaveBeenCalled();
  });
  it('shows retry recovery when verification fails', async () => {
    vi.mocked(paymentService.verifyPayment).mockRejectedValueOnce(new Error('Network unavailable'));
    render(<MemoryRouter initialEntries={['/post-payment-redirect?trxref=ref1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByText('Network unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Verification' })).toBeInTheDocument();
  });
});
