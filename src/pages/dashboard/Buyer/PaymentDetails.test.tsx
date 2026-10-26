import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentDetails from './PaymentDetails';
import { paymentService } from '../../../services/paymentService';

vi.mock('../../../components/layout/BuyerPortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'buyer' } }) }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('../../../services/paymentService', () => ({ paymentService: {
  getPaymentById: vi.fn(),
  verifyPayment: vi.fn(),
} }));

const payment = {
  _id: 'payment-1',
  user: null,
  property: null,
  amount: 5000,
  status: 'pending' as const,
  reference: 'ref-1',
  createdAt: '2026-10-26T10:00:00.000Z',
};

describe('PaymentDetails verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentService.getPaymentById).mockResolvedValue(payment);
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({
      verified: true,
      payment: { _id: payment._id, status: 'paid', reference: payment.reference },
    });
  });

  it('reloads the authorized payment projection instead of marking it paid locally', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/buyer/payment-details/payment-1']}>
        <Routes><Route path="/dashboard/buyer/payment-details/:id" element={<PaymentDetails />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Verify Payment' }));

    await waitFor(() => expect(paymentService.verifyPayment).toHaveBeenCalledWith('ref-1'));
    await waitFor(() => expect(paymentService.getPaymentById).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: 'Payment Pending' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Payment Confirmed' })).not.toBeInTheDocument();
  });
});
