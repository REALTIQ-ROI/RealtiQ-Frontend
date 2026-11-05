import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import AdminLogin from './AdminLogin';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), login: vi.fn(), completeInvitation: vi.fn() }));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../../services/authService', () => ({
  isInitialStaffPasswordChangeRequired: (error: unknown) => typeof error === 'object' && error !== null && 'status' in error && error.status === 428 && 'code' in error && error.code === 'AUTH_INITIAL_PASSWORD_CHANGE_REQUIRED' && 'passwordChangeRequired' in error && error.passwordChangeRequired === true,
  authService: { completeStaffInvitation: mocks.completeInvitation },
}));

describe('AdminLogin invited staff activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mocks.useAuth.mockReturnValue({ login: mocks.login, isLoading: false, loginChallenge: null });
    mocks.completeInvitation.mockResolvedValue({ passwordUpdated: true, loginRequired: true });
  });

  it('shows password setup after the documented 428 gate and returns to normal login without storing or reusing a session', async () => {
    mocks.login.mockRejectedValueOnce(new ApiRequestError('Set a new password to activate your Admin staff sign-in.', {
      status: 428, code: 'AUTH_INITIAL_PASSWORD_CHANGE_REQUIRED', passwordChangeRequired: true,
    }));
    const user = userEvent.setup();
    render(<MemoryRouter><AdminLogin /></MemoryRouter>);

    await user.type(screen.getByLabelText('Email Address'), 'ada@example.test');
    await user.type(screen.getByLabelText('Password'), '483920175');
    await user.click(screen.getByRole('button', { name: /Enter Console/i }));

    expect(await screen.findByRole('heading', { name: 'Set your permanent password' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.length).toBe(0);
    await user.type(screen.getByLabelText('New password'), 'SecureAdminPass9');
    await user.type(screen.getByLabelText('Confirm new password'), 'SecureAdminPass9');
    await user.click(screen.getByRole('button', { name: 'Set password and return to sign in' }));

    await waitFor(() => expect(mocks.completeInvitation).toHaveBeenCalledWith({
      email: 'ada@example.test', temporaryPassword: '483920175', newPassword: 'SecureAdminPass9',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Password activated. Sign in with your new password.');
    expect(await screen.findByRole('button', { name: /Enter Console/i })).toBeInTheDocument();
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('explains an expired invitation and retains the user on password setup', async () => {
    mocks.login.mockRejectedValueOnce(new ApiRequestError('Set a new password to activate your Admin staff sign-in.', {
      status: 428, code: 'AUTH_INITIAL_PASSWORD_CHANGE_REQUIRED', passwordChangeRequired: true,
    }));
    mocks.completeInvitation.mockRejectedValueOnce(new ApiRequestError('Invitation expired', { status: 410, code: 'AUTH_STAFF_INVITATION_EXPIRED' }));
    const user = userEvent.setup();
    render(<MemoryRouter><AdminLogin /></MemoryRouter>);
    await user.type(screen.getByLabelText('Email Address'), 'ada@example.test');
    await user.type(screen.getByLabelText('Password'), '483920175');
    await user.click(screen.getByRole('button', { name: /Enter Console/i }));
    expect(await screen.findByRole('button', { name: 'Set password and return to sign in' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('New password'), 'SecureAdminPass9');
    await user.type(screen.getByLabelText('Confirm new password'), 'SecureAdminPass9');
    await user.click(screen.getByRole('button', { name: 'Set password and return to sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This invitation has expired. Contact an Executive and ask them to resend it.');
    expect(screen.getByRole('button', { name: 'Set password and return to sign in' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Return to sign in' }));
    expect(await screen.findByRole('button', { name: /Enter Console/i })).toBeInTheDocument();
  });
});
