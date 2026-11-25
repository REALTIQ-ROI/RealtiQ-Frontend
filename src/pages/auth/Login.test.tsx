import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiRequestError } from '../../lib/axios';
import { authService, EMAIL_UNVERIFIED_LOGIN_MESSAGE, isEmailUnverifiedLoginError } from '../../services/authService';
import Login from './Login';
import { DIRECT_DEBIT_CALLBACK_PATH } from '../../utils/directDebit';

const mocks = vi.hoisted(() => ({ login: vi.fn(), logout: vi.fn(), resend: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mocks.login, logout: mocks.logout, isLoading: false, loginChallenge: null }),
}));
vi.mock('../../services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/authService')>();
  return { ...actual, authService: { ...actual.authService, resendVerificationEmail: mocks.resend } };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const renderLogin = () => render(
  <MemoryRouter initialEntries={['/login']}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/buyer" element={<p>Buyer dashboard</p>} />
    </Routes>
  </MemoryRouter>,
);

const CallbackReturnProbe = () => {
  const location = useLocation();
  return <p>callback return {location.pathname} {JSON.stringify(location.state)}</p>;
};

describe('Login email verification handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.resend.mockResolvedValue({
      code: 'AUTH_EMAIL_REQUEST_ACCEPTED',
      message: 'If the account is eligible, instructions will be sent. Check your inbox or request another link later.',
    });
  });

  it('recognizes only the exact unverified-email message with HTTP 403', () => {
    expect(isEmailUnverifiedLoginError(new ApiRequestError(EMAIL_UNVERIFIED_LOGIN_MESSAGE, { status: 403 }))).toBe(true);
    expect(isEmailUnverifiedLoginError(new ApiRequestError(`${EMAIL_UNVERIFIED_LOGIN_MESSAGE} `, { status: 403 }))).toBe(false);
    expect(isEmailUnverifiedLoginError(new ApiRequestError(EMAIL_UNVERIFIED_LOGIN_MESSAGE, { status: 401 }))).toBe(false);
  });

  it('automatically requests verification once for the exact unverified-email 403 and stays unauthenticated', async () => {
    mocks.login.mockRejectedValueOnce(new ApiRequestError(EMAIL_UNVERIFIED_LOGIN_MESSAGE, { status: 403 }));
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), ' Person@Example.com ');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByRole('heading', { name: 'Email verification required' })).toBeInTheDocument();
    await waitFor(() => expect(authService.resendVerificationEmail).toHaveBeenCalledTimes(1));
    expect(authService.resendVerificationEmail).toHaveBeenCalledWith('person@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent('If the account is eligible, instructions will be sent.');
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.queryByText('Buyer dashboard')).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not resend for other 403 errors or MFA challenges', async () => {
    const user = userEvent.setup();
    const view = renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');

    mocks.login.mockRejectedValueOnce(new ApiRequestError('Permission denied.', { status: 403, code: 'PERMISSION_PROFILE_REQUIRED' }));
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Permission denied.'));
    expect(authService.resendVerificationEmail).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Email verification required' })).not.toBeInTheDocument();

    mocks.login.mockResolvedValueOnce(null);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(2));
    expect(authService.resendVerificationEmail).not.toHaveBeenCalled();
    view.unmount();
  });

  it('returns a signed-in customer to the Direct Debit callback and preserves references only in router state', async () => {
    mocks.login.mockResolvedValueOnce({ role: 'owner' });
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { redirectTo: DIRECT_DEBIT_CALLBACK_PATH, directDebitProviderReferences: ['paystack-ref-1', 'trx-ref-1'] } }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path={DIRECT_DEBIT_CALLBACK_PATH} element={<CallbackReturnProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Owner' }));
    await user.type(screen.getByLabelText('Email Address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText(/callback return/)).toHaveTextContent(DIRECT_DEBIT_CALLBACK_PATH);
    expect(screen.getByText(/callback return/)).toHaveTextContent('paystack-ref-1');
    expect(screen.getByText(/callback return/)).toHaveTextContent('trx-ref-1');
  });
});
