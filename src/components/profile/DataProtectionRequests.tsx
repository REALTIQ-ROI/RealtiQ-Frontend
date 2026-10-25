import { useEffect, useState } from 'react';
import { dataProtectionService, type DataProtectionRequestSummary } from '../../services/dataProtectionService';
import Button from '../ui/Button';

const readable = (value: string) => value.replaceAll('_', ' ');

const DataProtectionRequests = () => {
  const [requests, setRequests] = useState<DataProtectionRequestSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<DataProtectionRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const open = async (id: string) => {
    setError(null);
    try {
      setSelected(await dataProtectionService.detail(id));
    } catch (raw) {
      setSelected(null);
      setError(raw instanceof Error ? raw.message : 'Unable to load the request.');
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
        </div>
      ) : null}
      <p className="mt-4 text-xs text-amber-800">Creating or withdrawing a request requires a server step-up challenge. Those actions are unavailable until its request contract is documented.</p>
    </section>
  );
};

export default DataProtectionRequests;
