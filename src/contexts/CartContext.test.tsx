import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cartService } from '../services/cartService';
import type { User } from '../types';
import { CartProvider } from './CartContext';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/cartService', () => ({
  cartService: { getCart: vi.fn() },
}));

describe('CartProvider authorization gating', () => {
  let authState: { isAuthenticated: boolean; isLoading: boolean; user: User | null };

  beforeEach(() => {
    vi.clearAllMocks();
    authState = { isAuthenticated: false, isLoading: true, user: null };
    vi.mocked(useAuth).mockImplementation(() => authState as ReturnType<typeof useAuth>);
  });

  it('does not request a cart while authentication is unresolved or for an admin', async () => {
    const view = render(
      <CartProvider>
        <div />
      </CartProvider>,
    );

    authState = { isAuthenticated: true, isLoading: false, user: { role: 'admin' } as User };
    view.rerender(
      <CartProvider>
        <div />
      </CartProvider>,
    );

    expect(cartService.getCart).not.toHaveBeenCalled();
  });
});
