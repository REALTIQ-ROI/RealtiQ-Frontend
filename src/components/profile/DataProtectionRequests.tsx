import { useEffect, useRef, useState, type ReactNode } from 'react';
import { dataProtectionService, type DataProtectionExecution, type DataProtectionRequestSummary, type DataProtectionScope } from '../../services/dataProtectionService';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';

const readable = (value: string) => value.replaceAll('_', ' ');
const fieldLabel = (value: string) => readable(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2'));
const stateGuidance: Record<string, string> = {
  submitted: 'Submitted for review.',
  under_review: 'A reviewer is assessing the request.',
  queued: 'Execution is queued; individual records have not all finished.',
  processing: 'Execution is in progress. Refresh to see later record outcomes.',
  completed: 'The request reached a terminal state. Inspect record outcomes to see what was completed or preserved.',
  partially_blocked: 'Some records may be complete while others are preserved or blocked. Inspect each returned outcome and reason code.',
  waiting_for_policy: 'Execution is waiting for an approved retention or legal-hold policy decision.',
  failed: 'Execution failed. The returned result codes and record outcomes show what remains unresolved.',
  rejected: 'The request was rejected. Review the returned result codes and history.',
  withdrawn: 'This request was withdrawn.',
};

const serverFields = (value: unknown, depth = 0): ReactNode => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'object') return String(value);
  if (depth >= 4) return JSON.stringify(value);
  if (Array.isArray(value)) return value.length ? (
    <ol className="space-y-2">{value.map((item, index) => <li key={index} className="rounded-lg bg-surface-container-low p-2">{serverFields(item, depth + 1)}</li>)}</ol>
  ) : 'No records returned.';
  const entries = Object.entries(value);
  return entries.length ? (
    <dl className="space-y-2">{entries.map(([key, item]) => (
      <div key={key} className="break-words"><dt className="font-semibold capitalize text-secondary">{fieldLabel(key)}</dt><dd>{serverFields(item, depth + 1)}</dd></div>
    ))}</dl>
  ) : 'No records returned.';
};

