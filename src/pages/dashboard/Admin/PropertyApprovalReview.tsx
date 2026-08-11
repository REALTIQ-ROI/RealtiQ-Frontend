import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import PaymentTypeBadges from '../../../components/property/PaymentTypeBadges';
import PropertyGallery from '../../../components/property/PropertyGallery';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import TitleVerificationBadge from '../../../components/title/TitleVerificationBadge';
import { ApiRequestError } from '../../../lib/axios';
import { propertyService, type PropertyApprovalDetailResponse } from '../../../services/propertyService';
import { propertyDisplayReference, type Property } from '../../../types';
import { normalizePropertyPaymentTypes } from '../../../utils/propertyPaymentTypes';
import { formatDate, labelize } from '../../../utils/projectFormatters';

const resolveOwnerName = (property?: Property | null) => {
  const owner = property?.ownerId;
  if (!owner || typeof owner === 'string') return 'Owner unavailable';
  return owner.name || owner.email || 'Owner unavailable';
};

const approvalLookupId = (property: Property) => property._id || property.publicReference || '';

const PropertyApprovalReview = () => {
  const [pending, setPending] = useState<Property[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<PropertyApprovalDetailResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const selectedProperty = detail?.property ?? pending.find((property) => approvalLookupId(property) === selectedId) ?? null;
  const selectedReference = useMemo(() => propertyDisplayReference(selectedProperty), [selectedProperty]);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const response = await propertyService.listPendingApprovalProperties();
      setPending(response.properties ?? []);
      if (!selectedId && response.properties?.[0]) setSelectedId(approvalLookupId(response.properties[0]));
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to load pending property approvals.');
    } finally {
      setLoadingList(false);
    }
  };

  const loadDetail = async (id: string) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      setDetail(await propertyService.getPropertyApprovalDetail(id));
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to load property approval detail.');
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [selectedId]);

  const review = async (decision: 'approve' | 'reject') => {
    if (!selectedId || reviewing) return;
    if (decision === 'reject' && !rejectionReason.trim()) {
      toast.error('Enter a rejection reason.');
      return;
    }
    setReviewing(true);
    try {
      await propertyService.updatePropertyApproval(selectedId, {
        decision,
        ...(decision === 'reject' ? { rejectionReason: rejectionReason.trim() } : {}),
      });
      toast.success(decision === 'approve' ? 'Listing approved.' : 'Listing rejected.');
      setRejectionReason('');
      setDetail(null);
      await loadList();
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) {
        toast.error(raw.message || 'This listing cannot be approved in its current state.');
      } else {
        toast.error(raw instanceof Error ? raw.message : 'Unable to update listing approval.');
      }
    } finally {
      setReviewing(false);
    }
  };

  return (
    <AdminLayout>
      <main className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold">Listing Approval Queue</h1>
          <p className="mt-2 text-sm text-secondary">Review pending listings before they appear in public property browsing.</p>
          <div className="mt-5 space-y-2">
            {loadingList ? <LoadingState label="Loading pending listings..." /> : null}
            {!loadingList && !pending.length ? <p className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">No listings are pending approval.</p> : null}
            {pending.map((property) => {
              const id = approvalLookupId(property);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className={`w-full rounded-lg p-4 text-left transition-colors ${selectedId === id ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high'}`}
                >
                  <span className="block font-bold">{property.title}</span>
                  <span className="mt-1 block text-xs opacity-80">{propertyDisplayReference(property)}</span>
                  <span className="mt-1 block text-xs opacity-80">{property.location}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
          {loadingDetail ? <LoadingState label="Loading listing review..." /> : null}
          {!loadingDetail && !selectedProperty ? <p className="text-sm text-secondary">Select a pending listing to review.</p> : null}
          {!loadingDetail && selectedProperty ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">{selectedReference}</p>
                  <h2 className="mt-1 text-2xl font-extrabold">{selectedProperty.title}</h2>
                  <p className="text-sm text-secondary">{selectedProperty.location}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                  {selectedProperty.approvalStatus || 'pending_review'}
                </span>
              </div>

              <PropertyGallery property={selectedProperty} />

              <dl className="grid gap-4 rounded-xl bg-surface-container-low p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="text-xs font-bold uppercase text-secondary">Owner</dt><dd className="mt-1">{resolveOwnerName(selectedProperty)}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Type</dt><dd className="mt-1">{selectedProperty.propertyType}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Price</dt><dd className="mt-1">{selectedProperty.currency ?? 'NGN'} {selectedProperty.price?.toLocaleString()}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Category</dt><dd className="mt-1">{labelize(selectedProperty.category)}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Status</dt><dd className="mt-1">{labelize(selectedProperty.status)}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Listing Type</dt><dd className="mt-1">{labelize(selectedProperty.listingType ?? 'ready')}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Bedrooms</dt><dd className="mt-1">{selectedProperty.bedrooms ?? 'N/A'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Bathrooms</dt><dd className="mt-1">{selectedProperty.bathrooms ?? 'N/A'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Area</dt><dd className="mt-1">{selectedProperty.squareFeet ? `${selectedProperty.squareFeet.toLocaleString()} sqft` : 'N/A'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Title Document Status</dt><dd className="mt-1">{detail?.titleDocumentStatus || 'not_submitted'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-secondary">Title Verification</dt><dd className="mt-1"><TitleVerificationBadge summary={selectedProperty.titleVerification} context="admin" /></dd></div>
                {selectedProperty.project ? <div><dt className="text-xs font-bold uppercase text-secondary">Project</dt><dd className="mt-1">{selectedProperty.project.name}</dd></div> : null}
                {selectedProperty.projectUnit ? <div><dt className="text-xs font-bold uppercase text-secondary">Project Unit</dt><dd className="mt-1">{[selectedProperty.projectUnit.unitName, selectedProperty.projectUnit.unitNumber, selectedProperty.projectUnit.block, selectedProperty.projectUnit.phase, selectedProperty.projectUnit.floor].filter(Boolean).join(' - ') || 'N/A'}</dd></div> : null}
              </dl>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-outline-variant/20 p-4">
                  <h3 className="font-bold">Description</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">{selectedProperty.description || 'No description provided.'}</p>
                </section>
                <section className="rounded-xl border border-outline-variant/20 p-4">
                  <h3 className="font-bold">Amenities</h3>
                  {selectedProperty.amenities?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity) => <span key={amenity} className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold">{amenity}</span>)}
                    </div>
                  ) : <p className="mt-3 text-sm text-secondary">No amenities provided.</p>}
                </section>
              </div>

              {selectedProperty.offPlan ? (
                <section className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <h3 className="font-bold text-primary">Off-plan details</h3>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-xs font-bold uppercase text-secondary">Stage</dt><dd>{labelize(selectedProperty.offPlan.developmentStatus)}</dd></div>
                    <div><dt className="text-xs font-bold uppercase text-secondary">Progress</dt><dd>{selectedProperty.offPlan.constructionProgress ?? 0}%</dd></div>
                    <div><dt className="text-xs font-bold uppercase text-secondary">Expected completion</dt><dd>{formatDate(selectedProperty.offPlan.expectedCompletionDate)}</dd></div>
                    <div><dt className="text-xs font-bold uppercase text-secondary">Initial deposit</dt><dd>{selectedProperty.offPlan.minimumInitialDeposit?.toLocaleString() ?? 'N/A'}</dd></div>
                    <div><dt className="text-xs font-bold uppercase text-secondary">Installment</dt><dd>{selectedProperty.offPlan.installmentAvailable ? 'Available' : 'Not available'}</dd></div>
                    <div><dt className="text-xs font-bold uppercase text-secondary">Units</dt><dd>{selectedProperty.offPlan.unitsAvailable ?? 'N/A'} / {selectedProperty.offPlan.totalUnitsPlanned ?? 'N/A'}</dd></div>
                  </dl>
                  {selectedProperty.offPlan.riskDisclosure ? <p className="mt-3 rounded-lg bg-white p-3 text-sm text-on-surface-variant">{selectedProperty.offPlan.riskDisclosure}</p> : null}
                </section>
              ) : null}

              <div>
                <h3 className="font-bold">Payment options</h3>
                <div className="mt-3">
                  <PaymentTypeBadges
                    paymentTypes={normalizePropertyPaymentTypes(
                      selectedProperty.paymentTypes,
                      selectedProperty.price,
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-bold">Restricted Title Documents</h3>
                {detail?.titleDocuments?.length ? (
                  <div className="mt-3 space-y-2">
                    {detail.titleDocuments.map((document) => (
                      <div key={document.publicReference || document._id} className="rounded-lg border border-outline-variant/20 p-4 text-sm">
                        <p className="font-bold">{document.title || document.originalFileName || 'Title document'}</p>
                        <p className="mt-1 text-xs text-secondary">{document.publicReference || 'Reference pending'} - {document.documentType || 'other'}</p>
                        <p className="mt-2 text-xs font-bold text-secondary">Open through the protected viewer from the property management panel.</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-surface-container-low p-4 text-sm text-secondary">
                    No title document is uploaded. Admin approval is still allowed; public listings will show Title Document Not Verified.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-outline-variant/20 p-4">
                <label className="text-sm font-bold">
                  Rejection reason
                  <textarea
                    className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm"
                    rows={3}
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder="Required only when rejecting"
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" onClick={() => void review('approve')} loading={reviewing} loadingLabel="Approving...">
                    Approve Listing
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void review('reject')} loading={reviewing} loadingLabel="Rejecting...">
                    Reject Listing
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </AdminLayout>
  );
};

export default PropertyApprovalReview;
