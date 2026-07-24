import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAsync } from '../../../hooks/useAsync';
import { escrowService } from '../../../services/escrowService';
import type { Property } from '../../../types';
import CreateEscrow from './CreateEscrow';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({ toast }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'buyer-1', role: 'buyer', name: 'Buyer' },
  }),
}));
vi.mock('../../../components/layout/BuyerPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../hooks/useAsync', () => ({ useAsync: vi.fn() }));
vi.mock('../../../services/escrowService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/escrowService')>();
  return {
    ...original,
    escrowService: { ...original.escrowService, create: vi.fn() },
  };
});

const property: Property = {
  _id: 'property-1',
  publicReference: 'RTQ-PROP-1',
  title: 'Lekki Home',
  price: 100_000_000,
  paymentTypes: ['escrow'],
  location: 'Lekki, Lagos',
  propertyType: 'house',
  bedrooms: 4,
  bathrooms: 4,
  description: 'Home',
  squareFeet: 3000,
  media: [],
  status: 'available' as const,
  approvalStatus: 'approved' as const,
  ownerId: { _id: 'seller-1', name: 'Seller' },
};

const renderCreate = () =>
  render(
    <MemoryRouter
      initialEntries={['/dashboard/buyer/escrows/create/RTQ-PROP-1']}
    >
      <Routes>
        <Route
          path="/dashboard/buyer/escrows/create/:propertyId"
          element={<CreateEscrow />}
        />
        <Route
          path="/dashboard/buyer/escrows/:id"
          element={<p>Escrow detail destination</p>}
        />
      </Routes>
    </MemoryRouter>,
  );

const enableCustomAllocation = async () => {
  await userEvent.click(
    screen.getByRole('radio', { name: /Define custom milestone allocations/i }),
  );
};

describe('CreateEscrow milestone amounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAsync).mockReturnValue({
      data: property,
      loading: false,
      error: null,
      execute: vi.fn().mockResolvedValue(property),
    });
    vi.mocked(escrowService.create).mockResolvedValue({
      _id: 'escrow-1',
      amount: 100_000_000,
      status: 'pending_payment',
      createdAt: '2026-07-24T10:00:00.000Z',
      rules: [],
      logs: [],
      milestoneSummary: {
        configured: true,
        totalAllocated: 100_000_000,
        satisfiedAmount: 0,
        remainingAmount: 100_000_000,
        milestoneCount: 1,
        satisfiedMilestoneCount: 0,
      },
    });
  });

  it('submits an exact numeric allocation while keeping full funding separate', async () => {
    renderCreate();
    await enableCustomAllocation();
    await userEvent.type(
      screen.getByLabelText('Milestone amount (NGN)'),
      '100000000',
    );

    expect(screen.getByText('Unallocated amount').parentElement)
      .toHaveTextContent(/₦0/);
    await userEvent.click(screen.getByRole('button', { name: 'Review Escrow' }));
    expect(screen.getByText(/Paystack will still charge the full escrow amount/i))
      .toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('checkbox', { name: /full property price is funded upfront/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create Escrow' }));

    expect(escrowService.create).toHaveBeenCalledWith({
      propertyId: 'RTQ-PROP-1',
      amount: 100_000_000,
      rules: [{
        type: 'inspection_completed',
        description: 'Buyer must confirm physical inspection before release',
        required: true,
        amount: 100_000_000,
        metadata: {},
      }],
      metadata: {},
    });
    expect(await screen.findByText('Escrow detail destination')).toBeInTheDocument();
  });

  it('blocks missing, below-total, and overallocated custom milestones', async () => {
    renderCreate();
    await enableCustomAllocation();

    await userEvent.click(screen.getByRole('button', { name: 'Review Escrow' }));
    expect(await screen.findByText(/Enter an amount for this required milestone/i))
      .toBeInTheDocument();

    const amount = screen.getByRole('spinbutton', {
      name: /Milestone amount \(NGN\)/i,
    });
    await userEvent.type(amount, '90000000');
    await userEvent.click(screen.getByRole('button', { name: 'Review Escrow' }));
    expect(toast.error).toHaveBeenCalledWith(
      'Milestone allocations must total the full escrow amount.',
    );

    await userEvent.clear(amount);
    await userEvent.type(amount, '110000000');
    expect(screen.getByText('Overallocated amount').parentElement)
      .toHaveTextContent(/10,000,000/);
    await userEvent.click(screen.getByRole('button', { name: 'Review Escrow' }));
    expect(toast.error).toHaveBeenCalledWith(
      'Milestone allocations exceed the escrow amount.',
    );
    expect(escrowService.create).not.toHaveBeenCalled();
  });

  it('renders an authoritative backend allocation error and preserves the entered plan', async () => {
    vi.mocked(escrowService.create).mockRejectedValueOnce(
      new Error(
        'Escrow milestone amounts must total the escrow amount of 100000000',
      ),
    );
    renderCreate();
    await enableCustomAllocation();
    await userEvent.type(
      screen.getByLabelText('Milestone amount (NGN)'),
      '100000000',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Review Escrow' }));
    await userEvent.click(
      screen.getByRole('checkbox', { name: /full property price is funded upfront/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create Escrow' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escrow milestone amounts must total the escrow amount of 100000000',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(
      screen.getByRole('spinbutton', {
        name: /Milestone amount \(NGN\)/i,
      }),
    ).toHaveValue(100_000_000);
  });
});
