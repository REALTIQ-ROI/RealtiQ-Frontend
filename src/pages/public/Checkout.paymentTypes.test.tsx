import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentService } from '../../services/paymentService';
import { propertyService } from '../../services/propertyService';
import type { Property } from '../../types';
import Checkout from './Checkout';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('../../components/layout/PublicLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { _id: 'buyer-1', role: 'buyer' },
  }),
}));
vi.mock('../../services/propertyService', () => ({
  propertyService: { getPropertyById: vi.fn() },
}));
vi.mock('../../services/paymentService', () => ({
  paymentService: {
    getPendingPaymentPropertyId: vi.fn(() => null),
    persistPendingPaymentProperty: vi.fn(),
    initializePayment: vi.fn(),
    redirectToCheckout: vi.fn(),
  },
}));

const property = (paymentTypes: Property['paymentTypes']): Property => ({
  _id: 'property-1',
  publicReference: 'RTQ-PROP-1',
  title: 'Ikoyi Home',
  price: 45_000_000,
  location: 'Ikoyi, Lagos',
  propertyType: 'house',
  bedrooms: 4,
  bathrooms: 4,
  description: 'A home',
  squareFeet: 3000,
  media: [],
  status: 'available',
  approvalStatus: 'approved',
  paymentTypes,
});

describe('outright checkout availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentService.initializePayment).mockResolvedValue({
      redirectUrl: 'https://checkout.example.test',
      reference: 'PAY-1',
    });
  });

  it('does not initialize direct purchase when outright is not offered', async () => {
    vi.mocked(propertyService.getPropertyById).mockResolvedValue(property(['installment', 'escrow']));

    render(
      <MemoryRouter initialEntries={['/checkout?propertyId=property-1']}>
        <Checkout />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Outright Payment Unavailable')).toBeInTheDocument();
    expect(paymentService.initializePayment).not.toHaveBeenCalled();
  });

  it('keeps the legacy missing-field fallback on the existing direct-purchase flow', async () => {
    vi.mocked(propertyService.getPropertyById).mockResolvedValue(
      property(undefined as unknown as Property['paymentTypes']),
    );

    render(
      <MemoryRouter initialEntries={['/checkout?propertyId=property-1']}>
        <Checkout />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(paymentService.initializePayment).toHaveBeenCalledWith('property-1');
      expect(paymentService.redirectToCheckout).toHaveBeenCalled();
    });
  });
});
