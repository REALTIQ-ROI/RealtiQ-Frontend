import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService } from '../../../services/paymentService';
import ManagePayments from './ManagePayments';

vi.mock('../../../components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ activeProfile: { id: 'finance-profile' }, token: 'session-token', adminAccess: { readOnly: false, isInternalAudit: false, staffDepartments: ['finance'], capabilities: ['finance.read', 'finance.manage'] } }),
}));
vi.mock('../../../services/paymentService', () => ({
  paymentService: {
    getPaymentsPage: vi.fn(),
    verifyPayment: vi.fn(),
  },
}));

describe('ManagePayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('activeProfileId', 'finance-profile');
  });

  it('shows the safe payment purpose and missing related records without guessing buyer identity', async () => {
    const payments = [
      {
        _id: 'payment-1',
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
        property: null,
        amount: 5000,
        status: 'pending',
        reference: 'RTQ-DOC-PAY-2',
        createdAt: '2026-07-24T09:00:00.000Z',
      },
    ] as Awaited<ReturnType<typeof paymentService.getPaymentsPage>>['payments'];
    vi.mocked(paymentService.getPaymentsPage).mockResolvedValue({ payments, page: 1, limit: 20, total: 2 });

    render(
      <MemoryRouter>
        <ManagePayments />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lekki Home')).toBeInTheDocument();
    expect(screen.getByText('title document view')).toBeInTheDocument();
    expect(screen.getByText('Not returned')).toBeInTheDocument();
    expect(screen.queryByText('Guest')).not.toBeInTheDocument();
    expect(screen.getByText('Property unavailable')).toBeInTheDocument();
    expect(screen.getByText('Related record unavailable')).toBeInTheDocument();
  });

  it('offers cancellation only through the documented pending-payment flow', async () => {
    const payments = [
      {
        _id: 'payment-2',
        property: null,
        amount: 5000,
        status: 'pending',
        reference: 'RTQ-DOC-PAY-2',
        createdAt: '2026-07-24T09:00:00.000Z',
      },
    ] as Awaited<ReturnType<typeof paymentService.getPaymentsPage>>['payments'];
    vi.mocked(paymentService.getPaymentsPage).mockResolvedValue({ payments, page: 1, limit: 20, total: 1 });
    render(
      <MemoryRouter>
        <ManagePayments />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Cancel payment' })).toBeEnabled();
    expect(screen.getByText(/cancels only a pending attempt and does not issue a refund/i)).toBeInTheDocument();
  });
});
