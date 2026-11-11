import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { revenueFoundationService, type PaymentAuthorization, type RenewalPreference } from '../../services/revenueFoundationService';
import { renewalMethodAvailable } from '../../services/renewalAvailability';
import type { OrganizationSeatPlans, OrganizationSeats } from '../../services/organizationManagementService';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';

const message = (raw: unknown) => raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})` : raw instanceof Error ? raw.message : 'Seat renewal settings could not be loaded.';

const SeatRenewalPreferences = ({ plans, seats, canManage }: { plans: OrganizationSeatPlans; seats: OrganizationSeats; canManage: boolean }) => {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id;
  const availability = plans.renewalAvailability;
  const [preferences, setPreferences] = useState<RenewalPreference[]>([]);
  const [authorizations, setAuthorizations] = useState<PaymentAuthorization[]>([]);
  const [memberId, setMemberId] = useState('');
  const [planKey, setPlanKey] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [method, setMethod] = useState<RenewalPreference['method']>('manual');
  const [authorizationId, setAuthorizationId] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const version = useRef(0);
  const submitted = useRef(false);
  const stepUp = useBoundStepUp<RenewalPreference>();

  const refresh = useCallback(async () => {
    if (!profileId) return;
    const request = ++version.current;
    setLoading(true); setError('');
    const results = await Promise.allSettled([revenueFoundationService.listRenewalPreferences(), revenueFoundationService.listPaymentAuthorizations()]);
    if (request !== version.current || localStorage.getItem('activeProfileId') !== profileId) return;
    if (results[0].status === 'fulfilled') setPreferences(results[0].value.filter((item) => item.kind === 'seat'));
    if (results[1].status === 'fulfilled') setAuthorizations(results[1].value);
    setLoaded(results.every((item) => item.status === 'fulfilled'));
    setError(results.filter((item): item is PromiseRejectedResult => item.status === 'rejected').map((item) => message(item.reason)).join(' '));
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    const request = version.current;
    queueMicrotask(() => { if (request === version.current) void refresh(); });
    return () => { version.current += 1; stepUp.cancel(); };
    // Parent keys this panel by the active organization profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const beginSave = async () => {
    if (!availability || !canManage || loading || !loaded || stepUp.busy || stepUp.challenge) return;
    const seat = seats.paidSeats.find((item) => item.membershipId === memberId && item.entitlement?.active);
    const plan = plans.plans.find((item) => item.key === planKey && item.terms.some((term) => term.period === period));
    if (!seat || !plan || !renewalMethodAvailable(availability, method)) { setError('Choose an active paid seat, current term and available renewal method.'); return; }
    const authorization = authorizations.find((item) => item.id === authorizationId && item.method === method && item.reusable && item.state === 'active');
    if ((method === 'saved_card' || method === 'direct_debit') && !authorization) { setError('Select an active reusable authorization for this method.'); return; }
    const current = preferences.find((item) => item.membershipId === memberId);
    const body = { kind: 'seat' as const, targetId: memberId, planKey, billingPeriod: period, method, ...(authorization ? { authorizationId: authorization.id } : {}), autoRenew: (method === 'saved_card' || method === 'direct_debit') && autoRenew, expectedVersion: current?.version ?? 0 };
    submitted.current = false;
    await stepUp.begin({ method: 'PUT', path: '/api/profiles/current/billing/renewal-preferences', body, label: 'Save seat renewal preference', execute: (challengeId, exactBody) => { submitted.current = true; return revenueFoundationService.saveRenewalPreference(exactBody, challengeId); } });
  };

  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) {
      if (submitted.current || result.code === 'CONFLICT_RENEWAL_PREFERENCE_VERSION') await refresh();
      setError(result.error ?? 'Seat renewal was not saved. Refresh the current preference before retrying.');
      return false;
    }
    setNotice(`Seat renewal preference is ${result.value.state}. Automatic charging is active only when the server reports a valid active authorization and scheduled preference.`);
    await refresh();
    return true;
  };

  if (!availability) return null;
  const availableAuthorizations = authorizations.filter((item) => item.method === method && item.state === 'active' && item.reusable);
  return <div className="mt-5 border-t pt-4" aria-label="Seat renewal preferences"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Seat renewal preferences</h4><Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh()}>Refresh preferences</Button></div>
    {loading ? <p role="status" className="mt-2 text-sm">Loading renewal settings…</p> : null}{error ? <p role="alert" className="mt-2 text-sm text-error">{error}</p> : null}{notice ? <p role="status" className="mt-2 text-sm">{notice}</p> : null}
    {preferences.length ? <ul className="mt-2 space-y-2">{preferences.map((item) => <li key={item.id} className="rounded-lg bg-surface-container-low p-3 text-sm">Seat {item.membershipId} · {item.method.replaceAll('_', ' ')} · {item.state} · version {item.version}{item.suspensionCode ? ` · ${item.suspensionCode}` : ''}{canManage ? <Button type="button" variant="ghost" className="ml-2" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void stepUp.begin({ method: 'POST', path: `/api/profiles/current/billing/renewal-preferences/${encodeURIComponent(item.id)}/disable`, body: {}, label: 'Disable seat renewal', execute: (challengeId) => revenueFoundationService.disableRenewalPreference(item.id, challengeId) })}>Disable with authenticator</Button> : null}</li>)}</ul> : <p className="mt-2 text-sm text-secondary">No seat renewal preferences returned.</p>}
    {canManage && plans.state === 'configured' ? <div className="mt-3 grid gap-3 rounded-lg border p-3 sm:grid-cols-2"><label className="text-sm">Active paid seat<select className="mt-1 block w-full rounded border p-2" value={memberId} onChange={(event) => setMemberId(event.target.value)}><option value="">Choose seat</option>{seats.paidSeats.filter((item) => item.entitlement?.active).map((item) => <option key={item.membershipId} value={item.membershipId}>{item.role.replaceAll('_', ' ')} · {item.identityId}</option>)}</select></label><label className="text-sm">Seat plan<select className="mt-1 block w-full rounded border p-2" value={planKey} onChange={(event) => { const next = plans.plans.find((item) => item.key === event.target.value); setPlanKey(event.target.value); setPeriod(next?.terms[0]?.period ?? 'monthly'); }}><option value="">Choose plan</option>{plans.plans.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="text-sm">Billing period<select className="mt-1 block w-full rounded border p-2" value={period} onChange={(event) => setPeriod(event.target.value as 'monthly' | 'annual')}>{plans.plans.find((item) => item.key === planKey)?.terms.map((term) => <option key={term.period} value={term.period}>{term.period}</option>)}</select></label><label className="text-sm">Renewal method<select className="mt-1 block w-full rounded border p-2" value={method} onChange={(event) => { setMethod(event.target.value as RenewalPreference['method']); setAuthorizationId(''); setAutoRenew(false); }}>{availability.manual.available ? <option value="manual">Manual</option> : null}{availability.methods.map((item) => <option key={item.method} value={item.method}>{item.method.replaceAll('_', ' ')}</option>)}{!renewalMethodAvailable(availability, method) ? <option value={method} disabled>{method.replaceAll('_', ' ')} (unavailable)</option> : null}</select></label>{method === 'saved_card' || method === 'direct_debit' ? <label className="text-sm">Active authorization<select className="mt-1 block w-full rounded border p-2" value={authorizationId} onChange={(event) => setAuthorizationId(event.target.value)}><option value="">Choose authorization</option>{availableAuthorizations.map((item) => <option key={item.id} value={item.id}>{item.method} · {item.id}</option>)}</select></label> : null}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoRenew} disabled={method !== 'saved_card' && method !== 'direct_debit' || !authorizationId} onChange={(event) => setAutoRenew(event.target.checked)} />Automatic renewal</label><Button type="button" disabled={!loaded || !memberId || !plans.plans.find((item) => item.key === planKey)?.terms.some((term) => term.period === period) || !renewalMethodAvailable(availability, method) || loading || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginSave()}>Save seat preference with authenticator</Button></div> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </div>;
};

export default SeatRenewalPreferences;
