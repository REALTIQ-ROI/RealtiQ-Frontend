import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountSecuritySettings from './AccountSecuritySettings';
import type { User } from '../../types';

const mocks = vi.hoisted(() => ({
  auth: { activeProfile: null, isLoading: false, refreshUser: vi.fn(), refreshProfiles: vi.fn(), updateUser: vi.fn(), logout: vi.fn() },
  service: { getTwoStep: vi.fn(), sessions: vi.fn(), startPhoneVerification: vi.fn(), verifyPhone: vi.fn(), phoneVerification: vi.fn() },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({ challenge: null, busy: false, error: null }) }));
vi.mock('../../services/authService', () => ({ authService: mocks.service }));
vi.mock('../auth/StepUpDialog', () => ({ default: () => null }));
vi.mock('../auth/AuthenticatorEnrollmentQrCode', () => ({ default: () => null }));

const account = (role: User['role'], phoneVerified?: boolean): User => ({
  _id: 'account-1', name: 'Example User', email: 'user@example.test', phone: '+2348012345678', role, phoneVerified,
});
const challenge = { id: 'challenge-1', state: 'pending', expiresAt: '2099-01-01T00:00:00.000Z', verifiedAt: null };

describe('account phone verification visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.isLoading = false;
    mocks.service.getTwoStep.mockResolvedValue({ enabled: true });
    mocks.service.sessions.mockResolvedValue({ sessions: [] });
    mocks.service.startPhoneVerification.mockResolvedValue(challenge);
    mocks.auth.refreshUser.mockResolvedValue(account('buyer', true));
  });

  it.each(['buyer', 'owner'] as const)('hides all phone verification controls for a verified %s', async (role) => {
    render(<AccountSecuritySettings user={account(role, true)} />);
    await screen.findByText(/Authenticator enabled/);
    expect(screen.queryByRole('heading', { name: 'Phone verification' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send verification code' })).not.toBeInTheDocument();
    expect(mocks.service.startPhoneVerification).not.toHaveBeenCalled();
  });

  it.each(['buyer', 'owner'] as const)('shows the existing flow only for an explicitly unverified %s', async (role) => {
    render(<AccountSecuritySettings user={account(role, false)} />);
    await screen.findByRole('heading', { name: 'Phone verification' });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    await screen.findByLabelText('Verification code');
    expect(mocks.service.startPhoneVerification).toHaveBeenCalledWith(expect.any(String));
  });

  it('does not flash a verification prompt while the account is loading or the flag is missing', async () => {
    mocks.auth.isLoading = true;
    const { rerender } = render(<AccountSecuritySettings user={account('buyer', false)} />);
    await screen.findByText('Loading account verification status…');
    expect(screen.queryByRole('button', { name: 'Send verification code' })).not.toBeInTheDocument();
    mocks.auth.isLoading = false;
    rerender(<AccountSecuritySettings user={account('buyer')} />);
    expect(screen.getByText('Account phone verification status is unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Phone verification' })).not.toBeInTheDocument();
  });

  it.each(['buyer', 'owner'] as const)('refreshes account state after confirmation and immediately removes the %s section', async (role) => {
    const { rerender } = render(<AccountSecuritySettings user={account(role, false)} />);
    mocks.service.verifyPhone.mockResolvedValue({ ...challenge, state: 'verified', verifiedAt: '2026-11-11T10:00:00.000Z' });
    mocks.auth.refreshUser.mockImplementation(async () => {
      const current = account(role, true);
      rerender(<AccountSecuritySettings user={current} />);
      return current;
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify', exact: true }));
    await waitFor(() => expect(mocks.auth.refreshUser).toHaveBeenCalledTimes(1));
    expect(mocks.service.verifyPhone).toHaveBeenCalledWith('challenge-1', '123456');
    expect(screen.queryByRole('heading', { name: 'Phone verification' })).not.toBeInTheDocument();
  });

  it('does not treat the challenge result as authoritative when account refresh fails', async () => {
    render(<AccountSecuritySettings user={account('buyer', false)} />);
    mocks.service.verifyPhone.mockResolvedValue({ ...challenge, state: 'verified', verifiedAt: '2026-11-11T10:00:00.000Z' });
    mocks.auth.refreshUser.mockRejectedValue(new Error('Account unavailable. Retry status refresh.'));
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify', exact: true }));
    expect(await screen.findByText('Account unavailable. Retry status refresh.')).toBeInTheDocument();
    expect(screen.queryByText('Phone verified.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh status' })).toBeInTheDocument();
    await act(async () => undefined);
  });
});
