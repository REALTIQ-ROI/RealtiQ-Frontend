import api from '../lib/axios';
import type {
  AddCartItemRequest,
  AdminCartCheckoutDetail,
  AdminCartCheckoutListQuery,
  CartCheckoutDetail,
  CartCheckoutInitializeResponse,
  CartCheckoutListQuery,
  CartCheckoutListResponse,
  CartEligibilityParams,
  CartEligibilityResponse,
  CartResponse,
} from '../types';

const CART_CHECKOUT_ID_KEY = 'realtiq.cartCheckoutId';
const CART_CHECKOUT_REFERENCE_KEY = 'realtiq.cartCheckoutReference';

const compact = <T extends object>(value?: T) =>
  Object.fromEntries(
    Object.entries(value ?? {}).filter(([, item]) => item !== '' && item !== undefined && item !== null),
  );

export const cartService = {
  persistPendingCheckout(checkoutId: string, reference: string): void {
    sessionStorage.setItem(CART_CHECKOUT_ID_KEY, checkoutId);
    sessionStorage.setItem(CART_CHECKOUT_REFERENCE_KEY, reference);
  },

  getPendingCheckout(): { checkoutId: string | null; reference: string | null } {
    return {
      checkoutId: sessionStorage.getItem(CART_CHECKOUT_ID_KEY),
      reference: sessionStorage.getItem(CART_CHECKOUT_REFERENCE_KEY),
    };
  },

  clearPendingCheckout(): void {
    sessionStorage.removeItem(CART_CHECKOUT_ID_KEY);
    sessionStorage.removeItem(CART_CHECKOUT_REFERENCE_KEY);
  },

  async getCart(): Promise<CartResponse> {
    const { data } = await api.get<CartResponse>('/cart');
    return data;
  },

  async addCartItem(body: AddCartItemRequest): Promise<CartResponse> {
    const { data } = await api.post<CartResponse>('/cart/items', body);
    return data;
  },

  async removeCartItem(itemId: string): Promise<CartResponse> {
    const { data } = await api.delete<CartResponse>(`/cart/items/${encodeURIComponent(itemId)}`);
    return data;
  },

  async clearCart(): Promise<CartResponse> {
    const { data } = await api.delete<CartResponse>('/cart');
    return data;
  },

  async checkCartEligibility(params: CartEligibilityParams): Promise<CartEligibilityResponse> {
    const { data } = await api.get<CartEligibilityResponse>('/cart/eligibility', { params: compact(params) });
    return data;
  },

  async initializeCartCheckout(): Promise<CartCheckoutInitializeResponse> {
    const { data } = await api.post<CartCheckoutInitializeResponse>('/cart/checkout/initialize');
    cartService.persistPendingCheckout(data.checkoutId, data.reference);
    return data;
  },

  async listCartCheckouts(query?: CartCheckoutListQuery): Promise<CartCheckoutListResponse> {
    const { data } = await api.get<CartCheckoutListResponse>('/cart/checkouts', { params: compact(query) });
    return data;
  },

  async getCartCheckout(checkoutId: string): Promise<CartCheckoutDetail> {
    const { data } = await api.get<CartCheckoutDetail>(`/cart/checkouts/${encodeURIComponent(checkoutId)}`);
    return data;
  },

  async adminListCartCheckouts(query?: AdminCartCheckoutListQuery): Promise<CartCheckoutListResponse> {
    const { data } = await api.get<CartCheckoutListResponse>('/admin/cart-checkouts', { params: compact(query) });
    return data;
  },

  async adminGetCartCheckout(checkoutId: string): Promise<AdminCartCheckoutDetail> {
    const { data } = await api.get<AdminCartCheckoutDetail>(`/admin/cart-checkouts/${encodeURIComponent(checkoutId)}`);
    return data;
  },

  async adminRetryCartAllocations(checkoutId: string): Promise<CartCheckoutDetail> {
    const { data } = await api.post<CartCheckoutDetail>(`/admin/cart-checkouts/${encodeURIComponent(checkoutId)}/retry-allocations`);
    return data;
  },
};
