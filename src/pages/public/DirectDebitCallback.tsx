import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import { revenueFoundationService, type PaymentAuthorization } from '../../services/revenueFoundationService';
import {
  clearDirectDebitOperationKey,
  DIRECT_DEBIT_CALLBACK_PATH,
  isPendingDirectDebitState,
  isTerminalDirectDebitState,
} from '../../utils/directDebit';

type CallbackStatus =
  | { kind: 'unmatched' }
  | { kind: 'authorization'; authorization: PaymentAuthorization };

const providerReferencesFromLocation = (search: string, state: unknown): string[] => {
  const params = new URLSearchParams(search);
  const stateReference = typeof state === 'object' && state !== null && 'directDebitProviderReference' in state
    ? (state as { directDebitProviderReference?: unknown }).directDebitProviderReference
    : null;
  const stateReferences = typeof state === 'object' && state !== null && 'directDebitProviderReferences' in state
    ? (state as { directDebitProviderReferences?: unknown }).directDebitProviderReferences
    : null;
  const values = [params.get('reference'), params.get('trxref'), stateReference, ...(Array.isArray(stateReferences) ? stateReferences : [])];
  return [...new Set(values.flatMap((value) => {
    if (typeof value !== 'string') return [];
    const normalized = value.trim().slice(0, 256);
    return normalized ? [normalized] : [];
  }))];
};

const callbackErrorMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return 'Your session expired. Sign in again to check this mandate.';
    if (error.status === 403) return 'The selected profile cannot read payment authorizations. Switch to an eligible billing profile and check again.';
    return `${error.message}${error.code ? ` (${error.code})` : ''}${error.requestId ? ` · Support reference ${error.requestId}` : ''}`;
  }
  return error instanceof Error ? error.message : 'Unable to check the current mandate status.';
};

const stateLabel = (state: string): string => state.replaceAll('_', ' ');

const DirectDebitCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, activeProfile, profileError, refreshProfiles, token } = useAuth();
  const profileId = activeProfile?.id ?? null;
  const [providerReferences, setProviderReferences] = useState(() => providerReferencesFromLocation(location.search, location.state));
  const providerReferencesRef = useRef(providerReferences);
  providerReferencesRef.current = providerReferences;
  const [status, setStatus] = useState<CallbackStatus>({ kind: 'unmatched' });
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [manualRefreshVersion, setManualRefreshVersion] = useState(0);
  const referenceKey = JSON.stringify(providerReferences);

  useEffect(() => {
    if (!location.search && !location.state) return;

    const incoming = providerReferencesFromLocation(location.search, location.state);
    if (incoming.length) {
      setProviderReferences((current) => [...new Set([...current, ...incoming])]);
    }
    // The provider reference is kept only in component/router memory. Removing it
    // here prevents it from remaining visible in the address bar or later links.
    navigate(DIRECT_DEBIT_CALLBACK_PATH, { replace: true, state: null });
  }, [location.search, location.state, navigate]);

  useEffect(() => {
    setStatus({ kind: 'unmatched' });
    setError(null);
    setPollTimedOut(false);
  }, [profileId]);

  useEffect(() => {
    if (!isAuthenticated || !profileId) return;

    let active = true;
    let requestInFlight = false;
    let shouldContinuePolling = false;
    let timer: number | undefined;
    const pollDeadline = Date.now() + 60_000;

    const scheduleNextCheck = () => {
      if (!active || !shouldContinuePolling) return;
      if (Date.now() >= pollDeadline) {
        setPollTimedOut(true);
        return;
      }
      if (document.visibilityState === 'hidden') return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void checkStatus(), 5_000);
    };

    const checkStatus = async () => {
      if (!active || requestInFlight) return;
      requestInFlight = true;
      setChecking(true);
      setError(null);
      try {
        const authorizations = await revenueFoundationService.listPaymentAuthorizations();
        if (!active || activeProfile?.id !== profileId || localStorage.getItem('activeProfileId') !== profileId || localStorage.getItem('token') !== token) return;

        const references = providerReferencesRef.current;
        const match = references.length
          ? authorizations.find((authorization) => authorization.method === 'direct_debit' && references.includes(authorization.providerReference))
          : undefined;

        if (match) {
          setStatus({ kind: 'authorization', authorization: match });
          shouldContinuePolling = isPendingDirectDebitState(match.state);
          if (isTerminalDirectDebitState(match.state)) clearDirectDebitOperationKey(profileId);
        } else {
          setStatus({ kind: 'unmatched' });
          shouldContinuePolling = references.length > 0;
        }
      } catch (raw) {
        if (!active) return;
        setStatus({ kind: 'unmatched' });
        setError(callbackErrorMessage(raw));
        const retryable = !(raw instanceof ApiRequestError) || raw.status === undefined || raw.status === 429 || raw.status >= 500;
        shouldContinuePolling = providerReferencesRef.current.length > 0 && retryable;
      } finally {
        requestInFlight = false;
        if (active) {
          setChecking(false);
          scheduleNextCheck();
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
        return;
      }
      scheduleNextCheck();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    setPollTimedOut(false);
    void checkStatus();

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [activeProfile?.id, isAuthenticated, manualRefreshVersion, profileId, referenceKey, token]);

  const signInState = {
    redirectTo: DIRECT_DEBIT_CALLBACK_PATH,
    ...(providerReferences.length ? { directDebitProviderReferences: providerReferences } : {}),
  };

  return (
    <main className="min-h-screen bg-surface px-5 py-16 text-on-surface sm:px-8">
      <section className="mx-auto max-w-2xl rounded-2xl border border-outline-variant/20 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">REALTIQ billing</p>
        <h1 className="mt-2 text-3xl font-black">Direct Debit mandate status</h1>

        {isLoading ? <p role="status" className="mt-5 text-sm text-secondary">Restoring your account and selected profile…</p> : null}

        {!isLoading && profileError ? <div className="mt-5 rounded-xl bg-error-container p-4 text-sm text-on-error-container" role="alert">
          <p className="font-bold">Your billing profile could not be loaded.</p>
          <p className="mt-1">{profileError}</p>
          <button type="button" className="mt-3 rounded-lg bg-primary px-4 py-2 font-bold text-on-primary" onClick={() => void refreshProfiles()}>Reload profile</button>
        </div> : null}

        {!isLoading && !profileError && !isAuthenticated ? <div className="mt-5 rounded-xl bg-surface-container-low p-4 text-sm">
          <p className="font-bold">Sign in to check your mandate.</p>
          <p className="mt-1 text-secondary">The provider return does not confirm approval. After signing in, REALTIQ will check the status for your currently selected profile.</p>
          <Link to="/login" state={signInState} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 font-bold text-on-primary">Sign in and return here</Link>
        </div> : null}

        {!isLoading && !profileError && isAuthenticated ? <>
          <p className="mt-3 text-sm text-secondary">Status is read from REALTIQ for your selected profile. The return link and its reference are not proof of approval.</p>

          {checking ? <p role="status" className="mt-5 text-sm">Checking mandate status…</p> : null}
          {error ? <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p> : null}

          {status.kind === 'unmatched' ? <div className="mt-5 rounded-xl bg-surface-container-low p-4">
            <h2 className="font-bold">Checking mandate status</h2>
            <p className="mt-1 text-sm text-secondary">{providerReferences.length
              ? 'No matching Direct Debit authorization has been returned for this profile yet. Check again shortly.'
              : 'No provider reference was returned. You can still check the current status for this profile.'}</p>
          </div> : null}

          {status.kind === 'authorization' && status.authorization.state === 'active' && status.authorization.reusable ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-950" role="status">
            <h2 className="font-bold">Mandate active and ready for renewal settings</h2>
            <p className="mt-1 text-sm">REALTIQ confirms this authorization is active and reusable. You can select it in your renewal preferences.</p>
          </div> : null}

          {status.kind === 'authorization' && status.authorization.state === 'pending_activation' ? <div className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-950" role="status">
            <h2 className="font-bold">The bank or Paystack is activating your mandate</h2>
            <p className="mt-1 text-sm">You can leave this page and return later to check again. Do not start another setup while activation is pending.</p>
          </div> : null}

          {status.kind === 'authorization' && ['pending_initialization', 'initializing', 'outcome_unknown'].includes(status.authorization.state) ? <div className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-950" role="status">
            <h2 className="font-bold">Setup is still being resolved</h2>
            <p className="mt-1 text-sm">REALTIQ has not confirmed the result yet. Do not start another setup; return later or check this status again.</p>
          </div> : null}

          {status.kind === 'authorization' && status.authorization.state === 'provider_declined' ? <div className="mt-5 rounded-xl bg-red-50 p-4 text-red-950" role="status">
            <h2 className="font-bold">The provider declined this mandate</h2>
            <p className="mt-1 text-sm">REALTIQ has not marked this authorization reusable. Return to billing to see whether a new setup is available.</p>
          </div> : null}

          {status.kind === 'authorization' && status.authorization.state === 'expired' ? <div className="mt-5 rounded-xl bg-surface-container-low p-4" role="status">
            <h2 className="font-bold">This mandate setup expired</h2>
            <p className="mt-1 text-sm text-secondary">Return to billing to see whether the backend permits another setup.</p>
          </div> : null}

          {status.kind === 'authorization' && status.authorization.state === 'revoked' ? <div className="mt-5 rounded-xl bg-surface-container-low p-4" role="status">
            <h2 className="font-bold">This mandate was revoked</h2>
            <p className="mt-1 text-sm text-secondary">It cannot be used for renewal. Return to billing to see the current options.</p>
          </div> : null}

          {status.kind === 'authorization' && status.authorization.state === 'active' && !status.authorization.reusable ? <div className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-950" role="status">
            <h2 className="font-bold">The authorization is not reusable</h2>
            <p className="mt-1 text-sm">REALTIQ has not approved it for renewal settings. Check again later or contact support.</p>
          </div> : null}

          {status.kind === 'authorization' && !['active', 'pending_activation', 'pending_initialization', 'initializing', 'outcome_unknown', 'provider_declined', 'expired', 'revoked'].includes(status.authorization.state) ? <div className="mt-5 rounded-xl bg-surface-container-low p-4" role="status">
            <h2 className="font-bold">Mandate status: {stateLabel(status.authorization.state)}</h2>
            <p className="mt-1 text-sm text-secondary">Only an authorization marked active and reusable by REALTIQ can be selected for renewals.</p>
          </div> : null}

          {pollTimedOut ? <p className="mt-4 text-sm text-secondary">Automatic checks have stopped. Use “Check status” to refresh when you are ready.</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={checking} onClick={() => setManualRefreshVersion((version) => version + 1)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50">{checking ? 'Checking…' : 'Check status'}</button>
            <Link to="/dashboard/billing" className="rounded-lg border border-outline-variant/30 px-4 py-2 text-sm font-bold">Return to billing</Link>
          </div>
        </> : null}
      </section>
    </main>
  );
};

export default DirectDebitCallback;
