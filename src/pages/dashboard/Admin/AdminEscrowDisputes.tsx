import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { formatDateTime, formatEscrowMoney } from '../../../components/escrow/escrowConfig';
import { escrowService } from '../../../services/escrowService';
import type { EscrowDisputeListResponse, EscrowDisputeStatus } from '../../../types/escrow';
import { escrowBuyer, escrowProperty, escrowSeller, populated } from '../../../types/escrow';

const statuses: Array<EscrowDisputeStatus | ''> = [
  '', 'open', 'under_review', 'awaiting_refund',
  'awaiting_seller_release', 'resolved', 'cancelled',
];

const AdminEscrowDisputes = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [data, setData] = useState<EscrowDisputeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const status = (searchParams.get('status') ?? '') as EscrowDisputeStatus | '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await escrowService.listAdminDisputes({
        page,
        limit: 20,
        status: status || undefined,
        search: searchParams.get('search')?.trim() || undefined,
      }));
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load escrow disputes.');
    } finally {
      setLoading(false);
    }
  }, [page, searchParams, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (search.trim()) next.set('search', search.trim());
      else next.delete('search');
      next.set('page', '1');
      if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search, searchParams, setSearchParams]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  return (
    <AdminLayout>
      <main className="min-h-screen space-y-6 p-4 sm:p-8 lg:p-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Escrow Management</p>
            <h1 className="mt-2 text-3xl font-extrabold text-primary">Escrow Disputes</h1>
            <p className="mt-2 text-sm text-secondary">Review participant disputes and submit controlled backend-authorized resolutions.</p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary">Refresh</button>
        </header>

        <section className="grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="text-sm font-bold">
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Property, buyer, seller, escrow" className="mt-1 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-bold">
            Status
            <select value={status} onChange={(event) => update('status', event.target.value)} className="mt-1 w-full rounded-lg bg-surface-container-low px-4 py-3 font-normal">
              {statuses.map((item) => <option key={item || 'all'} value={item}>{item ? item.replaceAll('_', ' ') : 'All statuses'}</option>)}
            </select>
          </label>
        </section>

        {loading ? <LoadingState label="Loading escrow disputes..." /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : !data?.items.length ? (
          <section className="rounded-xl bg-white p-12 text-center"><h2 className="font-bold">No disputes found</h2><p className="mt-1 text-sm text-secondary">Try another status or search.</p></section>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {data.items.map((dispute) => {
                const escrow = populated(dispute.escrow);
                const property = escrow ? escrowProperty(escrow) : null;
                return (
                  <article key={dispute._id} className="rounded-xl bg-white p-5">
                    <div className="flex justify-between gap-3"><h2 className="font-bold">{property?.title ?? 'Property escrow'}</h2><span className="text-xs font-bold capitalize">{dispute.status.replaceAll('_', ' ')}</span></div>
                    <p className="mt-2 text-sm">{dispute.reason}</p>
                    <p className="mt-3 text-lg font-black">{formatEscrowMoney(escrow?.amount ?? 0, escrow?.currency)}</p>
                    <p className="mt-2 text-xs text-secondary">{escrow ? `${escrowBuyer(escrow)?.name ?? 'Buyer'} · ${escrowSeller(escrow)?.name ?? 'Seller'}` : 'Participants unavailable'}</p>
                    <Link to={`/dashboard/admin/escrow-disputes/${dispute._id}`} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Review dispute</Link>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto rounded-xl bg-white lg:block">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-secondary"><tr><th className="p-4">Property</th><th className="p-4">Amount</th><th className="p-4">Buyer</th><th className="p-4">Seller</th><th className="p-4">Opened</th><th className="p-4">Status</th><th className="p-4">Reason</th><th className="p-4" /></tr></thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {data.items.map((dispute) => {
                    const escrow = populated(dispute.escrow);
                    const property = escrow ? escrowProperty(escrow) : null;
                    return <tr key={dispute._id}><td className="p-4 font-bold">{property?.title ?? 'Property escrow'}</td><td className="p-4">{formatEscrowMoney(escrow?.amount ?? 0, escrow?.currency)}</td><td className="p-4">{escrow ? escrowBuyer(escrow)?.name ?? 'Buyer' : '—'}</td><td className="p-4">{escrow ? escrowSeller(escrow)?.name ?? 'Seller' : '—'}</td><td className="p-4 text-xs">{formatDateTime(dispute.openedAt)}</td><td className="p-4 capitalize">{dispute.status.replaceAll('_', ' ')}</td><td className="max-w-xs truncate p-4">{dispute.reason}</td><td className="p-4"><Link className="font-bold text-primary hover:underline" to={`/dashboard/admin/escrow-disputes/${dispute._id}`}>Review</Link></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            <nav className="flex items-center justify-between rounded-xl bg-white p-4" aria-label="Dispute pagination">
              <button type="button" disabled={data.pagination.page <= 1} onClick={() => update('page', String(page - 1))} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button>
              <span className="text-sm">Page {data.pagination.page} of {Math.max(1, data.pagination.pages)}</span>
              <button type="button" disabled={data.pagination.page >= data.pagination.pages} onClick={() => update('page', String(page + 1))} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-40">Next</button>
            </nav>
          </>
        )}
      </main>
    </AdminLayout>
  );
};

export default AdminEscrowDisputes;
