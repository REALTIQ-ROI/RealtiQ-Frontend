import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { cartService } from './cartService';

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('cartService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('gets the backend cart state used for count and subtotal', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { cartId: 'cart1', currency: 'NGN', subtotal: 5000, itemCount: 1, status: 'active', items: [] } });
    const result = await cartService.getCart();
    expect(api.get).toHaveBeenCalledWith('/cart');
    expect(result.itemCount).toBe(1);
    expect(result.subtotal).toBe(5000);
  });

  it('adds a title document cart item without sending frontend price data', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { cartId: 'cart1', currency: 'NGN', subtotal: 5000, itemCount: 1, status: 'active', items: [] } });
    await cartService.addCartItem({ itemType: 'title_document_view', resourceId: 'doc1' });
    expect(api.post).toHaveBeenCalledWith('/cart/items', { itemType: 'title_document_view', resourceId: 'doc1' });
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).not.toHaveProperty('amount');
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).not.toHaveProperty('price');
  });

  it('adds analytics access with accessType only', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { cartId: 'cart1', currency: 'NGN', subtotal: 10000, itemCount: 1, status: 'active', items: [] } });
    await cartService.addCartItem({ itemType: 'property_market_analytics', accessType: 'one_time' });
    expect(api.post).toHaveBeenCalledWith('/cart/items', { itemType: 'property_market_analytics', accessType: 'one_time' });
  });

  it('initializes unified checkout and stores the pending checkout reference', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        checkoutId: 'checkout1',
        reference: 'ref1',
        redirectUrl: 'https://checkout.paystack.com/ref1',
        authorizationUrl: 'https://checkout.paystack.com/ref1',
        totalAmount: 55000,
        currency: 'NGN',
      },
    });
    const result = await cartService.initializeCartCheckout();
    expect(api.post).toHaveBeenCalledWith('/cart/checkout/initialize');
    expect(result.totalAmount).toBe(55000);
    expect(cartService.getPendingCheckout()).toEqual({ checkoutId: 'checkout1', reference: 'ref1' });
  });

  it('sends guest email when initializing guest cart checkout', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        checkoutId: 'checkout1',
        reference: 'ref1',
        redirectUrl: 'https://checkout.paystack.com/ref1',
        authorizationUrl: 'https://checkout.paystack.com/ref1',
        totalAmount: 55000,
        currency: 'NGN',
      },
    });
    await cartService.initializeCartCheckout({ email: 'guest@example.com' });
    expect(api.post).toHaveBeenCalledWith('/cart/checkout/initialize', { email: 'guest@example.com' });
  });

  it('uses user and admin cart checkout audit routes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { checkouts: [], total: 0, page: 1, limit: 20 } });
    await cartService.listCartCheckouts({ page: 1, limit: 20, status: 'completed' });
    expect(api.get).toHaveBeenCalledWith('/cart/checkouts', { params: { page: 1, limit: 20, status: 'completed' } });
    await cartService.adminListCartCheckouts({ page: 1, limit: 20, status: 'partially_failed', user: 'user1', paymentReference: 'ref1' });
    expect(api.get).toHaveBeenCalledWith('/admin/cart-checkouts', { params: { page: 1, limit: 20, status: 'partially_failed', user: 'user1', paymentReference: 'ref1' } });
  });

  it('retries failed allocations through the admin-only endpoint', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { checkoutId: 'checkout1', totalAmount: 5000, currency: 'NGN', status: 'completed', items: [] } });
    await cartService.adminRetryCartAllocations('checkout1');
    expect(api.post).toHaveBeenCalledWith('/admin/cart-checkouts/checkout1/retry-allocations');
  });
});
