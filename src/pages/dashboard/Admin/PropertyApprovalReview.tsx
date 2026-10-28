import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import AdminLayout from '../../../components/layout/AdminLayout';
import PaymentTypeBadges from '../../../components/property/PaymentTypeBadges';
import PropertyGallery from '../../../components/property/PropertyGallery';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import TitleVerificationBadge from '../../../components/title/TitleVerificationBadge';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../../lib/axios';
import { propertyService, type PropertyApprovalDetailResponse, type PropertyApprovalInput } from '../../../services/propertyService';
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
  const [pendingDecision, setPendingDecision] = useState<PropertyApprovalInput | null>(null);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const [statusRefreshBusy, setStatusRefreshBusy] = useState(false);
  const [statusRefreshError, setStatusRefreshError] = useState<string | null>(null);
  const stepUp = useBoundStepUp<Awaited<ReturnType<typeof propertyService.updatePropertyApproval>>>();
  const detailRequestVersion = useRef(0);
  const pendingListRequestVersion = useRef(0);

  const selectedProperty = detail?.property ?? pending.find((property) => approvalLookupId(property) === selectedId) ?? null;
  const selectedReference = useMemo(() => propertyDisplayReference(selectedProperty), [selectedProperty]);
  const selectedInPendingQueue = pending.some((property) => approvalLookupId(property) === selectedId);
  const selectedIsPending = selectedInPendingQueue
    && (selectedProperty?.approvalStatus === undefined || selectedProperty.approvalStatus === 'pending_review');

  const loadList = async () => {
    const requestVersion = ++pendingListRequestVersion.current;
    setLoadingList(true);
    try {
      const response = await propertyService.listPendingApprovalProperties();
      if (requestVersion !== pendingListRequestVersion.current) return;
      setPending(response.properties ?? []);
      if (!selectedId && response.properties?.[0]) setSelectedId(approvalLookupId(response.properties[0]));
    } catch (raw) {
      if (requestVersion === pendingListRequestVersion.current) {
        toast.error(raw instanceof Error ? raw.message : 'Unable to load pending property approvals.');
      }
    } finally {
      if (requestVersion === pendingListRequestVersion.current) setLoadingList(false);
    }
  };

  const loadDetail = async (id: string) => {
    const requestVersion = ++detailRequestVersion.current;
    if (!id) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const result = await propertyService.getPropertyApprovalDetail(id);
      if (requestVersion === detailRequestVersion.current) setDetail(result);
    } catch (raw) {
      if (requestVersion === detailRequestVersion.current) {
        toast.error(raw instanceof Error ? raw.message : 'Unable to load property approval detail.');
        setDetail(null);
      }
    } finally {
      if (requestVersion === detailRequestVersion.current) setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [selectedId]);

  const refreshApprovalState = async (id: string): Promise<boolean> => {
    const currentDetailRequest = ++detailRequestVersion.current;
    const currentListRequest = ++pendingListRequestVersion.current;
    setStatusRefreshBusy(true);
    setStatusRefreshError(null);
    setOutcomeUnknown(true);
    try {
      const [freshDetail, freshQueue] = await Promise.all([
        propertyService.getPropertyApprovalDetail(id),
        propertyService.listPendingApprovalProperties(),
      ]);
      if (currentDetailRequest !== detailRequestVersion.current || currentListRequest !== pendingListRequestVersion.current) {
        setStatusRefreshError('A newer approval refresh replaced this result. Refresh the listing status again before submitting.');
        return false;
      }
      const freshPending = freshQueue.properties ?? [];
      const stillPending = freshDetail.property.approvalStatus !== undefined
        ? freshDetail.property.approvalStatus === 'pending_review'
        : freshPending.some((property) => approvalLookupId(property) === id);
      setDetail(freshDetail);
      setPending(freshPending);
      setOutcomeUnknown(false);
      if (!stillPending) {
        setPendingDecision(null);
        toast.info(`The listing is no longer pending approval. Current status: ${freshDetail.property.approvalStatus ?? 'updated by the server'}.`);
      }
      return true;
    } catch {
      setOutcomeUnknown(true);
      setStatusRefreshError('The approval state could not be refreshed. A new decision is disabled until the listing status is confirmed.');
      return false;
    } finally {
      setStatusRefreshBusy(false);
    }
  };

  const beginPendingDecision = async (body: PropertyApprovalInput, id: string) => {
    setStatusRefreshError(null);
    setOutcomeUnknown(false);
    await stepUp.begin({
      method: 'PATCH',
      path: `/api/properties/${encodeURIComponent(id)}/approval`,
      body,
      label: `${body.decision === 'approve' ? 'Approve' : 'Reject'} listing ${propertyDisplayReference(selectedProperty)}`,
      execute: async (challengeId, exactBody) => {
        try {
          return await propertyService.updatePropertyApproval(id, exactBody, challengeId);
        } catch (raw) {
          const status = raw instanceof ApiRequestError ? raw.status : undefined;
          const outcomeNeedsRefresh = status === 409 || status === undefined || status >= 500;
          if (outcomeNeedsRefresh) {
            await refreshApprovalState(id);
            if (status === 409) setPendingDecision(null);
          }
          throw raw;
        }
      },
    });
  };

  const review = async (decision: 'approve' | 'reject') => {
    if (!selectedId || reviewing || pendingDecision || !selectedIsPending) return;
    if (decision === 'reject' && !rejectionReason.trim()) {
      toast.error('Enter a rejection reason.');
      return;
    }
    setReviewing(true);
    try {
      const body: PropertyApprovalInput = decision === 'approve'
        ? { decision: 'approve' }
        : { decision: 'reject', rejectionReason: rejectionReason.trim() };
      const confirmation = await Swal.fire({
        title: decision === 'approve' ? 'Approve this listing?' : 'Reject this listing?',
        text: decision === 'approve'
          ? `Confirm approval of ${selectedProperty?.title ?? 'this listing'}.`
          : `Confirm rejection of ${selectedProperty?.title ?? 'this listing'}. Reason: ${body.decision === 'reject' ? body.rejectionReason : ''}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: decision === 'approve' ? 'Confirm approval' : 'Confirm rejection',
        confirmButtonColor: decision === 'approve' ? '#173d32' : '#b42318',
      });
      if (!confirmation.isConfirmed) return;
      setPendingDecision(body);
      stepUp.clearError();
      await beginPendingDecision(body, selectedId);
    } finally {
      setReviewing(false);
    }
  };

  const completeDecision = async (code: string): Promise<boolean> => {
    setReviewing(true);
    try {
      const result = await stepUp.complete(code);
      if (!result.ok) return false;
      const decision = pendingDecision?.decision;
      const updatedProperty = result.value.approvalStatus
        ? { ...result.value.property, approvalStatus: result.value.approvalStatus }
        : result.value.property;
      setDetail((current) => current ? { ...current, property: updatedProperty } : current);
      setPendingDecision(null);
      setRejectionReason('');
      toast.success(decision === 'approve' ? 'Listing approved.' : 'Listing rejected.');
      await loadList();
      return true;
    } finally {
      setReviewing(false);
    }
  };

  const requestFreshChallenge = async () => {
    if (!pendingDecision || !selectedId || statusRefreshBusy || outcomeUnknown) return;
    await beginPendingDecision(pendingDecision, selectedId);
  };

  const cancelDecisionChallenge = () => {
    stepUp.cancel();
    setPendingDecision(null);
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
                  disabled={reviewing || Boolean(pendingDecision)}
                  onClick={() => setSelectedId(id)}
                  className={`w-full rounded-lg p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${selectedId === id ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high'}`}
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
                    disabled={Boolean(pendingDecision) || reviewing}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder="Required only when rejecting"
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" disabled={!selectedIsPending || reviewing || Boolean(pendingDecision) || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void review('approve')} loading={reviewing} loadingLabel="Preparing...">
                    Approve Listing
                  </Button>
                  <Button type="button" variant="secondary" disabled={!selectedIsPending || reviewing || Boolean(pendingDecision) || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void review('reject')} loading={reviewing} loadingLabel="Preparing...">
                    Reject Listing
                  </Button>
                </div>
                {!selectedIsPending ? <p role="status" className="mt-3 text-sm text-secondary">This listing is no longer in the pending approval queue. Current approval status: {selectedProperty.approvalStatus ?? 'not supplied'}.</p> : null}
                {pendingDecision ? <p className="mt-3 text-xs text-secondary">Confirmed decision: {pendingDecision.decision}{pendingDecision.decision === 'reject' ? ` — ${pendingDecision.rejectionReason}` : ''}. The decision is locked while its authenticator challenge is active.</p> : null}
                {statusRefreshBusy ? <p role="status" className="mt-3 text-sm text-secondary">Refreshing the listing approval state before allowing another submission…</p> : null}
                {statusRefreshError ? <div className="mt-3 space-y-2"><p role="alert" className="text-sm text-error">{statusRefreshError}</p><Button type="button" variant="secondary" disabled={statusRefreshBusy} onClick={() => void refreshApprovalState(selectedId)}>Refresh approval status</Button></div> : null}
                {stepUp.error && !stepUp.challenge ? <p role="alert" className="mt-3 text-sm text-error">{stepUp.error}</p> : null}
                {stepUp.errorCode === 'AUTH_FACTOR_REQUIRED' ? <p className="mt-2 text-sm text-secondary">The decision remains unsent. <Link className="font-bold text-primary underline" to="/dashboard/admin/settings#authenticator-enrollment" target="_blank" rel="noreferrer">Set up an authenticator in Account Security</Link>, then return here to request a fresh challenge.</p> : null}
                {pendingDecision && !stepUp.challenge && !stepUp.busy && !outcomeUnknown && !statusRefreshBusy ? <Button type="button" className="mt-3" disabled={reviewing} onClick={() => void requestFreshChallenge()}>Request a fresh authenticator challenge</Button> : null}
                {outcomeUnknown && !statusRefreshBusy && !statusRefreshError ? <p role="alert" className="mt-3 text-sm text-error">The server did not confirm the decision. The listing status is being checked; no second approval request has been sent.</p> : null}
              </div>
            </div>
          ) : null}
        </section>
      </main>
      <StepUpDialog
        challenge={stepUp.challenge}
        busy={reviewing || stepUp.busy}
        error={stepUp.error}
        onCancel={cancelDecisionChallenge}
        onSubmit={completeDecision}
      />
    </AdminLayout>
  );
};

export default PropertyApprovalReview;
