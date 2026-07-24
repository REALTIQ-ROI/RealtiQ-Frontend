import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/AuthContext';
import LoginToPurchase from './LoginToPurchase';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('LoginToPurchase', () => {
  const login = vi.fn();
  const logout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      login,
      logout,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    login.mockResolvedValue({ _id: 'buyer-1', role: 'buyer' });
  });

  it('uses the buyer login UI and continues to checkout after authentication', async () => {
    render(
      <MemoryRouter initialEntries={['/login-to-purchase']}>
        <Routes>
          <Route path="/login-to-purchase" element={<LoginToPurchase />} />
          <Route path="/checkout" element={<p>Checkout destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    expect(screen.getByText('Experience real estate as an art form.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buyer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Landlord' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create one' })).toHaveAttribute(
      'href',
      '/register-to-purchase',
    );

    await userEvent.type(screen.getByLabelText('Email Address'), 'buyer@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In to Purchase' }));

    expect(login).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      password: 'secret123',
      role: 'buyer',
    });
    expect(await screen.findByText('Checkout destination')).toBeInTheDocument();
  });
});
