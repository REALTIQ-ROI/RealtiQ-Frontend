import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../../components/layout/AdminLayout';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import LandlordPortalLayout from '../../components/layout/LandlordPortalLayout';
import PropertySearchSelect from '../../components/forms/PropertySearchSelect';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import { useAsync } from '../../hooks/useAsync';
import { propertyService } from '../../services/propertyService';
import { tourService } from '../../services/tourService';
import { propertyRouteReference, type Property, type Tour, type TourMode, type TourStatus, type TourType } from '../../types';

const statusClasses: Record<TourStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-slate-100 text-slate-700',
};

const toLabel = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const TOUR_TYPES: Array<{ value: TourType; label: string }> = [
  { value: 'open_house', label: 'Open House' },
  { value: 'staging_view', label: 'Staging View' },
];

const TOUR_MODES: Array<{ value: TourMode; label: string }> = [
  { value: 'physical', label: 'Physical' },
  { value: 'virtual', label: 'Virtual' },
];

const propertyKeys = (property: { _id?: string; id?: string; publicReference?: string | null }) =>
  [property._id, property.id, property.publicReference].filter(Boolean) as string[];

const formatPropertyRef = (
  propertyRef: Tour['property'],
  propertyLookup: Map<string, Property>,
) => {
  if (!propertyRef) return 'Property unavailable';
  const lookupTitle = propertyKeys(propertyRef).map((key) => propertyLookup.get(key)?.title).find(Boolean);
  return propertyRef.title ?? lookupTitle ?? propertyRef.id;
};

