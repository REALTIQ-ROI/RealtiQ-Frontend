import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import InquiryForm from '../../components/forms/InquiryForm';
import PropertyGallery from '../../components/property/PropertyGallery';
import PropertyMeta from '../../components/property/PropertyMeta';
import PublicLayout from '../../components/layout/PublicLayout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useProperties } from '../../contexts/PropertiesContext';
import { useAsync } from '../../hooks/useAsync';
import { inquiryService } from '../../services/inquiryService';
import { installmentService } from '../../services/installmentService';
import { paymentService } from '../../services/paymentService';
import { propertyService, type NearbyPropertySummary } from '../../services/propertyService';
import { tourService } from '../../services/tourService';
import {
  calculateInstallmentAmount,
  frequencyToInstallmentCount,
  getInstallmentSummary,
  isInstallmentActive,
  resolveInstallmentPropertyId,
  resolveInstallmentProperty,
  requiresInstallments,
} from '../../utils/installment';

const formatCurrency = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const PROPERTY_TOUR_TYPES = [
  { value: 'open_house', label: 'Open House' },
  { value: 'virtual_paid', label: 'Virtual Paid' },
  { value: 'staging_view', label: 'Staging View' },
] as const;

const PROPERTY_TOUR_MODES = [
  { value: 'physical', label: 'Physical' },
  { value: 'virtual', label: 'Virtual' },
] as const;

const INSTALLMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannually', label: 'Biannually' },
  { value: 'annually', label: 'Annually' },
] as const;

