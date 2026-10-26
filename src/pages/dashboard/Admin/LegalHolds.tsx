import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { legalHoldService, type LegalHold, type LegalHoldCategory, type LegalHoldCreateInput, type LegalHoldReasonCode, type LegalHoldReleaseReason, type LegalHoldSubjectKind } from '../../../services/legalHoldService';

const subjectKinds: LegalHoldSubjectKind[] = ['account', 'profile', 'financial_transaction', 'escrow', 'dispute', 'investigation', 'property', 'ownership', 'title_document', 'kyc_evidence', 'regulatory_record', 'litigation_record'];
const reasonCodes: LegalHoldReasonCode[] = ['regulatory_preservation', 'litigation_preservation', 'investigation', 'dispute', 'ownership_claim', 'identity_review', 'financial_review', 'other_authorized_basis'];
const releaseReasons: LegalHoldReleaseReason[] = ['resolved', 'authority_withdrawn', 'superseded', 'court_or_regulator_release'];
const categoryForSubject = (subject: LegalHoldSubjectKind): LegalHoldCategory => {
  if (subject === 'account' || subject === 'profile') return 'account_profile';
  if (subject === 'financial_transaction' || subject === 'escrow') return 'financial_transaction_escrow';
  if (subject === 'dispute' || subject === 'investigation') return 'dispute_investigation';
  if (subject === 'property' || subject === 'ownership' || subject === 'title_document') return 'property_ownership_title';
  if (subject === 'kyc_evidence') return 'kyc_identity_evidence';
  return 'regulatory_litigation';
};
const localToIso = (value: string) => value ? new Date(value).toISOString() : undefined;

