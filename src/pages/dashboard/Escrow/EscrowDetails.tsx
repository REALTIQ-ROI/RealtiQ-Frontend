import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  canSatisfyRule,
  ESCROW_STATUS,
  escrowActions,
  formatDateTime,
  formatEscrowMoney,
  requiredProgress,
  RULE_LABELS,
} from '../../../components/escrow/escrowConfig';
import EscrowRoleLayout from '../../../components/escrow/EscrowRoleLayout';
import EscrowDisputePanel from '../../../components/escrow/EscrowDisputePanel';
import BuyerRefundAccountForm from '../../../components/escrow/BuyerRefundAccountForm';
import EscrowStatusBadge from '../../../components/escrow/EscrowStatusBadge';
import RefundAdminPanel from '../../../components/escrow/RefundAdminPanel';
import RefundChat from '../../../components/escrow/RefundChat';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import MediaPreview from '../../../components/property/MediaPreview';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../../lib/axios';
import { useAsync } from '../../../hooks/useAsync';
import {
  escrowErrorDetails,
  escrowService,
} from '../../../services/escrowService';
import { propertyService } from '../../../services/propertyService';
import { propertyPublicReference } from '../../../types';
import type { Property } from '../../../types';
import { paymentService } from '../../../services/paymentService';
import type {
  Escrow,
  EscrowRule,
  SatisfyEscrowRuleResponse,
} from '../../../types/escrow';
import {
  escrowPayment,
  escrowProperty,
  isRuleSatisfied,
  populated,
} from '../../../types/escrow';

type Action = 'request' | 'approve' | 'cancel';
type MutationResponse = Escrow | SatisfyEscrowRuleResponse;

const refundStatuses = [
  'refund_pending',
  'refund_processing',
  'refunded',
  'refund_failed',
  'cancellation_pending_refund',
  'cancelled_refunded',
];
const processingStatuses = new Set([
  'refund_processing',
  'release_processing',
  'cancellation_pending_refund',
]);

const notePrompt = (
  title: string,
  required: boolean,
  confirmButtonText: string,
) =>
  Swal.fire<string>({
    title,
    input: 'textarea',
    inputLabel: required ? 'Reason (required)' : 'Audit note (optional)',
    inputPlaceholder: 'Add context for the audit timeline',
    showCancelButton: true,
    confirmButtonText,
    confirmButtonColor: '#173d32',
    inputValidator: (value) =>
      required && !value.trim() ? 'A reason is required.' : undefined,
  });

const actorName = (value: unknown) => {
  const actor = populated(
    value as { _id: string; name?: string } | string | null,
  );
  return actor?.name ?? (typeof value === 'string' ? 'Participant' : 'System');
};

const propertyLookupId = (escrow: Escrow): string | null => {
  const references = [escrow.property, escrow.propertyId];
  for (const reference of references) {
    if (reference && typeof reference === 'object') {
      const populatedReference = reference as { _id?: unknown; id?: unknown; publicReference?: unknown };
      for (const candidate of [populatedReference._id, populatedReference.id, populatedReference.publicReference]) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
      }
    }
  }
  for (const reference of references) {
    if (typeof reference === 'string' && reference.trim()) return reference.trim();
  }
  return null;
};

const escrowRuleIdentifier = (rule: EscrowRule): string | undefined => {
  if (typeof rule._id === 'string' && rule._id.trim()) return rule._id;
  if (typeof rule.id === 'string' && rule.id.trim()) return rule.id;
  return undefined;
};

