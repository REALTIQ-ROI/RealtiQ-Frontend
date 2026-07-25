import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/AuthContext';
import RegisterToPurchase from './RegisterToPurchase';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('RegisterToPurchase', () => {
  const register = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      register,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    register.mockResolvedValue(undefined);
  });

  it('uses the buyer registration design and continues to the requested purchase flow', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/register-to-purchase',
          state: { redirectTo: '/dashboard/buyer/escrows/create/RTQ-PROP-1' },
        }]}
      >
        <Routes>
          <Route path="/register-to-purchase" element={<RegisterToPurchase />} />
          <Route path="/dashboard/buyer/escrows/create/:propertyId" element={<p>Create escrow destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/The Archive of/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buyer/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Landlord/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login-to-purchase');

    await userEvent.type(screen.getByLabelText('Full Name'), 'Buyer One');
    await userEvent.type(screen.getByLabelText('Email Address'), 'buyer@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Secure1!');
    await userEvent.click(screen.getByRole('button', { name: /Start Curating/i }));

    expect(register).toHaveBeenCalledWith({
      name: 'Buyer One',
      email: 'buyer@example.com',
      password: 'Secure1!',
      role: 'buyer',
    });
    expect(await screen.findByText('Create escrow destination')).toBeInTheDocument();
  });
});
