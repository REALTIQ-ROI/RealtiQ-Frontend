import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService } from '../../../services/paymentService';
import AdminPaymentDetails from './AdminPaymentDetails';

const mocks = vi.hoisted(() => ({
  getPaymentById: vi.fn(),
  verifyPayment: vi.fn(),
  cancelPayment: vi.fn(),
  startStepUp: vi.fn(),
  verifyStepUp: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/paymentService', () => ({ paymentService: {
  getPaymentById: mocks.getPaymentById,
  verifyPayment: mocks.verifyPayment,
  cancelPayment: mocks.cancelPayment,
} }));
vi.mock('../../../services/stepUpService', () => ({ stepUpService: { start: mocks.startStepUp, verify: mocks.verifyStepUp } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'finance-profile' }, token: 'session-token' }) }));
vi.mock('sweetalert2', () => ({ default: { fire: mocks.confirm } }));

const pendingPayment = {
  _id: 'payment-1',
  user: null,
  property: null,
  amount: 5_000,
  status: 'pending' as const,
  reference: 'PAY-1',
  createdAt: '2026-10-01T10:00:00.000Z',
};

describe('AdminPaymentDetails protected cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('activeProfileId', 'finance-profile');
    localStorage.setItem('token', 'session-token');
    mocks.getPaymentById.mockResolvedValue(pendingPayment);
    mocks.confirm.mockResolvedValue({ isConfirmed: true, value: 'Reviewed cancellation request' });
    mocks.startStepUp.mockResolvedValue({
      challengeId: 'challenge-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      method: 'totp',
    });
    mocks.verifyStepUp.mockResolvedValue(undefined);
    mocks.cancelPayment.mockResolvedValue({
      message: 'Payment canceled.',
      payment: { ...pendingPayment, status: 'canceled' },
      alreadyCanceled: false,
    });
  });

  it('binds the documented pending-payment cancellation and refreshes from its response', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/payment-details/payment-1']}>
        <Routes><Route path="/dashboard/admin/payment-details/:id" element={<AdminPaymentDetails />} /></Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Cancel payment' }));
    await waitFor(() => expect(mocks.startStepUp).toHaveBeenCalledWith(
      'PATCH',
      '/api/admin/payments/payment-1/cancel',
      { reason: 'Reviewed cancellation request' },
    ));

    await user.type(await screen.findByRole('textbox', { name: 'Six-digit authenticator code' }), '123456');
    const submit = await screen.findByRole('button', { name: 'Verify and continue' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    await waitFor(() => expect(mocks.verifyStepUp).toHaveBeenCalledWith('challenge-1', '123456'));
    expect(paymentService.cancelPayment).toHaveBeenCalledWith('payment-1', { reason: 'Reviewed cancellation request' }, 'challenge-1');
    expect(await screen.findByText('Payment Canceled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel payment' })).not.toBeInTheDocument();
    expect(screen.getByText(/does not issue a refund/i)).toBeInTheDocument();
  });

  it('does not expose cancellation for a failed payment', async () => {
    mocks.getPaymentById.mockResolvedValue({ ...pendingPayment, status: 'failed' });
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/payment-details/payment-1']}>
        <Routes><Route path="/dashboard/admin/payment-details/:id" element={<AdminPaymentDetails />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Transaction Details', level: 1 });
    expect(screen.queryByRole('button', { name: 'Cancel payment' })).not.toBeInTheDocument();
  });

  it('discards a pending challenge and stale detail when the payment route changes', async () => {
    const user = userEvent.setup();
    mocks.getPaymentById.mockImplementation(async (id: string) => ({ ...pendingPayment, _id: id, reference: id.toUpperCase() }));
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/payment-details/payment-1']}>
        <Link to="/dashboard/admin/payment-details/payment-2">Open next payment</Link>
        <Routes><Route path="/dashboard/admin/payment-details/:id" element={<AdminPaymentDetails />} /></Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Cancel payment' }));
    expect(await screen.findByRole('textbox', { name: 'Six-digit authenticator code' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Open next payment' }));

    expect(await screen.findAllByText('PAYMENT-2')).toHaveLength(2);
    expect(screen.queryByRole('textbox', { name: 'Six-digit authenticator code' })).not.toBeInTheDocument();
    expect(paymentService.cancelPayment).not.toHaveBeenCalled();
  });
});
