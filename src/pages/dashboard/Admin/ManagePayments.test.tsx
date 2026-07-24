import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService } from '../../../services/paymentService';
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
});
