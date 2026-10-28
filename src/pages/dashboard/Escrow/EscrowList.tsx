import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import MediaPreview from '../../../components/property/MediaPreview';
import EscrowRoleLayout from '../../../components/escrow/EscrowRoleLayout';
import EscrowStatusBadge from '../../../components/escrow/EscrowStatusBadge';
import { ESCROW_STATUS, formatDateTime, formatEscrowMoney, requiredProgress } from '../../../components/escrow/escrowConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { escrowErrorDetails, escrowService } from '../../../services/escrowService';
import { propertyService } from '../../../services/propertyService';
import type { Property } from '../../../types';
import type { Escrow, EscrowStatus } from '../../../types/escrow';
import { escrowBuyer, escrowProperty, escrowSeller } from '../../../types/escrow';

const refundFilters: { status: EscrowStatus; label: string }[] = [{ status: 'refund_pending', label: 'Action required' }, { status: 'refund_processing', label: 'Refund processing' }, { status: 'release_processing', label: 'Seller payout processing' }, { status: 'cancellation_pending_refund', label: 'Cancellation refund' }, { status: 'refund_failed', label: 'Failed' }, { status: 'refunded', label: 'Completed' }];
const ConditionsProgress = ({ complete, total, percent, loading, unavailable, errorMessage, onRetry }: { complete: number; total: number; percent: number; loading: boolean; unavailable: boolean; errorMessage?: string; onRetry: () => void }) => loading ? <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-xs text-secondary" role="status"><LoaderCircle className="mr-1 inline-block h-4 w-4 animate-spin align-middle" aria-hidden="true" />Loading release conditions...</div> : unavailable ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3 text-xs text-secondary" role="status"><span>{errorMessage ?? 'Release conditions are unavailable for this escrow.'}</span><button type="button" onClick={onRetry} className="font-bold text-primary underline">Retry</button></div> : total > 0 ? <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span>Required conditions</span><span>{complete}/{total}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-container" role="progressbar" aria-label="Required conditions completed" aria-valuemin={0} aria-valuemax={total} aria-valuenow={complete}><div className="h-full bg-primary" style={{ width: `${percent}%` }} /></div></div> : <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-xs text-secondary">No required release conditions.</div>;

type DetailState = 'loading' | 'loaded' | 'error';
interface EscrowHydrationState {
  scopeKey: string;
  details: Record<string, Escrow>;
  detailStates: Record<string, DetailState>;
  detailErrors: Record<string, string>;
  propertyDetails: Record<string, Property>;
}
const emptyHydration = (scopeKey: string): EscrowHydrationState => ({ scopeKey, details: {}, detailStates: {}, detailErrors: {}, propertyDetails: {} });
const escrowIdentifier = (escrow: Escrow): string | undefined => {
  if (typeof escrow._id === 'string' && escrow._id.trim()) return escrow._id;
  if (typeof escrow.id === 'string' && escrow.id.trim()) return escrow.id;
  return undefined;
};
const escrowPropertyId = (escrow: Escrow) => {
  const value = escrow.property ?? escrow.propertyId;
  return typeof value === 'string' ? value : value?._id ?? value?.publicReference ?? null;
};

