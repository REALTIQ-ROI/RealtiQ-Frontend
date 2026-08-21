import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import InquiryForm from '../../components/forms/InquiryForm';
import PropertyGallery from '../../components/property/PropertyGallery';
import PropertyMap from '../../components/property/map/PropertyMap';
import PropertyMeta from '../../components/property/PropertyMeta';
import PriceHistorySection from '../../components/property/PriceHistorySection';
import PaymentTypeBadges from '../../components/property/PaymentTypeBadges';
import OffPlanBadges from '../../components/property/OffPlanBadges';
import TitleVerificationBadge from '../../components/title/TitleVerificationBadge';
import PublicTitleDocuments from '../../components/title/PublicTitleDocuments';
import VirtualTourExperience from '../../components/virtualTour/VirtualTourExperience';
import PublicLayout from '../../components/layout/PublicLayout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useProperties } from '../../contexts/PropertiesContext';
import { useAsync } from '../../hooks/useAsync';
import { inquiryService } from '../../services/inquiryService';
import { installmentService } from '../../services/installmentService';
import { paymentService } from '../../services/paymentService';
import { propertyService, type NearbyPropertySummary } from '../../services/propertyService';
import { tourService } from '../../services/tourService';
import { titleVerificationService } from '../../services/titleVerificationService';
import {
  type ConstructionUpdate,
  propertyRouteReference,
  resolvePropertyOwnerId,
  type PropertyTitleVerificationSummary,
  type PublicTitleDocument,
  type Property,
} from '../../types';
import {
  calculateInstallmentAmount,
  getInstallmentSummary,
  isInstallmentActive,
  resolveInstallmentPropertyId,
  resolveInstallmentProperty,
} from '../../utils/installment';
import { normalizePropertyPaymentTypes } from '../../utils/propertyPaymentTypes';
import { formatDate, formatNgn, labelize } from '../../utils/projectFormatters';

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
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
] as const;

