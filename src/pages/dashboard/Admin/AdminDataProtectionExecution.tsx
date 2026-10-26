import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { dataProtectionService, type DataProtectionExecution } from '../../../services/dataProtectionService';

const readable = (value: string) => value.replaceAll('_', ' ');

const processingStates = new Set(['queued', 'processing', 'waiting_for_policy']);

const AdminDataProtectionExecutionContent = () => {
  const [requestId, setRequestId] = useState('');
  const [loadedRequestId, setLoadedRequestId] = useState('');
  const [execution, setExecution] = useState<DataProtectionExecution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollTick, setPollTick] = useState(0);
  const pollCount = useRef(0);

  const refresh = async () => {
    const id = requestId.trim();
    if (!id || loading) return;
    setLoading(true); setError(null);
    try {
      const result = await dataProtectionService.adminExecution(id);
      setExecution(result);
      setLoadedRequestId(id);
      pollCount.current = 0;
      setPollTick((tick) => tick + 1);
      setPolling(processingStates.has(result.job?.state ?? result.state));
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load the authorized execution record.'); }
    finally { setLoading(false); }
  };

  const jobState = execution?.job?.state ?? execution?.state;
  useEffect(() => {
    if (!polling || !loadedRequestId || !jobState || !processingStates.has(jobState)) return;
    if (pollCount.current >= 12) { setPolling(false); return; }
    const timer = window.setTimeout(() => {
      pollCount.current += 1;
      void dataProtectionService.adminExecution(loadedRequestId).then((result) => {
        setExecution(result);
      setPollTick((tick) => tick + 1);
        if (!processingStates.has(result.job?.state ?? result.state)) setPolling(false);
      }).catch((raw: unknown) => { setError(raw instanceof Error ? raw.message : 'Unable to refresh execution progress.'); setPolling(false); });
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [jobState, loadedRequestId, pollTick, polling]);

  return <AdminLayout><main className="mx-auto max-w-6xl space-y-6 p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Data protection staff view</p><h1 className="mt-2 text-3xl font-black">Execution outcomes</h1><p className="mt-2 max-w-3xl text-sm text-secondary">The backend returns grouped results and aggregate counts only. Staff execution lookup is authorized and rechecked by the server.</p></header>
    <section className="rounded-2xl border border-outline-variant/10 bg-white p-6"><label htmlFor="privacy-request-id" className="block text-sm font-bold">Data-protection request ID</label><div className="mt-2 flex flex-wrap gap-2"><input id="privacy-request-id" value={requestId} onChange={(event) => setRequestId(event.target.value)} className="min-w-[260px] flex-1 rounded-lg border border-outline-variant/20 px-3 py-2" placeholder="Request ID" /><Button type="button" disabled={!requestId.trim() || loading} loading={loading} loadingLabel="Loading…" onClick={() => void refresh()}>Load execution</Button>{execution ? <Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh()}>Refresh</Button> : null}</div>{error ? <p role="alert" className="mt-3 text-sm text-error">{error}</p> : null}</section>
    {execution ? <section className="space-y-5 rounded-2xl border border-outline-variant/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{readable(execution.state)} · version {execution.version}</h2><p className="mt-1 text-xs text-secondary">Request {execution.requestId} · completed {execution.completedAt ?? 'not completed'}</p></div><span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold">{polling ? 'Refreshing every 10 seconds' : 'Manual refresh available'}</span></div>
      {execution.job ? <div className="rounded-lg bg-surface-container-low p-4"><h3 className="font-bold">Job {readable(execution.job.state)}</h3><p className="mt-1 text-xs text-secondary">{execution.job.progress.discovered} discovered · {execution.job.progress.completed} completed · {execution.job.progress.preserved} preserved · {execution.job.progress.blocked} blocked · {execution.job.progress.processing} processing · {execution.job.attempts} attempts</p><p className="mt-1 text-xs text-secondary">Due {execution.job.dueAt ?? 'not scheduled'} · Completed {execution.job.completedAt ?? 'not completed'}</p>{execution.job.lastErrorCode ? <p className="mt-1 text-sm text-error">Last error: {execution.job.lastErrorCode}</p> : null}{execution.job.resultCodes.length ? <p className="mt-1 text-xs">Result codes: {execution.job.resultCodes.join(', ')}</p> : null}</div> : <p className="rounded-lg bg-surface-container-low p-4 text-sm">No execution job was returned.</p>}
      {execution.deletion ? <div><h3 className="font-bold">Deletion counts</h3><p className="mt-1 text-sm text-secondary">{execution.deletion.counts.discovered} discovered · {execution.deletion.counts.completed} completed · {execution.deletion.counts.preserved} preserved · {execution.deletion.counts.blocked} blocked · {execution.deletion.counts.held} held · {execution.deletion.counts.eligible} eligible · {execution.deletion.counts.processing} processing</p><h4 className="mt-4 font-bold">Grouped outcomes</h4><div className="mt-2 space-y-2">{execution.deletion.outcomes.map((outcome, index) => <div key={`${outcome.recordKind}:${outcome.category}:${outcome.state}:${outcome.reasonCode}:${index}`} className="rounded-lg bg-surface-container-low p-3"><p className="font-bold capitalize">{readable(outcome.recordKind)} · {readable(outcome.category)} · {readable(outcome.state)} · {outcome.count} records</p><p className="mt-1 text-xs text-secondary">{outcome.reasonCode} · proposed action: {readable(outcome.proposedAction)}</p></div>)}{!execution.deletion.outcomes.length ? <p className="text-sm text-secondary">No grouped outcomes returned yet.</p> : null}</div></div> : null}
      {execution.export !== null && execution.export !== undefined ? <div className="rounded-lg bg-surface-container-low p-4"><h3 className="font-bold">Access export</h3><p className="mt-1 text-sm">An export record was returned. Its status fields are not defined by the current handoff.</p></div> : <p className="text-sm text-secondary">No access export record was returned.</p>}
      {execution.completionNotice ? <div className="rounded-lg border border-outline-variant/10 p-4"><h3 className="font-bold">Staff completion notice</h3><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold text-secondary">State</dt><dd>{execution.completionNotice.state}</dd></div><div><dt className="text-xs font-bold text-secondary">Outcome</dt><dd>{execution.completionNotice.outcome}</dd></div><div><dt className="text-xs font-bold text-secondary">Attempts</dt><dd>{execution.completionNotice.attempts}</dd></div><div><dt className="text-xs font-bold text-secondary">Last error</dt><dd>{execution.completionNotice.lastErrorCode ?? 'None returned'}</dd></div><div><dt className="text-xs font-bold text-secondary">Accepted at</dt><dd>{execution.completionNotice.acceptedAt ?? 'Not accepted'}</dd></div></dl></div> : null}
      {execution.resultCodes.length ? <p className="text-xs text-secondary">Execution result codes: {execution.resultCodes.join(', ')}</p> : null}
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Outcome groups do not include individual record IDs. No individual record rows are inferred from these totals.{polling ? '' : pollCount.current >= 12 && processingStates.has(jobState ?? '') ? ' Automatic refresh stopped after 12 checks; refresh manually for a later state.' : ''}</p>
    </section> : null}
  </main></AdminLayout>;
};

const AdminDataProtectionExecution = () => {
  const { activeProfile } = useAuth();
  return <AdminDataProtectionExecutionContent key={activeProfile?.id ?? 'none'} />;
};

export default AdminDataProtectionExecution;