const PropertyDetails = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { buyProperty, refreshProperties } = useProperties();
  const { data: property, loading, error, execute } = useAsync(() => propertyService.getPropertyById(id), true);
  const {
    data: installmentData,
    loading: installmentLoading,
    error: installmentError,
  } = useAsync(() => installmentService.getInstallments(), Boolean(isAuthenticated && user?.role === 'buyer'));
  const hasMounted = useRef(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [requestingTour, setRequestingTour] = useState(false);
  const [creatingInstallment, setCreatingInstallment] = useState(false);
  const [nearby, setNearby] = useState<NearbyPropertySummary[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [tourType, setTourType] = useState<(typeof PROPERTY_TOUR_TYPES)[number]['value']>('open_house');
  const [tourMode, setTourMode] = useState<(typeof PROPERTY_TOUR_MODES)[number]['value']>('physical');
  const [tourDate, setTourDate] = useState('');
  const [tourNotes, setTourNotes] = useState('');
  const [installmentFrequency, setInstallmentFrequency] = useState<(typeof INSTALLMENT_FREQUENCIES)[number]['value']>('monthly');

  useEffect(() => {
    if (!property?._id) return;

    if (isAuthenticated) {
      void propertyService.incrementView(property._id).catch(() => undefined);
    }

    if (!property.coordinates) {
      setNearby([]);
      return;
    }

    setLoadingNearby(true);
    propertyService
      .getNearbyProperties({ lat: property.coordinates.lat, lng: property.coordinates.lng, radius: 5 })
      .then(setNearby)
      .catch(() => setNearby([]))
      .finally(() => setLoadingNearby(false));
  }, [isAuthenticated, property]);

  useEffect(() => {
    if (hasMounted.current) {
      void execute();
    } else {
      hasMounted.current = true;
    }
  }, [id, execute]);

  const owner = useMemo(
    () => (property && typeof property.ownerId !== 'string' ? property.ownerId : null),
    [property],
  );

  const installments = useMemo(() => (Array.isArray(installmentData) ? installmentData : []), [installmentData]);
  const propertyInstallment = useMemo(() => {
    const propertyInstallments = installments.filter((installment) => resolveInstallmentPropertyId(installment) === property?._id);
    return propertyInstallments.find(isInstallmentActive) ?? propertyInstallments[0] ?? null;
  }, [installments, property?._id]);
  const installmentSummary = propertyInstallment ? getInstallmentSummary(propertyInstallment) : null;
  const installmentProperty = propertyInstallment ? resolveInstallmentProperty(propertyInstallment) : null;
  const hasActiveInstallment = Boolean(propertyInstallment && installmentSummary && !installmentSummary.completed);
  const hasInstallmentHistory = Boolean(propertyInstallment);
  const installmentOnly = requiresInstallments(property.price);

  const handleSaveProperty = async () => {
    if (!property?._id) return;
    if (!user) {
      navigate('/login-required');
      return;
    }

    setSavingProperty(true);
    try {
      await propertyService.saveProperty(property._id);
      toast.success('Property saved to your profile.');
      await refreshProperties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save property.');
    } finally {
      setSavingProperty(false);
    }
  };

  const handleBuyProperty = async () => {
    if (!property?._id) {
      toast.error('Unable to initialize payment. Please try again.');
      return;
    }

    if (!user) {
      paymentService.persistPendingPaymentProperty(property._id);
      navigate('/login-to-purchase');
      return;
    }

    if (hasActiveInstallment && propertyInstallment) {
      navigate(`/dashboard/buyer/installments/${propertyInstallment._id}?propertyId=${property._id}`);
      return;
    }

    if (user.role !== 'buyer') {
      toast.error('Only buyers can purchase properties.');
      return;
    }

    if (installmentOnly) {
      toast.error('This property is available through installments only.');
      await handleCreateInstallment();
      return;
    }

    const confirmed = await Swal.fire({
      title: 'Proceed to Payment?',
      text: 'You will be redirected to the secure payment gateway.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#000000',
      cancelButtonColor: '#6b7280',
    });
    if (!confirmed.isConfirmed) return;

    try {
      await buyProperty(property._id, user._id);
    } catch {
      toast.error('Unable to initialize payment. Please try again.');
    }
  };

  const handleContinueInstallment = () => {
    if (!property?._id) return;
    if (!hasActiveInstallment || !propertyInstallment) {
      navigate('/dashboard/buyer/installments');
      return;
    }

    navigate(`/dashboard/buyer/installments/${propertyInstallment._id}?propertyId=${property._id}`);
  };

  const handleTourRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!property?._id) return;

    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'buyer') {
      toast.error('Only buyers can request tours.');
      return;
    }

    setRequestingTour(true);
    try {
      const response = await tourService.requestTour({
        propertyId: property._id,
        type: tourType,
        mode: tourMode,
        scheduledAt: tourDate ? new Date(tourDate).toISOString() : undefined,
        notes: tourNotes.trim() || undefined,
      });

      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }

      toast.success('Tour request submitted successfully.');
      setTourNotes('');
      setTourDate('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to request tour.');
    } finally {
      setRequestingTour(false);
    }
  };

  const handleCreateInstallment = async () => {
    if (!property?._id) return;

    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'buyer') {
      toast.error('Only buyers can create installment plans.');
      return;
    }

    if (property.status === 'sold') {
      toast.error('This property has already been purchased in full.');
      return;
    }

    if (hasActiveInstallment && propertyInstallment) {
      toast.error('An installment plan already exists for this property.');
      navigate(`/dashboard/buyer/installments/${propertyInstallment._id}?propertyId=${property._id}`);
      return;
    }

    const installmentCount = frequencyToInstallmentCount(installmentFrequency);
    const calculatedInstallmentAmount = calculateInstallmentAmount(property.price, installmentFrequency);
    if (property.price <= 0 || installmentCount <= 0 || calculatedInstallmentAmount <= 0) {
      toast.error('Unable to calculate installment amount for this property.');
      return;
    }

    setCreatingInstallment(true);
    try {
      const plan = await installmentService.createInstallmentPlan({
        propertyId: property._id,
        totalAmount: property.price,
        schedule: {
          frequency: installmentFrequency,
          notes: String(calculatedInstallmentAmount),
        },
      });

      toast.success('Installment plan created successfully.');
      navigate(`/dashboard/buyer/installments/${plan._id}?propertyId=${property._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to create installment plan.');
    } finally {
      setCreatingInstallment(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState label="Loading property details..." />
      </PublicLayout>
    );
  }

  if (error || !property) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Property not found</h1>
          <p className="text-secondary mb-6">We could not load this listing.</p>
          <Button onClick={() => navigate('/properties')}>Back to Listings</Button>
        </div>
      </PublicLayout>
    );
  }

  const currency = property.currency ?? 'NGN';
  const ownerName = owner?.name ?? 'RealtiQ Agent';
  const ownerEmail = owner?.email ?? 'support@realtiq.com';
  const mapLink = property.coordinates
    ? `https://www.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(property.location)}`;

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-8 space-y-10">
        <PropertyGallery property={property} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  {property.propertyType}
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                    property.status === 'sold' ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {property.status}
                </span>
                {property.featured ? (
                  <span className="bg-amber-400/15 text-amber-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    Featured
                  </span>
                ) : null}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-primary mb-2">
                {property.title}
              </h1>
              <p className="text-lg text-secondary font-body mb-6 flex items-center gap-1">
                <span className="material-symbols-outlined text-lg">location_on</span>
                {property.location}
              </p>
              <PropertyMeta property={property} />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">Description</h2>
              <p className="text-on-surface-variant leading-relaxed">{property.description}</p>
            </div>

            {property.amenities?.length ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">Amenities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {property.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container-lowest rounded-lg px-4 py-3 border border-outline-variant/10"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <h2 className="text-2xl font-bold mb-4">Nearby Properties</h2>
              <Card className="p-5 space-y-4">
                {loadingNearby ? (
                  <LoadingState label="Loading nearby properties..." />
                ) : nearby.length > 0 ? (
                  nearby.map((item) => (
                    <div key={item._id} className="flex items-center justify-between gap-3 py-2 border-b border-outline-variant/10 last:border-b-0">
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-secondary">
                          {item.coordinates
                            ? `${item.coordinates.lat.toFixed(2)}, ${item.coordinates.lng.toFixed(2)}`
                            : 'Coordinates unavailable'}
                        </p>
                      </div>
                      <Link to={`/properties/${item._id}`} className="text-xs font-bold text-primary hover:underline">
                        View
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-secondary">
                    No nearby properties found for this location.
                  </div>
                )}
                {property.coordinates ? (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-sm">map</span>
                    Open in Maps
                  </a>
                ) : (
                  <p className="text-xs text-secondary">No coordinates available yet. Search is based on the saved address.</p>
                )}
              </Card>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Tour Request</h2>
              <Card className="p-5">
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(event) => void handleTourRequest(event)}>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Tour Type</label>
                    <select
                      className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                      value={tourType}
                      onChange={(e) => setTourType(e.target.value as (typeof PROPERTY_TOUR_TYPES)[number]['value'])}
                    >
                      {PROPERTY_TOUR_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Mode</label>
                    <select
                      className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                      value={tourMode}
                      onChange={(e) => setTourMode(e.target.value as (typeof PROPERTY_TOUR_MODES)[number]['value'])}
                    >
                      {PROPERTY_TOUR_MODES.map((option) => (
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
                      value={tourDate}
                      onChange={(e) => setTourDate(e.target.value)}
                      className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Notes</label>
                    <input
                      type="text"
                      value={tourNotes}
                      onChange={(e) => setTourNotes(e.target.value)}
                      placeholder="Need a virtual walkthrough"
                      className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={requestingTour} className="w-full">
                      {requestingTour ? 'Submitting...' : 'Request Tour'}
                    </Button>
                    <p className="text-xs text-secondary mt-2">
                      Virtual paid tours will redirect to Paystack when the backend returns a payment URL.
                    </p>
                  </div>
                </form>
              </Card>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Installment Plan</h2>
              <Card className="p-5">
                {installmentLoading ? (
                  <LoadingState label="Checking installment plans..." />
                ) : installmentError ? (
                  <p className="text-sm text-error">{installmentError}</p>
                ) : hasActiveInstallment && propertyInstallment ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4">
                      <p className="text-xs uppercase tracking-widest text-secondary font-bold">Current Plan</p>
                      <p className="mt-2 text-lg font-bold text-primary">Installment Plan Active</p>
                      <p className="text-sm text-secondary mt-1">
                        A plan already exists for this property. Continue from the installments page.
                      </p>
                      <p className="text-sm text-on-surface mt-3">
                        Property Price:{' '}
                        <span className="font-semibold">
                          {installmentProperty ? formatCurrency(installmentProperty.price, currency) : formatCurrency(property.price, currency)}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button type="button" onClick={handleContinueInstallment}>
                        Continue Installment
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/buyer/installments')}>
                        View Installments
                      </Button>
                    </div>
                  </div>
                ) : hasInstallmentHistory && installmentSummary?.completed ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4">
                      <p className="text-xs uppercase tracking-widest text-secondary font-bold">Current Plan</p>
                      <p className="mt-2 text-lg font-bold text-primary">Installment Plan Completed</p>
                      <p className="text-sm text-secondary mt-1">This property already has a completed installment plan.</p>
                      <p className="text-sm text-on-surface mt-3">
                        Property Price:{' '}
                        <span className="font-semibold">
                          {installmentProperty ? formatCurrency(installmentProperty.price, currency) : formatCurrency(property.price, currency)}
                        </span>
                      </p>
                    </div>
                  </div>
                ) : property.status === 'sold' ? (
                  <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-6 text-sm text-secondary">
                    This property has already been purchased in full. Installment creation is unavailable.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {installmentOnly ? (
                      <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-4 text-sm text-amber-900">
                        This property exceeds the one-time payment limit. Installment plans are required.
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
                        Frequency
                      </label>
                      <select
                        className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                        value={installmentFrequency}
                        onChange={(e) =>
                          setInstallmentFrequency(e.target.value as (typeof INSTALLMENT_FREQUENCIES)[number]['value'])
                        }
                      >
                        {INSTALLMENT_FREQUENCIES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
                          Installment Amount
                        </label>
                        <input
                          readOnly
                          value={
                            property.price > 0 ? formatCurrency(calculateInstallmentAmount(property.price, installmentFrequency)) : 'Not available'
                          }
                          className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm outline-none cursor-not-allowed"
                        />
                      </div>
                      <Button type="button" onClick={() => void handleCreateInstallment()} disabled={creatingInstallment}>
                        {creatingInstallment ? 'Creating...' : `Create Plan for ${formatCurrency(property.price, currency)}`}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate('/dashboard/buyer/installments')}
                      >
                        View Installments
                      </Button>
                    </div>
                  </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-8 h-fit space-y-4">
              <p className="text-xs text-secondary uppercase tracking-[0.2em] mb-2">List Price</p>
              <p className="text-4xl font-extrabold tracking-tighter">{formatCurrency(property.price, currency)}</p>
              <p className="text-xs text-secondary">{property.squareFeet.toLocaleString()} sq ft</p>
              <div className="text-sm">
                Status:{' '}
                <span className={property.status === 'sold' ? 'text-error font-semibold' : 'text-green-700 font-semibold'}>
                  {property.status.toUpperCase()}
                </span>
              </div>

              {hasActiveInstallment && propertyInstallment ? (
                <Button fullWidth onClick={handleContinueInstallment} disabled={installmentLoading}>
                  Continue Installment
                </Button>
              ) : hasInstallmentHistory && installmentSummary?.completed ? (
                <Button fullWidth disabled>
                  Installment Plan Completed
                </Button>
              ) : installmentOnly ? (
                <Button fullWidth onClick={() => void handleCreateInstallment()} disabled={creatingInstallment}>
                  {creatingInstallment ? 'Creating...' : 'Create Installment Plan'}
                </Button>
              ) : (
                <Button
                  fullWidth
                  disabled={property.status === 'sold' || installmentLoading}
                  onClick={() => void handleBuyProperty()}
                >
                  {installmentLoading
                    ? 'Checking installment status...'
                    : property.status === 'sold'
                      ? 'Already Sold'
                      : 'Buy Property'}
                </Button>
              )}
              <Button
                fullWidth
                variant="secondary"
                onClick={() => navigate(`/properties/${property._id}/roi`)}
              >
                <span className="material-symbols-outlined text-sm mr-1">monitoring</span>
                Analyze ROI
              </Button>
              <Button fullWidth variant="ghost" onClick={() => void handleSaveProperty()} disabled={savingProperty}>
                <span className="material-symbols-outlined text-sm mr-1">bookmark_add</span>
                {savingProperty ? 'Saving...' : 'Save Property'}
              </Button>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Send an Inquiry</h3>
              <InquiryForm
                propertyId={property._id}
                onSubmitInquiry={async (payload) => {
                  await inquiryService.createInquiry(payload);
                  toast.success('Inquiry submitted successfully.');
                  await refreshProperties();
                }}
              />
            </Card>

            <Card className="p-6">
              <div className="pt-0">
                <p className="text-xs text-secondary uppercase tracking-widest mb-3">Listed By</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">person</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{ownerName}</p>
                    <p className="text-xs text-secondary">{ownerEmail}</p>
                  </div>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {property.coordinates ? (
          <section className="w-full mt-12">
            <Card className="w-full overflow-hidden rounded-none md:rounded-2xl border-x-0 md:border-x border-t border-b border-outline-variant/10 bg-surface-container-lowest">
              <div className="px-8 md:px-12 py-6">
                <h3 className="text-2xl font-bold">Location</h3>
                <p className="text-sm text-secondary mt-1">
                  Explore the property location on the map below.
                </p>
              </div>
              <div className="w-full h-[420px]">
                <iframe
                  title={`${property.title} map`}
                  src={`https://www.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}&z=14&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            </Card>
          </section>
        ) : null}
      </section>
    </PublicLayout>
  );
};

export default PropertyDetails;
