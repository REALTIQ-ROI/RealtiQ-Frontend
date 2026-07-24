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
import EscrowStatusBadge from '../../../components/escrow/EscrowStatusBadge';
import RefundAdminPanel from '../../../components/escrow/RefundAdminPanel';
import RefundChat from '../../../components/escrow/RefundChat';
import MediaPreview from '../../../components/property/MediaPreview';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import {
  escrowErrorDetails,
  escrowService,
} from '../../../services/escrowService';
import { propertyPublicReference } from '../../../types';
import type {
  Escrow,
  SatisfyEscrowRuleResponse,
} from '../../../types/escrow';
import {
  escrowBuyer,
  escrowPayment,
  escrowProperty,
  escrowSeller,
  isRuleSatisfied,
  populated,
} from '../../../types/escrow';

type Action = 'request' | 'approve' | 'cancel' | 'dispute';
type MutationResponse = Escrow | SatisfyEscrowRuleResponse;

const refundStatuses = [
  'refund_pending',
  'refund_processing',
  'refunded',
  'refund_failed',
];

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

const metadataText = (metadata?: Record<string, unknown>) =>
  metadata && Object.keys(metadata).length ? JSON.stringify(metadata) : null;

const EscrowDetails = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const {
    data: escrow,
    loading,
    error,
    execute,
  } = useAsync(() => escrowService.get(id), true);
  const [pending, setPending] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [ruleEligibility, setRuleEligibility] = useState<Record<string, string>>(
    {},
  );
  const [satisfactionUpdate, setSatisfactionUpdate] =
    useState<SatisfyEscrowRuleResponse | null>(null);

  const displayedRules = useMemo(() => {
    if (!escrow) return [];
    const updatedRule =
      satisfactionUpdate?.escrow._id === escrow._id
        ? satisfactionUpdate.rule
        : null;
    return (escrow.rules ?? [])
      .map((rule) => (updatedRule?._id === rule._id ? updatedRule : rule))
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

  const displayedEscrow = useMemo(
    () => (escrow ? { ...escrow, rules: displayedRules } : null),
    [displayedRules, escrow],
  );
  const milestoneSummary =
    satisfactionUpdate && satisfactionUpdate.escrow._id === escrow?._id
      ? satisfactionUpdate.milestoneSummary
      : escrow?.milestoneSummary;
  const property = displayedEscrow ? escrowProperty(displayedEscrow) : null;
  const buyer = displayedEscrow ? escrowBuyer(displayedEscrow) : null;
  const seller = displayedEscrow ? escrowSeller(displayedEscrow) : null;
  const payment = displayedEscrow ? escrowPayment(displayedEscrow) : null;
  const propertyReference = propertyPublicReference(property);
  const progress = useMemo(
    () => (displayedEscrow ? requiredProgress(displayedEscrow) : null),
    [displayedEscrow],
  );

  useEffect(() => {
    if (escrow?.status !== 'refund_processing') return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void execute();
    };
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [escrow?.status, execute]);

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
      type === 'dispute'
        ? ['Raise a dispute', true, 'Submit dispute']
        : type === 'cancel'
          ? ['Cancel this escrow?', true, 'Cancel escrow']
          : type === 'approve'
            ? ['Approve final release?', false, 'Approve release']
            : ['Request release?', false, 'Request release'];
    const result = await notePrompt(settings[0], settings[1], settings[2]);
    if (!result.isConfirmed) return;
    const note = result.value?.trim() ?? '';
    if (type === 'dispute') {
      await mutate(type, () =>
        escrowService.dispute(displayedEscrow._id, note),
      );
    }
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
    if (!displayedEscrow || pending) return;
    const result = await Swal.fire({
      title: 'Continue to secured payment?',
      text: `Paystack will charge the full escrow amount of ${formatEscrowMoney(
        displayedEscrow.amount,
        displayedEscrow.currency ?? property?.currency,
      )}. Milestone allocations do not split this funding transaction.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Continue to Paystack',
      confirmButtonColor: '#173d32',
    });
    if (!result.isConfirmed) return;
    setPending('payment');
    try {
      escrowService.redirectToPayment(
        await escrowService.initializePayment(displayedEscrow._id),
      );
    } catch (raw) {
      toast.error(escrowErrorDetails(raw).message);
      setPending(null);
    }
  };

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
  const actions = escrowActions(user?.role ?? 'buyer', displayedEscrow);
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
                  media={property?.media?.[0]}
                  alt={property?.title ?? 'Property'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      {property?.title ?? 'Property escrow'}
                    </h2>
                    <p className="text-sm text-secondary">
                      {property?.location ?? 'Location unavailable'}
                    </p>
                  </div>
                  <EscrowStatusBadge status={displayedEscrow.status} />
                </div>
                <p className="mt-5 text-3xl font-black text-primary">
                  {formatEscrowMoney(
                    displayedEscrow.amount,
                    displayedEscrow.currency ?? property?.currency,
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
                <dd>{buyer?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-secondary">
                  Seller
                </dt>
                <dd>{seller?.name ?? '—'}</dd>
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
                        displayedEscrow.currency ?? property?.currency,
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
                        displayedEscrow.currency ?? property?.currency,
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
                        displayedEscrow.currency ?? property?.currency,
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
                  const eligibleAt = ruleEligibility[rule._id];
                  return (
                    <article
                      key={rule._id}
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
                                displayedEscrow.currency ?? property?.currency,
                              )}
                            </p>
                          ) : null}
                          {eligibleAt ? (
                            <p className="text-xs text-amber-700">
                              Eligible {formatDateTime(eligibleAt)}
                            </p>
                          ) : null}
                        </div>
                        {user &&
                        canSatisfyRule(user.role, displayedEscrow, rule) ? (
                          <button
                            type="button"
                            disabled={Boolean(pending)}
                            onClick={() => void satisfy(rule._id)}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary"
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

          {refundEscrow ? (
            <RefundChat escrow={displayedEscrow} onChanged={execute} />
          ) : null}
          {user?.role === 'admin' && refundEscrow ? (
            <RefundAdminPanel escrow={displayedEscrow} onChanged={execute} />
          ) : null}

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
                    {metadataText(log.metadata) ? (
                      <p className="mt-1 break-all text-xs text-secondary">
                        Metadata: {metadataText(log.metadata)}
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
                disabled={Boolean(pending)}
                onClick={() => void initialize()}
                className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-on-primary"
              >
                Fund full escrow amount
              </button>
            ) : null}
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
            {actions.dispute ? (
              <button
                type="button"
                onClick={() => void action('dispute')}
                className="w-full rounded-lg bg-red-100 px-4 py-3 font-bold text-red-800"
              >
                Raise dispute
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
            {refundEscrow ? (
              <a
                href="#refund-chat"
                className="block rounded-lg bg-primary px-4 py-3 text-center font-bold text-on-primary"
              >
                Open refund conversation
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </EscrowRoleLayout>
  );
};

export default EscrowDetails;
