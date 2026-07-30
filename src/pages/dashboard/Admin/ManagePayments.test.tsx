import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService } from '../../../services/paymentService';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import ManagePayments from './ManagePayments';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
}));
vi.mock('../../../components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../services/paymentService', () => ({
  paymentService: {
    getPayments: vi.fn(),
    verifyPayment: vi.fn(),
    cancelPayment: vi.fn(),
  },
}));

describe('ManagePayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders guest and missing related records without crashing the page', async () => {
    vi.mocked(paymentService.getPayments).mockResolvedValue([
      {
        _id: 'payment-1',
        user: null,
        guestIdentity: {},
        property: {
          _id: 'property-1',
          title: 'Lekki Home',
          price: 75_000_000,
          location: 'Lekki, Lagos',
        },
        purpose: 'title_document_view',
        amount: 5000,
        status: 'paid',
        reference: 'RTQ-DOC-PAY-1',
        createdAt: '2026-07-24T08:00:00.000Z',
      },
      {
        _id: 'payment-2',
        user: null,
        property: null,
        amount: 5000,
        status: 'pending',
        reference: 'RTQ-DOC-PAY-2',
        createdAt: '2026-07-24T09:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <ManagePayments />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lekki Home')).toBeInTheDocument();
    expect(screen.getAllByText('Guest')).toHaveLength(2);
    expect(screen.getAllByText('Secure guest payment')).toHaveLength(2);
    expect(screen.getByText('Property unavailable')).toBeInTheDocument();
    expect(screen.getByText('Related record unavailable')).toBeInTheDocument();
  });

  it('cancels pending payments with an optional admin reason', async () => {
    const user = userEvent.setup();
    vi.mocked(paymentService.getPayments).mockResolvedValue([
      {
        _id: 'payment-2',
        user: null,
        property: null,
        amount: 5000,
        status: 'pending',
        reference: 'RTQ-DOC-PAY-2',
        createdAt: '2026-07-24T09:00:00.000Z',
      },
    ]);
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true, value: 'Duplicate pending hold' });
    vi.mocked(paymentService.cancelPayment).mockResolvedValue({
      message: 'Payment canceled successfully.',
      alreadyCanceled: false,
      payment: {
        _id: 'payment-2',
        user: null,
        property: null,
        amount: 5000,
        status: 'canceled',
        reference: 'RTQ-DOC-PAY-2',
        createdAt: '2026-07-24T09:00:00.000Z',
        metadata: {
          canceledBy: 'admin-1',
          canceledAt: '2026-07-24T10:00:00.000Z',
          cancellationReason: 'Duplicate pending hold',
        },
      },
    });

    render(
      <MemoryRouter>
        <ManagePayments />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Cancel payment' }));

    expect(paymentService.cancelPayment).toHaveBeenCalledWith('payment-2', 'Duplicate pending hold');
    expect(toast.success).toHaveBeenCalledWith('Payment canceled successfully.');
    expect((await screen.findAllByText('canceled')).length).toBeGreaterThan(0);
  });
});
