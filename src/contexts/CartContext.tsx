/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cartService } from '../services/cartService';
import type { AddCartItemRequest, CartResponse } from '../types';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: CartResponse | null;
  itemCount: number;
  loading: boolean;
  refreshCart: () => Promise<CartResponse | null>;
  addItem: (body: AddCartItemRequest) => Promise<CartResponse>;
  removeItem: (itemId: string) => Promise<CartResponse>;
  clearCart: () => Promise<CartResponse>;
  setCartFromResponse: (cart: CartResponse) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const fallbackCartContext: CartContextValue = {
  cart: null,
  itemCount: 0,
  loading: false,
  refreshCart: async () => null,
  addItem: async () => {
    throw new Error('Service cart is not available in this render context.');
  },
  removeItem: async () => {
    throw new Error('Service cart is not available in this render context.');
  },
  clearCart: async () => {
    throw new Error('Service cart is not available in this render context.');
  },
  setCartFromResponse: () => undefined,
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'buyer') {
      setCart(null);
      return null;
    }
    setLoading(true);
    try {
      const next = await cartService.getCart();
      setCart(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    void refreshCart().catch(() => undefined);
  }, [refreshCart]);

  const addItem = useCallback(async (body: AddCartItemRequest) => {
    const next = await cartService.addCartItem(body);
    setCart(next);
    return next;
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const next = await cartService.removeCartItem(itemId);
    setCart(next);
    return next;
  }, []);

  const clearCart = useCallback(async () => {
    const next = await cartService.clearCart();
    setCart(next);
    return next;
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      loading,
      refreshCart,
      addItem,
      removeItem,
      clearCart,
      setCartFromResponse: setCart,
    }),
    [addItem, cart, clearCart, loading, refreshCart, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  return context ?? fallbackCartContext;
};
