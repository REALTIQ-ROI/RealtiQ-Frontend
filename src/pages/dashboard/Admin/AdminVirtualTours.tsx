import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { virtualTourService, type AdminVirtualTourListParams } from '../../../services/virtualTourService';
import type { AdminVirtualTourListResponse, ProviderHealthResponse, VirtualTourProvider, VirtualTourStatus } from '../../../types/virtualTour';

const AdminVirtualTours = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<AdminVirtualTourListResponse | null>(null);
  const [health, setHealth] = useState<ProviderHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const queryKey = searchParams.toString();
  const params: AdminVirtualTourListParams = useMemo(() => {
    const query = new URLSearchParams(queryKey);
    return {
      provider: (query.get('provider') || undefined) as VirtualTourProvider | undefined,
      status: (query.get('status') || undefined) as VirtualTourStatus | undefined,
      project: query.get('project') || undefined,
      property: query.get('property') || undefined,
      owner: query.get('owner') || undefined,
      page: Number(query.get('page') || 1), limit: 20,
    };
  }, [queryKey]);
  useEffect(() => {
    let active = true;
    Promise.all([virtualTourService.listAdminVirtualTours(params), virtualTourService.getAdminVirtualTourProviderHealth()])
      .then(([items, providerHealth]) => { if (active) { setResult(items); setHealth(providerHealth); setError(null); } })
      .catch((raw: unknown) => { if (active) setError(raw instanceof Error ? raw.message : 'Unable to load virtual tours.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params, refreshVersion]);
  const load = () => { setLoading(true); setRefreshVersion((value) => value + 1); };
  const update = (key: string, value: string) => { const next = new URLSearchParams(searchParams); if (value) next.set(key, value); else next.delete(key); next.set('page', '1'); setSearchParams(next); };
  return <AdminLayout><main className="mx-auto max-w-7xl space-y-6 p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Provider-neutral operations</p><h1 className="text-3xl font-black">Virtual Tours</h1></header>
    {health ? <section className="grid gap-4 md:grid-cols-2">{(['realsee', 'matterport'] as const).map((provider) => { const item = health[provider]; const state = item.reachable === null ? 'Validated per Work URL' : item.reachable ? 'Reachable' : item.configured ? 'Configured, unreachable' : 'Not configured'; return <div key={provider} className="rounded-xl bg-white p-5"><p className="font-black capitalize">{provider}</p><p className="text-sm text-secondary">{state} · {item.mode}</p></div>; })}</section> : null}
    <section className="grid gap-3 rounded-xl bg-white p-5 md:grid-cols-5">
      <select aria-label="Provider filter" value={params.provider ?? ''} onChange={(event) => update('provider', event.target.value)} className="rounded-lg border p-2"><option value="">All providers</option><option value="realsee">Realsee</option><option value="matterport">Matterport</option></select>
      <select aria-label="Status filter" value={params.status ?? ''} onChange={(event) => update('status', event.target.value)} className="rounded-lg border p-2"><option value="">All statuses</option>{['not_configured','processing','ready','failed','disabled'].map((status) => <option key={status} value={status}>{status}</option>)}</select>
      {['project','property','owner'].map((key) => <input key={key} aria-label={`${key} filter`} placeholder={key} defaultValue={searchParams.get(key) ?? ''} onBlur={(event) => update(key, event.target.value.trim())} className="rounded-lg border p-2" />)}
    </section>
    {loading ? <LoadingState label="Loading virtual tours..." /> : error ? <ErrorState message={error} onRetry={load} /> : <section className="overflow-x-auto rounded-xl bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-4">Property</th><th>Project</th><th>Owner</th><th>Resolved</th><th>Status</th><th /></tr></thead><tbody>{result?.items.map((item) => <tr key={item.property.id} className="border-b border-outline-variant/10"><td className="p-4"><strong>{item.property.title}</strong><br/><span className="text-xs text-secondary">{item.property.publicReference}</span></td><td>{item.project?.name ?? '—'}</td><td>{item.owner?.name ?? '—'}</td><td>{item.resolvedProvider ?? 'none'}{item.fallbackUsed ? ' (fallback)' : ''}</td><td>{item.resolvedProvider ? item.providers[item.resolvedProvider].status : 'not configured'}</td><td><Link className="font-bold text-primary underline" to={`/dashboard/admin/virtual-tours/${item.property.publicReference || item.property.id}`}>Safe detail</Link></td></tr>)}</tbody></table>{!result?.items.length ? <p className="p-8 text-center text-secondary">No virtual-tour records match these filters.</p> : null}</section>}
    {result && result.total > result.limit ? <div className="flex justify-end gap-2"><Button variant="secondary" disabled={result.page <= 1} onClick={() => update('page', String(result.page - 1))}>Previous</Button><Button variant="secondary" disabled={result.page * result.limit >= result.total} onClick={() => update('page', String(result.page + 1))}>Next</Button></div> : null}
  </main></AdminLayout>;
};
export default AdminVirtualTours;