const PropertyDetails = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { buyProperty, refreshProperties } = useProperties();
  const { data: property, loading, error, execute } = useAsync(() => propertyService.getPublicProperty(id), true);
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
  const [tourPaymentOption, setTourPaymentOption] = useState<'pay_now' | 'cart'>('pay_now');
  const [installmentFrequency, setInstallmentFrequency] = useState<(typeof INSTALLMENT_FREQUENCIES)[number]['value']>('monthly');
  const [titleSummary, setTitleSummary] = useState<PropertyTitleVerificationSummary | null>(null);
  const [publicTitleDocuments, setPublicTitleDocuments] = useState<PublicTitleDocument[]>([]);
  const [constructionUpdates, setConstructionUpdates] = useState<ConstructionUpdate[]>([]);
  const [constructionUpdatesLoading, setConstructionUpdatesLoading] = useState(false);
  const [nearbyMapOpen, setNearbyMapOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showStickySummary, setShowStickySummary] = useState(false);
  const mediaSectionRef = useRef<HTMLDivElement>(null);
  const propertyReference = property ? propertyRouteReference(property) : '';
  const virtualTourRequestAvailable = Boolean(property?.virtualTour?.available);

  const selectMedia = useCallback((index: number, scrollToMedia = false) => {
    const mediaLength = property?.media?.length ?? 0;
    if (!mediaLength) return;
    setActiveMediaIndex((index + mediaLength) % mediaLength);
    if (scrollToMedia) mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [property?.media?.length]);
  const resolveNearbyProperty = useCallback(
    (nearbyProperty: Property) => propertyService.getPropertyById(propertyRouteReference(nearbyProperty)),
    [],
  );

  useEffect(() => {
    if (tourType === 'virtual_paid' && property && !virtualTourRequestAvailable) {
      setTourType('open_house');
      setTourMode('physical');
    }
  }, [property, tourType, virtualTourRequestAvailable]);

  useEffect(() => {
    const mediaSection = mediaSectionRef.current;
    if (!mediaSection) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowStickySummary(!entry.isIntersecting);
    }, { threshold: 0 });
    observer.observe(mediaSection);
    return () => observer.disconnect();
  }, [propertyReference]);

  useEffect(() => {
    if (!property) return;
    const reference = propertyRouteReference(property);
    if (!reference) return;

    if (isAuthenticated) {
      void propertyService.incrementView(reference).catch(() => undefined);
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
    if (!property) return;
    const reference = propertyRouteReference(property);
    if (!reference) return;
    if (property.titleVerification) {
      setTitleSummary(property.titleVerification);
      return;
    }
    titleVerificationService
      .getPropertyTitleVerification(reference)
      .then((response) => setTitleSummary(response.titleVerification))
      .catch(() => setTitleSummary(null));
  }, [property]);

  useEffect(() => {
    if (!propertyReference || property?.listingType !== 'off_plan') {
      setConstructionUpdates([]);
      return;
    }
    setConstructionUpdatesLoading(true);
    propertyService
      .listConstructionUpdates(propertyReference, { page: 1, limit: 5, sort: 'desc' })
      .then((response) => setConstructionUpdates(response.updates ?? []))
      .catch(() => setConstructionUpdates([]))
      .finally(() => setConstructionUpdatesLoading(false));
  }, [property?.listingType, propertyReference]);

  useEffect(() => {
    if (hasMounted.current) {
      void execute();
    } else {
      hasMounted.current = true;
    }
  }, [id, execute]);

  const owner = useMemo(
    () => property?.owner ?? (property && typeof property.ownerId !== 'string' ? property.ownerId : null),
    [property],
  );
  const canPurchase = Boolean(
    property &&
      property.status === 'available' &&
      (!property.approvalStatus || property.approvalStatus === 'approved') &&
      (!user || (user.role === 'buyer' && resolvePropertyOwnerId(property) !== user._id)),
  );

  const installments = useMemo(() => (Array.isArray(installmentData) ? installmentData : []), [installmentData]);
  const propertyInstallment = useMemo(() => {
    const refs = new Set([property?._id, propertyReference].filter(Boolean));
    const propertyInstallments = installments.filter((installment) => refs.has(resolveInstallmentPropertyId(installment)));
    return propertyInstallments.find(isInstallmentActive) ?? propertyInstallments[0] ?? null;
  }, [installments, property?._id, propertyReference]);
  const installmentSummary = propertyInstallment ? getInstallmentSummary(propertyInstallment) : null;
  const installmentProperty = propertyInstallment ? resolveInstallmentProperty(propertyInstallment) : null;
  const hasActiveInstallment = Boolean(propertyInstallment && installmentSummary && !installmentSummary.completed);
  const hasInstallmentHistory = Boolean(propertyInstallment);
  const paymentTypes = property ? normalizePropertyPaymentTypes(property.paymentTypes, property.price) : [];
  const hasOutrightPayment = paymentTypes.includes('outright');
  const hasInstallmentPayment = paymentTypes.includes('installment');
  const hasEscrowPayment = paymentTypes.includes('escrow');

  const handleSaveProperty = async () => {
    if (!propertyReference) return;
    if (!user) {
      navigate('/login-required');
      return;
    }

    setSavingProperty(true);
    try {
      await propertyService.saveProperty(propertyReference);
      toast.success('Property saved to your profile.');
      await refreshProperties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save property.');
    } finally {
      setSavingProperty(false);
    }
  };

  const handleBuyProperty = async () => {
    if (!propertyReference) {
      toast.error('Unable to initialize payment. Please try again.');
      return;
    }

    if (!user) {
      paymentService.persistPendingPaymentProperty(propertyReference);
      navigate('/login-to-purchase');
      return;
    }

    if (hasActiveInstallment && propertyInstallment) {
      navigate(`/dashboard/buyer/installments/${propertyInstallment._id}?propertyId=${propertyReference}`);
      return;
    }

    if (user.role !== 'buyer') {
      toast.error('Only buyers can purchase properties.');
      return;
    }

    if (!hasOutrightPayment) {
      toast.error('Outright payment is not offered for this property.');
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
      await buyProperty(propertyReference, user._id);
    } catch {
      toast.error('Unable to initialize payment. Please try again.');
    }
  };

  const handleContinueInstallment = () => {
    if (!propertyReference) return;
    if (!hasActiveInstallment || !propertyInstallment) {
      navigate('/dashboard/buyer/installments');
      return;
    }

    navigate(`/dashboard/buyer/installments/${propertyInstallment._id}?propertyId=${propertyReference}`);
  };

  const handleTourRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyReference) return;

    if (tourType === 'virtual_paid' && !virtualTourRequestAvailable) {
      toast.error('A virtual tour is not available for this property.');
      return;
    }

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
        propertyId: propertyReference,
        type: tourType,
        mode: tourType === 'virtual_paid' ? 'virtual' : tourMode,
        scheduledAt: tourDate ? new Date(tourDate).toISOString() : undefined,
        notes: tourNotes.trim() || undefined,
        paymentOption: tourType === 'virtual_paid' && tourPaymentOption === 'cart' ? 'cart' : undefined,
      });

      if (tourType === 'virtual_paid' && tourPaymentOption === 'cart') {
        const cartItem = response.cartItem ?? { itemType: 'paid_virtual_tour' as const, resourceId: response.tour._id };
        try {
          await addItem(cartItem);
          toast.success('Paid virtual tour created and added to cart.');
          setTourNotes('');
          setTourDate('');
        } catch (raw) {
          toast.error(raw instanceof Error ? raw.message : 'Tour was created, but could not be added to cart. Retry from your tours page.');
          toast.info(`Pending tour: ${response.tour._id}`);
        }
        return;
      }

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
    if (!property || !propertyReference) return;
    if (!hasInstallmentPayment) {
      toast.error('Installment payment is not offered for this property.');
      return;
    }

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
      navigate(`/dashboard/buyer/installments/${propertyInstallment._id}?propertyId=${propertyReference}`);
      return;
    }

    setCreatingInstallment(true);
    navigate(`/dashboard/buyer/installments?propertyId=${propertyReference}&frequency=${installmentFrequency}`);
    setCreatingInstallment(false);
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
  const nearbyMapProperties = nearby
    .map((item): Property | null => {
      const reference = item.publicReference || item._id;
      if (!reference || !item.coordinates) return null;
      return {
        _id: reference,
        publicReference: item.publicReference,
        title: item.title,
        price: 0,
        location: 'Nearby property',
        propertyType: 'property',
        bedrooms: 0,
        bathrooms: 0,
        description: '',
        squareFeet: 0,
        paymentTypes: item.paymentTypes ?? [],
        coordinates: item.coordinates,
        media: [],
        status: 'available',
      };
    })
    .filter((item): item is Property => item !== null);

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-8 space-y-10">
        <PropertyGallery property={property} activeIndex={activeMediaIndex} onActiveIndexChange={(index) => selectMedia(index)} mediaSectionRef={mediaSectionRef} />
        <VirtualTourExperience
          propertyId={propertyReference}
          summary={property.virtualTour}
          onPhotosSelected={() => mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />

        {showStickySummary ? <div className="sticky top-20 z-30 -mx-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest/95 p-3 shadow-lg backdrop-blur sm:top-24 md:-mx-4 md:px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Sticky property media thumbnails">{(property.media ?? []).map((item, index) => <button key={item.public_id || item.url} type="button" aria-label={`View property ${item.type} ${index + 1}`} aria-current={index === activeMediaIndex ? 'true' : undefined} onClick={() => selectMedia(index, true)} className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 ${index === activeMediaIndex ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-60'}`}>{item.type === 'video' ? <div className="flex h-full w-full items-center justify-center bg-surface-container-low"><span className="material-symbols-outlined text-base text-secondary">play_circle</span></div> : <img src={item.url} alt={`Sticky thumbnail ${index + 1}`} className="h-full w-full object-cover" />}</button>)}</div>
              <div className="hidden min-w-0 sm:block"><p className="truncate text-sm font-black text-primary">{formatCurrency(property.price, currency)}</p><div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-secondary"><span>{property.bedrooms ?? '—'} Beds</span><span>{property.bathrooms ?? '—'} Baths</span><span>{property.squareFeet?.toLocaleString() ?? '—'} sq ft</span></div></div>
            </div>
            <div className="flex items-center gap-2"><div className="sm:hidden"><p className="text-sm font-black text-primary">{formatCurrency(property.price, currency)}</p><p className="text-[11px] font-semibold text-secondary">{property.bedrooms ?? '—'} Beds · {property.bathrooms ?? '—'} Baths · {property.squareFeet?.toLocaleString() ?? '—'} sq ft</p></div><button type="button" aria-label="Save property" onClick={() => void handleSaveProperty()} disabled={savingProperty} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary disabled:opacity-50"><span className="material-symbols-outlined">bookmark_add</span></button>
              {canPurchase && hasActiveInstallment && propertyInstallment ? <Button onClick={handleContinueInstallment} disabled={installmentLoading}>Continue Installment</Button> : canPurchase && hasOutrightPayment ? <Button onClick={() => void handleBuyProperty()} disabled={installmentLoading}>{installmentLoading ? 'Checking...' : 'Buy Property'}</Button> : canPurchase && hasInstallmentPayment ? <Button onClick={() => void handleCreateInstallment()} disabled={creatingInstallment}>{creatingInstallment ? 'Creating...' : 'Create Plan'}</Button> : hasEscrowPayment && canPurchase ? <Button variant="secondary" onClick={() => { const escrowPath = `/dashboard/buyer/escrows/create/${propertyReference}`; if (!user) navigate('/login-to-purchase', { state: { redirectTo: escrowPath } }); else navigate(escrowPath); }}>{user ? 'Create Escrow' : 'Login for Escrow'}</Button> : <Button disabled>Unavailable</Button>}</div>
          </div>
        </div> : null}

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
                <TitleVerificationBadge
                  summary={titleSummary}
                  context="public"
                  documents={
                    publicTitleDocuments.length
                      ? publicTitleDocuments
                      : property.titleDocumentReferences
                  }
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-primary mb-2">
                {property.title}
              </h1>
              {property.listingType === 'off_plan' ? (
                <div className="mb-4">
                  <OffPlanBadges summary={property.offPlanSummary ?? property.offPlan} />
                </div>
              ) : null}
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

            <PriceHistorySection propertyId={propertyReference} />

            {property.project ? (
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">Part of Project</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-primary">{property.project.name}</h2>
                    <p className="text-sm text-secondary">{labelize(property.project.projectType)} - {labelize(property.project.status)}</p>
                    {property.projectUnit ? (
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {[property.projectUnit.phase, property.projectUnit.block, property.projectUnit.floor, property.projectUnit.unitNumber || property.projectUnit.plotNumber]
                          .filter(Boolean)
                          .join(' / ')}
                      </p>
                    ) : null}
                  </div>
                  <Button type="button" variant="secondary" onClick={() => navigate(`/projects/${property.project?.slug || property.project?._id}`)}>
                    View Project
                  </Button>
                </div>
              </div>
            ) : null}

            {property.listingType === 'off_plan' && property.offPlan ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">Off-Plan Details</h2>
                <Card className="p-5 space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Development Status</p>
                      <p className="mt-1 font-black">{labelize(property.offPlan.developmentStatus)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Progress</p>
                      <p className="mt-1 font-black">{property.offPlan.constructionProgress ?? 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Expected Completion</p>
                      <p className="mt-1 font-black">{formatDate(property.offPlan.expectedCompletionDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Reservation</p>
                      <p className="mt-1 font-black">{formatNgn(property.offPlan.reservationAmount, currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Initial Deposit</p>
                      <p className="mt-1 font-black">{formatNgn(property.offPlan.minimumInitialDeposit, currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Installment Terms</p>
                      <p className="mt-1 font-black">{property.offPlan.installmentAvailable ? `${property.offPlan.installmentDurationMonths ?? 'Custom'} months` : 'Not offered'}</p>
                    </div>
                  </div>
                  {property.offPlan.paymentPlanDescription ? <p className="text-sm text-secondary">{property.offPlan.paymentPlanDescription}</p> : null}
                  {property.offPlan.paymentMilestones?.length ? (
                    <div>
                      <h3 className="font-bold">Listing payment milestones</h3>
                      <div className="mt-3 divide-y divide-outline-variant/10 rounded-xl border border-outline-variant/10">
                        {property.offPlan.paymentMilestones.map((milestone) => (
                          <div key={milestone.sequence} className="grid gap-2 p-4 text-sm md:grid-cols-[80px_1fr_120px]">
                            <span className="font-black">#{milestone.sequence}</span>
                            <span><strong>{milestone.title || 'Milestone'}</strong>{milestone.description ? <p className="text-secondary">{milestone.description}</p> : null}</span>
                            <span className="font-semibold">{milestone.percentage ? `${milestone.percentage}%` : formatNgn(milestone.amount, currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {property.offPlan.riskDisclosure ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-bold">Risk disclosure</p>
                      <p className="mt-1">{property.offPlan.riskDisclosure}</p>
                    </div>
                  ) : null}
                  {property.offPlan.developerGuaranteeInformation ? <p className="text-sm text-secondary"><strong>Developer guarantee:</strong> {property.offPlan.developerGuaranteeInformation}</p> : null}
                  {property.offPlan.refundPolicy ? <p className="text-sm text-secondary"><strong>Refund policy:</strong> {property.offPlan.refundPolicy}</p> : null}
                </Card>
              </div>
            ) : null}

            {property.listingType === 'off_plan' ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">Construction Updates</h2>
                <Card className="p-5">
                  {constructionUpdatesLoading ? <LoadingState label="Loading construction updates..." /> : null}
                  {!constructionUpdatesLoading && constructionUpdates.length ? (
                    <div className="space-y-4">
                      {constructionUpdates.map((update) => (
                        <article key={update._id} className="border-l-4 border-primary pl-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-secondary">{formatDate(update.updateDate || update.createdAt)}</p>
                          <h3 className="mt-1 font-black">{update.title}</h3>
                          <p className="text-sm text-secondary">{labelize(update.developmentStatus)} - {update.progressPercentage}% complete</p>
                          {update.description ? <p className="mt-2 text-sm text-on-surface-variant">{update.description}</p> : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {!constructionUpdatesLoading && !constructionUpdates.length ? (
                    <p className="text-sm text-secondary">No construction updates have been published yet.</p>
                  ) : null}
                </Card>
              </div>
            ) : null}

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
              <h2 className="text-2xl font-bold mb-2">Verified title documents</h2>
              <p className="mb-4 text-sm text-secondary">
                Safe metadata is shown here. Restricted files open only through a short-lived protected viewer session.
              </p>
              <PublicTitleDocuments
                propertyId={propertyReference}
                onDocumentsLoaded={setPublicTitleDocuments}
                registryReferences={property.titleDocumentReferences}
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Nearby Properties</h2>
              <Card className="space-y-4 p-5">
                {loadingNearby ? (
                  <LoadingState label="Loading nearby properties..." />
                ) : nearby.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {nearby.map((item, index) => {
                      const reference = item.publicReference || item._id;
                      return <article key={reference || `${item.title}-${index}`} className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 transition-shadow hover:shadow-md">
                        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><span className="material-symbols-outlined">location_on</span></div><div className="min-w-0 flex-1"><h3 className="truncate font-bold text-on-surface">{item.title}</h3><p className="mt-1 text-xs text-secondary">{item.coordinates ? `${item.coordinates.lat.toFixed(3)}, ${item.coordinates.lng.toFixed(3)}` : 'Location unavailable'}</p></div></div>
                        <div className="mt-4 flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wider text-secondary">Nearby listing</span>{reference ? <Link to={`/properties/${reference}`} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">View details <span className="material-symbols-outlined text-sm">arrow_forward</span></Link> : <span className="text-xs text-secondary">Reference unavailable</span>}</div>
                      </article>;
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-secondary">
                    No nearby properties found for this location.
                  </div>
                )}
                {property.coordinates ? (
                  <button type="button" onClick={() => setNearbyMapOpen(true)} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                    <span className="material-symbols-outlined text-sm">map</span>
                    Open in Map
                  </button>
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
                    <label htmlFor="tour-request-type" className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Tour Type</label>
                    <select
                      id="tour-request-type"
                      className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                      value={tourType}
                      onChange={(event) => {
                        const nextType = event.target.value as (typeof PROPERTY_TOUR_TYPES)[number]['value'];
                        setTourType(nextType);
                        if (nextType === 'virtual_paid') setTourMode('virtual');
                      }}
                    >
                      {PROPERTY_TOUR_TYPES.map((option) => (
                        <option key={option.value} value={option.value} disabled={option.value === 'virtual_paid' && !virtualTourRequestAvailable}>
                          {option.value === 'virtual_paid' && !virtualTourRequestAvailable ? `${option.label} (Unavailable)` : option.label}
                        </option>
                      ))}
                    </select>
                    {!virtualTourRequestAvailable ? <p className="mt-1 text-xs text-secondary">This property does not currently have a virtual tour available.</p> : null}
                  </div>
                  <div>
                    <label htmlFor="tour-request-mode" className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Mode</label>
                    <select
                      id="tour-request-mode"
                      className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                      value={tourMode}
                      disabled={tourType === 'virtual_paid'}
                      onChange={(e) => setTourMode(e.target.value as (typeof PROPERTY_TOUR_MODES)[number]['value'])}
                    >
                      {PROPERTY_TOUR_MODES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {tourType === 'virtual_paid' ? <p className="mt-1 text-xs text-secondary">Virtual mode is required for this tour type.</p> : null}
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
                    {tourType === 'virtual_paid' ? (
                      <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Payment Option</label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            className={`rounded-lg border px-4 py-3 text-sm font-bold ${tourPaymentOption === 'pay_now' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/20 bg-surface-container-low'}`}
                            onClick={() => setTourPaymentOption('pay_now')}
                          >
                            Pay Now
                          </button>
                          <button
                            type="button"
                            className={`rounded-lg border px-4 py-3 text-sm font-bold ${tourPaymentOption === 'cart' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/20 bg-surface-container-low'}`}
                            onClick={() => setTourPaymentOption('cart')}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    ) : null}
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
                ) : !hasInstallmentPayment ? (
                  <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-6 text-sm text-secondary">
                    The landlord has not offered installment payments for this property.
                  </div>
                ) : property.status === 'sold' ? (
                  <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-6 text-sm text-secondary">
                    This property has already been purchased in full. Installment creation is unavailable.
                  </div>
                ) : (
                  <div className="space-y-4">
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

            {nearbyMapOpen ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Nearby properties map" onClick={() => setNearbyMapOpen(false)}>
              <div className="relative h-[min(80vh,720px)] w-full max-w-6xl overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="absolute left-4 right-16 top-4 z-[1100] rounded-xl bg-white/95 px-4 py-3 shadow"><p className="font-bold text-on-surface">Nearby properties</p><p className="text-xs text-secondary">Select a marker to view its property details.</p></div>
                <button type="button" aria-label="Close nearby properties map" onClick={() => setNearbyMapOpen(false)} className="absolute right-4 top-4 z-[1200] flex h-10 w-10 items-center justify-center rounded-full bg-white text-on-surface shadow"><span className="material-symbols-outlined">close</span></button>
                <PropertyMap properties={nearbyMapProperties} detailsPath={(nearbyProperty) => `/properties/${propertyRouteReference(nearbyProperty)}`} className="h-full min-h-0 rounded-none" resolveProperty={resolveNearbyProperty} onDetailsNavigate={() => setNearbyMapOpen(false)} />
              </div>
            </div> : null}
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
              <PaymentTypeBadges paymentTypes={paymentTypes} />
              {property.status === 'available' && (!property.approvalStatus || property.approvalStatus === 'approved') ? (
                user?.role === 'landlord' || user?.role === 'admin' || user?.role === 'proxy_inspector' ? null : (
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => {
                      const path = `/proxy-inspectors?propertyId=${encodeURIComponent(property._id)}`;
                      navigate(path);
                    }}
                  >
                    Hire a RealtiQ Verified Property Agent
                  </Button>
                )
              ) : null}

              {!canPurchase ? (
                <p className="rounded-lg bg-surface-container-low p-3 text-center text-sm text-secondary">
                  {property.status === 'sold' ? 'This property has already been sold.' : 'Purchase options are available to eligible buyers only.'}
                </p>
              ) : (
                <>
                  {hasActiveInstallment && propertyInstallment ? (
                    <Button fullWidth onClick={handleContinueInstallment} disabled={installmentLoading}>
                      Continue Installment
                    </Button>
                  ) : hasInstallmentHistory && installmentSummary?.completed ? (
                    <Button fullWidth disabled>Installment Plan Completed</Button>
                  ) : (
                    <>
                      {hasOutrightPayment ? (
                        <Button fullWidth disabled={installmentLoading} onClick={() => void handleBuyProperty()}>
                          {installmentLoading ? 'Checking eligibility...' : 'Buy Property Outright'}
                        </Button>
                      ) : null}
                      {hasInstallmentPayment ? (
                        <Button fullWidth variant="secondary" onClick={() => void handleCreateInstallment()} disabled={creatingInstallment}>
                          {creatingInstallment ? 'Creating...' : 'Create Installment Plan'}
                        </Button>
                      ) : null}
                    </>
                  )}
                </>
              )}
              {hasEscrowPayment && canPurchase && !hasActiveInstallment && (!user || (user.role === 'buyer' && resolvePropertyOwnerId(property) !== user._id)) ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-bold text-primary">Prefer protected release conditions?</p>
                  <p className="mt-1 text-xs text-secondary">Pay through escrow. Funds remain locked until agreed conditions are completed and an administrator approves release.</p>
                  <Button
                    fullWidth
                    variant="secondary"
                    className="mt-3"
                    onClick={() => {
                      const escrowPath = `/dashboard/buyer/escrows/create/${propertyReference}`;
                      if (!user) {
                        navigate('/login-to-purchase', { state: { redirectTo: escrowPath } });
                        return;
                      }
                      navigate(escrowPath);
                    }}
                  >
                    {user ? 'Create Escrow Payment' : 'Login to Create Payment Escrow'}
                  </Button>
                </div>
              ) : null}
              <Button
                fullWidth
                variant="secondary"
                onClick={() => navigate(`/properties/${propertyReference}/roi`)}
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
                propertyId={propertyReference}
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
