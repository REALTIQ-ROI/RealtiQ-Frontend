import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import AuthorizedFilePreview from '../../../components/verification/AuthorizedFilePreview';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { verificationCaseService, type VerificationCaseCheck, type VerificationCaseDecision, type VerificationCaseDetail, type VerificationCaseHistoryPage, type VerificationCasePage } from '../../../services/verificationCaseService';
import { buildVerificationDecisionCheck, isEvidenceDecisionCheck, isScumlDecisionCheck, verificationSourcesForCheck } from '../../../services/verificationDecisionForm';

const states = ['submitted', 'under_review', 'approved', 'rejected', 'withdrawn', 'superseded', 'expired'];
type DataRecord = Record<string, unknown>;
type CaseEvidence = { id: string; purpose: string };

const asRecord = (value: unknown): DataRecord | null => value !== null && typeof value === 'object' && !Array.isArray(value)
  ? value as DataRecord
  : null;

const asText = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

const humanize = (value: string): string => value
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[._-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^\w/, (letter) => letter.toUpperCase());

const humanizeCheck = (field: string): string => {
  const normalized = field.replace(/^applicant\./, '').replace(/^evidence\./, '');
  const exact: Record<string, string> = {
    countryOfResidence: 'Submitted country of residence',
    'applicant.identity_route': 'Identity verification route',
    'applicant.country_of_residence': 'Applicant profile country of residence',
  };
  if (exact[field]) return exact[field];
  const known: Record<string, string> = {
    countryOfResidence: 'Submitted country of residence',
    country_of_residence: 'Country of residence',
    identity_route: 'Identity verification route',
    scuml: 'SCUML certificate and applicability',
  };
  return known[normalized] ?? humanize(normalized);
};

const snapshotEntries = (value: unknown, parent = '', depth = 0): Array<[string, string]> => {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const formatted = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value).trim();
    return parent && formatted ? [[parent, formatted]] : [];
  }
  if (Array.isArray(value)) {
    const primitiveValues = value.filter((item) => ['string', 'number', 'boolean'].includes(typeof item)).map((item) => String(item));
    if (primitiveValues.length === value.length && parent) return primitiveValues.length ? [[parent, primitiveValues.join(', ')]] : [];
    return value.slice(0, 20).flatMap((item, index) => snapshotEntries(item, parent ? `${parent} ${index + 1}` : `Item ${index + 1}`, depth + 1));
  }
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record).slice(0, 30).flatMap(([key, item]) => snapshotEntries(item, parent ? `${parent}.${key}` : key, depth + 1));
};

const readableDate = (value: string | null | undefined): string => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not provided' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const evidencePurposeLabel = (purpose: string): string => {
  const labels: Record<string, string> = {
    bvn: 'Bank verification number (BVN)',
    nin: 'National identity number (NIN)',
    additional_government_id: 'Additional government ID',
    proof_of_address: 'Proof of address',
    selfie: 'Selfie',
    passport: 'Passport',
    residence_national_id: 'Residence national ID',
    overseas_address_proof: 'Overseas proof of address',
    company_registration: 'Company registration document',
    cooperative_registration: 'Cooperative registration document',
    state_registration: 'State registration document',
    purchase_resolution: 'Purchase resolution',
    scuml: 'SCUML certificate',
  };
  return labels[purpose] ?? humanize(purpose);
};

const requiredCheckField = (check: unknown): string | null => {
  if (typeof check === 'string') return check;
  if (check && typeof check === 'object' && 'field' in check && typeof check.field === 'string') return check.field;
  return null;
};

