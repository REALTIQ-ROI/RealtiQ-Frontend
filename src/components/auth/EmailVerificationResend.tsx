import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError, retryAfterDelayMs } from '../../lib/axios';
import { EMAIL_VERIFICATION_RESEND_COOLDOWN_MS, normalizeVerificationEmail } from '../../lib/emailVerification';
import { authService } from '../../services/authService';

interface EmailVerificationResendProps {
  email: string;
  visible?: boolean;
  initialCooldownUntil?: number;
  autoRequestKey?: number | null;
}

const EmailVerificationResend = ({
  email,
  visible = true,
  initialCooldownUntil = 0,
  autoRequestKey = null,
}: EmailVerificationResendProps) => {
  const initialDeadline = useRef(initialCooldownUntil > Date.now() ? initialCooldownUntil : 0);
  const cooldownUntilRef = useRef(initialDeadline.current);
  const requestBusyRef = useRef(false);
  const lastAutoRequestKey = useRef<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(initialDeadline.current);
  const [remainingSeconds, setRemainingSeconds] = useState(() => Math.max(0, Math.ceil((initialDeadline.current - Date.now()) / 1000)));
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const extendCooldown = useCallback((deadline: number) => {
    const nextDeadline = Math.max(cooldownUntilRef.current, deadline);
    cooldownUntilRef.current = nextDeadline;
    setCooldownUntil(nextDeadline);
  }, []);

  useEffect(() => {
    const update = () => {
      const seconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemainingSeconds(seconds);
    };
    if (!cooldownUntil) {
      setRemainingSeconds(0);
      return;
    }
    update();
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const resend = useCallback(async (emailToUse: string) => {
    const normalizedEmail = normalizeVerificationEmail(emailToUse);
    if (!normalizedEmail || requestBusyRef.current || cooldownUntilRef.current > Date.now()) return false;

    requestBusyRef.current = true;
    setBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);
    const attemptStartedAt = Date.now();
    extendCooldown(attemptStartedAt + EMAIL_VERIFICATION_RESEND_COOLDOWN_MS);
    try {
      const response = await authService.resendVerificationEmail(normalizedEmail);
      setStatusMessage(response.message);
      extendCooldown(Date.now() + EMAIL_VERIFICATION_RESEND_COOLDOWN_MS);
      return true;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 429) {
        const serverDelay = retryAfterDelayMs(error.retryAfter) ?? 0;
        extendCooldown(Math.max(
          attemptStartedAt + EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
          Date.now() + Math.max(EMAIL_VERIFICATION_RESEND_COOLDOWN_MS, serverDelay),
        ));
        setErrorMessage(error.message || 'Too many requests. Please wait before trying again.');
      } else {
        setErrorMessage('We could not confirm the verification email request. Please try again when the countdown ends.');
      }
      return false;
    } finally {
      requestBusyRef.current = false;
      setBusy(false);
    }
  }, [extendCooldown]);

  useEffect(() => {
    if (!visible || autoRequestKey === null || !email || lastAutoRequestKey.current === autoRequestKey) return;
    lastAutoRequestKey.current = autoRequestKey;
    void resend(email);
  }, [autoRequestKey, email, resend, visible]);

  if (!visible) return null;

  const announcement = [
    busy ? 'Requesting a verification email.' : statusMessage,
    remainingSeconds > 0 ? `Resend available in ${remainingSeconds} seconds.` : (!busy && !statusMessage ? 'You can request another verification email now.' : null),
  ].filter(Boolean).join(' ');

  return (
    <div className="mt-4 space-y-3 text-left">
      <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-secondary">{announcement}</p>
      {errorMessage ? <p role="alert" className="text-sm text-red-700">{errorMessage}</p> : null}
      <button
        type="button"
        className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!email || busy || remainingSeconds > 0}
        onClick={() => void resend(email)}
      >
        {busy ? 'Requesting verification email…' : 'Resend verification email'}
      </button>
    </div>
  );
};

export default EmailVerificationResend;
