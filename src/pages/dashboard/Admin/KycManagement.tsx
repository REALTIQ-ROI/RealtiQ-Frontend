import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { adminPolicyService, type CompanyManualSource } from '../../../services/adminPolicyService';
import { verificationCaseService, type VerificationCaseCheck, type VerificationCaseDecision, type VerificationCaseDetail, type VerificationCaseHistoryPage, type VerificationCasePage } from '../../../services/verificationCaseService';

const states = ['submitted', 'under_review', 'approved', 'rejected', 'withdrawn', 'superseded', 'expired'];
const display = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'missing';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};

const requiredCheckField = (check: unknown): string | null => {
  if (typeof check === 'string') return check;
  if (check && typeof check === 'object' && 'field' in check && typeof check.field === 'string') return check.field;
  return null;
};

const ManageKyc = () => {
  const [state, setState] = useState('submitted');
  const [queue, setQueue] = useState<VerificationCasePage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VerificationCaseDetail | null>(null);
  const [history, setHistory] = useState<VerificationCaseHistoryPage | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState('');
  const [filePreview, setFilePreview] = useState<{ url: string; mimeType: string; id: string } | null>(null);
  const [reasonCode, setReasonCode] = useState<'DOCUMENT_UNREADABLE'>('DOCUMENT_UNREADABLE');
  const [manualSources, setManualSources] = useState<CompanyManualSource[]>([]);
  const [manualSourcesError, setManualSourcesError] = useState<string | null>(null);
  const [checkInputs, setCheckInputs] = useState<Record<string, Partial<VerificationCaseCheck>>>({});
  const stepUp = useBoundStepUp<VerificationCaseDetail>();

  const loadQueue = useCallback(async (cursor?: string) => {
    setQueueLoading(true); setError(null);
    try {
      const page = await verificationCaseService.staffQueue({ limit: 25, state, ...(cursor ? { cursor } : {}) });
      setQueue((current) => cursor && current ? { ...page, cases: [...current.cases, ...page.cases] } : page);
    }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load the Trust & Safety verification queue.'); }
    finally { setQueueLoading(false); }
  }, [state]);

  const loadCase = useCallback(async (id: string) => {
    setDetailLoading(true); setError(null);
    try {
      const [current, events] = await Promise.all([verificationCaseService.staffCase(id), verificationCaseService.staffHistory(id)]);
      setDetail(current); setHistory(events); setSelectedId(id);
      const fields = (current.requiredChecks ?? []).map(requiredCheckField).filter((field): field is string => Boolean(field));
      setCheckInputs(Object.fromEntries(fields.map((field) => [field, { field }])));
      try {
        const policy = await adminPolicyService.getCompanyVerificationManualSources();
        setManualSources(policy.sources);
        setManualSourcesError(null);
      } catch (raw) {
        setManualSources([]);
        setManualSourcesError(raw instanceof Error ? raw.message : 'The approved company verification policy is unavailable.');
      }
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load this verification case.'); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview.url); }, [filePreview]);

  const runProtected = async (kind: 'claim' | 'reject' | 'approve') => {
    if (!detail) return;
    const path = `/api/admin/verification-cases/${encodeURIComponent(detail.id)}/${kind === 'claim' ? 'claim' : 'decision'}`;
    let body: { expectedVersion: number } | VerificationCaseDecision;
    if (kind === 'claim') body = { expectedVersion: detail.version };
    else if (kind === 'reject') body = { expectedVersion: detail.version, decision: 'rejected', reasonCodes: [reasonCode] };
    else {
      const fields = (detail.requiredChecks ?? []).map(requiredCheckField);
      if (!fields.length || fields.some((field) => !field)) { setError('The server did not return a usable requiredChecks field list. Approval is unavailable until the case is refreshed.'); return; }
      if (!manualSources.length || manualSourcesError) { setError(manualSourcesError ?? 'The approved company verification policy is unavailable.'); return; }
      if (detail.approvalBlockers?.length) { setError('The server reports approval blockers. Resolve them and refresh this case before deciding.'); return; }
      const checks: VerificationCaseCheck[] = [];
      for (const field of fields as string[]) {
        const input = checkInputs[field] ?? {};
        if (!input.source || !manualSources.includes(input.source) || !input.reference?.trim()) {
          setError(`Complete a policy-approved source and reviewer reference for ${field}.`);
          return;
        }
        const check: VerificationCaseCheck = { field, source: input.source, reference: input.reference.trim() };
        if (field.startsWith('evidence.')) {
          if (!input.expiresAt) { setError(`Enter an evidence expiry for ${field}. The non-expiring exception is policy-specific and is not enabled here.`); return; }
          const expiry = new Date(input.expiresAt);
          if (Number.isNaN(expiry.getTime())) { setError(`Enter a valid evidence expiry for ${field}.`); return; }
          check.expiresAt = expiry.toISOString();
        }
        if (input.applicability) check.applicability = input.applicability;
        if (input.jurisdictionStateId?.trim()) check.jurisdictionStateId = input.jurisdictionStateId.trim();
        if (input.issuerName?.trim()) check.issuerName = input.issuerName.trim();
        checks.push(check);
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
    if (!result.ok) return false;
    setDetail(result.value);
    await loadQueue();
    await loadCase(result.value.id);
    return true;
  };

  const openEvidence = async () => {
    if (!selectedId || !evidenceId.trim()) return;
    setError(null);
    try {
      const blob = await verificationCaseService.staffEvidenceContent(selectedId, evidenceId.trim());
      const mimeType = blob.type || 'application/octet-stream';
      setFilePreview({ url: URL.createObjectURL(blob), mimeType, id: evidenceId.trim() });
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'The current staff profile cannot view this case evidence.'); }
  };

  return (
    <AdminLayout>
      <main className="mx-auto max-w-7xl space-y-8 p-8">
        <header><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Compliance review</p><h1 className="mt-2 text-4xl font-extrabold tracking-tight text-primary">Verification Cases</h1><p className="mt-2 text-sm text-secondary">Current Trust & Safety authority, reviewer assignment and separation-of-duties checks are enforced by the backend.</p></header>
        {error ? <div role="alert" className="rounded-xl bg-error-container p-4 text-sm text-on-error-container">{error}</div> : null}
        <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.6fr)]">
          <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-2"><h2 className="text-xl font-extrabold">Current review queue</h2><Button type="button" variant="secondary" disabled={queueLoading} onClick={() => void loadQueue()}>Refresh</Button></div>
            <label className="mt-4 block text-xs font-bold uppercase text-secondary">Case state<select aria-label="Verification case state" value={state} onChange={(event) => setState(event.target.value)} className="mt-2 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm">{states.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
            {queueLoading ? <LoadingState label="Loading verification cases..." /> : null}
            <div className="mt-4 space-y-2">{queue?.cases.map((item) => <button type="button" key={item.id} onClick={() => void loadCase(item.id)} className={`w-full rounded-lg border p-3 text-left ${selectedId === item.id ? 'border-primary bg-primary/5' : 'border-outline-variant/10 bg-surface-container-low'}`}><span className="flex items-center justify-between gap-2"><strong className="capitalize">{item.kind} · {item.structure}</strong><span className="text-xs">{item.state.replaceAll('_', ' ')}</span></span><span className="mt-1 block text-xs text-secondary">{item.id} · Version {item.version} · {item.profileId}</span></button>)}{!queueLoading && !queue?.cases.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No cases returned for this queue state.</p> : null}</div>
            {queue?.nextCursor ? <Button type="button" variant="secondary" className="mt-3 w-full" disabled={queueLoading} onClick={() => void loadQueue(queue.nextCursor ?? undefined)}>Load next signed cursor page</Button> : null}
          </section>
          <section className="space-y-5 rounded-2xl border border-outline-variant/10 bg-white p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Case detail</h2><p className="mt-1 text-xs text-secondary">The raw applicant snapshot and evidence checks are shown only on this staff-authorized screen.</p></div>{selectedId ? <Button type="button" variant="secondary" disabled={detailLoading} onClick={() => void loadCase(selectedId)}>Refresh detail</Button> : null}</div>
            {detailLoading ? <LoadingState label="Loading case details..." /> : null}
            {!detail ? <p className="rounded-lg border border-dashed p-5 text-sm text-secondary">Select a case to view its current server detail.</p> : <>
              <div className="rounded-lg bg-surface-container-low p-4"><p className="font-bold">{detail.kind} · {detail.structure} · {detail.state.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-secondary">Case {detail.id} · Profile {detail.profileId} · Version {detail.version} · Draft version {detail.draftVersion}</p><p className="mt-1 text-xs text-secondary">Review deadline {detail.reviewDeadlineState ?? 'not returned'} · Due {detail.reviewDueAt ?? 'not returned'} · Escalation {detail.escalationDueAt ?? 'not returned'}</p></div>
              <details><summary className="cursor-pointer font-bold">Authorized case snapshot</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-xs">{display(detail.snapshot)}</pre></details>
              <div><h3 className="font-bold">Required checks from this case</h3>{detail.requiredChecks?.length ? <div className="mt-2 space-y-2">{detail.requiredChecks.map((check, index) => <pre key={index} className="overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-xs">{display(check)}</pre>)}</div> : <p className="mt-1 text-sm text-secondary">No required checks were returned.</p>}</div>
              {detail.approvalBlockers?.length ? <div className="rounded-lg bg-amber-50 p-3 text-sm"><strong>Server-returned approval blockers</strong><pre className="mt-2 whitespace-pre-wrap text-xs">{display(detail.approvalBlockers)}</pre></div> : null}
              <div className="rounded-lg border border-outline-variant/10 p-4">
                <h3 className="font-bold">Policy-bound approval checks</h3>
                <p className="mt-1 text-xs text-secondary">The current approved <code>company_verification.manualSources</code> policy and the server-returned required checks control the decision. Evidence expiry is required here; non-expiring evidence is not offered without purpose-specific policy metadata.</p>
                {manualSourcesError || !manualSources.length ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Approval is unavailable: {manualSourcesError ?? 'No approved review sources were returned.'}</p> : null}
                {detail.requiredChecks?.length && detail.requiredChecks.map(requiredCheckField).some((field) => !field) ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">The server required-check response does not include a usable field for every check. Refresh the case; approval stays disabled.</p> : null}
                {detail.approvalBlockers?.length ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Server-returned blockers: {display(detail.approvalBlockers)}</p> : null}
                <div className="mt-3 space-y-3">{(detail.requiredChecks ?? []).map(requiredCheckField).filter((field): field is string => Boolean(field)).map((field) => <div key={field} className="grid gap-3 rounded-lg bg-surface-container-low p-3 sm:grid-cols-2">
                  <p className="break-all text-sm font-bold sm:col-span-2">Required check <code>{field}</code></p>
                  <label className="text-xs font-bold">Approved source<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={checkInputs[field]?.source ?? ''} onChange={(event) => { setError(null); setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, source: (event.target.value || undefined) as CompanyManualSource | undefined } })); }}><option value="">Choose current policy source</option>{manualSources.map((source) => <option key={source} value={source}>{source.replaceAll('_', ' ')}</option>)}</select></label>
                  <label className="text-xs font-bold">Reviewer reference<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={checkInputs[field]?.reference ?? ''} onChange={(event) => { setError(null); setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, reference: event.target.value } })); }} /></label>
                  {field.startsWith('evidence.') ? <label className="text-xs font-bold">Evidence expiry<input type="datetime-local" className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={checkInputs[field]?.expiresAt?.slice(0, 16) ?? ''} onChange={(event) => setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, expiresAt: event.target.value } }))} /></label> : null}
                  <label className="text-xs font-bold">Issuer name, if required by this evidence<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={checkInputs[field]?.issuerName ?? ''} onChange={(event) => setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, issuerName: event.target.value } }))} /></label>
                  <label className="text-xs font-bold">Jurisdiction state ID, if required<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={checkInputs[field]?.jurisdictionStateId ?? ''} onChange={(event) => setCheckInputs((current) => ({ ...current, [field]: { ...current[field], field, jurisdictionStateId: event.target.value } }))} /></label>
                </div>)}</div>
                <Button type="button" className="mt-3" disabled={detail.state !== 'under_review' || !manualSources.length || Boolean(manualSourcesError) || Boolean(detail.approvalBlockers?.length) || !(detail.requiredChecks?.length) || Boolean(detail.requiredChecks?.some((check) => !requiredCheckField(check))) || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void runProtected('approve')}>Approve with authenticator</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2"><Button type="button" disabled={detail.state !== 'submitted' || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void runProtected('claim')}>Claim case with authenticator</Button><Button type="button" variant="secondary" disabled={detail.state !== 'under_review' || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void runProtected('reject')}>Reject with documented reason</Button><label className="flex items-center gap-2 text-sm">Reason<select aria-label="Rejection reason" value={reasonCode} onChange={(event) => setReasonCode(event.target.value as 'DOCUMENT_UNREADABLE')} className="rounded border px-2 py-1"><option value="DOCUMENT_UNREADABLE">Document unreadable</option></select></label></div>
              <div className="rounded-lg border border-outline-variant/10 p-4"><h3 className="font-bold">Private case evidence</h3><p className="mt-1 text-xs text-secondary">Enter an evidence ID referenced by the selected case. The backend checks current Trust & Safety permission and case membership.</p><div className="mt-3 flex gap-2"><input aria-label="Case evidence ID" value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Evidence ID" /><Button type="button" variant="secondary" disabled={!evidenceId.trim()} onClick={() => void openEvidence()}>Open private evidence</Button></div></div>
              <div><h3 className="font-bold">Case history</h3><div className="mt-2 space-y-2">{history?.events.map((event) => <details key={event.id} className="rounded-lg bg-surface-container-low p-3"><summary className="cursor-pointer text-sm font-bold">{event.action} · version {event.version} · {event.at}</summary><pre className="mt-2 whitespace-pre-wrap text-xs">{display(event)}</pre></details>)}{!history?.events.length ? <p className="text-sm text-secondary">No history events returned.</p> : null}</div>{history?.nextCursor ? <Button type="button" variant="secondary" className="mt-3" onClick={async () => { if (!detail) return; try { const page = await verificationCaseService.staffHistory(detail.id, history.nextCursor ?? undefined); setHistory((current) => current ? { events: [...current.events, ...page.events], nextCursor: page.nextCursor } : page); } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load more case history.'); } }}>Load more history</Button> : null}</div>
            </>}
          </section>
        </div>
        <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={completeProtected} />
        {filePreview ? <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-label="Protected case evidence" className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Private case evidence · {filePreview.id}</h2><Button type="button" variant="secondary" onClick={() => { URL.revokeObjectURL(filePreview.url); setFilePreview(null); }}>Close viewer</Button></div><div className="mt-3 min-h-0 flex-1">{filePreview.mimeType.startsWith('image/') ? <img src={filePreview.url} alt="Private verification evidence" className="mx-auto h-full max-w-full object-contain" /> : <iframe title="Private verification evidence document" src={filePreview.url} sandbox="" className="h-full w-full rounded border" />}</div></section></div> : null}
      </main>
    </AdminLayout>
  );
};

export default ManageKyc;
