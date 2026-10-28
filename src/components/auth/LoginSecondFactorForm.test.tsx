import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import LoginSecondFactorForm from './LoginSecondFactorForm';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const challenge = {
  code: 'AUTH_SECOND_FACTOR_REQUIRED' as const,
  challengeId: 'login-challenge-1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  method: 'totp' as const,
};

describe('LoginSecondFactorForm', () => {
  const completeLoginSecondFactor = vi.fn();
  const cancelLoginChallenge = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ completeLoginSecondFactor, cancelLoginChallenge, isLoading: false } as ReturnType<typeof useAuth>);
  });

  it('submits the entered one-time code and completes sign-in only after the service succeeds', async () => {
    const user = { _id: 'user-1', role: 'buyer' };
    completeLoginSecondFactor.mockResolvedValueOnce(user);
    render(<LoginSecondFactorForm challenge={challenge} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Authenticator code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    expect(completeLoginSecondFactor).toHaveBeenCalledWith('123456');
    expect(onSuccess).toHaveBeenCalledWith(user);
  });

  it('keeps the challenge available after an invalid factor code', async () => {
    completeLoginSecondFactor.mockRejectedValueOnce(new ApiRequestError('The verification code is invalid or already used.', {
      status: 401,
      code: 'AUTH_FACTOR_CODE_INVALID',
    }));
    render(<LoginSecondFactorForm challenge={challenge} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Authenticator code'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or already used');
    expect(screen.getByLabelText('Authenticator code')).toBeEnabled();
    await userEvent.type(screen.getByLabelText('Authenticator code'), '123456');
    expect(screen.getByRole('button', { name: 'Verify and sign in' })).toBeEnabled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('requires a fresh challenge after the backend rejects a consumed or expired challenge', async () => {
    completeLoginSecondFactor.mockRejectedValueOnce(new ApiRequestError('Start a new verification challenge.', {
      status: 401,
      code: 'AUTH_CHALLENGE_INVALID',
    }));
    render(<LoginSecondFactorForm challenge={challenge} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Authenticator code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Start sign-in again');
    expect(screen.getByRole('button', { name: 'Return to sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Authenticator code')).toBeDisabled();
  });

  it('preserves the challenge and server guidance for a second-factor request rate limit', async () => {
    completeLoginSecondFactor.mockRejectedValueOnce(new ApiRequestError('Wait before trying verification again.', {
      status: 429,
      code: 'AUTH_CHALLENGE_RATE_LIMITED',
    }));
    render(<LoginSecondFactorForm challenge={challenge} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Authenticator code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wait before trying verification again');
    expect(screen.getByLabelText('Authenticator code')).toBeEnabled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('requires a new sign-in after the backend locks the authenticator factor', async () => {
    completeLoginSecondFactor.mockRejectedValueOnce(new ApiRequestError('Authenticator verification is temporarily locked.', {
      status: 429,
      code: 'AUTH_FACTOR_RATE_LIMITED',
    }));
    render(<LoginSecondFactorForm challenge={challenge} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Authenticator code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wait five minutes');
    expect(screen.getByRole('button', { name: 'Return to sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Authenticator code')).toBeDisabled();
  });

  it('does not allow submitting a challenge already expired at render time', () => {
    render(<LoginSecondFactorForm challenge={{ ...challenge, expiresAt: new Date(Date.now() - 1000).toISOString() }} onSuccess={onSuccess} />);
    expect(screen.getByLabelText('Authenticator code')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Return to sign in' })).toBeInTheDocument();
    expect(completeLoginSecondFactor).not.toHaveBeenCalled();
  });

  it('does not reuse a challenge after an ambiguous network failure', async () => {
    completeLoginSecondFactor.mockRejectedValueOnce(new Error('Unable to confirm a response from the server.'));
    render(<LoginSecondFactorForm challenge={challenge} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Authenticator code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Start sign-in again');
    expect(screen.getByRole('button', { name: 'Return to sign in' })).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
