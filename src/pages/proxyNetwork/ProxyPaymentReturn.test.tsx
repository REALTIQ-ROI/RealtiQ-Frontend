import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProxyPaymentReturn from './ProxyPaymentReturn';
import { cartService } from '../../services/cartService';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import { useCart } from '../../contexts/CartContext';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { role: 'buyer' } }),
}));

vi.mock('../../contexts/CartContext', () => ({
  useCart: vi.fn(),
}));

vi.mock('../../services/cartService', () => ({
  cartService: {
    getPendingCheckout: vi.fn(),
    clearPendingCheckout: vi.fn(),
    listCartCheckouts: vi.fn(),
  },
}));

vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    verifyPayment: vi.fn(),
    getDetail: vi.fn(),
  },
}));

vi.mock('../../services/propertyAnalyticsService', () => ({
  propertyAnalyticsService: { getAccessStatus: vi.fn() },
}));

const Location = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

describe('ProxyPaymentReturn', () => {
  const setCartFromResponse = vi.fn();
  const refreshCart = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(useCart).mockReturnValue({
      setCartFromResponse,
      refreshCart,
    } as never);
    vi.mocked(cartService.getPendingCheckout).mockReturnValue({
      checkoutId: 'checkout-1',
      reference: 'ref-unknown',
    });
  });

  it('preserves an unresolved checkout reference and offers status refresh without clearing the cart', async () => {
    const user = userEvent.setup();
    vi.mocked(proxyNetworkService.verifyPayment).mockResolvedValue({ verified: false });

    render(
      <MemoryRouter initialEntries={['/payments/verify?reference=ref-unknown']}>
        <ProxyPaymentReturn />
        <Location />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/outcome is unresolved, not confirmed as failed/i)).toBeInTheDocument();
    expect(screen.getByText('Payment reference: ref-unknown')).toBeInTheDocument();
    expect(cartService.clearPendingCheckout).not.toHaveBeenCalled();
    expect(setCartFromResponse).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Check payment status again' }));
    await waitFor(() => expect(proxyNetworkService.verifyPayment).toHaveBeenCalledTimes(2));
    expect(cartService.clearPendingCheckout).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/payments/verify');
  });

  it('clears checkout context only after provider verification and a matching checkout record', async () => {
    vi.mocked(cartService.getPendingCheckout).mockReturnValue({
      checkoutId: 'checkout-1',
      reference: 'ref-paid',
    });
    vi.mocked(proxyNetworkService.verifyPayment).mockResolvedValue({
      verified: true,
      payment: {
        _id: 'payment-1',
        purpose: 'multi_service_cart',
        status: 'paid',
        reference: 'ref-paid',
      },
    });

    render(
      <MemoryRouter initialEntries={['/payments/verify?reference=ref-paid']}>
        <ProxyPaymentReturn />
        <Location />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/buyer/cart-checkouts/checkout-1'));
    expect(cartService.clearPendingCheckout).toHaveBeenCalledTimes(1);
    expect(setCartFromResponse).toHaveBeenCalledWith(null);
  });
});
