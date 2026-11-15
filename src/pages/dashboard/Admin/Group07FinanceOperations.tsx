import { useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { hasAdminCapability } from '../../../services/adminAccessService';
import { group07Service } from '../../../services/group07Service';

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
const money = (minor: unknown, currency: unknown) => typeof minor === 'number' && typeof currency === 'string' ? new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100) : 'Amount not returned';
export default function Group07FinanceOperations() {
  const { adminAccess } = useAuth();
  const stepUp = useBoundStepUp<unknown>();
  const canManage = Boolean(adminAccess && !adminAccess.readOnly && hasAdminCapability(adminAccess, 'finance.manage'));
  const [tab, setTab] = useState<'settlement' | 'refund'>('settlement');
  const [resourceId, setResourceId] = useState('');
  const [settlement, setSettlement] = useState<JsonRecord | null>(null);
  const [refund, setRefund] = useState<JsonRecord | null>(null);
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    const id = resourceId.trim();
    if (!/^[0-9a-f]{24}$/i.test(id)) { setError('Enter the current partner job or dispute reference from an authorized Finance record.'); return; }
    setLoading(true); setError(''); setNotice('');
    try {
      if (tab === 'settlement') { const result = await group07Service.partnerSettlement(id); setSettlement(result); }
      else { const result = await group07Service.partnerRefundExecution(id); setRefund(result); }
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Finance execution details could not be loaded.'); }
    finally { setLoading(false); }
  };
  const run = async <B extends object>(method: 'POST', path: string, body: B, label: string, execute: (challenge: string, exactBody: B) => Promise<unknown>) => {
    const started = await stepUp.begin({ method, path, body, label, execute });
    if (!started) setNotice(stepUp.getError() ?? 'The protected Finance action could not start. Refresh the current provider record.');
  };
  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (result.ok) { setAuthorizationCode(''); setNotice('The server recorded this action. Refresh the same resource to confirm provider state.'); await refresh(); return true; }
    setNotice(result.error ?? 'The action was not confirmed. Check the same provider reference.'); return false;
  };
  const settlementVersion = typeof settlement?.version === 'number' ? settlement.version : null;
  const settlementState = String(settlement?.state ?? '');
  const settlementEligibility = record(settlement?.actionEligibility);
  const beneficiaries = Array.isArray(settlement?.beneficiaries) ? settlement.beneficiaries.map(record) : [];
  const refundVersion = typeof refund?.version === 'number' ? refund.version : null;
  const refundEligibility = record(refund?.actionEligibility);

  return <AdminLayout><main className="space-y-6 p-4 sm:p-8"><header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Finance</p><h1 className="mt-2 text-3xl font-black">Partner settlements and refunds</h1><p className="mt-2 text-sm text-secondary">Use the resource reference from the authorized Finance record. Every action rechecks current authority, versions and provider state.</p></header>
    <nav aria-label="Partner Finance sections" className="flex gap-2">{(['settlement', 'refund'] as const).map((item) => <button key={item} type="button" onClick={() => { setTab(item); setSettlement(null); setRefund(null); setError(''); setNotice(''); }} aria-current={tab === item ? 'page' : undefined} className={`rounded-lg px-4 py-2 font-bold capitalize ${tab === item ? 'bg-primary text-on-primary' : 'border bg-white'}`}>{item}</button>)}</nav>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void refresh(); }}><label className="min-w-80 flex-1 text-sm font-bold">{tab === 'settlement' ? 'Partner job reference' : 'Dispute reference'}<input value={resourceId} onChange={(event) => { setResourceId(event.target.value); setSettlement(null); setRefund(null); }} className="mt-1 block w-full rounded border p-3 font-normal" autoComplete="off" /></label><button disabled={loading} className="rounded bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50">{loading ? 'Loading…' : 'Load current state'}</button></form>
    {error ? <p role="alert" className="rounded bg-red-50 p-3">{error}</p> : null}{notice ? <p role="status" className="rounded bg-surface-container-low p-3">{notice}</p> : null}{!canManage ? <p className="rounded bg-amber-50 p-3 text-sm">The current staff profile is read-only or does not have Finance management authority. Read and write authorization is rechecked by the server.</p> : null}
    {tab === 'settlement' && settlement ? <section className="space-y-4 rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-bold">Partner settlement</h2><span className="rounded-full bg-surface-container-low px-3 py-1 capitalize">{settlementState.replaceAll('_', ' ')}</span></div><p>Collected {money(settlement.collectedMinor, settlement.currency)} · Partner {money(settlement.partnerMinor, settlement.currency)} · REALTIQ fee {money(settlement.feeMinor, settlement.currency)}</p>{typeof settlement.whtMinor === 'number' ? <p>Withholding tax: {money(settlement.whtMinor, settlement.currency)}. This is shown as a separate server-confirmed allocation.</p> : null}<p className="text-sm text-secondary">A merchant collection receipt is not proof that each beneficiary transfer completed.</p>
      {settlementEligibility.reconcile === true && settlementVersion !== null ? <button disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void run('POST', `/api/admin/partner-jobs/${encodeURIComponent(resourceId)}/settlement/reconcile`, { expectedVersion: settlementVersion }, 'Reconcile the same partner settlement reference', (challenge) => group07Service.reconcilePartnerSettlement(resourceId, settlementVersion, challenge))} className="rounded border px-3 py-2 font-bold disabled:opacity-50">Reconcile current transfer</button> : null}
      {settlementEligibility.release === true ? <p role="status" className="rounded bg-amber-50 p-3 text-sm">The server indicates settlement release may be eligible, but this read response does not include the current job version required by the release request. Refresh after the Finance read contract exposes that version; no release request was sent.</p> : null}
      <div className="space-y-2">{beneficiaries.map((beneficiary) => { const id = typeof beneficiary.id === 'string' ? beneficiary.id : ''; const canAuthorize = Array.isArray(settlementEligibility.authorizeBeneficiaryIds) && settlementEligibility.authorizeBeneficiaryIds.includes(id); return <article key={id} className="rounded-lg bg-surface-container-low p-3"><p className="font-bold">{String(beneficiary.key ?? 'Transfer').replaceAll('_', ' ')} · {String(beneficiary.state ?? 'state not returned').replaceAll('_', ' ')}</p><p className="text-sm">{money(beneficiary.amountMinor, settlement.currency)} · {String(beneficiary.destinationBankName ?? 'Bank not returned')} · {String(beneficiary.destinationMasked ?? 'Destination masked')}</p>{beneficiary.completedAt ? <p className="text-xs">Provider-confirmed {new Date(String(beneficiary.completedAt)).toLocaleString('en-GB')}</p> : null}{canAuthorize ? <div className="mt-2 flex flex-wrap gap-2"><label className="text-sm">Provider authorization code<input type="password" autoComplete="one-time-code" value={authorizationCode} onChange={(event) => setAuthorizationCode(event.target.value)} className="ml-2 rounded border p-2" /></label><button disabled={!canManage || !authorizationCode || settlementVersion === null || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => { if (settlementVersion === null) return; void run('POST', `/api/admin/partner-jobs/${encodeURIComponent(resourceId)}/settlement/beneficiaries/${encodeURIComponent(id)}/authorize`, { expectedVersion: settlementVersion, authorizationCode }, 'Authorize a settlement beneficiary', (challenge, body) => group07Service.authorizePartnerBeneficiary(resourceId, id, body, challenge)); }} className="rounded bg-primary px-3 py-2 font-bold text-on-primary disabled:opacity-50">Authorize transfer</button></div> : null}</article>; })}</div>
    </section> : null}
    {tab === 'refund' && resourceId && refund === null && !loading && !error ? <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Refund execution</h2><p className="mt-2 text-sm text-secondary">No current refund reservation was returned. The current contract does not provide Finance with the dispute version and job version required to prepare one. The UI will not guess either version or start a refund.</p></section> : null}
    {tab === 'refund' && refund ? <section className="space-y-3 rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-bold">Partner refund execution</h2><span className="rounded-full bg-surface-container-low px-3 py-1 capitalize">{String(refund.state ?? '').replaceAll('_', ' ')}</span></div><p>{money(refund.amountMinor, refund.currency)} · {String(refund.destinationBankName ?? 'Bank not returned')} · {String(refund.destinationMasked ?? 'Destination masked')}</p>{typeof refund.lastFailureCode === 'string' ? <p className="text-sm">The latest operation needs review; refresh the same provider reference.</p> : null}{refundVersion !== null && refundEligibility.initiate === true ? <button disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void run('POST', `/api/admin/partner-job-disputes/${encodeURIComponent(resourceId)}/refund-execution/initiate`, { expectedVersion: refundVersion }, 'Initiate the reserved partner refund', (challenge) => group07Service.initiatePartnerRefund(resourceId, { expectedVersion: refundVersion }, challenge))} className="rounded bg-primary px-3 py-2 font-bold text-on-primary disabled:opacity-50">Start reserved refund</button> : null}{refundEligibility.authorize === true && refundVersion !== null ? <div className="flex flex-wrap gap-2"><label className="text-sm">Provider authorization code<input type="password" autoComplete="one-time-code" value={authorizationCode} onChange={(event) => setAuthorizationCode(event.target.value)} className="ml-2 rounded border p-2" /></label><button disabled={!canManage || !authorizationCode || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void run('POST', `/api/admin/partner-job-disputes/${encodeURIComponent(resourceId)}/refund-execution/authorize`, { expectedVersion: refundVersion, authorizationCode }, 'Authorize the same provider refund reference', (challenge, body) => group07Service.authorizePartnerRefund(resourceId, body, challenge))} className="rounded bg-primary px-3 py-2 font-bold text-on-primary disabled:opacity-50">Authorize refund</button></div> : null}{refundEligibility.reconcile === true && refundVersion !== null ? <button disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void run('POST', `/api/admin/partner-job-disputes/${encodeURIComponent(resourceId)}/refund-execution/reconcile`, { expectedVersion: refundVersion }, 'Reconcile the original partner refund reference', (challenge) => group07Service.reconcilePartnerRefund(resourceId, { expectedVersion: refundVersion }, challenge))} className="rounded border px-3 py-2 font-bold disabled:opacity-50">Reconcile original refund</button> : null}</section> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </main></AdminLayout>;
}
