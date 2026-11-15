import { useState } from 'react';
import StepUpDialog from '../auth/StepUpDialog';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { group07Service } from '../../services/group07Service';

type Impact = { version: number; defaultPenaltyPoints: number; adjustedPenaltyPoints: number | null; policyRevision?: number };
export default function DisputeTrustImpact({ kind, disputeId, canManage }: { kind: 'escrow' | 'partner_job'; disputeId: string; canManage: boolean }) {
  const stepUp = useBoundStepUp<unknown>();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [penalty, setPenalty] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try {
      const value = await group07Service.profileDisputeImpact(kind, disputeId) as Impact;
      setImpact(value); setPenalty(String(value.adjustedPenaltyPoints ?? value.defaultPenaltyPoints));
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Trust impact is unavailable for this case.'); }
  };
  const begin = async () => {
    if (!canManage || !impact || !reason.trim()) return;
    const penaltyPoints = Number(penalty);
    if (!Number.isInteger(penaltyPoints) || penaltyPoints < 0 || penaltyPoints > 100) { setError('Enter a whole-number penalty from 0 to 100.'); return; }
    const body = { expectedVersion: impact.version, penaltyPoints, reason: reason.trim() };
    const path = `/api/trust/v1/admin/disputes/${kind}/${encodeURIComponent(disputeId)}/impact`;
    const started = await stepUp.begin({ method: 'PATCH', path, body, label: 'Adjust trust impact for this upheld dispute', execute: (challenge, exactBody) => group07Service.updateProfileDisputeImpact(kind, disputeId, exactBody, challenge) });
    if (!started) setError(stepUp.getError() ?? 'The protected trust impact change could not start. Refresh before retrying.');
  };
  const complete = async (code: string) => {
    setBusy(true);
    try { const result = await stepUp.complete(code); if (!result.ok) { setError(result.error ?? 'The impact change was not confirmed.'); return false; } setReason(''); await load(); return true; }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Trust impact</h2><p className="text-sm text-secondary">A case adjustment affects the trust penalty only. It does not change the financial dispute outcome.</p></div><button type="button" onClick={() => void load()} className="rounded border px-3 py-2 text-sm font-bold">{impact ? 'Refresh impact' : 'Load impact'}</button></div>{error ? <p role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm">{error}</p> : null}{impact ? <div className="mt-4 space-y-3"><p className="text-sm">Policy default: {impact.defaultPenaltyPoints} points · current case override: {impact.adjustedPenaltyPoints ?? 'none'} · version {impact.version}</p>{canManage ? <><label className="block text-sm font-bold">Case penalty points<input type="number" min={0} max={100} step={1} value={penalty} onChange={(event) => setPenalty(event.target.value)} className="mt-1 block w-full max-w-xs rounded border p-2" /></label><label className="block text-sm font-bold">Private reason<textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block w-full rounded border p-2" /></label><button type="button" disabled={!reason.trim() || busy || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void begin()} className="rounded bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Adjust case impact with authenticator</button></> : <p className="text-sm text-secondary">This staff profile has read-only access to trust-impact records.</p>}</div> : null}<StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} /></section>;
}
