import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import MediaPreview from '../../../components/property/MediaPreview';
import EscrowRoleLayout from '../../../components/escrow/EscrowRoleLayout';
import EscrowStatusBadge from '../../../components/escrow/EscrowStatusBadge';
import { ESCROW_STATUS, formatDateTime, formatEscrowMoney, requiredProgress } from '../../../components/escrow/escrowConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { escrowService } from '../../../services/escrowService';
import type { EscrowStatus } from '../../../types/escrow';
import { escrowBuyer, escrowProperty, escrowSeller } from '../../../types/escrow';

const EscrowList = () => {
  const { user } = useAuth();
  const { data, loading, error, execute } = useAsync(escrowService.list, true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'' | EscrowStatus>('');
  const escrows = useMemo(() => (data ?? []).filter((escrow) => {
    const property = escrowProperty(escrow); const buyer = escrowBuyer(escrow); const seller = escrowSeller(escrow);
    return (!status || escrow.status === status) && (!query.trim() || `${property?.title ?? ''} ${property?.location ?? ''} ${buyer?.name ?? ''} ${seller?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  }), [data, query, status]);
  const base = user?.role === 'admin' ? '/dashboard/admin/escrows' : user?.role === 'landlord' ? '/dashboard/landlord/escrows' : '/dashboard/buyer/escrows';
  const title = user?.role === 'admin' ? 'Escrow Management' : user?.role === 'landlord' ? 'Property Escrows' : 'My Escrows';

  return <EscrowRoleLayout title={title} subtitle="Track secured payments, release conditions, disputes, and ownership completion.">
    <div className="mb-6 flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-lg bg-surface-container-low px-3"><span className="material-symbols-outlined">search</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search property or participant" className="w-full bg-transparent py-3 text-sm outline-none" /></label><select value={status} onChange={(event) => setStatus(event.target.value as '' | EscrowStatus)} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm"><option value="">All statuses</option>{Object.entries(ESCROW_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></div>
    {loading ? <LoadingState label="Loading escrows..." /> : error ? <ErrorState message={error} onRetry={() => void execute()} /> : escrows.length === 0 ? <div className="rounded-xl bg-white p-12 text-center"><span className="material-symbols-outlined text-5xl text-secondary/40">shield_lock</span><h2 className="mt-3 font-bold">No escrows found</h2><p className="mt-1 text-sm text-secondary">Escrows matching your filters will appear here.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{escrows.map((escrow) => { const property = escrowProperty(escrow); const buyer = escrowBuyer(escrow); const seller = escrowSeller(escrow); const progress = requiredProgress(escrow); return <article key={escrow._id} className="rounded-xl bg-white p-4 shadow-sm sm:p-5"><div className="flex gap-4"><div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg"><MediaPreview media={property?.media?.[0]} alt={property?.title ?? 'Property'} className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="truncate font-bold">{property?.title ?? 'Property escrow'}</h2><p className="truncate text-xs text-secondary">{property?.location ?? 'Location unavailable'}</p></div><EscrowStatusBadge status={escrow.status} /></div><p className="mt-2 text-lg font-black text-primary">{formatEscrowMoney(escrow.amount, escrow.currency ?? property?.currency)}</p></div></div>{user?.role === 'admin' ? <p className="mt-4 text-xs text-secondary">Buyer: {buyer?.name ?? '—'} · Seller: {seller?.name ?? '—'}</p> : null}<div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span>Required conditions</span><span>{progress.complete}/{progress.total}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full bg-primary" style={{ width: `${progress.percent}%` }} /></div></div><div className="mt-4 flex items-center justify-between gap-3"><time className="text-xs text-secondary">Created {formatDateTime(escrow.createdAt)}</time><Link to={`${base}/${escrow._id}`} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary">View escrow</Link></div></article>; })}</div>}
  </EscrowRoleLayout>;
};
export default EscrowList;
