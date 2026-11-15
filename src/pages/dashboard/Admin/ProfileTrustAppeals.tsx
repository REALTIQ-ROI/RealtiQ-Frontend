import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { hasAdminCapability } from '../../../services/adminAccessService';
import { group07Service, type Group07ProfileTrustAppeal } from '../../../services/group07Service';

type DecisionDraft = { appeal: Group07ProfileTrustAppeal; decision: 'dismissed' | 'adjusted'; reason: string; adjustedScore: string; reviewAt: string };
export default function ProfileTrustAppeals() {
  const { adminAccess } = useAuth();
  const stepUp = useBoundStepUp<Group07ProfileTrustAppeal>();
  const [state, setState] = useState<'open' | 'adjusted' | 'dismissed'>('open');
  const [appeals, setAppeals] = useState<Group07ProfileTrustAppeal[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState<DecisionDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = Boolean(adminAccess && !adminAccess.readOnly && hasAdminCapability(adminAccess, 'trust.manage'));
  const load = async (after?: string | null, append = false) => {
    setLoading(true); setError('');
    try { const page = await group07Service.adminProfileAppeals(state, after); setAppeals((current) => append ? [...current, ...page.appeals] : page.appeals); setCursor(page.nextCursor); }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'Profile trust appeals are unavailable.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setAppeals([]); setDraft(null); void load(); }, [state]);

  const prepare = async () => {
    if (!canManage || !draft || stepUp.busy || stepUp.challenge) return;
    const reason = draft.reason.trim();
    if (!reason) { setNotice('Enter a private decision reason.'); return; }
    const adjustedScore = Number(draft.adjustedScore);
    const body = draft.decision === 'adjusted'
      ? { decision: draft.decision, expectedVersion: draft.appeal.version, reason, adjustedScore, reviewAt: new Date(draft.reviewAt).toISOString() }
      : { decision: draft.decision, expectedVersion: draft.appeal.version, reason };
    if (draft.decision === 'adjusted' && (!Number.isInteger(adjustedScore) || adjustedScore < 0 || adjustedScore > 100 || !draft.reviewAt || !Number.isFinite(Date.parse(draft.reviewAt)) || Date.parse(draft.reviewAt) <= Date.now())) { setNotice('An adjusted decision needs a whole-number score from 0 to 100 and a future review date.'); return; }
    setNotice('');
    const started = await stepUp.begin({ method: 'PATCH', path: `/api/trust/v1/admin/profile-appeals/${encodeURIComponent(draft.appeal.id)}`, body, label: 'Review a profile trust appeal', execute: (challenge, exactBody) => group07Service.decideProfileAppeal(draft.appeal.id, exactBody, challenge) });
    if (!started) setNotice(stepUp.getError() ?? 'The protected review could not start. Refresh the appeal before retrying.');
  };
  const complete = async (code: string) => {
    setBusy(true);
    try { const result = await stepUp.complete(code); if (!result.ok) { setNotice(result.error ?? 'Decision was not confirmed. Refresh and review the current appeal.'); await load(); return false; } setDraft(null); setNotice(`The server recorded the ${result.value.state} decision.`); await load(); return true; }
    finally { setBusy(false); }
  };

  return <AdminLayout><main className="space-y-6 p-4 sm:p-8"><header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Trust & Safety</p><h1 className="mt-2 text-3xl font-black">Profile trust appeals</h1><p className="mt-2 text-sm text-secondary">This queue is separate from legacy account-level trust appeals. Decisions use the current selected staff profile and a fresh request-bound authenticator challenge.</p></header>
    <label className="block max-w-sm text-sm font-bold">Appeal state<select value={state} onChange={(event) => setState(event.target.value as typeof state)} className="mt-1 block w-full rounded border bg-white p-3">{['open', 'adjusted', 'dismissed'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    <button type="button" className="rounded border bg-white px-4 py-2 font-bold" disabled={loading} onClick={() => void load()}>Refresh appeals</button>{loading ? <p role="status">Loading profile trust appeals…</p> : null}{error ? <p role="alert" className="rounded bg-red-50 p-3">{error}</p> : null}{notice ? <p role="status" className="rounded bg-surface-container-low p-3">{notice}</p> : null}{!canManage ? <p className="rounded bg-amber-50 p-3 text-sm">This staff profile can read the queue but does not have the current Trust & Safety write capability.</p> : null}
    <section className="space-y-3">{appeals.map((appeal) => <article key={appeal.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold">Profile trust appeal</h2><span className="rounded-full bg-surface-container-low px-3 py-1 text-sm capitalize">{appeal.state}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{appeal.reason}</p><p className="mt-2 text-sm text-secondary">Initial result: {appeal.initialTier} · {appeal.initialScore}/100 · scoring policy revision {appeal.scoringPolicyRevision}</p>{appeal.state === 'adjusted' ? <p className="mt-1 text-sm">Current adjustment: {appeal.adjustedTier} · {appeal.adjustedScore}/100{appeal.expiresAt ? ` · expires ${new Date(appeal.expiresAt).toLocaleDateString('en-GB')}` : ''}</p> : null}{appeal.decisionReason ? <p className="mt-2 text-sm"><strong>Decision reason:</strong> {appeal.decisionReason}</p> : null}{appeal.outcomeDocument ? <div className="mt-3 rounded bg-surface-container-low p-3 text-sm"><p>Outcome document: <strong className="capitalize">{appeal.outcomeDocument.state}</strong></p>{appeal.outcomeDocument.state === 'issued' && appeal.outcomeDocument.contentPath ? <p className="mt-1">The holder can open the issued outcome in Document Manager.</p> : appeal.outcomeDocument.state === 'approved' || appeal.outcomeDocument.state === 'issuing' ? <p className="mt-1">Issuance is pending or recoverable. An authorized issuer can continue from Document Manager.</p> : null}{appeal.outcomeDocument.issuanceErrorCode ? <p className="mt-1">Sealed issuance is currently unavailable; the decision remains recorded.</p> : null}<Link to="/dashboard/documents" className="mt-2 inline-block font-bold text-primary underline">Open Document Manager</Link></div> : null}{appeal.state === 'open' && canManage ? <button type="button" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => { setNotice(''); setDraft({ appeal, decision: 'dismissed', reason: '', adjustedScore: '', reviewAt: '' }); }} className="mt-3 rounded bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Review appeal</button> : null}{draft?.appeal.id === appeal.id ? <form className="mt-3 grid gap-3 rounded-lg border p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void prepare(); }}><label className="text-sm font-bold">Decision<select className="mt-1 block w-full rounded border p-2" value={draft.decision} onChange={(event) => setDraft({ ...draft, decision: event.target.value as DecisionDraft['decision'] })}><option value="dismissed">Dismiss appeal</option><option value="adjusted">Adjust score</option></select></label><label className="text-sm font-bold">Private reason<textarea required value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} className="mt-1 block w-full rounded border p-2" /></label>{draft.decision === 'adjusted' ? <><label className="text-sm font-bold">Adjusted score<input type="number" min={0} max={100} step={1} required value={draft.adjustedScore} onChange={(event) => setDraft({ ...draft, adjustedScore: event.target.value })} className="mt-1 block w-full rounded border p-2" /></label><label className="text-sm font-bold">Review date<input type="datetime-local" required value={draft.reviewAt} onChange={(event) => setDraft({ ...draft, reviewAt: event.target.value })} className="mt-1 block w-full rounded border p-2" /></label></> : null}<div className="flex items-end gap-3"><button type="button" onClick={() => setDraft(null)} className="rounded border px-3 py-2 font-bold">Cancel</button><button type="submit" disabled={busy || stepUp.busy || Boolean(stepUp.challenge)} className="rounded bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Continue with authenticator</button></div></form> : null}</article>)}{!loading && !appeals.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No profile trust appeals match this state.</p> : null}</section>
    {cursor ? <button type="button" disabled={loading} onClick={() => void load(cursor, true)} className="rounded border bg-white px-4 py-2 font-bold">Load more</button> : null}<StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </main></AdminLayout>;
}
