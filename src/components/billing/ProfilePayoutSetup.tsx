import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import StepUpDialog from '../auth/StepUpDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { revenueFoundationService, type PayoutSetupRecord, type PayoutSetupState } from '../../services/revenueFoundationService';

const message = (error: unknown) => error instanceof ApiRequestError && error.code ? `${error.message} (${error.code})` : error instanceof Error ? error.message : 'Payout setup could not be loaded.';

const ProfilePayoutSetup = () => {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id;
  const operationStorageKey = profileId ? `realtiq.payoutSetupOperation:${profileId}` : '';
  const permissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const canManage = permissions.includes('payout.manage');
  const [state, setState] = useState<PayoutSetupState | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; action: string; code: string | null; at: string }>>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  const operation = useRef<{ fingerprint: string; key: string } | null>(null);
  const stepUp = useBoundStepUp<PayoutSetupRecord>();

  const refresh = useCallback(async () => {
    if (!profileId) return;
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    const [currentResult, historyResult] = await Promise.allSettled([
      revenueFoundationService.getPayoutSetup(),
      revenueFoundationService.getPayoutSetupHistory({ limit: 25 }),
    ]);
    if (version !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
    if (currentResult.status === 'fulfilled') setState(currentResult.value);
    if (historyResult.status === 'fulfilled') { setHistory(historyResult.value.events); setHistoryCursor(historyResult.value.nextCursor); }
    setError([currentResult, historyResult].filter((item): item is PromiseRejectedResult => item.status === 'rejected').map((item) => message(item.reason)).join(' '));
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    const startVersion = requestVersion.current;
    if (profileId) queueMicrotask(() => { if (requestVersion.current === startVersion) void refresh(); });
    return () => { requestVersion.current += 1; };
  }, [profileId, refresh]);

  const beginSetup = async () => {
    if (!canManage || !state || state.policy.state !== 'configured' || !state.providerActivation.available || stepUp.busy || stepUp.challenge) return;
    if (!/^\d{10}$/.test(accountNumber) || !bankCode.trim()) { setError('Enter the 10-digit account number and the bank directory code.'); return; }
    const fingerprint = `${profileId}:${state.setup?.version ?? 0}:${bankCode.trim()}:${accountNumber}`;
    if (operation.current?.fingerprint !== fingerprint) operation.current = { fingerprint, key: (operationStorageKey ? sessionStorage.getItem(operationStorageKey) : null) || `payout_${crypto.randomUUID()}` };
    const body = { expectedVersion: state.setup?.version ?? 0, operationKey: operation.current.key, bankCode: bankCode.trim(), accountNumber };
    setError(''); setNotice('');
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/payout-setup', body, label: 'Verify profile payout destination', execute: (challengeId, exactBody) => { if (operationStorageKey) sessionStorage.setItem(operationStorageKey, exactBody.operationKey); return revenueFoundationService.startPayoutSetup(exactBody, challengeId); } });
  };
  const beginReconcile = async () => {
    if (!state?.setup?.id || !canManage || stepUp.busy || stepUp.challenge) return;
    const id = state.setup.id;
    await stepUp.begin({ method: 'POST', path: `/api/profiles/current/payout-setup/${encodeURIComponent(id)}/reconcile`, body: {}, label: 'Reconcile payout setup', execute: (challengeId) => revenueFoundationService.reconcilePayoutSetup(id, challengeId) });
  };
  const beginRevoke = async () => {
    if (!state?.setup || !canManage || stepUp.busy || stepUp.challenge) return;
    if (!/^[A-Z][A-Z0-9_]{0,79}$/.test(reasonCode)) { setError('Enter the approved uppercase reason code for revoking this setup.'); return; }
    const body = { expectedVersion: state.setup.version, reasonCode };
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/payout-setup/revoke', body, label: 'Revoke payout setup', execute: (challengeId, exactBody) => revenueFoundationService.revokePayoutSetup(exactBody, challengeId) });
  };
  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'The payout action was not confirmed. Check current status before another attempt.'); return false; }
    setAccountNumber(''); setBankCode(''); setReasonCode('');
    setNotice(`Payout setup state: ${result.value.state.replaceAll('_', ' ')}. Recipient readiness is confirmed only by the current server status.`);
    if (!['initiating', 'provider_create_started', 'reconciliation_required'].includes(result.value.state)) { operation.current = null; if (operationStorageKey) sessionStorage.removeItem(operationStorageKey); }
    await refresh();
    return true;
  };
  const loadMore = async () => {
    if (!historyCursor || !profileId) return;
    const version = requestVersion.current;
    try {
      const page = await revenueFoundationService.getPayoutSetupHistory({ limit: 25, before: historyCursor });
      if (version !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
      setHistory((current) => [...current, ...page.events.filter((event) => !current.some((old) => old.id === event.id))]); setHistoryCursor(page.nextCursor);
    } catch (raw) { if (version === requestVersion.current) setError(message(raw)); }
  };

  return <section className="rounded-xl border bg-white p-5" aria-labelledby="profile-payout-heading">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="profile-payout-heading" className="text-xl font-bold">Profile payout destination</h2><Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh()}>Refresh status</Button></div>
    <p className="mt-1 text-sm text-secondary">A ready destination can receive eligible settlement. It does not mean any buyer payment or escrow transfer has settled.</p>
    {loading ? <p role="status" className="mt-3">Loading payout setup…</p> : null}
    {error ? <p role="alert" className="mt-3 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}
    {state ? <><p className="mt-3 text-sm">Policy: {state.policy.state}{state.policy.errorCode ? ` (${state.policy.errorCode})` : ''} · Provider: {state.providerActivation.available ? 'available' : state.providerActivation.errorCode ?? 'unavailable'} · Ready: {state.ready ? 'Yes' : 'No'}</p>
      {state.setup ? <dl className="mt-3 grid gap-2 rounded-lg bg-surface-container-low p-3 text-sm sm:grid-cols-2"><div><dt className="font-bold">Status</dt><dd>{state.setup.state.replaceAll('_', ' ')}</dd></div><div><dt className="font-bold">Bank</dt><dd>{state.setup.bankName} · {state.setup.maskedAccountNumber}</dd></div><div><dt className="font-bold">Verified account name</dt><dd>{state.setup.verifiedAccountName ?? 'Not returned'}</dd></div><div><dt className="font-bold">Split settlement ready</dt><dd>{state.setup.splitSettlementReady ? 'Yes' : 'No'}</dd></div></dl> : <p className="mt-3 text-sm text-secondary">No payout setup returned for this profile.</p>}
      {canManage && state.policy.state === 'configured' && state.providerActivation.available ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Bank directory code<input className="mt-1 block w-full rounded-lg border p-2" value={bankCode} onChange={(event) => setBankCode(event.target.value)} autoComplete="off" /></label><label className="text-sm font-bold">Account number<input className="mt-1 block w-full rounded-lg border p-2" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="off" /></label><Button type="button" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginSetup()}>Submit payout setup with authenticator</Button></div> : <p className="mt-3 text-sm text-secondary">Setup is unavailable with the current policy, provider or profile authority. No bank or payout destination is assumed.</p>}
      {state.setup && canManage ? <div className="mt-4 flex flex-wrap items-end gap-3"><Button type="button" variant="secondary" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginReconcile()}>Reconcile setup</Button><label className="text-sm">Approved revocation reason code<input className="mt-1 block rounded-lg border p-2" value={reasonCode} onChange={(event) => setReasonCode(event.target.value.toUpperCase())} /></label><Button type="button" variant="ghost" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginRevoke()}>Revoke with authenticator</Button></div> : null}
    </> : null}
    <h3 className="mt-5 font-bold">Setup history</h3>{history.map((event) => <p key={event.id} className="mt-2 text-sm">{event.action.replaceAll('_', ' ')} · {new Date(event.at).toLocaleString('en-GB')}{event.code ? ` · ${event.code}` : ''}</p>)}{!history.length ? <p className="mt-2 text-sm text-secondary">No history returned.</p> : null}{historyCursor ? <Button type="button" variant="secondary" className="mt-3" onClick={() => void loadMore()}>Load more history</Button> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </section>;
};

export default ProfilePayoutSetup;
