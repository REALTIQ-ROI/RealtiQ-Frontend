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
import { useCart } from '../../contexts/CartContext';
import { useAsync } from '../../hooks/useAsync';
import { propertyService } from '../../services/propertyService';
import { tourService } from '../../services/tourService';
import { propertyRouteReference, type Property, type Tour, type TourMode, type TourPropertySummary, type TourStatus, type TourType } from '../../types';

const statusClasses: Record<TourStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-700',
};

const toLabel = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCurrency = (value?: number) =>
  value
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
    : 'N/A';

const TOUR_TYPES: Array<{ value: TourType; label: string }> = [
  { value: 'open_house', label: 'Open House' },
  { value: 'virtual_paid', label: 'Virtual Paid' },
  { value: 'staging_view', label: 'Staging View' },
];

const TOUR_MODES: Array<{ value: TourMode; label: string }> = [
  { value: 'physical', label: 'Physical' },
  { value: 'virtual', label: 'Virtual' },
];

const propertyKeys = (property: Pick<Property, '_id' | 'id' | 'publicReference'> | TourPropertySummary) =>
  [property._id, property.id, property.publicReference].filter(Boolean) as string[];

const formatPropertyRef = (
  propertyRef: Tour['property'] | Tour['propertyId'],
  propertyLookup: Map<string, Property>,
) => {
  if (!propertyRef) return 'Property unavailable';
  if (typeof propertyRef !== 'string') {
    const lookupTitle = propertyKeys(propertyRef).map((key) => propertyLookup.get(key)?.title).find(Boolean);
    return propertyRef.title ?? lookupTitle ?? propertyRef._id ?? 'Property unavailable';
  }
  return propertyLookup.get(propertyRef)?.title ?? propertyRef;
};

const Tours = () => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [searchParams] = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') ?? '';
  const { data: tourData, loading, error, execute } = useAsync(() => tourService.getTours(), true);
  const {
    data: propertyData,
    loading: loadingProperties,
    error: propertyError,
  } = useAsync(() => propertyService.getProperties({ limit: 500 }), user?.role === 'buyer');
  const tours = useMemo(() => (Array.isArray(tourData) ? tourData : []), [tourData]);
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
  const [paymentOption, setPaymentOption] = useState<'pay_now' | 'cart'>('pay_now');
  const [submitting, setSubmitting] = useState(false);
  const [cartingTourId, setCartingTourId] = useState<string | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, TourStatus>>({});
  const [query, setQuery] = useState('');

  const filteredTours = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tours;
    return tours.filter((tour) => {
      const propertyRef = tour.property ?? tour.propertyId;
      const haystack = [
        tour._id,
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
    if (!propertyId.trim()) {
      toast.error('Property is required.');
      return;
    }

    setSubmitting(true);
    try {
      const requestPropertyId = propertyLookup.get(propertyId.trim())?._id ?? propertyId.trim();
      const response = await tourService.requestTour({
        propertyId: requestPropertyId,
        type,
        mode,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
        paymentOption: type === 'virtual_paid' && paymentOption === 'cart' ? 'cart' : undefined,
      });

      if (type === 'virtual_paid' && paymentOption === 'cart') {
        const cartItem = response.cartItem ?? { itemType: 'paid_virtual_tour' as const, resourceId: response.tour._id };
        try {
          await addItem(cartItem);
          toast.success('Paid virtual tour created and added to cart.');
          setNotes('');
          setScheduledAt('');
          await execute();
        } catch (raw) {
          toast.error(raw instanceof Error ? raw.message : 'Tour was created, but could not be added to cart. Retry adding the pending tour.');
        }
        return;
      }

      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }

      toast.success('Tour request submitted.');
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
    const nextStatus = statusUpdates[tour._id];
    if (!nextStatus || nextStatus === tour.status) return;

    try {
      await tourService.updateTourStatus(tour._id, { status: nextStatus });
      toast.success('Tour status updated.');
      await execute();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update tour status.');
    }
  };

  const addTourToCart = async (tour: Tour) => {
    setCartingTourId(tour._id);
    try {
      await addItem({ itemType: 'paid_virtual_tour', resourceId: tour._id });
      toast.success('Paid virtual tour added to cart.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to add tour to cart.');
    } finally {
      setCartingTourId(null);
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
                {type === 'virtual_paid' ? (
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Payment Option</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        className={`rounded-lg border px-4 py-3 text-sm font-bold ${paymentOption === 'pay_now' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/20 bg-surface-container-low'}`}
                        onClick={() => setPaymentOption('pay_now')}
                      >
                        Pay Now
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-4 py-3 text-sm font-bold ${paymentOption === 'cart' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/20 bg-surface-container-low'}`}
                        onClick={() => setPaymentOption('cart')}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ) : null}
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Submitting...' : 'Request Tour'}
                </Button>
                <p className="text-xs text-secondary mt-2">
                  Virtual paid tours will redirect to Paystack when the backend returns a payment URL.
                </p>
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
              <article key={tour._id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{tour._id}</h3>
                    <p className="text-sm text-secondary">
                      {toLabel(tour.type)} - {toLabel(tour.mode)}
                    </p>
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClasses[tour.status]}`}>
                    {tour.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Property</p>
                    <p className="font-semibold">{formatPropertyRef(tour.property ?? tour.propertyId, propertyLookup)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Scheduled</p>
                    <p className="font-semibold">{tour.scheduledAt ? new Date(tour.scheduledAt).toLocaleString() : 'Not scheduled'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Price</p>
                    <p className="font-semibold">{formatCurrency(tour.price)}</p>
                  </div>
                </div>
                {tour.notes ? <p className="text-sm text-secondary">{tour.notes}</p> : null}
                {user?.role === 'buyer' && tour.type === 'virtual_paid' && tour.status === 'pending' ? (
                  <Button type="button" variant="secondary" disabled={cartingTourId === tour._id} onClick={() => void addTourToCart(tour)}>
                    {cartingTourId === tour._id ? 'Adding...' : 'Add to Cart'}
                  </Button>
                ) : null}
                {user?.role !== 'buyer' ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      className="bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                      value={statusUpdates[tour._id] ?? tour.status}
                      onChange={(e) =>
                        setStatusUpdates((current) => ({
                          ...current,
                          [tour._id]: e.target.value as TourStatus,
                        }))
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="completed">Completed</option>
                    </select>
                    <Button type="button" variant="secondary" onClick={() => void updateTourStatus(tour)}>
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
