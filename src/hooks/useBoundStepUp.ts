import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ApiRequestError } from '../lib/axios';
import { stepUpService } from '../services/stepUpService';

export interface BoundStepUpChallenge {
  challengeId: string;
  expiresAt: string;
  method: 'totp';
  label: string;
}

interface BoundAction<B extends object, T> {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: B;
  label: string;
  execute: (challengeId: string, exactBody: B) => Promise<T>;
}

const cloneAndFreeze = <T extends object>(value: T): T => {
  const cloned = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (item: unknown): void => {
    if (typeof item !== 'object' || item === null || Object.isFrozen(item)) return;
    Object.values(item).forEach(freeze);
    Object.freeze(item);
  };
  freeze(cloned);
  return cloned;
};

export const stepUpErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiRequestError)) return error instanceof Error ? error.message : 'The protected action could not be completed.';
  switch (error.code) {
    case 'AUTH_FACTOR_REQUIRED': return 'Enable the authenticator factor on this account before continuing.';
    case 'AUTH_FACTOR_CODE_INVALID': return 'That authenticator code was not accepted. Enter the current code and try again.';
    case 'AUTH_FACTOR_RATE_LIMITED': return 'Authenticator verification is temporarily locked. Wait before trying again.';
    case 'AUTH_CHALLENGE_RATE_LIMITED': return 'Too many security challenges were requested. Wait before trying again.';
    case 'AUTH_CHALLENGE_INVALID': return 'This security challenge expired or is no longer valid. Start a new request.';
    case 'AUTH_CHALLENGE_REVOKED':
    case 'AUTH_SESSION_REVOKED': return 'Your session was revoked. Sign in again before continuing.';
    case 'AUTH_CHALLENGE_FORBIDDEN':
    case 'AUTH_STEP_UP_REQUIRED': return 'The security challenge does not match the current session or request. Start again.';
    case 'AUTH_CHALLENGE_SCOPE_INVALID': return 'The protected request scope is invalid. Refresh the page and try again.';
    default: return error.code ? `${error.message} (${error.code})` : error.message;
  }
};