const ScopedDataProtectionRequests = () => {
  const { activeProfile } = useAuth();
  const createStepUp = useBoundStepUp<DataProtectionRequestSummary>();
  const [requests, setRequests] = useState<DataProtectionRequestSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<DataProtectionRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [execution, setExecution] = useState<DataProtectionExecution | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionPollTick, setExecutionPollTick] = useState(0);
  const [requestType, setRequestType] = useState<'access' | 'deletion'>('access');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const selectedId = useRef<string | null>(null);
  const executionPollCount = useRef(0);
  const operationKeyRef = useRef<string | null>(null);
  const scopes: Array<{ value: string; label: string }> = [
    { value: 'account_identity', label: 'Account identity' },
    { value: 'profile_data', label: 'Profile data' },
    { value: 'verification', label: 'Verification records' },
    { value: 'documents', label: 'Documents' },
    { value: 'communications', label: 'Communications' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'listing_operations', label: 'Listing operations' },
  ];
  const permissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const isOrganizationProfile = activeProfile?.structure !== 'individual';
  const canCreateRequest = Boolean(activeProfile && activeProfile.kind !== 'staff' && (!isOrganizationProfile || permissions.includes('team.manage')));

  const load = async (before?: string) => {
    setLoading(true);
    setError(null);
    try {
      const page = await dataProtectionService.list(before);
      setRequests((current) => before ? [...current, ...page.requests] : page.requests);
      setCursor(page.nextCursor);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load data requests.');
      if (!before) {
        setRequests([]);
        setCursor(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const loadHistory = async (id: string, before?: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await dataProtectionService.history(id, before);
      if (selectedId.current !== id) return;
      setHistory((current) => before ? [...current, ...result.events] : result.events);
      setHistoryCursor(result.nextCursor);
    } catch (raw) {
      if (selectedId.current === id) setHistoryError(raw instanceof Error ? raw.message : 'Unable to load request history.');
    } finally {
      if (selectedId.current === id) setHistoryLoading(false);
    }
  };

  const loadExecution = async (id: string) => {
    executionPollCount.current = 0;
    setExecutionPollTick((tick) => tick + 1);
    setExecutionLoading(true);
    setExecutionError(null);
    try {
      const result = await dataProtectionService.execution(id);
      if (selectedId.current === id) setExecution(result);
    } catch (raw) {
      if (selectedId.current === id) setExecutionError(raw instanceof Error ? raw.message : 'Unable to load execution outcomes.');
    } finally {
      if (selectedId.current === id) setExecutionLoading(false);
    }
  };

  const executionJobState = execution?.job?.state ?? execution?.state;
  const activeRequestId = selected?.id;
  useEffect(() => {
    if (!activeRequestId || !executionJobState || !['queued', 'processing', 'waiting_for_policy'].includes(executionJobState) || executionPollCount.current >= 12) return;
    const id = activeRequestId;
    const timer = window.setTimeout(() => {
      executionPollCount.current += 1;
      void dataProtectionService.execution(id).then((result) => { if (selectedId.current === id) { setExecution(result); setExecutionPollTick((tick) => tick + 1); } })
        .catch((raw: unknown) => { if (selectedId.current === id) setExecutionError(raw instanceof Error ? raw.message : 'Unable to refresh execution progress.'); });
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [activeRequestId, executionJobState, executionPollTick]);

  const open = async (id: string) => {
    selectedId.current = id;
    setError(null);
    setSelected(null);
    setHistory([]);
    setHistoryCursor(null);
    setExecution(null);
    try {
      const result = await dataProtectionService.detail(id);
      if (selectedId.current !== id) return;
      setSelected(result);
      void loadHistory(id);
      void loadExecution(id);
    } catch (raw) {
      if (selectedId.current !== id) return;
      setSelected(null);
      setError(raw instanceof Error ? raw.message : 'Unable to load the request.');
    }
  };

  const downloadExport = async (id: string) => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await dataProtectionService.downloadExport(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `realtiq-data-export-${id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to download the access export.');
    } finally {
      setDownloading(false);
    }
  };

  const beginCreate = async () => {
    if (!activeProfile || !canCreateRequest || !selectedScopes.length || createStepUp.busy || createStepUp.challenge) return;
    if (!Number.isInteger(activeProfile.version) || activeProfile.version < 0) {
      setError('The active profile version is unavailable. Refresh your profile before submitting this request.');
      return;
    }
    const operationKey = operationKeyRef.current ?? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    operationKeyRef.current = operationKey;
    const payload = {
      requestType,
      scopes: [...new Set(selectedScopes)] as DataProtectionScope[],
      operationKey,
      expectedProfileVersion: activeProfile.version,
    };
    const started = await createStepUp.begin({
      method: 'POST',
      path: '/api/profiles/current/data-protection-requests',
      body: payload,
      label: requestType === 'deletion' ? 'Submit a profile data deletion request' : 'Submit a profile data access request',
      execute: (challengeId, exactBody) => dataProtectionService.create(exactBody, challengeId),
    });
    if (!started && createStepUp.error) setError(createStepUp.error);
  };

  const completeCreate = async (code: string) => {
    const result = await createStepUp.complete(code);
    if (!result.ok) return false;
    operationKeyRef.current = null;
    setConfirmDeletion(false);
    setSelectedScopes([]);
    setError(null);
    setRequests((current) => [result.value, ...current.filter((request) => request.id !== result.value.id)]);
    await load();
    await open(result.value.id);
    return true;
  };

  return (
    <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
      <h3 className="text-lg font-bold">Data protection requests</h3>
      <p className="mt-1 text-sm text-secondary">Current requests for your selected profile. Result codes and record outcomes determine what was completed or preserved.</p>
      <div className="mt-4 rounded-lg border border-outline-variant/20 p-4">
        <h4 className="font-bold">Request access or deletion</h4>
        {!canCreateRequest ? <p role="status" className="mt-2 text-sm text-amber-800">Request submission requires a non-staff profile. Organization profiles also require the current `team.manage` permission.</p> : null}
        <p className="mt-1 text-xs text-secondary">Submitting a request creates a review record; it does not immediately export or delete data. Deletion outcomes may preserve records under retention or legal-hold rules.</p>
        <form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); if (requestType === 'deletion') setConfirmDeletion(true); else void beginCreate(); }}>
          <label className="block text-sm font-semibold">Request type<select className="mt-1 block w-full rounded-lg border border-outline-variant/20 p-2" value={requestType} disabled={!canCreateRequest || createStepUp.busy || Boolean(createStepUp.challenge)} onChange={(event) => { setRequestType(event.target.value as 'access' | 'deletion'); operationKeyRef.current = null; }}><option value="access">Access / export</option><option value="deletion">Deletion review</option></select></label>
          <fieldset disabled={!canCreateRequest || createStepUp.busy || Boolean(createStepUp.challenge)}><legend className="text-sm font-semibold">Requested data scopes</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{scopes.map((scope) => <label key={scope.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedScopes.includes(scope.value)} onChange={(event) => { operationKeyRef.current = null; setSelectedScopes((current) => event.target.checked ? [...current, scope.value] : current.filter((item) => item !== scope.value)); }} />{scope.label}</label>)}</div></fieldset>
          <p className="text-xs text-secondary">Correction requests remain unavailable here because the handoff does not define field-specific correction value schemas. No arbitrary correction payload is sent.</p>
          <Button type="submit" disabled={!canCreateRequest || !selectedScopes.length || createStepUp.busy || Boolean(createStepUp.challenge)} loading={createStepUp.busy} loadingLabel="Starting secure request…">Continue with authenticator</Button>
        </form>
        {createStepUp.error ? <p role="alert" className="mt-2 text-sm text-red-700">{createStepUp.error}</p> : null}
      </div>
      {confirmDeletion ? <div role="dialog" aria-modal="true" aria-labelledby="privacy-delete-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><section className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"><h4 id="privacy-delete-title" className="text-lg font-bold">Confirm deletion request</h4><p className="mt-2 text-sm text-secondary">This submits a request for staff review. It does not delete data immediately, and records may be preserved or held under retention and legal requirements.</p><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setConfirmDeletion(false)}>Go back</Button><Button type="button" disabled={createStepUp.busy || Boolean(createStepUp.challenge)} onClick={() => { setConfirmDeletion(false); void beginCreate(); }}>Continue to authenticator</Button></div></section></div> : null}
      <StepUpDialog challenge={createStepUp.challenge} busy={createStepUp.busy} error={createStepUp.error} onCancel={createStepUp.cancel} onSubmit={async (code) => (await completeCreate(code))} />
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {loading && !requests.length ? <p className="mt-4 text-sm text-secondary">Loading requests…</p> : null}
      {!loading && !requests.length && !error ? <p className="mt-4 text-sm text-secondary">No data protection requests yet.</p> : null}
      <div className="mt-4 space-y-2">
        {requests.map((request) => (
          <button key={request.id} type="button" className="w-full rounded-lg bg-surface-container-low p-4 text-left text-sm" onClick={() => void open(request.id)}>
            <span className="font-bold capitalize">{request.requestType} · {readable(request.state)}</span>
            <span className="mt-1 block text-xs text-secondary">Submitted {new Date(request.submittedAt).toLocaleDateString('en-NG')}</span>
          </button>
        ))}
      </div>
      {cursor ? <Button type="button" variant="secondary" disabled={loading} onClick={() => void load(cursor)}>{loading ? 'Loading…' : 'Load more'}</Button> : null}
      {selected ? (
        <div className="mt-5 rounded-lg border border-outline-variant/20 p-4 text-sm">
          <p className="font-bold capitalize">{selected.requestType} · {readable(selected.state)}</p>
          <p role="status" className="mt-2 rounded-lg bg-surface-container-low p-3 text-secondary">{stateGuidance[selected.state] ?? 'Review the server result codes and record outcomes for the current state.'}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-secondary">
            <span>Submitted {new Date(selected.submittedAt).toLocaleString('en-NG')}</span>
            {selected.reviewedAt ? <span>Reviewed {new Date(selected.reviewedAt).toLocaleString('en-NG')}</span> : null}
            <span>Version {selected.version}</span>
            <button type="button" className="font-bold text-primary" onClick={() => void open(selected.id)}>Refresh request</button>
          </div>
          <p className="mt-2 text-secondary">Requested scopes: {selected.scopes?.map(readable).join(', ') || 'See request status'}</p>
          {selected.correctionFields?.length ? <p className="mt-1 text-secondary">Correction fields: {selected.correctionFields.map(readable).join(', ')}</p> : null}
          {selected.resultCodes.length ? <div className="mt-2"><p className="text-xs font-bold text-secondary">Server result codes</p><div className="mt-1 flex flex-wrap gap-1">{selected.resultCodes.map((code) => <span key={code} className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">{code}</span>)}</div></div> : null}
          {selected.completedAt ? <p className="mt-2 text-secondary">Last completed {new Date(selected.completedAt).toLocaleDateString('en-NG')}; individual records may have separate outcomes.</p> : null}
          {['partially_blocked', 'waiting_for_policy', 'failed'].includes(selected.state) ? (
            <p role="status" className="mt-2 rounded-lg bg-amber-50 p-3 text-amber-900">Some work may be pending, blocked or preserved under retention and legal-hold rules. Review the server outcomes below.</p>
          ) : null}
          {selected.requestType === 'access' ? (
            <div className="mt-3">
              <Button type="button" variant="secondary" disabled={downloading} onClick={() => void downloadExport(selected.id)}>
                {downloading ? 'Downloading…' : 'Download access export'}
              </Button>
              <p className="mt-1 text-xs text-secondary">The server permits only an available, unexpired export for this profile.</p>
            </div>
          ) : null}
          <div className="mt-4 border-t border-outline-variant/20 pt-4">
            <h4 className="font-bold">Request history</h4>
            {historyError ? <p role="alert" className="mt-2 text-red-700">{historyError}</p> : null}
            {historyLoading && !history.length ? <p className="mt-2 text-secondary">Loading history…</p> : null}
            {!historyLoading && !historyError && !history.length ? <p className="mt-2 text-secondary">No history events returned.</p> : null}
            <ol className="mt-2 space-y-2">{history.map((event, index) => <li key={String(event.id ?? index)} className="rounded-lg bg-surface-container-low p-3">{serverFields(event)}</li>)}</ol>
            {historyCursor ? <Button type="button" variant="secondary" disabled={historyLoading} onClick={() => void loadHistory(selected.id, historyCursor)}>{historyLoading ? 'Loading…' : 'Load more history'}</Button> : null}
          </div>
          <div className="mt-4 border-t border-outline-variant/20 pt-4">
            <div className="flex items-center justify-between gap-2"><h4 className="font-bold">Execution and record outcomes</h4><button type="button" className="text-xs font-bold text-primary" disabled={executionLoading} onClick={() => void loadExecution(selected.id)}>Refresh</button></div>
            {executionError ? <p role="alert" className="mt-2 text-red-700">{executionError}</p> : null}
            {executionLoading ? <p className="mt-2 text-secondary">Loading execution status…</p> : null}
            {!executionLoading && !executionError ? execution ? <div className="mt-2 space-y-3 rounded-lg bg-surface-container-low p-3">
              <p className="font-bold capitalize">{readable(execution.state)} · Version {execution.version} · Completed {execution.completedAt ? new Date(execution.completedAt).toLocaleString('en-NG') : 'not completed'}</p>
              {execution.job ? <div><p className="font-semibold capitalize">Job {readable(execution.job.state)} · {execution.job.attempts} attempts</p><p className="mt-1 text-xs text-secondary">{execution.job.progress.discovered} discovered · {execution.job.progress.completed} completed · {execution.job.progress.preserved} preserved · {execution.job.progress.blocked} blocked · {execution.job.progress.processing} processing</p><p className="mt-1 text-xs text-secondary">Due {execution.job.dueAt ? new Date(execution.job.dueAt).toLocaleString('en-NG') : 'not scheduled'} · Job completed {execution.job.completedAt ? new Date(execution.job.completedAt).toLocaleString('en-NG') : 'not completed'}</p>{execution.job.lastErrorCode ? <p className="mt-1 text-xs text-error">Last error: {execution.job.lastErrorCode}</p> : null}{execution.job.resultCodes.length ? <p className="mt-1 text-xs text-secondary">Job result codes: {execution.job.resultCodes.join(', ')}</p> : null}</div> : <p className="text-xs text-secondary">No execution job returned.</p>}
              {execution.deletion ? <div><h5 className="font-bold">Deletion outcome groups</h5><p className="mt-1 text-xs text-secondary">{execution.deletion.counts.discovered} discovered · {execution.deletion.counts.completed} completed · {execution.deletion.counts.preserved} preserved · {execution.deletion.counts.blocked} blocked · {execution.deletion.counts.held} held · {execution.deletion.counts.eligible} eligible · {execution.deletion.counts.processing} processing</p><div className="mt-2 space-y-2">{execution.deletion.outcomes.map((outcome, index) => <div key={`${outcome.recordKind}:${outcome.category}:${outcome.state}:${outcome.reasonCode}:${index}`} className="rounded bg-white p-3 text-xs"><p className="font-bold capitalize">{readable(outcome.recordKind)} · {readable(outcome.category)} · {readable(outcome.state)} · {outcome.count} records</p><p className="mt-1 text-secondary">Reason: {outcome.reasonCode} · Proposed action: {readable(outcome.proposedAction)}</p></div>)}</div>{!execution.deletion.outcomes.length ? <p className="mt-2 text-xs text-secondary">No outcome groups returned yet.</p> : null}</div> : null}
              {execution.export !== null && execution.export !== undefined ? <div><p className="font-bold">Access export</p><p className="mt-1 text-xs text-secondary">An export record was returned. The current handoff does not define its status fields, so this screen does not infer whether it is ready or downloadable.</p></div> : <p className="text-xs text-secondary">No access export record was returned.</p>}
              {execution.resultCodes.length ? <p className="text-xs text-secondary">Result codes: {execution.resultCodes.join(', ')}</p> : null}
            </div> : <p className="mt-2 text-secondary">No execution record returned.</p> : null}
            <p className="mt-2 text-xs text-secondary">The server groups outcomes by record kind, category, state and reason; it does not return individual record IDs. Held and preserved counts reflect retention or legal-hold decisions only as returned.</p>
            {executionJobState && ['queued', 'processing', 'waiting_for_policy'].includes(executionJobState) && executionPollCount.current >= 12 ? <p className="mt-2 text-xs text-amber-800">Automatic refresh stopped after 12 checks. Use Refresh to check the latest state.</p> : null}
          </div>
        </div>
      ) : null}
      <p className="mt-4 text-xs text-amber-800">Withdrawal remains disabled because the current handoff does not specify its version-bound request body. Refresh the request to confirm its current state before contacting support.</p>
    </section>
  );
};

const DataProtectionRequests = () => {
  const { activeProfile } = useAuth();
  return <ScopedDataProtectionRequests key={activeProfile?.id ?? 'none'} />;
};

export default DataProtectionRequests;