const EscrowDetails = () => {
  const { id: routeId } = useParams();
  const normalizedRouteId = routeId?.trim() ?? '';
  const id = ['undefined', 'null', ':id'].includes(normalizedRouteId.toLowerCase())
    ? ''
    : normalizedRouteId;
  const { user, activeProfile } = useAuth();
  const {
    data: escrow,
    loading,
    error,
    execute,
  } = useAsync(() => id ? escrowService.get(id) : Promise.resolve(null), Boolean(id), id);
  const [pending, setPending] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [ruleEligibility, setRuleEligibility] = useState<Record<string, string>>(
    {},
  );
  const [satisfactionUpdate, setSatisfactionUpdate] =
    useState<SatisfyEscrowRuleResponse | null>(null);
  const escrowPaymentStepUp = useBoundStepUp<Awaited<ReturnType<typeof escrowService.initializePayment>>>();
  const [paymentOutcomeUnknown, setPaymentOutcomeUnknown] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState('');
  const [paymentTerminalStatus, setPaymentTerminalStatus] = useState<string | null>(null);
  const [checkingPaymentStatus, setCheckingPaymentStatus] = useState(false);

  const displayedRules = useMemo(() => {
    if (!escrow) return [];
    const rules = Array.isArray(escrow.rules)
      ? escrow.rules.filter((rule): rule is EscrowRule => Boolean(rule) && typeof rule === 'object')
        .map((rule) => {
          const ruleId = escrowRuleIdentifier(rule);
          return ruleId && rule._id !== ruleId ? { ...rule, _id: ruleId } : rule;
        })
      : [];
    const updatedRule =
      satisfactionUpdate?.escrow?._id === escrow._id
        ? satisfactionUpdate.rule
        : null;
    const updatedRuleId = updatedRule ? escrowRuleIdentifier(updatedRule) : undefined;
    return rules
      .map((rule) => {
        const ruleId = escrowRuleIdentifier(rule);
        return updatedRule && updatedRuleId && ruleId === updatedRuleId
          ? updatedRule
          : rule;
      })
      .map((rule, index) => ({ rule, index }))
      .sort((left, right) => {
        if (left.rule.sequence === undefined && right.rule.sequence === undefined) {
          return left.index - right.index;
        }
        if (left.rule.sequence === undefined) return 1;
        if (right.rule.sequence === undefined) return -1;
        return left.rule.sequence - right.rule.sequence;
      })
      .map(({ rule }) => rule);
  }, [escrow, satisfactionUpdate]);

  const hasMalformedRules = Boolean(escrow && Object.prototype.hasOwnProperty.call(escrow, 'rules') && (
    !Array.isArray(escrow.rules) || escrow.rules.some((rule) => !rule || typeof rule !== 'object' || !escrowRuleIdentifier(rule))
  ));

  const displayedEscrow = useMemo(
    () => (escrow ? { ...escrow, rules: displayedRules } : null),
    [displayedRules, escrow],
  );
  const firstUnsatisfiedMilestoneIndex = displayedRules.findIndex(
    (rule) => !isRuleSatisfied(rule),
  );
  const milestoneSummary =
    satisfactionUpdate && satisfactionUpdate.escrow._id === escrow?._id
      ? satisfactionUpdate.milestoneSummary
      : escrow?.milestoneSummary;
  const property = displayedEscrow ? escrowProperty(displayedEscrow) : null;
  const payment = displayedEscrow ? escrowPayment(displayedEscrow) : null;
  const buyerName = displayedEscrow?.participants?.buyer?.name?.trim() || null;
  const sellerName = displayedEscrow?.participants?.seller?.name?.trim() || null;
  const propertyId = displayedEscrow ? propertyLookupId(displayedEscrow) : null;
  const propertyImage = property?.media?.find((media) =>
    Boolean(media?.url) && media.type !== 'video' && media.resourceType !== 'video' &&
    (media.type === 'image' || media.resourceType === 'image'),
  );
  const propertyHasImage = Boolean(propertyImage);
  const propertyLookupKey = propertyId
    ? `${user?._id ?? ''}:${activeProfile?.id ?? ''}:${propertyId}`
    : null;
  const [hydratedProperty, setHydratedProperty] = useState<{
    key: string;
    property: Property;
  } | null>(null);

  useEffect(() => {
    if (!propertyId || !propertyLookupKey || propertyHasImage) return;
    let current = true;
    void propertyService.getPropertyById(propertyId)
      .then((result) => {
        if (current) setHydratedProperty({ key: propertyLookupKey, property: result });
      })
      .catch(() => {
        // Keep the safe media placeholder when the property projection is unavailable.
      });
    return () => { current = false; };
  }, [propertyHasImage, propertyId, propertyLookupKey]);

  const visibleProperty = propertyHasImage
    ? property
    : hydratedProperty?.key === propertyLookupKey
      ? hydratedProperty.property
      : property;
  const visiblePropertyImage = visibleProperty?.media?.find((media) =>
    Boolean(media?.url) && media.type !== 'video' && media.resourceType !== 'video' &&
    (media.type === 'image' || media.resourceType === 'image'),
  );
  const propertyReference = propertyPublicReference(visibleProperty);
  useEffect(() => {
    if (displayedEscrow && escrowService.getPendingId() === displayedEscrow._id && escrowService.getPendingReference()) {
      setPaymentOutcomeUnknown(true);
      setPaymentStatusMessage('A previous escrow payment attempt is recorded. Check its status before starting another attempt.');
    }
  }, [displayedEscrow]);
  const progress = useMemo(
    () => (displayedEscrow ? requiredProgress(displayedEscrow) : null),
    [displayedEscrow],
  );

  useEffect(() => {
    if (!escrow || !processingStatuses.has(escrow.status)) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void execute({ silent: true });
    };
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [escrow, execute]);

  const mutate = async (
    key: string,
    operation: () => Promise<MutationResponse>,
    onSuccess?: (result: MutationResponse) => void,
  ) => {
    if (pending) return;
    setPending(key);
    setConflict(null);
    try {
      const result = await operation();
      onSuccess?.(result);
      toast.success('Escrow updated successfully.');
      await execute();
    } catch (raw) {
      const err = escrowErrorDetails(raw);
      if (err.status === 409) {
        const missing = Array.isArray(err.missingRules)
          ? err.missingRules
              .map((item) =>
                typeof item === 'string'
                  ? item
                  : (item as { description?: string }).description ??
                    'Required condition',
              )
              .join(', ')
          : '';
        if (err.eligibleAt && key.startsWith('rule-')) {
          setRuleEligibility((current) => ({
            ...current,
            [key.slice(5)]: err.eligibleAt!,
          }));
        }
        setConflict(`${err.message}${missing ? ` Missing: ${missing}.` : ''}`);
        await execute();
      } else if (err.status === 403) {
        toast.error('You do not have permission to perform this escrow action.');
      } else if (err.status === 404) {
        toast.error('This escrow is no longer available.');
      } else {
        toast.error(err.message);
      }
    } finally {
      setPending(null);
    }
  };

  const action = async (type: Action) => {
    if (!displayedEscrow) return;
    const settings: readonly [string, boolean, string] =
      type === 'cancel'
          ? ['Cancel this escrow?', true, 'Cancel escrow']
          : type === 'approve'
            ? ['Approve final release?', false, 'Approve release']
            : ['Request release?', false, 'Request release'];
    const result = await notePrompt(settings[0], settings[1], settings[2]);
    if (!result.isConfirmed) return;
    const note = result.value?.trim() ?? '';
    if (type === 'cancel') {
      await mutate(type, () => escrowService.cancel(displayedEscrow._id, note));
    }
    if (type === 'request') {
      await mutate(type, () =>
        escrowService.requestRelease(displayedEscrow._id, note),
      );
    }
    if (type === 'approve') {
      await mutate(type, () =>
        escrowService.approveRelease(displayedEscrow._id, note),
      );
    }
  };

  const satisfy = async (ruleId: string) => {
    if (!displayedEscrow) return;
    const result = await notePrompt(
      'Mark milestone as satisfied?',
      false,
      'Confirm milestone',
    );
    if (!result.isConfirmed) return;
    await mutate(
      `rule-${ruleId}`,
      () =>
        escrowService.satisfyRule(
          displayedEscrow._id,
          ruleId,
          result.value,
        ),
      (response) => {
        if ('rule' in response && 'milestoneSummary' in response) {
          setSatisfactionUpdate(response);
        }
      },
    );
  };

  const initialize = async () => {
    if (!displayedEscrow || pending || paymentOutcomeUnknown || escrowPaymentStepUp.busy || escrowPaymentStepUp.challenge) return;
    const result = await Swal.fire({
      title: 'Continue to secured payment?',
      text: `Paystack will charge the full escrow amount of ${formatEscrowMoney(
        displayedEscrow.amount,
        displayedEscrow.currency ?? visibleProperty?.currency,
      )}. Milestone allocations do not split this funding transaction.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Continue to Paystack',
      confirmButtonColor: '#173d32',
    });
    if (!result.isConfirmed) return;
    setPending('payment');
    await escrowPaymentStepUp.begin({
      method: 'POST', path: '/api/payments/initialize', body: { escrowId: displayedEscrow._id },
      label: 'Initialize this escrow funding payment',
      execute: async (challengeId) => {
        try {
          const response = await escrowService.initializePayment(displayedEscrow._id, challengeId);
          if (response.redirectUrl) escrowService.redirectToPayment(response);
          else {
            setPaymentOutcomeUnknown(true);
            setPaymentStatusMessage('The escrow payment is pending without a provider URL. Check its reference before taking another action.');
          }
          return response;
        } catch (raw) {
          if (raw instanceof ApiRequestError && (raw.code === 'PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN' || raw.code === 'PAYMENT_INITIALIZATION_PENDING')) {
            setPaymentOutcomeUnknown(true);
            setPaymentStatusMessage('The provider outcome is unresolved. No replacement escrow payment was initialized.');
          } else if (!(raw instanceof ApiRequestError) || !raw.status || raw.status >= 500) {
            setPaymentOutcomeUnknown(true);
            setPaymentStatusMessage('The payment response was not confirmed. Check the saved reference before another attempt.');
          }
          toast.error(escrowErrorDetails(raw).message);
          throw raw;
        } finally { setPending(null); }
      },
    });
  };

  const completeEscrowStepUp = async (code: string): Promise<boolean> => {
    const result = await escrowPaymentStepUp.complete(code);
    if (!result.ok) setPending(null);
    if (!result.ok && result.error) toast.error(result.error);
    return result.ok;
  };

  const refreshEscrowPaymentStatus = async () => {
    const reference = escrowService.getPendingReference();
    if (!reference || checkingPaymentStatus) return;
    setCheckingPaymentStatus(true);
    try {
      const result = await paymentService.verifyPayment(reference);
      if (result.verified) {
        setPaymentTerminalStatus(result.payment.status);
        setPaymentOutcomeUnknown(result.payment.status === 'pending');
        setPaymentStatusMessage(`Server payment status: ${result.payment.status}. Escrow funding and allocations remain subject to the escrow record.`);
        if (result.payment.status === 'failed' || result.payment.status === 'canceled') escrowService.clearPending();
      } else setPaymentStatusMessage('The payment is still pending or has not been reconciled. Do not create another attempt.');
    } catch (raw) { setPaymentStatusMessage(raw instanceof Error ? raw.message : 'Unable to check escrow payment status.'); }
    finally { setCheckingPaymentStatus(false); }
  };

  if (!id) {
    const listPath = user?.role === 'admin'
      ? '/dashboard/admin/escrows'
      : user?.role === 'landlord'
        ? '/dashboard/landlord/escrows'
        : '/dashboard/buyer/escrows';
    return (
      <EscrowRoleLayout title="Escrow Details">
        <ErrorState message="This escrow link does not contain a valid escrow ID." />
        <Link to={listPath} className="mt-3 inline-block font-bold text-primary hover:underline">
          Back to escrows
        </Link>
      </EscrowRoleLayout>
    );
  }
  if (loading) {
    return (
      <EscrowRoleLayout title="Escrow Details">
        <LoadingState label="Loading escrow..." />
      </EscrowRoleLayout>
    );
  }
  if (error || !displayedEscrow || !progress) {
    return (
      <EscrowRoleLayout title="Escrow Details">
        <ErrorState
          message={error ?? 'Escrow not found or access was denied.'}
          onRetry={() => void execute()}
        />
      </EscrowRoleLayout>
    );
  }

  const refundEscrow = refundStatuses.includes(displayedEscrow.status);
  const availableActions = escrowActions(user?.role ?? 'buyer', displayedEscrow);
  const actions = hasMalformedRules
    ? { ...availableActions, requestRelease: false, approveRelease: false }
    : availableActions;
  const soldCancellation =
    displayedEscrow.status === 'cancelled' &&
    (displayedEscrow.logs ?? []).some((log) =>
      /sold|competing/i.test(`${log.action} ${log.note ?? ''}`),
    );
  const milestoneConfigured = Boolean(
    milestoneSummary?.configured && milestoneSummary.totalAllocated > 0,
  );
  const milestonePercent = milestoneConfigured
    ? Math.min(
        100,
        Math.max(
          0,
          (milestoneSummary!.satisfiedAmount /
            milestoneSummary!.totalAllocated) *
            100,
        ),
      )
    : progress.percent;

  return (
    <EscrowRoleLayout
      title="Escrow Details"
      subtitle={ESCROW_STATUS[displayedEscrow.status].description}
    >
      {conflict ? (
        <div
          role="alert"
          className="mb-6 rounded-xl bg-amber-100 p-4 text-sm font-medium text-amber-900"
        >
          {conflict}
        </div>
      ) : null}
      {hasMalformedRules ? (
        <div role="alert" className="mb-6 rounded-xl bg-amber-100 p-4 text-sm text-amber-900">
          The server returned incomplete release-condition data. Refresh this escrow before requesting or approving a release.
        </div>
      ) : null}
      {soldCancellation ? (
        <div
          role="status"
          className="mb-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-800"
        >
          This unpaid escrow was cancelled because the property was sold through
          another completed transaction. The property remains sold.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="h-40 w-full overflow-hidden rounded-xl bg-surface-container-low sm:w-56">
                <MediaPreview
                  media={visiblePropertyImage}
                  alt={visibleProperty?.title ?? 'Property'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      {visibleProperty?.title ?? 'Property escrow'}
                    </h2>
                    <p className="text-sm text-secondary">
                      {visibleProperty?.location ?? 'Location unavailable'}
                    </p>
                  </div>
                  <EscrowStatusBadge status={displayedEscrow.status} />
                </div>
                <p className="mt-5 text-3xl font-black text-primary">
                  {formatEscrowMoney(
                    displayedEscrow.amount,
                    displayedEscrow.currency ?? visibleProperty?.currency,
                  )}
                </p>
                {propertyReference ? (
                  <Link
                    to={`/properties/${propertyReference}`}
                    className="mt-3 inline-block text-sm font-bold text-primary hover:underline"
                  >
                    View property details
                  </Link>
                ) : property ? (
                  <p className="mt-3 text-sm font-bold text-secondary">
                    Reference pending
                  </p>
                ) : null}
              </div>
            </div>
            <dl className="mt-6 grid gap-4 border-t border-outline-variant/20 pt-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-bold uppercase text-secondary">
                  Buyer
                </dt>
                <dd>{buyerName ?? 'Buyer details unavailable'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-secondary">
                  Seller
                </dt>
                <dd>{sellerName ?? 'Seller details unavailable'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-secondary">
                  Created
                </dt>
                <dd>{formatDateTime(displayedEscrow.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-secondary">
                  Payment
                </dt>
                <dd>
                  {payment?.status ??
                    (displayedEscrow.status === 'pending_payment'
                      ? 'Awaiting payment'
                      : 'Confirmed')}
                </dd>
              </div>
            </dl>
          </section>

          {refundEscrow ? (
            <section className="rounded-xl bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold">Refund summary</h2>
              <p className="mt-2 text-sm text-secondary">
                This property remains sold. The refund affects only this
                competing escrow’s secured payment.
              </p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-secondary">Refund status</dt>
                  <dd>{ESCROW_STATUS[displayedEscrow.status].label}</dd>
                </div>
                <div>
                  <dt className="font-bold text-secondary">Requested</dt>
                  <dd>
                    {formatDateTime(
                      displayedEscrow.refundRequestedAt ?? undefined,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-secondary">
                    Processing started
                  </dt>
                  <dd>
                    {formatDateTime(
                      displayedEscrow.refundProcessingAt ?? undefined,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-secondary">Completed</dt>
                  <dd>
                    {formatDateTime(displayedEscrow.refundedAt ?? undefined)}
                  </dd>
                </div>
                {displayedEscrow.refundReference ? (
                  <div>
                    <dt className="font-bold text-secondary">
                      Refund reference
                    </dt>
                    <dd className="break-all">
                      {displayedEscrow.refundReference}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {displayedEscrow.status === 'refund_failed' ? (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                >
                  Refund processing was unsuccessful.{' '}
                  {user?.role === 'admin' &&
                  displayedEscrow.refundFailureReason
                    ? displayedEscrow.refundFailureReason
                    : 'An administrator will review and retry it.'}
                </p>
              ) : null}
            </section>
          ) : (
            <section className="rounded-xl bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {milestoneConfigured
                      ? 'Milestone progress'
                      : 'Required conditions'}
                  </h2>
                  {milestoneConfigured ? (
                    <p className="mt-1 text-xs text-secondary">
                      Satisfied allocation records milestone progress. It is not
                      money released or transferred.
                    </p>
                  ) : null}
                </div>
                <strong>
                  {milestoneConfigured
                    ? `${milestoneSummary!.satisfiedMilestoneCount}/${milestoneSummary!.milestoneCount}`
                    : `${progress.complete}/${progress.total}`}
                </strong>
              </div>

              <div
                className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container"
                aria-label="Milestone progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(milestonePercent)}
                role="progressbar"
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${milestonePercent}%` }}
                />
              </div>

              {milestoneConfigured ? (
                <dl className="mt-4 grid gap-3 rounded-lg bg-surface-container-low p-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-bold uppercase text-secondary">
                      Total allocated
                    </dt>
                    <dd className="mt-1 font-bold">
                      {formatEscrowMoney(
                        milestoneSummary!.totalAllocated,
                        displayedEscrow.currency ?? visibleProperty?.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-secondary">
                      Satisfied allocation
                    </dt>
                    <dd className="mt-1 font-bold text-emerald-700">
                      {formatEscrowMoney(
                        milestoneSummary!.satisfiedAmount,
                        displayedEscrow.currency ?? visibleProperty?.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-secondary">
                      Remaining allocation
                    </dt>
                    <dd className="mt-1 font-bold">
                      {formatEscrowMoney(
                        milestoneSummary!.remainingAmount,
                        displayedEscrow.currency ?? visibleProperty?.currency,
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-xs text-secondary">
                  This legacy escrow does not have milestone amount allocations.
                  Progress is shown by required condition count.
                </p>
              )}

              <div className="mt-6 space-y-3">
                {displayedRules.map((rule, index) => {
                  const satisfied = isRuleSatisfied(rule);
                  const ruleId = escrowRuleIdentifier(rule);
                  const eligibleAt = ruleId ? ruleEligibility[ruleId] : undefined;
                  const sequenceBlocked =
                    !satisfied &&
                    firstUnsatisfiedMilestoneIndex >= 0 &&
                    index > firstUnsatisfiedMilestoneIndex;
                  const blockingMilestone =
                    sequenceBlocked
                      ? displayedRules[firstUnsatisfiedMilestoneIndex]
                      : null;
                  const canCurrentUserSatisfy = Boolean(
                    user &&
                    canSatisfyRule(user.role, displayedEscrow, rule),
                  );
                  return (
                    <article
                      key={ruleId ?? `rule-${index}`}
                      className="rounded-xl border border-outline-variant/20 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined">
                          {satisfied
                            ? 'check_circle'
                            : 'radio_button_unchecked'}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                            Milestone {rule.sequence ?? index + 1}
                          </p>
                          <h3 className="font-bold">
                            {RULE_LABELS[rule.type]}
                          </h3>
                          <p className="text-sm text-secondary">
                            {rule.description}
                          </p>
                          {rule.amount !== undefined ? (
                            <p className="mt-2 text-sm font-black text-primary">
                              {formatEscrowMoney(
                                rule.amount,
                                displayedEscrow.currency ?? visibleProperty?.currency,
                              )}
                            </p>
                          ) : null}
                          {eligibleAt ? (
                            <p className="text-xs text-amber-700">
                              Eligible {formatDateTime(eligibleAt)}
                            </p>
                          ) : null}
                          {sequenceBlocked && canCurrentUserSatisfy ? (
                            <p className="mt-2 text-xs font-semibold text-amber-700">
                              Complete milestone {blockingMilestone?.sequence ?? firstUnsatisfiedMilestoneIndex + 1} first.
                            </p>
                          ) : null}
                        </div>
                        {canCurrentUserSatisfy && ruleId ? (
                          <button
                            type="button"
                            disabled={Boolean(pending) || sequenceBlocked}
                            onClick={() => void satisfy(ruleId)}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Satisfy
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {refundEscrow && user && ['buyer', 'admin'].includes(user.role) ? (
            <RefundChat escrow={displayedEscrow} onChanged={execute} />
          ) : null}
          <BuyerRefundAccountForm escrow={displayedEscrow} onChanged={execute} />
          {user?.role === 'admin' && refundEscrow ? (
            <RefundAdminPanel escrow={displayedEscrow} onChanged={execute} />
          ) : null}

          <EscrowDisputePanel escrow={displayedEscrow} onChanged={execute} />

          <section className="rounded-xl bg-white p-5 sm:p-7">
            <h2 className="text-xl font-bold">Audit timeline</h2>
            {displayedEscrow.logs?.length ? (
              <ol className="mt-6 space-y-5 border-l-2 pl-5">
                {displayedEscrow.logs.map((log, index) => (
                  <li key={log._id ?? `${log.createdAt}-${index}`}>
                    <div className="flex justify-between gap-2">
                      <strong className="capitalize">
                        {log.action.replaceAll('_', ' ')}
                      </strong>
                      <time className="text-xs text-secondary">
                        {formatDateTime(log.createdAt)}
                      </time>
                    </div>
                    <p className="text-xs text-secondary">
                      {actorName(log.actor ?? log.actorId)}
                    </p>
                    {log.note ? (
                      <p className="mt-2 rounded-lg bg-surface-container-low p-3 text-sm">
                        {log.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-secondary">
                No audit events have been recorded yet.
              </p>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl bg-white p-5 xl:sticky xl:top-24">
          <h2 className="font-bold">Available actions</h2>
          <div className="mt-5 space-y-3">
            {user?.role === 'buyer' &&
            displayedEscrow.status === 'pending_payment' ? (
              <button
                type="button"
                disabled={Boolean(pending) || paymentOutcomeUnknown || paymentTerminalStatus === 'paid' || escrowPaymentStepUp.busy || Boolean(escrowPaymentStepUp.challenge)}
                onClick={() => void initialize()}
                className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-on-primary"
              >
                {paymentOutcomeUnknown ? 'Payment outcome unresolved' : pending || escrowPaymentStepUp.busy ? 'Preparing secure payment…' : 'Fund full escrow amount'}
              </button>
            ) : null}
            {paymentOutcomeUnknown ? <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p>{paymentStatusMessage}</p><p className="mt-1">Reference: {escrowService.getPendingReference() || 'not available'}</p><button type="button" className="mt-2 font-bold underline" disabled={checkingPaymentStatus || !escrowService.getPendingReference()} onClick={() => void refreshEscrowPaymentStatus()}>{checkingPaymentStatus ? 'Checking…' : 'Check payment status'}</button></div> : paymentStatusMessage ? <p role="status" className="text-sm text-secondary">{paymentStatusMessage}</p> : null}
            {escrowPaymentStepUp.error && !escrowPaymentStepUp.challenge ? <p role="alert" className="text-sm text-error">{escrowPaymentStepUp.error}</p> : null}
            {actions.requestRelease ? (
              <button
                type="button"
                onClick={() => void action('request')}
                className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-on-primary"
              >
                Request release
              </button>
            ) : null}
            {actions.approveRelease ? (
              <button
                type="button"
                onClick={() => void action('approve')}
                className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white"
              >
                Approve final release
              </button>
            ) : null}
            {actions.cancel ? (
              <button
                type="button"
                onClick={() => void action('cancel')}
                className="w-full rounded-lg border border-red-300 px-4 py-3 font-bold text-red-700"
              >
                Cancel escrow
              </button>
            ) : null}
            {refundEscrow &&
            user &&
            ['buyer', 'admin'].includes(user.role) ? (
              <a
                href="#refund-chat"
                className="block rounded-lg bg-primary px-4 py-3 text-center font-bold text-on-primary"
              >
                Open refund conversation
              </a>
            ) : null}
          </div>
      </aside>
      <StepUpDialog challenge={escrowPaymentStepUp.challenge} busy={escrowPaymentStepUp.busy || pending === 'payment'} error={escrowPaymentStepUp.error} onCancel={() => { escrowPaymentStepUp.cancel(); setPending(null); }} onSubmit={completeEscrowStepUp} />
      </div>
    </EscrowRoleLayout>
  );
};

export default EscrowDetails;
