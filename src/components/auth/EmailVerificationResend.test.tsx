import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../lib/axios';
import { authService } from '../../services/authService';
import EmailVerificationResend from './EmailVerificationResend';

vi.mock('../../services/authService', () => ({
  authService: { resendVerificationEmail: vi.fn() },
}));

const accepted = {
  code: 'AUTH_EMAIL_REQUEST_ACCEPTED' as const,
  message: 'If the account is eligible, instructions will be sent. Check your inbox or request another link later.',
};

describe('EmailVerificationResend', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('starts registration success in a 60-second cooldown', () => {
    render(<EmailVerificationResend email="person@example.com" initialCooldownUntil={Date.now() + 60_000} />);
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/Resend available in (59|60) seconds/);
    expect(authService.resendVerificationEmail).not.toHaveBeenCalled();
  });

  it('enables resend only after the full cooldown expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-28T12:00:00.000Z'));
    render(<EmailVerificationResend email="person@example.com" initialCooldownUntil={Date.now() + 60_000} />);

    const button = screen.getByRole('button', { name: 'Resend verification email' });
    expect(button).toBeDisabled();
    act(() => { vi.advanceTimersByTime(59_000); });
    expect(button).toBeDisabled();
    act(() => { vi.advanceTimersByTime(1_250); });
    expect(button).toBeEnabled();
  });

  it('makes one automatic request per login trigger and presents 202 as a generic accepted request', async () => {
    vi.mocked(authService.resendVerificationEmail).mockResolvedValue(accepted);
    const view = render(<EmailVerificationResend email=" person@example.com " visible autoRequestKey={1} />);
    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent(accepted.message);
    view.rerender(<EmailVerificationResend email=" person@example.com " visible autoRequestKey={1} />);

    expect(authService.resendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(authService.resendVerificationEmail).toHaveBeenCalledWith('person@example.com');
    expect(screen.getByRole('status')).toHaveTextContent(/Resend available in (59|60) seconds/);
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeDisabled();
  });

  it('normalizes the submitted email, blocks concurrent clicks, and starts a fresh cooldown after 202', async () => {
    let resolveRequest: ((value: typeof accepted) => void) | undefined;
    vi.mocked(authService.resendVerificationEmail).mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
    const user = userEvent.setup();
    render(<EmailVerificationResend email=" Person@Example.com " />);
    const button = screen.getByRole('button', { name: 'Resend verification email' });

    await user.click(button);
    expect(authService.resendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(authService.resendVerificationEmail).toHaveBeenCalledWith('person@example.com');
    expect(button).toBeDisabled();
    resolveRequest?.(accepted);

    expect(await screen.findByRole('status')).toHaveTextContent(accepted.message);
    expect(screen.getByRole('status')).toHaveTextContent(/Resend available in (59|60) seconds/);
  });

  it('keeps ambiguous failures disabled for at least 60 seconds and permits no immediate duplicate', async () => {
    vi.mocked(authService.resendVerificationEmail).mockRejectedValueOnce(new Error('network timeout'));
    const user = userEvent.setup();
    render(<EmailVerificationResend email="person@example.com" />);
    const button = screen.getByRole('button', { name: 'Resend verification email' });
    await user.click(button);

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not confirm the verification email request.');
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/Resend available in (59|60) seconds/);
    expect(authService.resendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('honors server Retry-After without allowing a resend before the minimum cooldown', async () => {
    vi.mocked(authService.resendVerificationEmail).mockRejectedValueOnce(new ApiRequestError('Wait before trying again.', { status: 429, retryAfter: '120' }));
    const user = userEvent.setup();
    render(<EmailVerificationResend email="person@example.com" />);
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wait before trying again.');
    expect(screen.getByRole('status')).toHaveTextContent(/Resend available in 1(19|20) seconds/);
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeDisabled();
  });

  it('keeps the minimum 60-second cooldown when Retry-After is shorter', async () => {
    vi.mocked(authService.resendVerificationEmail).mockRejectedValueOnce(new ApiRequestError('Wait before trying again.', { status: 429, retryAfter: '5' }));
    const user = userEvent.setup();
    render(<EmailVerificationResend email="person@example.com" />);
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wait before trying again.');
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/Resend available in (59|60) seconds/);
  });
});
