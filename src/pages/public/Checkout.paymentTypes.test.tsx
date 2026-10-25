import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { paymentService } from '../../services/paymentService';
import Checkout from './Checkout';

vi.mock('../../components/layout/PublicLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../services/paymentService', () => ({
  paymentService: { getPendingPaymentPropertyId: vi.fn(() => null), initializePayment: vi.fn() },
}));

describe('outright checkout contract boundary', () => {
  it('preserves the property selection without starting direct payment', () => {
    render(<MemoryRouter initialEntries={['/checkout?propertyId=RTQ-PROP-1']}><Checkout /></MemoryRouter>);

    expect(screen.getByText('Outright checkout unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Property' })).toHaveAttribute('href', '/properties/RTQ-PROP-1');
    expect(paymentService.initializePayment).not.toHaveBeenCalled();
  });
});
