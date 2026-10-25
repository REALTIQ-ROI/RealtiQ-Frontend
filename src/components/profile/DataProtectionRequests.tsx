import { useEffect, useRef, useState, type ReactNode } from 'react';
import { dataProtectionService, type DataProtectionRequestSummary } from '../../services/dataProtectionService';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const readable = (value: string) => value.replaceAll('_', ' ');
const fieldLabel = (value: string) => readable(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2'));

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
  const [execution, setExecution] = useState<unknown>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const selectedId = useRef<string | null>(null);

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

  return (
    <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
      <h3 className="text-lg font-bold">Data protection requests</h3>
      <p className="mt-1 text-sm text-secondary">Current requests for your selected profile. Result codes and record outcomes determine what was completed or preserved.</p>
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
          <p className="mt-2 text-secondary">Requested scopes: {selected.scopes?.map(readable).join(', ') || 'See request status'}</p>
          {selected.correctionFields?.length ? <p className="mt-1 text-secondary">Correction fields: {selected.correctionFields.map(readable).join(', ')}</p> : null}
          {selected.resultCodes.length ? <p className="mt-2 text-secondary">Result codes: {selected.resultCodes.join(', ')}</p> : null}
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
            {!executionLoading && !executionError ? <div className="mt-2 rounded-lg bg-surface-container-low p-3">{serverFields(execution)}</div> : null}
          </div>
        </div>
      ) : null}
      <p className="mt-4 text-xs text-amber-800">Creating or withdrawing a request requires a server step-up challenge. Those actions are unavailable until its request contract is documented.</p>
    </section>
  );
};

const DataProtectionRequests = () => {
  const { activeProfile } = useAuth();
  return <ScopedDataProtectionRequests key={activeProfile?.id ?? 'none'} />;
};

export default DataProtectionRequests;
