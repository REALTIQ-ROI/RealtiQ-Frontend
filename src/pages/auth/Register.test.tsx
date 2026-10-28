import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Register from './Register';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('Register organization profile option', () => {
  const register = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ register, isLoading: false } as unknown as ReturnType<typeof useAuth>);
    register.mockResolvedValue({ user: { _id: 'identity-1', name: 'Alex User', email: 'alex@example.test', role: 'buyer' } });
  });

  const RegistrationSuccessState = () => {
    const location = useLocation();
    return <p data-testid="registration-success-state">{JSON.stringify(location.state)}</p>;
  };

  const renderForm = () => render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/registration-success" element={<RegistrationSuccessState />} />
      </Routes>
    </MemoryRouter>,
  );

  it('sends the documented optional company buyerProfile fields', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Alex User' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'alex@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText('Buyer profile type'), { target: { value: 'company' } });
    fireEvent.change(screen.getByLabelText(/Organization name/i), { target: { value: 'Alex Holdings' } });
    fireEvent.click(screen.getByRole('button', { name: /start curating/i }));

    await waitFor(() => expect(register).toHaveBeenCalledWith({
      name: 'Alex User',
      email: 'alex@example.test',
      password: 'StrongPass1!',
      role: 'buyer',
      buyerProfile: { structure: 'company', name: 'Alex Holdings' },
    }));
    expect(await screen.findByTestId('registration-success-state')).toHaveTextContent('"email":"alex@example.test"');
    expect(screen.getByTestId('registration-success-state').textContent).toMatch(/"verificationRequestedAt":\d+/);
  });

  it('passes the submitted email and initial cooldown timestamp to registration success', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Alex User' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'Alex@Example.Test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /start curating/i }));

    const state = await screen.findByTestId('registration-success-state');
    expect(state).toHaveTextContent('"email":"alex@example.test"');
    expect(state.textContent).toMatch(/"verificationRequestedAt":\d+/);
  });

  it('keeps standard individual registration on the existing request shape', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Alex User' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'alex@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /start curating/i }));

    await waitFor(() => expect(register).toHaveBeenCalledWith({
      name: 'Alex User',
      email: 'alex@example.test',
      password: 'StrongPass1!',
      role: 'buyer',
    }));
  });
});