const Tours = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') ?? '';
  const [page, setPage] = useState(1);
  const { data: tourData, loading, error, execute } = useAsync(() => tourService.getTours({ page, limit: 25 }), true, page);
  const {
    data: propertyData,
    loading: loadingProperties,
    error: propertyError,
  } = useAsync(() => propertyService.getProperties({ limit: 500 }), user?.role === 'buyer');
  const tours = useMemo(() => tourData?.tours ?? [], [tourData]);
  const allProperties = useMemo(() => propertyData?.properties ?? [], [propertyData]);
  const properties = useMemo(() => allProperties.filter((property) => property.status === 'available'), [allProperties]);
  const propertyLookup = useMemo(() => {
    const lookup = new Map<string, Property>();
    allProperties.forEach((property) => {
      propertyKeys(property).forEach((key) => lookup.set(key, property));
      const routeReference = propertyRouteReference(property);
      if (routeReference) lookup.set(routeReference, property);
    });
    return lookup;
  }, [allProperties]);
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [type, setType] = useState<TourType>('open_house');
  const [mode, setMode] = useState<TourMode>('physical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, TourStatus>>({});
  const [query, setQuery] = useState('');

  const filteredTours = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tours;
    return tours.filter((tour) => {
      const propertyRef = tour.property;
      const haystack = [
        tour.id,
        formatPropertyRef(propertyRef, propertyLookup),
        tour.type,
        tour.mode,
        tour.status,
        tour.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [propertyLookup, query, tours]);

  const handleRequestTour = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyId.trim() || !scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
      toast.error('Choose a property and a valid viewing time.');
      return;
    }

    setSubmitting(true);
    try {
      const requestPropertyId = propertyLookup.get(propertyId.trim())?._id ?? propertyId.trim();
      const response = await tourService.requestTour({
        propertyId: requestPropertyId,
        type: type as 'open_house' | 'staging_view',
        mode,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes.trim() || undefined,
      });
      toast.success(`Viewing request ${response.tour.id} submitted.`);
      setNotes('');
      setScheduledAt('');
      await execute();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to request tour.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTourStatus = async (tour: Tour) => {
    const nextStatus = statusUpdates[tour.id];
    if (!nextStatus || nextStatus === tour.status) return;

    try {
      if (nextStatus === 'cancelled') return;
      await tourService.updateTourStatus(tour.id, { status: nextStatus, expectedVersion: tour.version });
      toast.success('Tour status updated.');
      await execute();
    } catch (err) {
      toast.error(err instanceof ApiRequestError && err.status === 409 ? 'This viewing changed on the server. The list has been refreshed; review it before updating again.' : err instanceof Error ? err.message : 'Unable to update tour status.');
      if (err instanceof ApiRequestError && err.status === 409) await execute();
    }
  };

  const searchInput = (
    <div className="relative w-full max-w-md">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
      <input
        className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20 outline-none"
        placeholder="Search tours..."
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );

  const body = (
    <div className="p-8 max-w-6xl mx-auto">
      {user?.role === 'admin' ? (
        <header className="mb-8 flex flex-col gap-3">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-primary">Tours</h2>
              <p className="text-sm font-medium text-secondary tracking-widest uppercase">Tour Module</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {searchInput}
              <Link
                className="px-4 py-2 rounded-lg bg-surface-container-low text-sm font-bold"
                to={user?.role === 'admin' ? '/dashboard/admin/installments' : '/dashboard/buyer/installments'}
              >
                Installments
              </Link>
            </div>
          </div>
          <p className="text-secondary text-sm">Review, approve, and complete tour requests.</p>
        </header>
      ) : null}

      {user?.role === 'buyer' ? (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Tour Request</h2>
          <Card className="p-5">
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(event) => void handleRequestTour(event)}>
              <div className="md:col-span-2">
                <PropertySearchSelect
                  label="Property"
                  properties={properties}
                  value={propertyId}
                  loading={loadingProperties}
                  onChange={(property) => setPropertyId(property?._id ?? '')}
                  placeholder="Search available properties..."
                  emptyMessage="No available properties found."
                  helperText={propertyError ?? undefined}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Tour Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as TourType)} className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm">
                  {TOUR_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value as TourMode)} className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm">
                  {TOUR_MODES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Scheduled At</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm outline-none"
                  placeholder="Need a virtual walkthrough"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Submitting...' : 'Request Tour'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading tours..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}

      {!loading && !error ? (
        filteredTours.length > 0 ? (
          <div className="space-y-4">
            {filteredTours.map((tour) => (
              <article key={tour.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{tour.id}</h3>
                    <p className="text-sm text-secondary">
                      {toLabel(tour.type)} - {toLabel(tour.mode)}
                    </p>
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClasses[tour.status]}`}>
                    {tour.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Property</p>
                    <p className="font-semibold">{formatPropertyRef(tour.property, propertyLookup)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Scheduled</p>
                    <p className="font-semibold">{tour.scheduledAt ? new Date(tour.scheduledAt).toLocaleString() : 'Not scheduled'}</p>
                  </div>
                </div>
                {tour.notes ? <p className="text-sm text-secondary">{tour.notes}</p> : null}
                {user?.role !== 'buyer' ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      className="bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                      value={statusUpdates[tour.id] ?? tour.status}
                      onChange={(e) =>
                        setStatusUpdates((current) => ({
                          ...current,
                          [tour.id]: e.target.value as TourStatus,
                        }))
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="completed">Completed</option>
                    </select>
                    <Button type="button" variant="secondary" onClick={() => void updateTourStatus(tour)} disabled={tour.status === 'cancelled'}>
                      Update Status
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-12 text-center">
            <p className="text-secondary">No tours found.</p>
          </div>
        )
      ) : null}
      {tourData && tourData.pageCount > 1 ? <nav aria-label="Viewing pages" className="mt-6 flex items-center justify-end gap-3 text-sm">
        <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span>Page {page} of {tourData.pageCount}</span>
        <Button type="button" variant="secondary" disabled={page >= tourData.pageCount} onClick={() => setPage(page + 1)}>Next</Button>
      </nav> : null}
    </div>
  );

  if (user?.role === 'landlord') {
    return (
      <LandlordPortalLayout active="tours" title="Tours" topLeft={searchInput}>
        {body}
      </LandlordPortalLayout>
    );
  }

  if (user?.role === 'admin') {
    return <AdminLayout>{body}</AdminLayout>;
  }

  return (
    <BuyerPortalLayout
      pageEyebrow="Buyer Portal"
      pageTitle="Tours"
      pageSubtitle="Request and monitor property tours from a single screen."
      topbarRight={searchInput}
    >
      {body}
    </BuyerPortalLayout>
  );
};

export default Tours;
