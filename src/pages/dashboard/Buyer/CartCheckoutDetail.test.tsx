import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CartCheckoutDetail from './CartCheckoutDetail';
import { cartService } from '../../../services/cartService';
import { paymentService } from '../../../services/paymentService';

vi.mock('../../../components/layout/BuyerPortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/cartService', () => ({ cartService: { getCartCheckout: vi.fn() } }));
vi.mock('../../../services/paymentService', () => ({ paymentService: { verifyPayment: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

const checkout = {
  checkoutId: 'checkout1', paymentReference: 'part-1', totalAmount: 5000, currency: 'NGN' as const,
  status: 'partially_paid' as const, initializationState: 'ready',
  paymentParts: [
    { key: 'merchant_collection_1', custody: 'merchant_collection' as const, paymentId: 'pay1', reference: 'part-1', amount: 3000, currency: 'NGN' as const, state: 'paid' as const, redirectUrl: null, providerCode: null },
    { key: 'merchant_collection_2', custody: 'merchant_collection' as const, paymentId: 'pay2', reference: 'part-2', amount: 2000, currency: 'NGN' as const, state: 'initialized' as const, redirectUrl: 'https://provider.example/part-2', providerCode: null },
    { key: 'merchant_collection_3', custody: 'merchant_collection' as const, paymentId: 'pay3', reference: 'part-3', amount: 1000, currency: 'NGN' as const, state: 'outcome_unknown' as const, redirectUrl: 'https://provider.example/part-3', providerCode: null },
  ],
  items: [],
};

describe('cart checkout payment parts', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(cartService.getCartCheckout).mockResolvedValue(checkout); });
  const open = () => render(<MemoryRouter initialEntries={['/cart-checkouts/checkout1']}><Routes><Route path="/cart-checkouts/:checkoutId" element={<CartCheckoutDetail />} /></Routes></MemoryRouter>);

  it('shows each server part and offers a provider link only for an initialized part', async () => {
    open();
    expect(await screen.findByRole('heading', { name: 'Payment parts' })).toBeInTheDocument();
    expect(screen.getByText('Reference part-1')).toBeInTheDocument();
    expect(screen.getByText('Reference part-2')).toBeInTheDocument();
    expect(screen.getByText('Reference part-3')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Continue this payment' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Continue this payment' })).toHaveAttribute('href', 'https://provider.example/part-2');
    expect(screen.queryByText(/all services are active/i)).not.toBeInTheDocument();
  });

  it('verifies the selected part reference and reloads authoritative checkout state', async () => {
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({ verified: false });
    open();
    await screen.findByText('Reference part-3');
    fireEvent.click(screen.getAllByRole('button', { name: 'Check this reference' })[2]);
    await waitFor(() => expect(paymentService.verifyPayment).toHaveBeenCalledWith('part-3'));
    await waitFor(() => expect(cartService.getCartCheckout).toHaveBeenCalledTimes(2));
  });
});
