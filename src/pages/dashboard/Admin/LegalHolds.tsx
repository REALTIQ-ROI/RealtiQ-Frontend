import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiRequestError } from '../../../lib/axios';
import {
  legalHoldService,
  type LegalHold,
  type LegalHoldCategory,
  type LegalHoldCategoryOption,
  type LegalHoldCreateInput,
  type LegalHoldReasonCode,
  type LegalHoldReleaseReason,
  type LegalHoldSubject,
  type LegalHoldSubjectKind,
} from '../../../services/legalHoldService';

const reasonCodes: LegalHoldReasonCode[] = ['regulatory_preservation', 'litigation_preservation', 'investigation', 'dispute', 'ownership_claim', 'identity_review', 'financial_review', 'other_authorized_basis'];
const releaseReasons: LegalHoldReleaseReason[] = ['resolved', 'authority_withdrawn', 'superseded', 'court_or_regulator_release'];
const localToIso = (value: string) => value ? new Date(value).toISOString() : undefined;
const lookupErrorMessage = (raw: unknown) => {
  if (raw instanceof ApiRequestError) {
    if (raw.status === 401) return 'Your session expired. Sign in again to continue.';
    if (raw.status === 403) return 'Access denied. The current staff profile needs compliance_data_protection authority to use legal holds.';
    if (raw.code === 'INPUT_LEGAL_HOLD_SUBJECT_QUERY_INVALID') return 'The category, subject kind, or search query is invalid. Review the selected options and try again.';
    return raw.message;
  }
  return raw instanceof Error ? raw.message : 'Unable to load legal-hold subjects.';
};