export const useBoundStepUp = <T,>() => {
  const { activeProfile, token } = useAuth();
  const profileId = activeProfile?.id ?? null;
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const actionRef = useRef<{ profileId: string; token: string; body: object; execute: (challengeId: string, body: never) => Promise<T> } | null>(null);
  const busyRef = useRef(false);
  const [challenge, setChallenge] = useState<BoundStepUpChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<string | null>(null);
  const publishError = useCallback((message: string | null) => {
    errorRef.current = message;
    setError(message);
  }, []);

  const clear = useCallback((message?: string) => {
    actionRef.current = null;
    setChallenge(null);
    publishError(message ?? null);
  }, [publishError]);

  useEffect(() => {
    if (actionRef.current && (actionRef.current.profileId !== profileId || actionRef.current.token !== token)) {
      clear(actionRef.current.profileId !== profileId
        ? 'The selected profile changed. Start the protected action again.'
        : 'The signed-in session changed. Start the protected action again.');
    }
  }, [clear, profileId, token]);

  const begin = useCallback(async <B extends object>(action: BoundAction<B, T>): Promise<boolean> => {
    if (busyRef.current || actionRef.current) return false;
    if (!profileIdRef.current) { publishError('Select an authorized profile before continuing.'); return false; }
    if (!tokenRef.current || localStorage.getItem('token') !== tokenRef.current) { publishError('Sign in again before starting this protected action.'); return false; }
    if (!action.path.startsWith('/api/') || action.path.includes('?') || action.path.includes('#')) {
      publishError('The protected request path must be a literal API path without a query string.');
      return false;
    }
    if (Array.isArray(action.body)) {
      publishError('The protected request body must be a JSON object.');
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    publishError(null);
    try {
      const body = cloneAndFreeze(action.body);
      const started = await stepUpService.start(action.method, action.path, body);
      if (started.method !== 'totp') {
        publishError('This account factor is not supported by the current step-up workflow.');
        return false;
      }
      if (profileIdRef.current !== activeProfile?.id || localStorage.getItem('activeProfileId') !== profileIdRef.current || tokenRef.current !== token || localStorage.getItem('token') !== token) {
        publishError(profileIdRef.current !== activeProfile?.id || localStorage.getItem('activeProfileId') !== profileIdRef.current
          ? 'The selected profile changed. The challenge was discarded.'
          : 'The signed-in session changed. The challenge was discarded.');
        return false;
      }
      if (!Number.isFinite(Date.parse(started.expiresAt)) || Date.parse(started.expiresAt) <= Date.now()) {
        publishError('The server returned an expired challenge. Start the action again.');
        return false;
      }
      actionRef.current = { profileId: profileIdRef.current, token: tokenRef.current ?? '', body, execute: action.execute as (challengeId: string, body: never) => Promise<T> };
      setChallenge({ ...started, label: action.label });
      return true;
    } catch (raw) {
      publishError(stepUpErrorMessage(raw));
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [activeProfile?.id, publishError, token]);

  const complete = useCallback(async (code: string): Promise<{ ok: true; value: T } | { ok: false; error?: string }> => {
    const action = actionRef.current;
    const current = challenge;
    if (!action || !current || busyRef.current) return { ok: false, error: error ?? undefined };
    if (action.profileId !== profileIdRef.current || localStorage.getItem('activeProfileId') !== action.profileId || action.token !== tokenRef.current || localStorage.getItem('token') !== action.token) {
      const message = action.profileId !== profileIdRef.current || localStorage.getItem('activeProfileId') !== action.profileId
        ? 'The selected profile changed. Start the protected action again.'
        : 'The signed-in session changed. Start the protected action again.';
      clear(message);
      return { ok: false, error: message };
    }
    if (Date.parse(current.expiresAt) <= Date.now()) {
      const message = 'This security challenge expired. Start the protected action again.';
      clear(message);
      return { ok: false, error: message };
    }
    if (!/^\d{6}$/.test(code)) {
      const message = 'Enter the six-digit authenticator code.';
      publishError(message);
      return { ok: false, error: message };
    }
    busyRef.current = true;
    setBusy(true);
    publishError(null);
    try {
      await stepUpService.verify(current.challengeId, code);
      if (action.profileId !== profileIdRef.current || localStorage.getItem('activeProfileId') !== action.profileId || action.token !== tokenRef.current || localStorage.getItem('token') !== action.token) {
        const message = action.profileId !== profileIdRef.current || localStorage.getItem('activeProfileId') !== action.profileId
          ? 'The selected profile changed. The verified challenge was discarded.'
          : 'The signed-in session changed. The verified challenge was discarded.';
        clear(message);
        return { ok: false, error: message };
      }
      if (Date.parse(current.expiresAt) <= Date.now()) {
        const message = 'This security challenge expired. Start the protected action again.';
        clear(message);
        return { ok: false, error: message };
      }
      // Consume locally before making the protected request. A network failure must never reuse this proof.
      actionRef.current = null;
      setChallenge(null);
      const value = await action.execute(current.challengeId, action.body as never);
      return { ok: true, value };
    } catch (raw) {
      const message = stepUpErrorMessage(raw);
      const codeValue = raw instanceof ApiRequestError ? raw.code : undefined;
      if (codeValue !== 'AUTH_FACTOR_CODE_INVALID' && codeValue !== 'AUTH_FACTOR_RATE_LIMITED' && codeValue !== 'AUTH_CHALLENGE_RATE_LIMITED') {
        actionRef.current = null;
        setChallenge(null);
      }
      publishError(message);
      return { ok: false, error: message };
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [challenge, clear, error, publishError]);

  const cancel = useCallback(() => clear(), [clear]);
  const clearError = useCallback(() => publishError(null), [publishError]);
  const getError = useCallback(() => errorRef.current, []);
  return { challenge, busy, error, begin, complete, cancel, clearError, getError };
};
