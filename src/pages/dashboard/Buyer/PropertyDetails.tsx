import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import OffPlanBadges from '../../../components/property/OffPlanBadges';
import PaymentTypeBadges from '../../../components/property/PaymentTypeBadges';
import SellerTrustBadge from '../../../components/trust/SellerTrustBadge';
import PropertyGallery from '../../../components/property/PropertyGallery';
import PropertyMeta from '../../../components/property/PropertyMeta';
import VirtualTourExperience from '../../../components/virtualTour/VirtualTourExperience';
import { ownershipService } from '../../../services/ownershipService';
import { propertyService } from '../../../services/propertyService';
import { titleDocumentService } from '../../../services/titleDocumentService';
import {
  propertyRouteReference,
  type ManagedPropertyDetail,
  type TitleDocumentRecord,
} from '../../../types';
import { documentTypeLabel } from '../../../utils/titleVerification';
import { normalizePropertyPaymentTypes } from '../../../utils/propertyPaymentTypes';

interface PropertyDetailState {
  property: ManagedPropertyDetail | null;
  titleDocuments: TitleDocumentRecord[];
}
const formatCurrency = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not provided';
const label = (value?: string | null) =>
  value
    ? value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
    : 'Not provided';
const Detail = ({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: React.ReactNode;
}) => (
  <div className='rounded-xl border border-slate-200 bg-white p-4'>
    <span className='material-symbols-outlined mb-2 text-xl text-emerald-700'>
      {icon}
    </span>
    <p className='text-[11px] font-bold uppercase tracking-wider text-slate-400'>
      {title}
    </p>
    <div className='mt-1 font-bold text-slate-800'>{value}</div>
  </div>
);

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PropertyDetailState>({
    property: null,
    titleDocuments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  );
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const mediaSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadPropertyDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const targetId =
          id ||
          propertyRouteReference(
            (await ownershipService.getMyOwnedProperties())[0],
          );
        if (!targetId) {
          if (active) setDetail({ property: null, titleDocuments: [] });
          return;
        }
        const response = await propertyService.getPropertyOwnerDetail(targetId);
        if (active)
          setDetail({
            property: response.property,
            titleDocuments: response.titleDocuments ?? [],
          });
      } catch (raw) {
        if (active) {
          setDetail({ property: null, titleDocuments: [] });
          setError(
            raw instanceof Error
              ? raw.message
              : 'Failed to load property details.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadPropertyDetail();
    return () => {
      active = false;
    };
  }, [id]);

  const { property, titleDocuments } = detail;
  const propertyReference = propertyRouteReference(property);
  const openOwnedTitleDocument = async (document: TitleDocumentRecord) => {
    if (!property || openingDocumentId) return;
    const documentId = document._id || document.publicReference;
    if (!documentId) {
      toast.error(
        'This title document is missing its protected viewer reference.',
      );
      return;
    }
    setOpeningDocumentId(documentId);
    try {
      const session = await titleDocumentService.openViewer(documentId);
      navigate('/protected-title-viewer', {
        state: {
          session,
          documentId,
          propertyId: propertyReference,
          returnPath: `/dashboard/buyer/property-details/${propertyReference}`,
        },
      });
    } catch (raw) {
      toast.error(
        raw instanceof Error
          ? raw.message
          : 'Unable to open this title document.',
      );
    } finally {
      setOpeningDocumentId(null);
    }
  };

  return (
    <BuyerPortalLayout
      pageEyebrow='Portfolio Overview'
      pageTitle='Property Details'
      pageSubtitle='A complete view of your owned property and its protected records.'
    >
      {loading ? (
        <div className='grid min-h-80 place-items-center rounded-2xl bg-white'>
          <div className='text-center'>
            <span className='material-symbols-outlined animate-spin text-4xl text-primary'>
              progress_activity
            </span>
            <p className='mt-3 font-semibold text-slate-500'>
              Loading complete property details…
            </p>
          </div>
        </div>
      ) : error ? (
        <div
          role='alert'
          className='rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800'
        >
          <h2 className='font-bold'>Unable to load this property</h2>
          <p className='mt-1 text-sm'>{error}</p>
        </div>
      ) : property ? (
        <div className='space-y-8'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <Link
              className='inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline'
              to='/dashboard/buyer/my-properties'
            >
              <span className='material-symbols-outlined text-lg'>
                arrow_back
              </span>
              Back to portfolio
            </Link>
            <div className='flex gap-2'>
              <span className='rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800'>
                Owned
              </span>
              <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-700'>
                {label(property.status)}
              </span>
            </div>
          </div>

          <PropertyGallery
            property={property}
            activeIndex={activeMediaIndex}
            onActiveIndexChange={setActiveMediaIndex}
            mediaSectionRef={mediaSectionRef}
          />
          <VirtualTourExperience
            propertyId={propertyReference}
            summary={property.virtualTour}
            onPhotosSelected={() =>
              mediaSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }
          />

          <section className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='space-y-6'>
              <div>
                <div className='mb-3 flex flex-wrap gap-2'>
                  <span className='rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary'>
                    {label(property.propertyType)}
                  </span>
                  <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700'>
                    {label(property.listingType ?? 'ready')}
                  </span>
                  {property.featured && (
                    <span className='rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800'>
                      Featured
                    </span>
                  )}
                </div>
                <h1 className='text-3xl font-black tracking-tight text-slate-950 sm:text-4xl'>
                  {property.title}
                </h1>
                <p className='mt-2 flex items-center gap-1 text-slate-500'>
                  <span className='material-symbols-outlined text-lg'>
                    location_on
                  </span>
                  {property.location}
                </p>
                <p className='mt-4 text-3xl font-black text-primary'>
                  {formatCurrency(property.price, property.currency)}
                </p>
              </div>
              {property.listingType === 'off_plan' && (
                <OffPlanBadges
                  summary={property.offPlanSummary ?? property.offPlan}
                />
              )}
              <PropertyMeta property={property} />
              <div>
                <h2 className='text-xl font-black text-slate-950'>
                  About this property
                </h2>
                <p className='mt-3 whitespace-pre-wrap leading-7 text-slate-600'>
                  {property.description}
                </p>
              </div>
              <div>
                <h2 className='text-xl font-black text-slate-950'>
                  Amenities and features
                </h2>
                {property.amenities?.length ? (
                  <div className='mt-3 flex flex-wrap gap-2'>
                    {property.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className='inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800'
                      >
                        <span className='material-symbols-outlined text-base'>
                          check_circle
                        </span>
                        {amenity}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className='mt-2 text-sm text-slate-500'>
                    No amenities were provided.
                  </p>
                )}
              </div>
            </div>
            <aside className='h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <h2 className='font-black text-slate-950'>Ownership summary</h2>
              <div className='mt-4 space-y-4 text-sm'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>
                    Public reference
                  </p>
                  <p className='mt-1 break-all font-mono font-bold text-slate-700'>
                    {property.publicReference ?? 'Pending'}
                  </p>
                </div>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>
                    Original seller
                  </p>
                  <div className='mt-1 flex flex-wrap items-center gap-2'><p className='font-bold text-slate-700'>
                    {property.owner?.name ??
                      (typeof property.ownerId === 'object'
                        ? property.ownerId.name
                        : 'Not provided')}
                  </p><SellerTrustBadge badge={property.owner?.trustBadge ?? (typeof property.ownerId === 'object' ? property.ownerId.trustBadge : undefined)} compact /></div>
                </div>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>
                    Payment methods
                  </p>
                  <div className='mt-2'>
                    <PaymentTypeBadges
                      paymentTypes={normalizePropertyPaymentTypes(
                        property.paymentTypes,
                        property.price,
                      )}
                    />
                  </div>
                </div>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>
                    Added
                  </p>
                  <p className='mt-1 font-bold text-slate-700'>
                    {formatDate(property.createdAt)}
                  </p>
                </div>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>
                    Last updated
                  </p>
                  <p className='mt-1 font-bold text-slate-700'>
                    {formatDate(property.updatedAt)}
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section>
            <h2 className='mb-4 text-xl font-black text-slate-950'>
              Listing information
            </h2>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              <Detail
                icon='category'
                title='Category'
                value={label(property.category)}
              />
              <Detail
                icon='construction'
                title='Completion stage'
                value={label(property.completionStage)}
              />
              <Detail
                icon='fact_check'
                title='Approval'
                value={label(property.approvalStatus)}
              />
              <Detail
                icon='payments'
                title='Currency'
                value={property.currency ?? 'NGN'}
              />
              {property.coordinates && (
                <>
                  <Detail
                    icon='north'
                    title='Latitude'
                    value={property.coordinates.lat}
                  />
                  <Detail
                    icon='east'
                    title='Longitude'
                    value={property.coordinates.lng}
                  />
                </>
              )}
              <Detail
                icon='visibility'
                title='Views'
                value={property.views ?? 0}
              />
              <Detail
                icon='bookmark'
                title='Saves'
                value={property.saves ?? 0}
              />
            </div>
          </section>

          {property.project && (
            <section className='rounded-2xl border border-slate-200 bg-white p-5'>
              <h2 className='text-xl font-black text-slate-950'>
                Project and unit
              </h2>
              <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                <Detail
                  icon='business'
                  title='Project'
                  value={
                    <Link
                      className='text-primary hover:underline'
                      to={`/projects/${property.project?.slug}`}
                    >
                      {property.project.name}
                    </Link>
                  }
                />
                <Detail
                  icon='apartment'
                  title='Project type'
                  value={label(property.project.projectType)}
                />
                <Detail
                  icon='flag'
                  title='Project status'
                  value={label(property.project.status)}
                />
                {property.projectUnit &&
                  Object.entries(property.projectUnit).map(([key, value]) =>
                    value ? (
                      <Detail
                        key={key}
                        icon='meeting_room'
                        title={label(key)}
                        value={String(value)}
                      />
                    ) : null,
                  )}
              </div>
            </section>
          )}

          {property.offPlan && (
            <section className='rounded-2xl border border-amber-200 bg-amber-50/50 p-5'>
              <h2 className='text-xl font-black text-slate-950'>
                Off-plan development details
              </h2>
              <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                <Detail
                  icon='engineering'
                  title='Development status'
                  value={label(property.offPlan.developmentStatus)}
                />
                <Detail
                  icon='percent'
                  title='Construction progress'
                  value={`${property.offPlan.constructionProgress ?? 0}%`}
                />
                <Detail
                  icon='event'
                  title='Expected completion'
                  value={formatDate(property.offPlan.expectedCompletionDate)}
                />
                <Detail
                  icon='calendar_month'
                  title='Construction started'
                  value={formatDate(property.offPlan.constructionStartDate)}
                />
                <Detail
                  icon='key'
                  title='Handover date'
                  value={formatDate(property.offPlan.handoverDate)}
                />
                <Detail
                  icon='payments'
                  title='Reservation amount'
                  value={
                    property.offPlan.reservationAmount
                      ? formatCurrency(property.offPlan.reservationAmount)
                      : 'Not provided'
                  }
                />
                <Detail
                  icon='account_balance_wallet'
                  title='Minimum deposit'
                  value={
                    property.offPlan.minimumInitialDeposit
                      ? formatCurrency(property.offPlan.minimumInitialDeposit)
                      : 'Not provided'
                  }
                />
                <Detail
                  icon='schedule'
                  title='Installment duration'
                  value={
                    property.offPlan.installmentDurationMonths
                      ? `${property.offPlan.installmentDurationMonths} months`
                      : 'Not provided'
                  }
                />
                <Detail
                  icon='domain'
                  title='Units planned'
                  value={property.offPlan.totalUnitsPlanned ?? 'Not provided'}
                />
                <Detail
                  icon='maps_home_work'
                  title='Units available'
                  value={property.offPlan.unitsAvailable ?? 'Not provided'}
                />
                <Detail
                  icon='home'
                  title='Unit type'
                  value={property.offPlan.unitType ?? 'Not provided'}
                />
                <Detail
                  icon='floor'
                  title='Floor plan'
                  value={
                    property.offPlan.floorPlanAvailable
                      ? 'Available'
                      : 'Not available'
                  }
                />
              </div>
              {property.offPlan.paymentPlanDescription && (
                <div className='mt-5'>
                  <h3 className='font-bold'>Payment plan</h3>
                  <p className='mt-1 leading-7 text-slate-600'>
                    {property.offPlan.paymentPlanDescription}
                  </p>
                </div>
              )}
              {property.offPlan.riskDisclosure && (
                <div className='mt-4 rounded-xl border border-amber-200 bg-white p-4'>
                  <h3 className='font-bold text-amber-900'>Risk disclosure</h3>
                  <p className='mt-1 text-sm leading-6 text-amber-800'>
                    {property.offPlan.riskDisclosure}
                  </p>
                </div>
              )}
              {property.offPlan.refundPolicy && (
                <div className='mt-4'>
                  <h3 className='font-bold'>Refund policy</h3>
                  <p className='mt-1 leading-7 text-slate-600'>
                    {property.offPlan.refundPolicy}
                  </p>
                </div>
              )}
            </section>
          )}

          <section className='rounded-2xl border border-slate-200 bg-white p-5'>
            <div className='mb-4'>
              <h2 className='text-xl font-black text-slate-950'>
                Title documents and verification
              </h2>
              <p className='mt-1 text-sm leading-6 text-slate-500'>
                As the property owner, you can open every available title
                document without another payment. Documents still use a
                short-lived protected viewer to keep private vault storage
                secure.
              </p>
            </div>
            {property.titleDocumentReferences?.length ? (
              <div className='mb-5 grid gap-3 sm:grid-cols-2'>
                {property.titleDocumentReferences.map((reference) => (
                  <div
                    key={reference.publicReference}
                    className='rounded-xl bg-slate-50 p-4'
                  >
                    <p className='font-bold'>
                      Registry record ·{' '}
                      {documentTypeLabel(reference.documentType)}
                    </p>
                    <p className='mt-1 text-xs text-slate-500'>
                      {reference.publicReference} ·{' '}
                      {label(reference.verificationStatus)}
                    </p>
                    {reference.publicVerificationId && (
                      <Link
                        className='mt-2 inline-block text-xs font-bold text-primary hover:underline'
                        to={`/title-verification/${reference.publicVerificationId}`}
                      >
                        Registry ID: {reference.publicVerificationId}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {titleDocuments.length ? (
              <div className='space-y-3'>
                {titleDocuments.map((document) => {
                  const documentId =
                    document._id || document.publicReference || '';
                  return (
                    <div
                      key={documentId}
                      className='flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center'
                    >
                      <div className='min-w-0'>
                        <p className='truncate font-bold'>
                          {document.title ??
                            document.originalFileName ??
                            'Title document'}
                        </p>
                        <p className='truncate text-xs text-slate-500'>
                          {documentTypeLabel(document.documentType)}
                          {document.publicReference
                            ? ` · ${document.publicReference}`
                            : ''}
                        </p>
                      </div>
                      <button
                        type='button'
                        disabled={
                          !documentId || openingDocumentId === documentId
                        }
                        onClick={() => void openOwnedTitleDocument(document)}
                        className='shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        {openingDocumentId === documentId
                          ? 'Opening…'
                          : 'View title document'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className='text-sm text-slate-500'>
                No title documents are available for this property yet.
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className='grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center'>
          <div>
            <span className='material-symbols-outlined text-5xl text-slate-300'>
              domain_disabled
            </span>
            <h2 className='mt-3 font-bold text-slate-800'>
              No purchased property selected
            </h2>
            <Link
              className='mt-3 inline-block font-bold text-primary hover:underline'
              to='/dashboard/buyer/my-properties'
            >
              Return to your portfolio
            </Link>
          </div>
        </div>
      )}
    </BuyerPortalLayout>
  );
};
export default PropertyDetails;