const EscrowList = () => {
  const { user, activeProfile } = useAuth();
  const [query, setQuery] = useState(''); const [status, setStatus] = useState<'' | EscrowStatus>('');
  const detailRequests = useRef(new Map<string, Promise<void>>());
  const propertyRequests = useRef(new Map<string, Promise<void>>());
  const scopeKey = `${user?._id ?? ''}:${activeProfile?.id ?? ''}`;
  const scopeRef = useRef(scopeKey);
  const generation = useRef(0);
  const [hydration, setHydration] = useState<EscrowHydrationState>(() => emptyHydration(scopeKey));
  const visibleHydration = hydration.scopeKey === scopeKey ? hydration : emptyHydration(scopeKey);
  const updateHydration = useCallback((requestScope: string, update: (current: EscrowHydrationState) => EscrowHydrationState) => {
    setHydration((current) => update(current.scopeKey === requestScope ? current : emptyHydration(requestScope)));
  }, []);
  const { data, loading, error, execute } = useAsync(escrowService.list, true, scopeKey);

  const loadProperty = useCallback((id: string, requestGeneration: number, requestScope: string) => {
    const requestKey = `${requestScope}:${requestGeneration}:${id}`;
    const existing = propertyRequests.current.get(requestKey);
    if (existing) return existing;
    const request = propertyService.getPropertyById(id)
      .then((property) => {
        if (generation.current === requestGeneration && scopeRef.current === requestScope) {
          updateHydration(requestScope, (current) => ({ ...current, propertyDetails: { ...current.propertyDetails, [id]: property } }));
        }
      })
      .catch(() => { /* The card keeps its safe image placeholder if the property is unavailable. */ })
      .finally(() => propertyRequests.current.delete(requestKey));
    propertyRequests.current.set(requestKey, request);
    return request;
  }, [updateHydration]);

  const loadEscrowDetails = useCallback((escrow: Escrow, requestGeneration: number, requestScope: string) => {
    const id = escrowIdentifier(escrow);
    if (!id) return Promise.resolve();
    const requestKey = `${requestScope}:${requestGeneration}:${id}`;
    const existing = detailRequests.current.get(requestKey);
    if (existing) return existing;
    updateHydration(requestScope, (current) => ({ ...current, detailStates: { ...current.detailStates, [id]: 'loading' } }));
    const request = (async () => {
      let resolvedEscrow = escrow;
      try {
        resolvedEscrow = await escrowService.get(id);
        if (generation.current === requestGeneration && scopeRef.current === requestScope) {
          updateHydration(requestScope, (current) => ({
            ...current,
            details: { ...current.details, [id]: resolvedEscrow },
            detailStates: { ...current.detailStates, [id]: 'loaded' },
            detailErrors: { ...current.detailErrors, [id]: '' },
          }));
        }
      } catch (raw) {
        if (generation.current === requestGeneration && scopeRef.current === requestScope) {
          const error = escrowErrorDetails(raw);
          const message = error.status === 401
            ? 'Your session expired. Sign in again, then retry loading release conditions.'
            : error.status === 403
              ? 'Your current profile is not authorized to view release conditions for this escrow. Escrow reads require participant access or authorized Finance access.'
              : error.status === 404
                ? 'This escrow’s release conditions are unavailable for the current profile.'
                : raw instanceof Error ? error.message : 'The escrow service could not load release conditions. Retry in a moment.';
          updateHydration(requestScope, (current) => ({
            ...current,
            detailStates: { ...current.detailStates, [id]: 'error' },
            detailErrors: { ...current.detailErrors, [id]: message },
          }));
        }
      }

      const property = escrowProperty(resolvedEscrow) ?? escrowProperty(escrow);
      if (!property?.media?.some((media) => Boolean(media.url))) {
        const propertyId = escrowPropertyId(resolvedEscrow) ?? escrowPropertyId(escrow);
        if (propertyId) await loadProperty(propertyId, requestGeneration, requestScope);
      }
    })().finally(() => detailRequests.current.delete(requestKey));
    detailRequests.current.set(requestKey, request);
    return request;
  }, [loadProperty, updateHydration]);

  useEffect(() => {
    scopeRef.current = scopeKey;
    generation.current += 1;
  }, [scopeKey]);

  useEffect(() => {
    const requestGeneration = generation.current;
    const requestScope = scopeKey;
    (data ?? []).forEach((escrow) => {
      const property = escrowProperty(escrow);
      const needsDetails = escrow.rules === undefined;
      const needsPropertyImage = !property?.media?.some((media) => Boolean(media.url));
      if (needsDetails && escrowIdentifier(escrow)) {
        void loadEscrowDetails(escrow, requestGeneration, requestScope);
      } else if (needsPropertyImage) {
        const propertyId = escrowPropertyId(escrow);
        if (propertyId) void loadProperty(propertyId, requestGeneration, requestScope);
      }
    });
  }, [data, scopeKey, loadEscrowDetails, loadProperty]);

  const retryDetails = (escrow: Escrow) => {
    const requestGeneration = generation.current;
    void loadEscrowDetails(escrow, requestGeneration, scopeKey);
  };

  const escrows = useMemo(() => (data ?? []).map((escrow) => { const id = escrowIdentifier(escrow); return id && visibleHydration.details[id] ? { ...escrow, ...visibleHydration.details[id] } : escrow; }).filter((escrow) => { const property = escrowProperty(escrow); const buyer = escrowBuyer(escrow); const seller = escrowSeller(escrow); return (!status || escrow.status === status) && (!query.trim() || `${property?.title ?? ''} ${property?.location ?? ''} ${buyer?.name ?? ''} ${seller?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())); }), [data, query, status, visibleHydration.details]);
  const base = user?.role === 'admin' ? '/dashboard/admin/escrows' : user?.role === 'landlord' ? '/dashboard/landlord/escrows' : '/dashboard/buyer/escrows';
  return <EscrowRoleLayout title={user?.role === 'admin' ? 'Escrow Management' : user?.role === 'landlord' ? 'Property Escrows' : 'My Escrows'} subtitle="Track secured payments, refunds, disputes, and ownership completion.">
    {user?.role === 'admin' ? <section className="mb-5 rounded-xl bg-white p-4"><h2 className="text-sm font-bold">Refund queue</h2><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setStatus('')} className="rounded-full border px-3 py-2 text-xs font-bold">All escrows</button>{refundFilters.map((item) => <button type="button" key={item.status} onClick={() => setStatus(item.status)} className={`rounded-full px-3 py-2 text-xs font-bold ${status === item.status ? 'bg-primary text-on-primary' : 'bg-surface-container-low'}`}>{item.label} ({(data ?? []).filter((escrow) => escrow.status === item.status).length})</button>)}</div></section> : null}
    <div className="mb-6 flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-lg bg-surface-container-low px-3"><span className="material-symbols-outlined">search</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search property or participant" className="w-full bg-transparent py-3 text-sm outline-none" /></label><select aria-label="Escrow status" value={status} onChange={(event) => setStatus(event.target.value as '' | EscrowStatus)} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm"><option value="">All statuses</option>{Object.entries(ESCROW_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></div>
    {loading ? <LoadingState label="Loading escrows..." /> : error ? <ErrorState message={error} onRetry={() => void execute()} /> : escrows.length === 0 ? <div className="rounded-xl bg-white p-12 text-center"><span className="material-symbols-outlined text-5xl text-secondary/40">shield_lock</span><h2 className="mt-3 font-bold">No escrows found</h2><p className="mt-1 text-sm text-secondary">Escrows matching your filters will appear here.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{escrows.map((escrow, index) => { const id = escrowIdentifier(escrow); const baseProperty = escrowProperty(escrow); const propertyId = escrowPropertyId(escrow); const property = (propertyId ? visibleHydration.propertyDetails[propertyId] : undefined) ?? baseProperty; const buyer = escrowBuyer(escrow); const progress = requiredProgress(escrow); const refund = escrow.status.startsWith('refund') || escrow.status === 'refunded' || ['cancellation_pending_refund', 'cancelled_refunded'].includes(escrow.status); const detailState = id ? visibleHydration.detailStates[id] : undefined; return <article key={id ?? `${propertyId ?? 'escrow'}-${index}`} className="rounded-xl bg-white p-4 shadow-sm sm:p-5"><div className="flex gap-4"><div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg"><MediaPreview media={property?.media?.find((media) => Boolean(media.url))} alt={property?.title ?? 'Property'} className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="truncate font-bold">{property?.title ?? 'Property escrow'}</h2><p className="truncate text-xs text-secondary">{property?.location ?? 'Location unavailable'}</p></div><EscrowStatusBadge status={escrow.status} /></div><p className="mt-2 text-lg font-black text-primary">{formatEscrowMoney(escrow.amount, escrow.currency ?? property?.currency)}</p></div></div>{refund ? <div className="mt-4 grid gap-2 rounded-lg bg-surface-container-low p-3 text-xs sm:grid-cols-2"><p><strong>Buyer:</strong> {buyer?.name ?? 'Buyer'}</p><p><strong>Requested:</strong> {formatDateTime(escrow.refundRequestedAt ?? undefined)}</p><p><strong>Processing:</strong> {formatDateTime(escrow.refundProcessingAt ?? undefined)}</p><p><strong>Next:</strong> {escrow.status === 'refund_pending' ? 'Request/verify details' : escrow.status === 'refund_failed' ? 'Review and retry' : ['refund_processing', 'cancellation_pending_refund'].includes(escrow.status) ? 'Await confirmation' : 'Complete'}</p></div> : <ConditionsProgress {...progress} loading={escrow.rules === undefined && detailState === 'loading'} unavailable={escrow.rules === undefined} errorMessage={id ? visibleHydration.detailErrors[id] : undefined} onRetry={() => retryDetails(escrow)} />}<div className="mt-4 flex items-center justify-between gap-3"><time className="text-xs text-secondary">Created {formatDateTime(escrow.createdAt)}</time>{id ? <Link to={`${base}/${id}`} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary">{refund ? 'Open refund' : 'View escrow'}</Link> : <span className="text-xs text-secondary">Escrow reference unavailable</span>}</div></article>; })}</div>}
  </EscrowRoleLayout>;
};
export default EscrowList;
