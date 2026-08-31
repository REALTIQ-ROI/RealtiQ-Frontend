/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import PublicLayout from '../../../components/layout/PublicLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { roiV1Cache } from '../../../features/roiV1/cache';
import { ApiRequestError } from '../../../lib/axios';
import { roiV1Service } from '../../../services/roiV1Service';
import type { RoiHistoryResponse } from '../../../types/roiV1';

const RoiV1HistoryPage = () => {
  const { propertyReference = '' } = useParams(); const { user } = useAuth(); const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1); const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 20)); const asOf = params.get('asOf') ?? '';
  const query = { page, limit, ...(asOf ? { asOf } : {}) };
  const [filter, setFilter] = useState(asOf ? asOf.slice(0, 16) : ''); const [data, setData] = useState<RoiHistoryResponse | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController(); const cached = roiV1Cache.getHistory(user._id, propertyReference, query); if (cached) setData((old) => ({ estimates: [...cached], pagination: old?.pagination ?? { page, limit, total: cached.length, pages: 1 } }));
    setLoading(true); setError('');
    roiV1Service.getPropertyHistory(propertyReference, query, controller.signal).then((next) => { if (!controller.signal.aborted) { roiV1Cache.setHistory(user._id, propertyReference, query, next.estimates); setData(next); } }).catch((e) => { if (!controller.signal.aborted) setError(e instanceof ApiRequestError && e.status === 403 ? 'Only the property owner or an administrator can view this history.' : e instanceof ApiRequestError && e.status === 404 ? 'Property not found.' : e instanceof ApiRequestError && e.status === 400 ? 'The evidence-date filter is invalid.' : e instanceof Error ? e.message : 'Unable to load history.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?._id, propertyReference, page, limit, asOf]);
  const apply = () => { const next: Record<string, string> = { page: '1', limit: String(limit) }; if (filter) next.asOf = new Date(filter).toISOString(); setParams(next); };
  return <PublicLayout><main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-8"><header><h1 className="text-3xl font-bold">ROI estimate history</h1><p>{propertyReference} Â· newest evidence date first</p></header><div className="flex flex-wrap items-end gap-3"><Input id="history-asof" label="At or before (your local time)" type="datetime-local" value={filter} onChange={(e) => setFilter(e.target.value)}/><Button onClick={apply}>Apply filter</Button></div>{loading && !data ? <LoadingState label="Loading estimate historyâ€¦"/> : error ? <div role="alert" className="rounded-lg border p-4">{error}</div> : !data?.estimates.length ? <div role="status" className="rounded-lg border p-5"><h2 className="text-xl font-bold">No estimates found</h2><p>No authorized estimates match this property and date filter.</p></div> : <div className="overflow-x-auto"><table className="min-w-full text-left"><thead><tr><th className="p-3">Reference</th><th className="p-3">Status</th><th className="p-3">Evidence as of</th><th className="p-3">Created</th></tr></thead><tbody>{data.estimates.map((roi) => <tr className="border-t" key={roi.publicReference}><td className="p-3"><Link className="font-bold text-primary" to={`/dashboard/roi-v1/estimates/${roi.publicReference}`}>{roi.publicReference}</Link></td><td className="p-3">{roi.status.replace(/_/g, ' ')}</td><td className="p-3">{new Date(roi.asOf).toLocaleString()}</td><td className="p-3">{new Date(roi.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}<nav aria-label="History pagination" className="flex items-center gap-3"><Button variant="secondary" disabled={page <= 1} onClick={() => setParams((old) => { old.set('page', String(page - 1)); return old; })}>Previous</Button><span>Page {data?.pagination.page ?? page} of {data?.pagination.pages ?? 0}</span><Button variant="secondary" disabled={!data || page >= data.pagination.pages} onClick={() => setParams((old) => { old.set('page', String(page + 1)); return old; })}>Next</Button></nav></main></PublicLayout>;
};
export default RoiV1HistoryPage;

