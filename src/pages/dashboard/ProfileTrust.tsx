import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { documentManagerService } from '../../services/documentManagerService';
import { group07Service, type Group07ProfileTrustAppeal, type Group07Trust } from '../../services/group07Service';

const humanize = (value: string) => value.replaceAll('_', ' ');

export default function ProfileTrust() {
  const { activeProfile } = useAuth();
  const [trust, setTrust] = useState<Group07Trust | null>(null);
  const [appeals, setAppeals] = useState<Group07ProfileTrustAppeal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [outcomeUrl, setOutcomeUrl] = useState('');

  const load = async (after?: string | null) => {
    setLoading(true); setError('');
    try {
      const [current, history] = await Promise.all([group07Service.trustProfile(), group07Service.trustAppeals(after)]);
      setTrust(current.trust);
      setAppeals((old) => after ? [...old, ...history.appeals] : history.appeals);
      setNextCursor(history.nextCursor);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Profile trust is unavailable.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    setTrust(null); setAppeals([]); setNextCursor(null); setOutcomeUrl(''); void load();
    // Every profile has an independent trust record and appeal history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]);
  useEffect(() => () => { if (outcomeUrl) URL.revokeObjectURL(outcomeUrl); }, [outcomeUrl]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim() || !trust?.evidenceFingerprint || submitting) return;
    setSubmitting(true);
    try {
      await group07Service.createTrustAppeal({ expectedEvidenceFingerprint: trust.evidenceFingerprint, reason: reason.trim() });
      setReason(''); toast.success('Trust review request submitted.'); await load();
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to submit this trust review request. Refresh and review the current score.'); }
    finally { setSubmitting(false); }
  };

  const openOutcome = async (appeal: Group07ProfileTrustAppeal) => {
    if (!appeal.outcomeDocument || appeal.outcomeDocument.state !== 'issued' || !appeal.outcomeDocument.contentPath) return;
    try {
      const file = await documentManagerService.getContent(appeal.outcomeDocument.id);
      if (outcomeUrl) URL.revokeObjectURL(outcomeUrl);
      setOutcomeUrl(URL.createObjectURL(file));
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The issued outcome document is unavailable.'); }
  };

  return <PublicLayout><main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Profile settings</p><h1 className="mt-2 text-3xl font-black">Profile Trust</h1><p className="mt-2 text-secondary">Trust reflects current, source-backed platform activity. It is separate from identity verification.</p></header>
    <section className="rounded-2xl border bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Selected profile</p><h2 className="mt-1 text-xl font-black">{activeProfile?.name ?? 'No profile selected'}</h2></div><button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border px-4 py-2 font-bold">Refresh</button></div>
      {loading ? <p role="status" className="mt-4">Loading profile trust…</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3">{error}<button className="ml-2 font-bold underline" onClick={() => void load()}>Retry</button></p> : null}
      {trust?.state === 'unavailable' ? <div role="status" className="mt-4 rounded-xl bg-amber-50 p-4"><h3 className="font-bold">Trust score is unavailable</h3><p className="mt-1 text-sm">The approved scoring policy or required source data is unavailable. Verification does not create a trust tier.</p></div> : null}
      {trust?.state === 'new' ? <div role="status" className="mt-4 rounded-xl bg-surface-container-low p-4"><h3 className="font-bold">New to REALTIQ — building history</h3><p className="mt-1 text-sm">There is not enough current source-backed activity to establish a trust score yet.</p></div> : null}
      {trust?.state === 'established' ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-surface-container-low p-4"><p className="text-sm text-secondary">Trust tier</p><p className="mt-1 text-2xl font-black capitalize">{trust.tier ?? 'Unavailable'}</p></div><div className="rounded-xl bg-surface-container-low p-4"><p className="text-sm text-secondary">Trust score</p><p className="mt-1 text-2xl font-black">{trust.score ?? 'Unavailable'}</p></div><div className="rounded-xl bg-surface-container-low p-4"><p className="text-sm text-secondary">Review status</p><p className="mt-1 font-bold">{trust.adjustment ? `Staff reviewed · ${new Date(trust.adjustment.reviewAt).toLocaleDateString('en-GB')}` : 'Current evidence'}</p></div></div> : null}
      {trust?.components ? <dl className="mt-5 grid gap-2 sm:grid-cols-2">{Object.entries(trust.components).map(([name, component]) => <div key={name} className="flex items-center justify-between rounded-lg border p-3"><dt className="capitalize">{humanize(name)}</dt><dd className="text-sm font-bold">{component.score ?? 'Not available'}{component.count == null ? '' : ` · ${component.count} source records`}</dd></div>)}</dl> : null}
      {trust?.unavailableSignals?.length ? <p className="mt-3 text-sm text-secondary">Unavailable signals: {trust.unavailableSignals.map(humanize).join(', ')}.</p> : null}
    </section>
    {trust?.state === 'established' && trust.evidenceFingerprint ? <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl border bg-white p-5 sm:p-7"><h2 className="text-xl font-black">Request a trust review</h2><p className="text-sm text-secondary">Explain which current trust information you believe needs review. The fingerprint is sent securely to confirm the evidence version; it is not shown here.</p><label htmlFor="profile-trust-reason" className="block text-sm font-bold">Reason<textarea id="profile-trust-reason" required value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-1 block w-full rounded-lg border p-3" /></label><button disabled={submitting || !reason.trim()} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">{submitting ? 'Sending…' : 'Submit review request'}</button></form> : null}
    <section className="rounded-2xl border bg-white p-5 sm:p-7"><h2 className="text-xl font-black">Review history</h2><div className="mt-4 space-y-3">{appeals.map((appeal) => <article key={appeal.id} className="rounded-xl bg-surface-container-low p-4"><div className="flex flex-wrap justify-between gap-2"><strong>Trust review · {humanize(appeal.state)}</strong><span className="text-sm text-secondary">{new Date(appeal.createdAt).toLocaleDateString('en-GB')}</span></div><p className="mt-2 text-sm">{appeal.reason}</p>{appeal.decisionReason ? <p className="mt-2 text-sm">Review outcome: {appeal.decisionReason}</p> : null}{appeal.decidedAt ? <p className="mt-1 text-xs text-secondary">Reviewed {new Date(appeal.decidedAt).toLocaleDateString('en-GB')}{appeal.expiresAt ? ` · current until ${new Date(appeal.expiresAt).toLocaleDateString('en-GB')}` : ''}</p> : null}{appeal.outcomeDocument ? <div className="mt-3">{appeal.outcomeDocument.state === 'issued' && appeal.outcomeDocument.contentPath ? <button type="button" onClick={() => void openOutcome(appeal)} className="font-bold text-primary underline">Open issued outcome document</button> : <p className="text-sm text-secondary">Outcome document: {humanize(appeal.outcomeDocument.state)}. It is available only after secure issuance.</p>}</div> : null}</article>)}{!appeals.length && !loading ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No profile trust review requests have been submitted for this profile.</p> : null}</div>{nextCursor ? <button type="button" onClick={() => void load(nextCursor)} disabled={loading} className="mt-4 rounded-lg border px-4 py-2 font-bold">Load older reviews</button> : null}</section>
    {outcomeUrl ? <div role="dialog" aria-modal="true" aria-label="Trust review outcome document" className="fixed inset-0 z-[1000] grid place-items-center bg-black/70 p-4" onClick={() => { URL.revokeObjectURL(outcomeUrl); setOutcomeUrl(''); }}><div className="h-[90vh] w-full max-w-5xl rounded-2xl bg-white p-3" onClick={(event) => event.stopPropagation()}><div className="mb-2 flex justify-between"><h2 className="font-bold">Issued trust review outcome</h2><button onClick={() => { URL.revokeObjectURL(outcomeUrl); setOutcomeUrl(''); }} className="font-bold underline">Close</button></div><iframe title="Issued trust review outcome" src={outcomeUrl} className="h-[calc(100%-2rem)] w-full rounded-lg" /></div></div> : null}
  </main></PublicLayout>;
}
