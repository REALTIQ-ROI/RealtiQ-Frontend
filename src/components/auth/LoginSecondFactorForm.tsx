import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { LoginSecondFactorChallenge } from '../../services/authService';
import type { User } from '../../types';

interface LoginSecondFactorFormProps {
  challenge: LoginSecondFactorChallenge;
  onSuccess: (user: User) => void;
}

const LoginSecondFactorForm = ({ challenge, onSuccess }: LoginSecondFactorFormProps) => {
  return <LoginSecondFactorChallengeForm key={challenge.challengeId} challenge={challenge} onSuccess={onSuccess} />;
};

const LoginSecondFactorChallengeForm = ({ challenge, onSuccess }: LoginSecondFactorFormProps) => {
  const { completeLoginSecondFactor, cancelLoginChallenge, isLoading } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [challengeUnavailable, setChallengeUnavailable] = useState(false);
  const [expired, setExpired] = useState(() => Date.parse(challenge.expiresAt) <= Date.now());

  useEffect(() => {
    const remainingMs = Date.parse(challenge.expiresAt) - Date.now();
    if (remainingMs <= 0) return;
    const timeout = window.setTimeout(() => setExpired(true), remainingMs);
    return () => window.clearTimeout(timeout);
  }, [challenge.challengeId, challenge.expiresAt]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (expired || challengeUnavailable || isLoading || !code.trim()) return;
    const submittedCode = code.trim();
    setCode('');
    setError('');

    try {
      const user = await completeLoginSecondFactor(submittedCode);
      onSuccess(user);
    } catch (raw) {
      const failure = raw as { message?: unknown; code?: unknown; status?: unknown };
      const message = typeof failure.message === 'string' ? failure.message : 'Unable to verify the authenticator code.';
      const errorCode = typeof failure.code === 'string' ? failure.code : undefined;
      const status = typeof failure.status === 'number' ? failure.status : undefined;

      if (errorCode === 'AUTH_CHALLENGE_INVALID') {
        setChallengeUnavailable(true);
        setError('This sign-in challenge expired or was already used. Start sign-in again to get a fresh challenge.');
      } else if (errorCode === 'AUTH_FACTOR_REQUIRED') {
        setChallengeUnavailable(true);
        setError(`${message} This challenge cannot be completed. Return to sign in; if your authenticator is already enabled, contact support before retrying.`);
      } else if (errorCode === 'AUTH_FACTOR_RATE_LIMITED') {
        setChallengeUnavailable(true);
        setError('Too many invalid authenticator codes. Wait five minutes, then start sign-in again.');
      } else if (status === undefined || status >= 500) {
        setChallengeUnavailable(true);
        setError('The verification result could not be confirmed. Start sign-in again before trying another code.');
      } else {
        // Invalid codes and documented request rate limits keep the challenge visible;
        // the backend decides whether another attempt is allowed.
        setError(message);
      }
    }
  };

  const needsNewChallenge = expired || challengeUnavailable;

  return (
    <section aria-labelledby="login-second-factor-title" className="rounded-xl border border-outline-variant/20 bg-white p-5">
      <h2 id="login-second-factor-title" className="text-xl font-bold text-primary">Verify your sign-in</h2>
      <p className="mt-2 text-sm text-secondary">Enter the current code from your authenticator app to finish signing in.</p>
      <p className="mt-2 text-xs text-secondary">This challenge expires at {new Date(challenge.expiresAt).toLocaleTimeString()}.</p>
      <form className="mt-5 space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="login-authenticator-code" className="block text-sm font-semibold text-on-surface">
          Authenticator code
        </label>
        <input
          id="login-authenticator-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={needsNewChallenge || isLoading}
          className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
        {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        {needsNewChallenge ? (
          <button type="button" className="font-bold text-primary underline" onClick={cancelLoginChallenge}>
            Return to sign in
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={!code.trim() || isLoading} className="rounded-lg bg-primary px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isLoading ? 'Verifying…' : 'Verify and sign in'}
            </button>
            <button type="button" disabled={isLoading} onClick={cancelLoginChallenge} className="rounded-lg px-4 py-3 font-semibold text-secondary underline disabled:opacity-50">
              Cancel
            </button>
          </div>
        )}
      </form>
    </section>
  );
};

export default LoginSecondFactorForm;