/** Extract only evidence references explicitly included in the authorized case snapshot. */
const collectCaseEvidence = (snapshot: unknown, requiredChecks: unknown[] = []): CaseEvidence[] => {
  const byId = new Map<string, CaseEvidence>();
  const visit = (value: unknown, depth = 0): void => {
    if (depth > 12 || value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    const record = value as DataRecord;
    const id = asText(record.evidenceId);
    const purpose = asText(record.purpose) ?? asText(record.documentKind);
    if (id) byId.set(id, { id, purpose: purpose ?? byId.get(id)?.purpose ?? 'private_evidence' });
    Object.values(record).forEach((item) => visit(item, depth + 1));
  };
  visit(snapshot);

  requiredChecks.forEach((check) => {
    const field = requiredCheckField(check);
    if (!field?.startsWith('evidence.')) return;
    const id = field.slice('evidence.'.length);
    if (id) byId.set(id, { id, purpose: byId.get(id)?.purpose ?? 'private_evidence' });
  });
  return [...byId.values()];
};

const formatBlocker = (value: unknown): string => {
  if (typeof value === 'string') return humanize(value);
  const record = asRecord(value);
  if (!record) return 'Resolve this server-reported requirement before approving the case.';
  const message = asText(record.message) ?? asText(record.reason);
  if (message) return message;
  const field = asText(record.field);
  const code = asText(record.code);
  if (field && code) return `${humanizeCheck(field)}: ${humanize(code)}`;
  if (field) return `${humanizeCheck(field)} needs attention.`;
  if (code) return humanize(code);
  return 'Resolve this server-reported requirement before approving the case.';
};

const ManageKyc = () => {
  const [state, setState] = useState('submitted');
  const [queue, setQueue] = useState<VerificationCasePage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VerificationCaseDetail | null>(null);
  const [history, setHistory] = useState<VerificationCaseHistoryPage | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ url: string; mimeType: string; title: string } | null>(null);
  const [reasonCode, setReasonCode] = useState<'DOCUMENT_UNREADABLE'>('DOCUMENT_UNREADABLE');
  const [checkInputs, setCheckInputs] = useState<Record<string, Partial<VerificationCaseCheck>>>({});
  const stepUp = useBoundStepUp<VerificationCaseDetail>();

  const loadQueue = useCallback(async (cursor?: string) => {
    setQueueLoading(true);
    setError(null);
    try {
      const page = await verificationCaseService.staffQueue({ limit: 25, state, ...(cursor ? { cursor } : {}) });
      setQueue((current) => cursor && current ? { ...page, cases: [...current.cases, ...page.cases] } : page);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load the Trust & Safety verification queue.');
    } finally {
      setQueueLoading(false);
    }
  }, [state]);

  const detailRequest = useRef(0);
  const loadCase = useCallback(async (id: string) => {
    const requestId = ++detailRequest.current;
    setSelectedId(id);
    setDetail(null);
    setHistory(null);
    setFilePreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setDetailLoading(true);
    setError(null);
    try {
      const [current, events] = await Promise.all([verificationCaseService.staffCase(id), verificationCaseService.staffHistory(id)]);
      if (requestId !== detailRequest.current) return;
      setDetail(current);
      setHistory(events);
      const fields = (current.requiredChecks ?? []).map(requiredCheckField).filter((field): field is string => Boolean(field));
      setCheckInputs(Object.fromEntries(fields.map((field) => [field, { field }])));
    } catch (raw) {
      if (requestId !== detailRequest.current) return;
      setError(raw instanceof Error ? raw.message : 'Unable to load this verification case.');
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }, []);
  const evidence = useMemo(() => collectCaseEvidence(detail?.snapshot, detail?.requiredChecks), [detail?.snapshot, detail?.requiredChecks]);
  const applicant = asRecord(asRecord(detail?.snapshot)?.applicant);
  const snapshotValues = asRecord(asRecord(detail?.snapshot)?.values);
  const identity = asRecord(asRecord(detail?.snapshot)?.identity);
  const people = Array.isArray(asRecord(detail?.snapshot)?.people) ? asRecord(detail?.snapshot)?.people as unknown[] : [];
  const applicantName = asText(applicant?.name) ?? 'Applicant';
  const currentStep = detail?.state === 'submitted' ? 1 : detail?.state === 'under_review' ? 2 : ['approved', 'rejected'].includes(detail?.state ?? '') ? 3 : -1;
  const applicantFields = snapshotEntries(snapshotValues);
  const fields = (detail?.requiredChecks ?? []).map(requiredCheckField).filter((field): field is string => Boolean(field));
  const documentFields = fields.filter(isEvidenceDecisionCheck);
  const applicantCheckFields = fields.filter((field) => !isEvidenceDecisionCheck(field));
  const malformedCheckList = Boolean(detail?.requiredChecks?.length && fields.length !== detail.requiredChecks.length);
  const checkLabel = (field: string): string => {
    if (!isEvidenceDecisionCheck(field)) return humanizeCheck(field);
    const evidenceId = field.slice('evidence.'.length);
    const item = evidence.find((candidate) => candidate.id === evidenceId);
    return item ? evidencePurposeLabel(item.purpose) : 'Uploaded document';
  };
  const firstIncompleteCheck = fields
    .map((field) => ({ field, ...buildVerificationDecisionCheck(field, checkInputs[field] ?? {}) }))
    .find((result) => !result.check);
  const approvalDisabledReasons = !detail ? ['Select a verification case first.'] : [
    detail.state === 'submitted' ? 'Claim this case with your authenticator first. Approval becomes available after the server confirms the case is under review.' : null,
    detail.state !== 'submitted' && detail.state !== 'under_review' ? `Approval is unavailable while this case is ${humanize(detail.state).toLowerCase()}.` : null,
    detail.approvalBlockers?.length ? 'Resolve the server-reported approval blockers above, then refresh this case.' : null,
    malformedCheckList ? 'Refresh the case because the server returned an incomplete review checklist.' : null,
    !fields.length ? 'Refresh the case because no approval checks were returned.' : null,
    firstIncompleteCheck ? (firstIncompleteCheck.error ?? `Complete ${checkLabel(firstIncompleteCheck.field)} before approving.`).replaceAll(firstIncompleteCheck.field, checkLabel(firstIncompleteCheck.field)) : null,
    stepUp.busy || stepUp.challenge ? 'Finish or cancel the current authenticator confirmation first.' : null,
  ].filter((reason): reason is string => Boolean(reason));

  useEffect(() => { void loadQueue(); }, [loadQueue]);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview.url); }, [filePreview]);

  const runProtected = async (kind: 'claim' | 'reject' | 'approve') => {
    if (!detail) return;
    const path = `/api/admin/verification-cases/${encodeURIComponent(detail.id)}/${kind === 'claim' ? 'claim' : 'decision'}`;
    let body: { expectedVersion: number } | VerificationCaseDecision;
    if (kind === 'claim') body = { expectedVersion: detail.version };
    else if (kind === 'reject') body = { expectedVersion: detail.version, decision: 'rejected', reasonCodes: [reasonCode] };
    else {
      if (!fields.length || malformedCheckList) { setError('The server did not return a complete review checklist. Refresh this case before deciding.'); return; }
      if (detail.approvalBlockers?.length) { setError('The server reports approval blockers. Resolve them and refresh this case before deciding.'); return; }
      const checks: VerificationCaseCheck[] = [];
      for (const field of fields) {
        const input = checkInputs[field] ?? {};
        const result = buildVerificationDecisionCheck(field, input);
        if (!result.check) { setError(result.error ?? `Complete the required review details for ${humanizeCheck(field)}.`); return; }
        checks.push(result.check);
      }
      body = { expectedVersion: detail.version, decision: 'approved', checks };
    }
    await stepUp.begin({
      method: 'POST', path, body,
      label: kind === 'claim' ? `Claim verification case ${detail.id}` : `${kind === 'approve' ? 'Approve' : 'Reject'} verification case ${detail.id}`,
      execute: async (challengeId, exactBody) => {
        try {
          return kind === 'claim'
            ? await verificationCaseService.claimCase(detail.id, exactBody as { expectedVersion: number }, challengeId)
            : await verificationCaseService.decideCase(detail.id, exactBody as VerificationCaseDecision, challengeId);
        } catch (raw) {
          if (raw && typeof raw === 'object' && 'status' in raw && (raw as { status?: number }).status === 409) await loadCase(detail.id);
          throw raw;
        }
      },
    });
  };

  const completeProtected = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) {
      const errorCode = stepUp.errorCode ?? result.error?.match(/\(([A-Z][A-Z0-9_]+)\)$/)?.[1];
      if (errorCode === 'REVIEW_VERIFICATION_EXPIRY_REQUIRED') {
        setError('The backend requires an expiry date for this evidence. Enter the future expiry shown on the document and retry. No non-expiring exception is currently configured.');
      } else if (errorCode === 'FEATURE_POLICY_UNCONFIGURED') {
        setError(`${result.error ?? 'A required verification policy is unconfigured.'} The decision was not confirmed; resolve the policy requirement and refresh the case before retrying.`);
      } else if (result.error) setError(result.error);
      return false;
    }
    setDetail(result.value);
    await loadQueue();
    await loadCase(result.value.id);
    return true;
  };

  const openEvidence = async (item: CaseEvidence) => {
    if (!selectedId || openingEvidenceId) return;
    const caseId = selectedId;
    const requestId = detailRequest.current;
    setOpeningEvidenceId(item.id);
    setError(null);
    try {
      const blob = await verificationCaseService.staffEvidenceContent(caseId, item.id);
      if (requestId !== detailRequest.current) return;
      const mimeType = blob.type || 'application/octet-stream';
      setFilePreview({ url: URL.createObjectURL(blob), mimeType, title: evidencePurposeLabel(item.purpose) });
    } catch (raw) {
      if (requestId !== detailRequest.current) return;
      setError(raw instanceof Error ? raw.message : 'The current staff profile cannot view this case evidence.');
    } finally {
      setOpeningEvidenceId(null);
    }
  };

  const renderCheckCard = (field: string, index: number) => {
    const evidenceId = field.startsWith('evidence.') ? field.slice('evidence.'.length) : null;
    const evidenceItem = evidence.find((item) => item.id === evidenceId);
    const input = checkInputs[field] ?? {};
    const complete = Boolean(input.source && input.reference?.trim() && (!isScumlDecisionCheck(field) || input.applicability));
    const checkTitle = checkLabel(field);

    return <article key={field} className="overflow-hidden rounded-2xl border border-outline-variant/15">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-800">{index + 1}</span><div><h4 className="font-bold text-primary">{checkTitle}</h4><p className="text-xs text-secondary">{isEvidenceDecisionCheck(field) ? 'Document review' : 'Applicant information check'}</p></div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${complete ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-600'}`}>{complete ? 'Details entered' : 'Needs review'}</span></div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        {evidenceItem ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 p-3 md:col-span-2"><div><p className="text-sm font-bold text-indigo-950">{evidencePurposeLabel(evidenceItem.purpose)}</p><p className="mt-0.5 text-xs text-indigo-800">Reference {evidenceItem.id}</p></div><Button type="button" variant="secondary" disabled={openingEvidenceId !== null} onClick={() => void openEvidence(evidenceItem)}>{openingEvidenceId === evidenceItem.id ? 'Opening…' : 'Open document to review'}</Button></div> : null}
        <label className="text-sm font-semibold text-primary">Verification source<select aria-label={`Decision source for ${field}`} className="mt-1.5 w-full rounded-xl border border-outline-variant/20 bg-white p-2.5 text-sm font-normal" value={input.source ?? ''} onChange={(event) => { setError(null); setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, source: (event.target.value || undefined) as VerificationCaseCheck['source'] | undefined } })); }}><option value="">Choose a source</option>{verificationSourcesForCheck(field).map((source) => <option key={source} value={source}>{humanize(source)}</option>)}</select>{isEvidenceDecisionCheck(field) && verificationSourcesForCheck(field).length < 3 ? <span className="mt-1 block text-xs font-normal text-secondary">For this evidence, use an official registry or approved provider.</span> : null}</label>
        <label className="text-sm font-semibold text-primary">Private supporting reference{isScumlDecisionCheck(field) && input.applicability === 'required' ? ' · current SCUML certificate' : ''}<input className="mt-1.5 w-full rounded-xl border border-outline-variant/20 p-2.5 text-sm font-normal" value={input.reference ?? ''} onChange={(event) => { setError(null); setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, reference: event.target.value } })); }} /><span className="mt-1 block text-xs font-normal text-secondary">Record the reference that supports your decision.</span></label>
        {isEvidenceDecisionCheck(field) ? <label className="text-sm font-semibold text-primary">Document expiry date, if shown<input type="datetime-local" className="mt-1.5 w-full rounded-xl border border-outline-variant/20 p-2.5 text-sm font-normal" value={input.expiresAt?.slice(0, 16) ?? ''} onChange={(event) => { setError(null); setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, expiresAt: event.target.value } })); }} /><span className="mt-1 block text-xs font-normal text-secondary">Enter the future date printed on the document. If expiry is required but not available, the server will explain why approval is blocked.</span></label> : null}
        {isScumlDecisionCheck(field) ? <label className="text-sm font-semibold text-primary">SCUML applicability<select aria-label="SCUML applicability" className="mt-1.5 w-full rounded-xl border border-outline-variant/20 p-2.5 text-sm font-normal" value={input.applicability ?? ''} onChange={(event) => { setError(null); setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, applicability: (event.target.value || undefined) as VerificationCaseCheck['applicability'] | undefined } })); }}><option value="">Choose applicability</option><option value="required">Required</option><option value="not_applicable">Not applicable</option></select><span className="mt-1 block text-xs font-normal text-secondary">Both options require a private supporting reference. If required, review the current certificate.</span></label> : null}
        <details className="rounded-xl bg-slate-50 p-3 md:col-span-2"><summary className="cursor-pointer text-sm font-semibold text-secondary">Additional issuer or jurisdiction details, if applicable</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-primary">Issuer name<input className="mt-1 w-full rounded-lg border border-outline-variant/20 bg-white p-2 text-sm font-normal" value={input.issuerName ?? ''} onChange={(event) => setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, issuerName: event.target.value } }))} /></label><label className="text-sm font-medium text-primary">Jurisdiction state ID<input className="mt-1 w-full rounded-lg border border-outline-variant/20 bg-white p-2 text-sm font-normal" value={input.jurisdictionStateId ?? ''} onChange={(event) => setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, jurisdictionStateId: event.target.value } }))} /></label></div></details>
      </div>
    </article>;
  };

  return (
    <AdminLayout>
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-8">
        <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-sm md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Trust &amp; Safety · KYC review</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Verification cases</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Review the applicant’s submitted information and protected documents, record each required check, then make the case decision. Staff authority, reviewer assignment and separation of duties are enforced by the backend.</p>
        </header>

        {error ? <div role="alert" className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>{error}</p><button type="button" aria-label="Dismiss message" className="shrink-0 font-bold" onClick={() => setError(null)}>Dismiss</button></div> : null}

        <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-white shadow-sm xl:sticky xl:top-5">
            <div className="border-b border-outline-variant/10 p-5">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold text-primary">Review queue</h2><p className="mt-1 text-xs text-secondary">Choose a case to review.</p></div><Button type="button" variant="secondary" disabled={queueLoading} onClick={() => void loadQueue()}>Refresh</Button></div>
              <label className="mt-4 block text-xs font-bold text-secondary">Filter by case status<select aria-label="Verification case state" value={state} onChange={(event) => setState(event.target.value)} className="mt-1.5 w-full rounded-xl border border-outline-variant/20 bg-white px-3 py-2.5 text-sm font-medium text-primary">{states.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
            </div>
            {queueLoading && !queue?.cases.length ? <div className="p-5"><LoadingState label="Loading verification cases..." /></div> : null}
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
              {queue?.cases.map((item) => <button type="button" key={item.id} aria-current={selectedId === item.id ? 'true' : undefined} onClick={() => void loadCase(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === item.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-outline-variant/15 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}>
                <span className="flex items-start justify-between gap-3"><span className="font-bold capitalize text-primary">{humanize(item.kind)} <span className="text-secondary">·</span> {humanize(item.structure)}</span><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-700">{humanize(item.state)}</span></span>
                <span className="mt-2 block text-xs text-secondary">Case {item.id.slice(0, 8)}… · v{item.version}</span>
                {item.submittedAt ? <span className="mt-1 block text-xs text-secondary">Submitted {readableDate(item.submittedAt)}</span> : null}
              </button>)}
              {!queueLoading && !queue?.cases.length ? <p className="rounded-2xl border border-dashed border-outline-variant/30 p-5 text-sm text-secondary">No cases are waiting in this status.</p> : null}
            </div>
            {queue?.nextCursor ? <div className="border-t border-outline-variant/10 p-3"><Button type="button" variant="secondary" className="w-full" disabled={queueLoading} onClick={() => void loadQueue(queue.nextCursor ?? undefined)}>Load more cases</Button></div> : null}
          </aside>

          <section className="min-w-0 space-y-5">
            {!detail && !detailLoading ? <div className="rounded-3xl border border-dashed border-outline-variant/30 bg-white p-10 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-2xl text-indigo-700" aria-hidden="true">✓</span><h2 className="mt-4 text-xl font-extrabold text-primary">Select a verification case</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">The case details, evidence and review actions will appear here. Private applicant information is loaded only after you open an authorized case.</p></div> : null}
            {detailLoading ? <div className="rounded-3xl border border-outline-variant/10 bg-white p-6"><LoadingState label="Loading case details..." /></div> : null}
            {detail ? <>
              <div className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-sm md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Applicant</p><h2 className="mt-1 break-words text-2xl font-extrabold text-primary">{applicantName}</h2><p className="mt-1 text-sm capitalize text-secondary">{humanize(detail.kind)} · {humanize(detail.structure)}</p></div>
                  <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold capitalize ${detail.state === 'approved' ? 'bg-emerald-100 text-emerald-800' : detail.state === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{humanize(detail.state)}</span><Button type="button" variant="secondary" disabled={detailLoading} onClick={() => void loadCase(detail.id)}>Refresh case</Button></div>
                </div>
                <div className="mt-5 grid gap-3 border-t border-outline-variant/10 pt-4 text-sm sm:grid-cols-3">
                  <div><span className="block text-xs text-secondary">Case version</span><span className="mt-1 block font-semibold">{detail.version}</span></div>
                  <div><span className="block text-xs text-secondary">Draft version submitted</span><span className="mt-1 block font-semibold">{detail.draftVersion}</span></div>
                  <div><span className="block text-xs text-secondary">Submitted</span><span className="mt-1 block font-semibold">{readableDate(detail.submittedAt)}</span></div>
                </div>
                <details className="mt-3 border-t border-outline-variant/10 pt-3"><summary className="cursor-pointer text-xs font-semibold text-secondary">Technical references</summary><div className="mt-2 grid gap-2 break-all text-xs text-secondary sm:grid-cols-2"><p>Case ID: {detail.id}</p><p>Profile ID: {detail.profileId}</p></div></details>
                {detail.reviewDeadlineState ? <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-secondary">Review timing: {humanize(detail.reviewDeadlineState)}{detail.reviewDueAt ? ` · Due ${readableDate(detail.reviewDueAt)}` : ''}{detail.escalationDueAt ? ` · Escalation ${readableDate(detail.escalationDueAt)}` : ''}</p> : null}
              </div>

              <section aria-label="KYC review progress" className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-sm md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-lg font-extrabold text-primary">Review process</h3><p className="mt-1 text-sm text-secondary">Each stage is confirmed by the server before the next action is available.</p></div><span className="text-xs font-bold capitalize text-secondary">Current status: {humanize(detail.state)}</span></div>
                <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {['Case submitted', 'Reviewer assigned', 'Information and documents reviewed', 'Decision recorded'].map((label, index) => {
                    const complete = currentStep > index;
                    const active = currentStep === index;
                    return <li key={label} className={`rounded-2xl border p-3 ${active ? 'border-indigo-300 bg-indigo-50' : complete ? 'border-emerald-200 bg-emerald-50' : 'border-outline-variant/15 bg-slate-50'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${complete ? 'bg-emerald-600 text-white' : active ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}`}>{complete ? '✓' : index + 1}</span><span className="mt-2 block text-sm font-bold text-primary">{label}</span><span className="mt-1 block text-xs text-secondary">{complete ? 'Complete' : active ? 'In progress' : 'Next'}</span></li>;
                  })}
                </ol>
              </section>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-sm md:p-6">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Application</p><h3 className="mt-1 text-lg font-extrabold text-primary">Applicant information</h3><p className="mt-1 text-sm text-secondary">Information submitted for this review.</p></div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {applicantFields.map(([field, value]) => <div key={field} className="min-w-0 rounded-xl bg-slate-50 p-3"><dt className="text-xs text-secondary">{humanizeCheck(field)}</dt><dd className="mt-1 break-words text-sm font-semibold text-primary">{value}</dd></div>)}
                    {asText(identity?.route) ? <div className="flex flex-wrap justify-between gap-2 border-b border-outline-variant/10 pb-2"><dt className="text-sm text-secondary">Identity route</dt><dd className="text-sm font-semibold capitalize text-primary">{humanize(asText(identity?.route) ?? '')}</dd></div> : null}
                    {asText(identity?.country) ? <div className="flex flex-wrap justify-between gap-2 border-b border-outline-variant/10 pb-2"><dt className="text-sm text-secondary">Identity country</dt><dd className="text-sm font-semibold text-primary">{asText(identity?.country)}</dd></div> : null}
                    {!applicantFields.length && !identity && !people.length ? <div className="sm:col-span-2"><dt className="text-sm text-secondary">Applicant information</dt><dd className="mt-1 text-sm text-primary">No additional applicant fields were returned.</dd></div> : null}
                  </dl>
                  {people.length ? <div className="mt-5 rounded-2xl bg-slate-50 p-4"><h4 className="text-sm font-bold text-primary">Declared people</h4><ul className="mt-2 space-y-2">{people.map((person, index) => { const data = asRecord(person); const name = asText(data?.name) ?? asText(data?.fullName); return <li key={`${name ?? 'person'}-${index}`} className="text-sm text-secondary">{name ?? `Declared person ${index + 1}`}{asText(data?.route) ? ` · ${humanize(asText(data?.route) ?? '')}` : ''}{asText(data?.country) ? ` · ${asText(data?.country)}` : ''}</li>; })}</ul></div> : null}
                  <p className="mt-4 text-xs text-secondary">Draft version submitted: {detail.draftVersion}</p>
                </section>

                <section className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Submitted files</p><h3 className="mt-1 text-lg font-extrabold text-primary">Private evidence</h3><p className="mt-1 text-sm leading-5 text-secondary">Open a file through the protected review route. Access is checked again by the server.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{evidence.length} {evidence.length === 1 ? 'file' : 'files'}</span></div>
                  {evidence.length ? <ul className="mt-4 space-y-3">{evidence.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/15 p-4"><div className="min-w-0"><p className="font-bold text-primary">{evidencePurposeLabel(item.purpose)}</p><p className="mt-1 truncate text-xs text-secondary">Private evidence reference · {item.id}</p></div><Button type="button" variant="secondary" disabled={openingEvidenceId !== null} onClick={() => void openEvidence(item)}>{openingEvidenceId === item.id ? 'Opening…' : 'View document'}</Button></li>)}</ul> : <div className="mt-4 rounded-2xl border border-dashed border-outline-variant/25 bg-slate-50 p-4"><p className="text-sm font-semibold text-primary">No document references were returned</p><p className="mt-1 text-sm text-secondary">This case detail did not include private evidence references, so there is no file the screen can safely open. Refresh the case or request Trust &amp; Safety support.</p></div>}
                </section>
              </div>

              <section className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-sm md:p-6">
                <div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Reviewer checklist</p><h3 className="mt-1 text-lg font-extrabold text-primary">Review submitted documents</h3><p className="mt-1 max-w-3xl text-sm leading-5 text-secondary">The document checklist is built from the evidence submitted for this case. Applicant and case-level checks returned by the server are listed separately below.</p></div>
                {malformedCheckList ? <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">The case returned a check the screen cannot identify. Refresh the case; approval remains disabled until the full server checklist is available.</p> : null}
                {detail.approvalBlockers?.length ? <div role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h4 className="font-bold text-amber-950">Approval cannot proceed yet</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{detail.approvalBlockers.map((blocker, index) => <li key={`${formatBlocker(blocker)}-${index}`}>{formatBlocker(blocker)}</li>)}</ul><p className="mt-2 text-xs text-amber-900">These requirements came from the backend. Resolve them and refresh before making a decision.</p></div> : null}
                <div className="mt-5 rounded-2xl border border-outline-variant/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-bold text-primary">Document checks</h4><p className="mt-1 text-sm text-secondary">Review only documents submitted and referenced in this case.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">{documentFields.length} {documentFields.length === 1 ? 'document' : 'documents'}</span></div>
                  {documentFields.length ? <div className="mt-4 space-y-4">{documentFields.map(renderCheckCard)}</div> : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-secondary">No document-specific approval checks were returned. Use the case requirements below and follow any server-provided blockers.</p>}
                </div>
                {applicantCheckFields.length ? <details className="mt-4 rounded-2xl border border-outline-variant/15 p-4"><summary className="cursor-pointer list-inside text-sm font-bold text-primary">Additional applicant and case checks <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{applicantCheckFields.length}</span><span className="mt-1 block pl-5 text-xs font-normal text-secondary">These are not uploaded documents, but the backend requires them in the case decision.</span></summary><div className="mt-4 space-y-4">{applicantCheckFields.map(renderCheckCard)}</div></details> : null}
                {!fields.length && !malformedCheckList ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-secondary">No approval checks were returned. Refresh the case before taking a decision.</p> : null}
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-outline-variant/10 pt-4">
                  <Button type="button" disabled={approvalDisabledReasons.length > 0} onClick={() => void runProtected('approve')}>Approve KYC with authenticator</Button>
                  {detail.state === 'submitted' ? <Button type="button" variant="secondary" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void runProtected('claim')}>Claim case to begin review with authenticator</Button> : null}
                  {approvalDisabledReasons.length ? <ul role="status" className="space-y-1 text-xs text-secondary">{approvalDisabledReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p role="status" className="text-xs text-secondary">All required checks are filled. Approval will still be revalidated by the backend.</p>}
                </div>
              </section>

              <section className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-sm md:p-6">
                <div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Case decision</p><h3 className="mt-1 text-lg font-extrabold text-primary">Reject this case</h3><p className="mt-1 text-sm text-secondary">Protected actions require an authenticator confirmation. The server checks your current authority and case assignment.</p></div>
                <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold text-primary">Rejection reason<select aria-label="Rejection reason" value={reasonCode} onChange={(event) => setReasonCode(event.target.value as 'DOCUMENT_UNREADABLE')} className="mt-1 block rounded-xl border border-outline-variant/20 bg-white px-3 py-2.5 text-sm font-normal"><option value="DOCUMENT_UNREADABLE">Document is unreadable</option></select></label><Button type="button" variant="secondary" disabled={detail.state !== 'under_review' || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void runProtected('reject')}>Reject with authenticator</Button></div>
              </section>

              <section className="rounded-3xl border border-outline-variant/15 bg-white p-5 shadow-sm md:p-6"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Audit trail</p><h3 className="mt-1 text-lg font-extrabold text-primary">Case history</h3></div>
                <ol className="mt-4 space-y-3">{history?.events.map((event) => <li key={event.id} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" /><div className="min-w-0 flex-1 rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-primary">{humanize(event.action)}</p><time className="text-xs text-secondary">{readableDate(event.at)}</time></div><p className="mt-1 text-xs text-secondary">Case version {event.version}</p></div></li>)}{!history?.events.length ? <li className="text-sm text-secondary">No history events have been returned.</li> : null}</ol>
                {history?.nextCursor ? <Button type="button" variant="secondary" className="mt-3" onClick={async () => { if (!detail) return; try { const page = await verificationCaseService.staffHistory(detail.id, history.nextCursor ?? undefined); setHistory((current) => current ? { events: [...current.events, ...page.events], nextCursor: page.nextCursor } : page); } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load more case history.'); } }}>Load more history</Button> : null}
              </section>
            </> : null}
          </section>
        </div>

        <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={completeProtected} />
        {filePreview ? <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-3 sm:p-6"><section role="dialog" aria-modal="true" aria-label="Protected case evidence" className="flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white p-4 shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/10 pb-3"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Protected document</p><h2 className="mt-1 font-bold text-primary">{filePreview.title}</h2><p className="mt-0.5 text-xs text-secondary">The content was retrieved through the authorized case evidence route.</p></div><Button type="button" variant="secondary" onClick={() => { URL.revokeObjectURL(filePreview.url); setFilePreview(null); }}>Close document</Button></div><div className="mt-3 min-h-0 flex-1"><AuthorizedFilePreview url={filePreview.url} mimeType={filePreview.mimeType} alt={filePreview.title} /></div></section></div> : null}
      </main>
    </AdminLayout>
  );
};

export default ManageKyc;