const LegalHolds = () => {
  const [holds, setHolds] = useState<LegalHold[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<'active' | 'released' | ''>('active');
  const [subjectKind, setSubjectKind] = useState<LegalHoldSubjectKind | ''>('');
  const [selected, setSelected] = useState<LegalHold | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [reasonCode, setReasonCode] = useState<LegalHoldReasonCode>('regulatory_preservation');
  const [expiresAt, setExpiresAt] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [releaseReason, setReleaseReason] = useState<LegalHoldReleaseReason>('resolved');
  const createStepUp = useBoundStepUp<LegalHold>();
  const releaseStepUp = useBoundStepUp<LegalHold>();

  const load = useCallback(async (before?: string) => {
    setLoading(true); setError('');
    try {
      const result = await legalHoldService.list({ limit: 50, ...(state ? { state } : {}), ...(subjectKind ? { subjectKind } : {}), ...(before ? { before } : {}) });
      setHolds((current) => before ? [...current, ...result.holds] : result.holds);
      setCursor(result.nextCursor);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load legal holds.'); }
    finally { setLoading(false); }
  }, [state, subjectKind]);

  useEffect(() => { void load(); }, [load]);
  const selectedCategory = useMemo(() => categoryForSubject(subjectKind || 'profile'), [subjectKind]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!subjectId.trim() || submitting || createStepUp.busy || createStepUp.challenge) return;
    const body: LegalHoldCreateInput = {
      subjectKind: subjectKind || 'profile',
      subjectId: subjectId.trim(),
      category: selectedCategory,
      reasonCode,
      operationKey: `legal_hold_${crypto.randomUUID()}`,
      ...(expiresAt ? { expiresAt: localToIso(expiresAt) } : {}),
      ...(reviewAt ? { reviewAt: localToIso(reviewAt) } : {}),
    };
    await createStepUp.begin({
      method: 'POST', path: '/api/admin/legal-holds', body,
      label: 'Create a record-scoped legal hold',
      execute: (challengeId, exactBody) => legalHoldService.create(exactBody, challengeId),
    });
  };

  const finishCreate = async (code: string) => {
    setSubmitting(true);
    try {
      const result = await createStepUp.complete(code);
      if (!result.ok) { setError(result.error ?? 'Legal hold creation failed. Refresh the list before trying again.'); return false; }
      setSelected(result.value); setSubjectId(''); setExpiresAt(''); setReviewAt('');
      await load();
      return true;
    } finally { setSubmitting(false); }
  };

  const beginRelease = async () => {
    if (!selected || selected.state !== 'active') return;
    const body = { expectedVersion: selected.version, reasonCode: releaseReason };
    await releaseStepUp.begin({
      method: 'POST', path: `/api/admin/legal-holds/${encodeURIComponent(selected.id)}/release`, body,
      label: `Release legal hold ${selected.id}`,
      execute: (challengeId, exactBody) => legalHoldService.release(selected.id, exactBody, challengeId),
    });
  };

  const finishRelease = async (code: string) => {
    const result = await releaseStepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'Legal hold release failed. Refresh the current record.'); return false; }
    setSelected(result.value);
    await load();
    return true;
  };

  return <AdminLayout><main className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Compliance and data protection</p><h1 className="mt-2 text-3xl font-extrabold text-primary">Legal holds</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Holds apply only to the selected record and block eligible deletion work. They do not grant access to protected records. Release requires an independent authorized reviewer.</p></header>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    <section className="rounded-2xl border border-outline-variant/10 bg-white p-5">
      <h2 className="text-lg font-bold">Create record-scoped hold</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => void create(event)}>
        <label className="text-xs font-bold">Subject kind<select value={subjectKind} onChange={(event) => setSubjectKind(event.target.value as LegalHoldSubjectKind | '')} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{[['', 'Profile'], ...subjectKinds.map((kind) => [kind, kind.replaceAll('_', ' ')])].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs font-bold">Subject ID<input required value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
        <label className="text-xs font-bold">Category<input readOnly value={selectedCategory} className="mt-1 w-full rounded-lg border bg-surface-container-low p-2 text-sm font-normal" /></label>
        <label className="text-xs font-bold">Reason code<select value={reasonCode} onChange={(event) => setReasonCode(event.target.value as LegalHoldReasonCode)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{reasonCodes.map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-xs font-bold">Review at (optional)<input type="datetime-local" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
        <label className="text-xs font-bold">Expires at (optional)<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
        <div className="md:col-span-2"><Button type="submit" disabled={!subjectId.trim() || submitting || createStepUp.busy || Boolean(createStepUp.challenge)}>Prepare hold with authenticator</Button>{createStepUp.error ? <p role="alert" className="mt-2 text-sm text-error">{createStepUp.error}</p> : null}</div>
      </form>
    </section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5"><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-bold">State<select value={state} onChange={(event) => setState(event.target.value as 'active' | 'released' | '')} className="mt-1 rounded-lg border p-2 text-sm font-normal"><option value="active">Active</option><option value="released">Released</option><option value="">All</option></select></label><label className="text-xs font-bold">Subject kind<select value={subjectKind} onChange={(event) => setSubjectKind(event.target.value as LegalHoldSubjectKind | '')} className="mt-1 rounded-lg border p-2 text-sm font-normal"><option value="">All subjects</option>{subjectKinds.map((kind) => <option key={kind} value={kind}>{kind.replaceAll('_', ' ')}</option>)}</select></label><Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>Refresh</Button></div>
        {loading ? <LoadingState label="Loading legal holds…" /> : null}
        <div className="mt-4 space-y-2">{holds.map((hold) => <button type="button" key={hold.id} onClick={() => void legalHoldService.get(hold.id).then(setSelected).catch((raw: unknown) => setError(raw instanceof Error ? raw.message : 'Unable to load this hold.'))} className={`w-full rounded-lg border p-3 text-left ${selected?.id === hold.id ? 'border-primary bg-primary/5' : 'border-outline-variant/20'}`}><span className="flex justify-between gap-2"><strong>{hold.subjectKind.replaceAll('_', ' ')} · {hold.subjectId}</strong><span className="text-xs uppercase">{hold.state}</span></span><span className="mt-1 block text-xs text-secondary">{hold.category} · {hold.reasonCode} · v{hold.version} · {new Date(hold.createdAt).toLocaleString()}</span></button>)}{!loading && !holds.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No legal holds match these filters.</p> : null}</div>
        {cursor ? <Button type="button" variant="secondary" className="mt-4" disabled={loading} onClick={() => void load(cursor)}>Load more</Button> : null}
      </div>
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">{selected ? <><h2 className="text-lg font-bold">Hold detail</h2><dl className="mt-3 space-y-2 text-sm">{Object.entries({ id: selected.id, subjectKind: selected.subjectKind, subjectId: selected.subjectId, category: selected.category, reasonCode: selected.reasonCode, state: selected.state, issuer: selected.issuer, version: selected.version, createdAt: selected.createdAt, reviewAt: selected.reviewAt ?? 'Not set', expiresAt: selected.expiresAt ?? 'Not set', releaseReasonCode: selected.releaseReasonCode ?? 'Not released', releasedAt: selected.releasedAt ?? 'Not released' }).map(([key, value]) => <div key={key} className="flex justify-between gap-4 border-b pb-2"><dt className="text-secondary">{key}</dt><dd className="break-all text-right font-semibold">{value}</dd></div>)}</dl>{selected.state === 'active' ? <div className="mt-4"><label className="text-xs font-bold">Release reason<select value={releaseReason} onChange={(event) => setReleaseReason(event.target.value as LegalHoldReleaseReason)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{releaseReasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}</select></label><p className="mt-2 text-xs text-secondary">The issuer cannot release their own hold. The server enforces independent Compliance authorization.</p><Button type="button" className="mt-3" disabled={releaseStepUp.busy || Boolean(releaseStepUp.challenge)} onClick={() => void beginRelease()}>Release with authenticator</Button>{releaseStepUp.error ? <p role="alert" className="mt-2 text-sm text-error">{releaseStepUp.error}</p> : null}</div> : null}</> : <p className="text-sm text-secondary">Select a hold to review its authoritative state.</p>}</div>
    </section>
    <StepUpDialog challenge={createStepUp.challenge} busy={submitting || createStepUp.busy} error={createStepUp.error} onCancel={createStepUp.cancel} onSubmit={finishCreate} />
    <StepUpDialog challenge={releaseStepUp.challenge} busy={releaseStepUp.busy} error={releaseStepUp.error} onCancel={releaseStepUp.cancel} onSubmit={finishRelease} />
  </main></AdminLayout>;
};

export default LegalHolds;