const LegalHolds = () => {
  const { activeProfile } = useAuth();
  const activeProfileId = activeProfile?.id ?? null;
  const [holds, setHolds] = useState<LegalHold[]>([]);
  const [holdCursor, setHoldCursor] = useState<string | null>(null);
  const [state, setState] = useState<'active' | 'released' | ''>('active');
  const [holdSubjectKind, setHoldSubjectKind] = useState<LegalHoldSubjectKind | ''>('');
  const [selectedHold, setSelectedHold] = useState<LegalHold | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<LegalHoldCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesRetry, setCategoriesRetry] = useState(0);
  const [category, setCategory] = useState<LegalHoldCategory | ''>('');
  const [subjectKind, setSubjectKind] = useState<LegalHoldSubjectKind | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subjects, setSubjects] = useState<LegalHoldSubject[]>([]);
  const [subjectCursor, setSubjectCursor] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<LegalHoldSubject | null>(null);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsLoadingMore, setSubjectsLoadingMore] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [subjectsRetry, setSubjectsRetry] = useState(0);
  const lookupRequestId = useRef(0);
  const lookupAbort = useRef<AbortController | null>(null);
  const categoriesAbort = useRef<AbortController | null>(null);
  const paginationBusy = useRef(false);

  const [reasonCode, setReasonCode] = useState<LegalHoldReasonCode>('regulatory_preservation');
  const [expiresAt, setExpiresAt] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [releaseReason, setReleaseReason] = useState<LegalHoldReleaseReason>('resolved');
  const createStepUp = useBoundStepUp<LegalHold>();
  const releaseStepUp = useBoundStepUp<LegalHold>();

  const selectedCategory = useMemo(
    () => categories.find((option) => option.category === category),
    [categories, category],
  );
  const availableKinds = selectedCategory?.subjectKinds ?? [];
  const allKinds = useMemo(() => {
    const byKind = new Map<LegalHoldSubjectKind, { subjectKind: LegalHoldSubjectKind; label: string }>();
    categories.forEach((item) => item.subjectKinds.forEach((option) => byKind.set(option.subjectKind, option)));
    return [...byKind.values()];
  }, [categories]);

  const invalidateSubjectLookup = () => {
    lookupRequestId.current += 1;
    lookupAbort.current?.abort();
    lookupAbort.current = null;
    paginationBusy.current = false;
  };

  const loadCategories = useCallback(async () => {
    categoriesAbort.current?.abort();
    const controller = new AbortController();
    categoriesAbort.current = controller;
    const profileId = activeProfileId;
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const result = await legalHoldService.lookupSubjects({}, controller.signal);
      if (!controller.signal.aborted && profileId === activeProfile?.id) setCategories(result.categories);
    } catch (raw) {
      if (!controller.signal.aborted && profileId === activeProfile?.id) setCategoriesError(lookupErrorMessage(raw));
    } finally {
      if (!controller.signal.aborted && profileId === activeProfile?.id) setCategoriesLoading(false);
    }
  }, [activeProfile?.id, activeProfileId]);

  useEffect(() => {
    void loadCategories();
    return () => categoriesAbort.current?.abort();
  }, [loadCategories, categoriesRetry]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (before?: string) => {
    setLoading(true); setError('');
    try {
      const result = await legalHoldService.list({ limit: 50, ...(state ? { state } : {}), ...(holdSubjectKind ? { subjectKind: holdSubjectKind } : {}), ...(before ? { before } : {}) });
      setHolds((current) => before ? [...current, ...result.holds] : result.holds);
      setHoldCursor(result.nextCursor);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load legal holds.'); }
    finally { setLoading(false); }
  }, [state, holdSubjectKind]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!category || !subjectKind || categoriesLoading) {
      setSubjects([]);
      setSubjectCursor(null);
      setSubjectsLoading(false);
      setSubjectsLoadingMore(false);
      setSubjectsError(null);
      return;
    }

    const controller = new AbortController();
    lookupAbort.current?.abort();
    lookupAbort.current = controller;
    const requestId = ++lookupRequestId.current;
    setSubjects([]);
    setSubjectCursor(null);
    setSubjectsLoading(true);
    setSubjectsLoadingMore(false);
    setSubjectsError(null);

    void legalHoldService.lookupSubjects({
      category,
      subjectKind,
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      limit: 25,
    }, controller.signal).then((result) => {
      if (controller.signal.aborted || requestId !== lookupRequestId.current || activeProfileId !== activeProfile?.id) return;
      setSubjects(result.subjects);
      setSubjectCursor(result.nextCursor);
      setSelectedSubject((current) => current && !result.subjects.some((item) => item.subjectId === current.subjectId && item.subjectKind === current.subjectKind) ? null : current);
    }).catch((raw: unknown) => {
      if (controller.signal.aborted || requestId !== lookupRequestId.current || activeProfileId !== activeProfile?.id) return;
      setSubjectsError(lookupErrorMessage(raw));
    }).finally(() => {
      if (controller.signal.aborted || requestId !== lookupRequestId.current || activeProfileId !== activeProfile?.id) return;
      setSubjectsLoading(false);
    });

    return () => controller.abort();
  }, [category, subjectKind, debouncedSearch, categoriesLoading, subjectsRetry, activeProfile?.id, activeProfileId]);

  const changeCategory = (value: LegalHoldCategory | '') => {
    invalidateSubjectLookup();
    setCategory(value);
    setSubjectKind('');
    setSearch('');
    setDebouncedSearch('');
    setSubjects([]);
    setSubjectCursor(null);
    setSelectedSubject(null);
    setSubjectsError(null);
  };

  const changeSubjectKind = (value: LegalHoldSubjectKind | '') => {
    invalidateSubjectLookup();
    setSubjectKind(value);
    setSearch('');
    setDebouncedSearch('');
    setSubjects([]);
    setSubjectCursor(null);
    setSelectedSubject(null);
    setSubjectsError(null);
  };

  const changeSearch = (value: string) => {
    invalidateSubjectLookup();
    setSearch(value.slice(0, 100));
    setSubjects([]);
    setSubjectCursor(null);
    setSelectedSubject(null);
    setSubjectsError(null);
  };

  const loadMoreSubjects = async () => {
    if (!category || !subjectKind || !subjectCursor || subjectsLoading || paginationBusy.current) return;
    paginationBusy.current = true;
    const requestId = lookupRequestId.current;
    const controller = new AbortController();
    lookupAbort.current?.abort();
    lookupAbort.current = controller;
    setSubjectsLoadingMore(true);
    setSubjectsError(null);
    try {
      const result = await legalHoldService.lookupSubjects({
        category,
        subjectKind,
        ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
        limit: 25,
        after: subjectCursor,
      }, controller.signal);
      if (controller.signal.aborted || requestId !== lookupRequestId.current || activeProfileId !== activeProfile?.id) return;
      setSubjects((current) => {
        const merged = new Map(current.map((item) => [`${item.subjectKind}:${item.subjectId}`, item]));
        result.subjects.forEach((item) => {
          const key = `${item.subjectKind}:${item.subjectId}`;
          if (!merged.has(key)) merged.set(key, item);
        });
        return [...merged.values()];
      });
      setSubjectCursor(result.nextCursor);
    } catch (raw) {
      if (!controller.signal.aborted && requestId === lookupRequestId.current && activeProfileId === activeProfile?.id) setSubjectsError(lookupErrorMessage(raw));
    } finally {
      if (requestId === lookupRequestId.current && activeProfileId === activeProfile?.id) setSubjectsLoadingMore(false);
      paginationBusy.current = false;
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSubject || submitting || createStepUp.busy || createStepUp.challenge || subjectsLoading || subjectsLoadingMore || search.trim() !== debouncedSearch) return;
    const body: LegalHoldCreateInput = {
      subjectKind: selectedSubject.subjectKind,
      subjectId: selectedSubject.subjectId,
      category: selectedSubject.category,
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
      setSelectedHold(result.value);
      setSelectedSubject(null);
      setExpiresAt('');
      setReviewAt('');
      await load();
      return true;
    } finally { setSubmitting(false); }
  };

  const beginRelease = async () => {
    if (!selectedHold || selectedHold.state !== 'active') return;
    const body = { expectedVersion: selectedHold.version, reasonCode: releaseReason };
    await releaseStepUp.begin({
      method: 'POST', path: `/api/admin/legal-holds/${encodeURIComponent(selectedHold.id)}/release`, body,
      label: `Release legal hold ${selectedHold.id}`,
      execute: (challengeId, exactBody) => legalHoldService.release(selectedHold.id, exactBody, challengeId),
    });
  };

  const finishRelease = async (code: string) => {
    const result = await releaseStepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'Legal hold release failed. Refresh the current record.'); return false; }
    setSelectedHold(result.value);
    await load();
    return true;
  };

  const searchPending = search !== debouncedSearch;
  const lookupReady = Boolean(category && subjectKind && selectedSubject && !subjectsLoading && !subjectsLoadingMore && !searchPending);

  return <AdminLayout><main className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Compliance and data protection</p><h1 className="mt-2 text-3xl font-extrabold text-primary">Legal holds</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Holds apply only to the selected record and block eligible deletion work. They do not grant access to protected records. Release requires an independent authorized reviewer.</p></header>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    <section className="rounded-2xl border border-outline-variant/10 bg-white p-5">
      <h2 className="text-lg font-bold">Create record-scoped hold</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => void create(event)}>
        <label className="text-xs font-bold">Category<select value={category} onChange={(event) => changeCategory(event.target.value as LegalHoldCategory | '')} disabled={categoriesLoading || Boolean(categoriesError)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="">Select a category</option>{categories.map((option) => <option key={option.category} value={option.category}>{option.label}</option>)}</select></label>
        <label className="text-xs font-bold">Subject kind<select value={subjectKind} onChange={(event) => changeSubjectKind(event.target.value as LegalHoldSubjectKind | '')} disabled={!category || categoriesLoading} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="">Select a subject kind</option>{availableKinds.map((option) => <option key={option.subjectKind} value={option.subjectKind}>{option.label}</option>)}</select></label>
        <div className="md:col-span-2 space-y-2">
          {categoriesLoading ? <LoadingState label="Loading legal-hold categories…" /> : categoriesError ? <ErrorState message={categoriesError} onRetry={() => setCategoriesRetry((value) => value + 1)} /> : null}
          {!categoriesLoading && !categoriesError && !category ? <p className="text-sm text-secondary">Select a category to continue.</p> : null}
          {category && !subjectKind ? <p className="text-sm text-secondary">Select a subject kind in this category.</p> : null}
          {category && subjectKind ? <>
            <label className="block text-xs font-bold">Search subjects<input value={search} onChange={(event) => changeSearch(event.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" placeholder="Search by subject name" /></label>
            <label className="block text-xs font-bold">Subject<select value={selectedSubject?.subjectId ?? ''} onChange={(event) => setSelectedSubject(subjects.find((item) => item.subjectId === event.target.value && item.subjectKind === subjectKind) ?? null)} disabled={subjectsLoading || searchPending} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="">Select a subject</option>{subjects.map((item) => <option key={`${item.subjectKind}:${item.subjectId}`} value={item.subjectId}>{item.title}{item.subtitle ? ` · ${item.subtitle}` : ''}</option>)}</select></label>
            {subjectsLoading ? <LoadingState label="Searching subjects…" /> : null}
            {searchPending && !subjectsLoading ? <p className="text-sm text-secondary">Waiting to search…</p> : null}
            {subjectsError ? <ErrorState message={subjectsError} onRetry={() => setSubjectsRetry((value) => value + 1)} /> : null}
            {!subjectsLoading && !searchPending && !subjectsError && !subjects.length ? <p className="rounded-lg border border-dashed p-3 text-sm text-secondary">No selectable subjects of this kind are currently available.</p> : null}
            {subjectCursor && !subjectsError ? <Button type="button" variant="secondary" disabled={subjectsLoading || subjectsLoadingMore} loading={subjectsLoadingMore} loadingLabel="Loading more…" onClick={() => void loadMoreSubjects()}>Load more subjects</Button> : null}
          </> : null}
        </div>
        <label className="text-xs font-bold">Category selected for hold<input readOnly value={selectedCategory?.label ?? ''} className="mt-1 w-full rounded-lg border bg-surface-container-low p-2 text-sm font-normal" /></label>
        <label className="text-xs font-bold">Reason code<select value={reasonCode} onChange={(event) => setReasonCode(event.target.value as LegalHoldReasonCode)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{reasonCodes.map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-xs font-bold">Review at (optional)<input type="datetime-local" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
        <label className="text-xs font-bold">Expires at (optional)<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
        <div className="md:col-span-2"><Button type="submit" disabled={!lookupReady || submitting || createStepUp.busy || Boolean(createStepUp.challenge)}>Prepare hold with authenticator</Button>{createStepUp.error ? <p role="alert" className="mt-2 text-sm text-error">{createStepUp.error}</p> : null}</div>
      </form>
    </section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5"><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-bold">State<select value={state} onChange={(event) => setState(event.target.value as 'active' | 'released' | '')} className="mt-1 rounded-lg border p-2 text-sm font-normal"><option value="active">Active</option><option value="released">Released</option><option value="">All</option></select></label><label className="text-xs font-bold">Subject kind<select value={holdSubjectKind} onChange={(event) => setHoldSubjectKind(event.target.value as LegalHoldSubjectKind | '')} className="mt-1 rounded-lg border p-2 text-sm font-normal"><option value="">All subjects</option>{allKinds.map((kind) => <option key={kind.subjectKind} value={kind.subjectKind}>{kind.label}</option>)}</select></label><Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>Refresh</Button></div>
        {loading ? <LoadingState label="Loading legal holds…" /> : null}
        <div className="mt-4 space-y-2">{holds.map((hold) => <button type="button" key={hold.id} onClick={() => void legalHoldService.get(hold.id).then(setSelectedHold).catch((raw: unknown) => setError(raw instanceof Error ? raw.message : 'Unable to load this hold.'))} className={`w-full rounded-lg border p-3 text-left ${selectedHold?.id === hold.id ? 'border-primary bg-primary/5' : 'border-outline-variant/20'}`}><span className="flex justify-between gap-2"><strong>{hold.subjectKind.replaceAll('_', ' ')} · {hold.subjectId}</strong><span className="text-xs uppercase">{hold.state}</span></span><span className="mt-1 block text-xs text-secondary">{hold.category} · {hold.reasonCode} · v{hold.version} · {new Date(hold.createdAt).toLocaleString()}</span></button>)}{!loading && !holds.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No legal holds match these filters.</p> : null}</div>
        {holdCursor ? <Button type="button" variant="secondary" className="mt-4" disabled={loading} onClick={() => void load(holdCursor)}>Load more</Button> : null}
      </div>
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">{selectedHold ? <><h2 className="text-lg font-bold">Hold detail</h2><dl className="mt-3 space-y-2 text-sm">{Object.entries({ id: selectedHold.id, subjectKind: selectedHold.subjectKind, subjectId: selectedHold.subjectId, category: selectedHold.category, reasonCode: selectedHold.reasonCode, state: selectedHold.state, issuer: selectedHold.issuer, version: selectedHold.version, createdAt: selectedHold.createdAt, reviewAt: selectedHold.reviewAt ?? 'Not set', expiresAt: selectedHold.expiresAt ?? 'Not set', releaseReasonCode: selectedHold.releaseReasonCode ?? 'Not released', releasedAt: selectedHold.releasedAt ?? 'Not released' }).map(([key, value]) => <div key={key} className="flex justify-between gap-4 border-b pb-2"><dt className="text-secondary">{key}</dt><dd className="break-all text-right font-semibold">{value}</dd></div>)}</dl>{selectedHold.state === 'active' ? <div className="mt-4"><label className="text-xs font-bold">Release reason<select value={releaseReason} onChange={(event) => setReleaseReason(event.target.value as LegalHoldReleaseReason)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal">{releaseReasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}</select></label><p className="mt-2 text-xs text-secondary">The issuer cannot release their own hold. The server enforces independent Compliance authorization.</p><Button type="button" className="mt-3" disabled={releaseStepUp.busy || Boolean(releaseStepUp.challenge)} onClick={() => void beginRelease()}>Release with authenticator</Button>{releaseStepUp.error ? <p role="alert" className="mt-2 text-sm text-error">{releaseStepUp.error}</p> : null}</div> : null}</> : <p className="text-sm text-secondary">Select a hold to review its authoritative state.</p>}</div>
    </section>
    <StepUpDialog challenge={createStepUp.challenge} busy={submitting || createStepUp.busy} error={createStepUp.error} onCancel={createStepUp.cancel} onSubmit={finishCreate} />
    <StepUpDialog challenge={releaseStepUp.challenge} busy={releaseStepUp.busy} error={releaseStepUp.error} onCancel={releaseStepUp.cancel} onSubmit={finishRelease} />
  </main></AdminLayout>;
};

export default LegalHolds;
