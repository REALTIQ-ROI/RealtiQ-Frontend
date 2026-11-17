import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import AdminLayout from '../../components/layout/AdminLayout';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import StepUpDialog from '../../components/auth/StepUpDialog';
import PropertyFxAgreement from '../../components/billing/PropertyFxAgreement';
import LandlordPortalLayout from '../../components/layout/LandlordPortalLayout';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import Input from '../../components/ui/Input';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { installmentService } from '../../services/installmentService';
import { paymentService } from '../../services/paymentService';
import type {
  Installment,
  InstallmentCondition,
  InstallmentPaymentPayload,
  InstallmentPaymentRecord,
  InstallmentPenaltyRecord,
  InstallmentScheduleItem,
  InstallmentStatus,
} from '../../types';
import {
  canCancelInstallment,
  canPayInstallment,
  canRoleSatisfyCondition,
  getNextPayableScheduleItem,
  getOutstandingPenaltyAmount,
  getPrincipalAmount,
  getPrincipalPaidAmount,
  getPrincipalRemainingBalance,
  getScheduleItems,
  getTotalOutstandingBalance,
  hasUnsatisfiedRequiredConditions,
  resolveInstallmentBuyerLabel,
  resolveInstallmentProperty,
  resolveInstallmentPropertyId,
  resolveInstallmentPropertyLabel,
} from '../../utils/installment';

const DEFAULT_GRACE_PERIOD_HOURS = 72;
const adminStatuses: InstallmentStatus[] = ['pending', 'active', 'overdue', 'defaulted', 'completed', 'cancelled'];

const statusClasses: Record<InstallmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-orange-100 text-orange-800',
  defaulted: 'bg-red-100 text-red-800',
  completed: 'bg-slate-100 text-slate-800',
  cancelled: 'bg-zinc-100 text-zinc-700',
};

const scheduleStatusClasses: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  due: 'bg-blue-100 text-blue-800',
  partially_paid: 'bg-violet-100 text-violet-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-orange-100 text-orange-800',
  waived: 'bg-zinc-100 text-zinc-700',
  cancelled: 'bg-red-100 text-red-800',
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );

const formatDateTime = (value?: string) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(date);
};

const labelize = (value?: string) => (value ? value.replaceAll('_', ' ') : 'not available');
const apiMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);
const conflictToast = async (error: unknown, refresh: () => Promise<void>) => {
  if (error instanceof ApiRequestError && error.status === 409) {
    toast.error(`State conflict: ${error.message}`);
    await refresh();
    return true;
  }
  return false;
};

const Stat = ({ label, value, tone = '' }: { label: string; value: string; tone?: string }) => (
  <div className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3 sm:p-4">
    <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{label}</p>
    <p className={`mt-1 break-words text-sm font-bold text-on-surface ${tone}`}>{value}</p>
  </div>
);

const StatusBadge = ({ status }: { status: InstallmentStatus | string }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClasses[status as InstallmentStatus] ?? scheduleStatusClasses[status] ?? 'bg-slate-100 text-slate-700'}`}
  >
    <span className="material-symbols-outlined text-sm" aria-hidden="true">
      {status === 'completed' || status === 'paid' ? 'check_circle' : status === 'overdue' || status === 'defaulted' ? 'warning' : 'radio_button_checked'}
    </span>
    {labelize(status)}
  </span>
);

const InstallmentAgreementNotice = ({ propertyId }: { propertyId?: string }) => {
  const target = propertyId
    ? `/dashboard/buyer/sale-negotiations/new?propertyId=${encodeURIComponent(propertyId)}`
    : '/dashboard/buyer/sale-negotiations';

  return (
    <section className="mb-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 sm:p-6">
      <h2 className="text-lg font-bold text-primary">Agree instalment terms with the seller</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
        Instalment schedules are part of the purchase proposal. Start a purchase negotiation to agree the price,
        payment schedule and any applicable conditions with the seller before checkout.
      </p>
      <Link
        to={target}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary"
      >
        Open purchase negotiation
      </Link>
    </section>
  );
};
const InstallmentList = ({
  installments,
  selectedId,
  role,
  query,
}: {
  installments: Installment[];
  selectedId?: string;
  role?: string;
  query: string;
}) => {
  const filtered = installments.filter((installment) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [installment._id, resolveInstallmentPropertyLabel(installment), resolveInstallmentBuyerLabel(installment), installment.status]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  if (!filtered.length) {
    return <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-10 text-center text-secondary">No installment plans found.</div>;
  }

  return (
    <div className="space-y-3">
      {filtered.map((installment) => (
        <Link
          key={installment._id}
          to={`/dashboard/${role === 'admin' ? 'admin' : role === 'owner' ? 'landlord' : 'buyer'}/installments/${installment._id}`}
          className={`block min-w-0 rounded-lg border p-3 transition hover:border-primary sm:p-4 ${selectedId === installment._id ? 'border-primary bg-surface-container-low' : 'border-outline-variant/20 bg-surface-container-lowest'}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="break-words font-bold text-on-surface">{resolveInstallmentPropertyLabel(installment)}</h3>
              <p className="break-words text-sm text-secondary">Buyer: {resolveInstallmentBuyerLabel(installment)}</p>
            </div>
            <StatusBadge status={installment.status} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Stat label="Principal paid" value={formatCurrency(getPrincipalPaidAmount(installment))} />
            <Stat label="Principal remaining" value={formatCurrency(getPrincipalRemainingBalance(installment))} />
            <Stat label="Penalties outstanding" value={formatCurrency(getOutstandingPenaltyAmount(installment))} />
            <Stat label="Total outstanding" value={formatCurrency(getTotalOutstandingBalance(installment))} />
            <Stat label="Next due" value={formatDateTime(installment.nextPaymentDueDate)} tone={installment.status === 'overdue' || installment.status === 'defaulted' ? 'text-error' : ''} />
          </div>
        </Link>
      ))}
    </div>
  );
};

const PaymentPanel = ({
  installment,
}: {
  installment: Installment;
}) => {
  const { activeProfile } = useAuth();
  const [amount, setAmount] = useState(String(getNextPayableScheduleItem(installment)?.remainingAmount || getTotalOutstandingBalance(installment)));
  const [selectedFx, setSelectedFx] = useState<{ scheduleItemId: string; id: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const paymentStepUp = useBoundStepUp<Awaited<ReturnType<typeof installmentService.initializePayment>>>();
  const paymentResourceKey = `installment:${activeProfile?.id ?? 'no-profile'}:${installment._id}`;
  const [outcomeUnknown, setOutcomeUnknown] = useState(() => Boolean(paymentService.getPendingPaymentReference(paymentResourceKey)));
  const [statusMessage, setStatusMessage] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  useEffect(() => {
    setOutcomeUnknown(Boolean(paymentService.getPendingPaymentReference(paymentResourceKey)));
    setStatusMessage('');
  }, [paymentResourceKey]);
  const selectedItem = getNextPayableScheduleItem(installment);
  const scheduleItemId = selectedItem?._id ?? '';
  const currency = resolveInstallmentProperty(installment)?.currency;
  const isUsd = currency === 'USD';
  const listedAmountMinor = Number(selectedItem?.remainingAmount) * 100;
  const fxConfirmationId = selectedFx?.scheduleItemId === scheduleItemId ? selectedFx.id : null;
  const targetMilestoneLabel = selectedItem ? `${selectedItem.sequence}. ${selectedItem.title}` : 'No specific milestone';
  const maxPayable = getTotalOutstandingBalance(installment);
  const numericAmount = Number(amount);
  const blockedByConditions = hasUnsatisfiedRequiredConditions(selectedItem);
  const invalidAmount = isUsd
    ? !scheduleItemId || !Number.isSafeInteger(listedAmountMinor) || listedAmountMinor <= 0
    : !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > maxPayable;

  useEffect(() => {
    setAmount(String(getNextPayableScheduleItem(installment)?.remainingAmount || getTotalOutstandingBalance(installment)));
  }, [installment]);

  const initialize = async () => {
    if (invalidAmount || blockedByConditions || !currency || (isUsd && (!fxConfirmationId || getOutstandingPenaltyAmount(installment) > 0)) || !canPayInstallment(installment) || outcomeUnknown || paymentStepUp.busy || paymentStepUp.challenge) return;
    const body: InstallmentPaymentPayload = isUsd
      ? { scheduleItemId, fxConfirmationId: fxConfirmationId! }
      : { amount: numericAmount, ...(scheduleItemId ? { scheduleItemId } : {}) };
    await paymentStepUp.begin({
      method: 'POST', path: `/api/installments/${encodeURIComponent(installment._id)}/initialize-payment`, body,
      label: 'Initialize the selected installment payment',
      execute: async (challengeId, exactBody) => {
        setPaying(true);
        try {
          const response = await installmentService.initializePayment(installment._id, exactBody, challengeId);
          if (response.redirectUrl) paymentService.redirectToCheckout(response, resolveInstallmentPropertyId(installment), paymentResourceKey);
          else { paymentService.persistPaymentReference(response.reference, resolveInstallmentPropertyId(installment), paymentResourceKey); setOutcomeUnknown(true); setStatusMessage('This payment attempt has no provider URL yet. Check its reference before taking another action.'); }
          return response;
        } catch (raw) {
          if (raw instanceof ApiRequestError && raw.reference) paymentService.persistPaymentReference(raw.reference, resolveInstallmentPropertyId(installment), paymentResourceKey);
          if (raw instanceof ApiRequestError && (raw.code === 'PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN' || raw.code === 'PAYMENT_INITIALIZATION_PENDING')) {
            setOutcomeUnknown(true);
            setStatusMessage('The provider outcome is unresolved. No new payment request was sent. Check the saved reference first.');
          } else if (!(raw instanceof ApiRequestError) || !raw.status || raw.status >= 500) {
            setOutcomeUnknown(true);
            setStatusMessage('The payment response was not confirmed. Check the saved reference before starting another attempt.');
          }
          toast.error(apiMessage(raw, 'Unable to initialize installment payment.'));
          throw raw;
        } finally { setPaying(false); }
      },
    });
  };

  const completePaymentStepUp = async (code: string): Promise<boolean> => {
    const result = await paymentStepUp.complete(code);
    if (!result.ok && result.error) toast.error(result.error);
    return result.ok;
  };

  const refreshPaymentStatus = async () => {
    const reference = paymentService.getPendingPaymentReference(paymentResourceKey);
    if (!reference || checkingStatus) return;
    setCheckingStatus(true);
    try {
      const result = await paymentService.verifyPayment(reference);
      if (result.verified) {
        setStatusMessage(`Server payment status: ${result.payment.status}. Ownership is confirmed only by the separate ownership record.`);
        setOutcomeUnknown(result.payment.status === 'pending');
        if (result.payment.status === 'failed' || result.payment.status === 'canceled') paymentService.clearPendingPayment(paymentResourceKey);
      } else setStatusMessage('The payment remains unverified or pending. Do not create another attempt.');
    } catch (raw) { setStatusMessage(raw instanceof Error ? raw.message : 'Unable to check the payment reference.'); }
    finally { setCheckingStatus(false); }
  };

  if (!canPayInstallment(installment)) {
    return (
      <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3 text-sm text-secondary sm:p-4">
        Payments are unavailable because this plan is {installment.status}. Partial payments do not transfer ownership.
      </div>
    );
  }

  return (
    <section className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
      <h3 className="text-lg font-bold">Installment payment</h3>
      <p className="mt-1 text-sm text-secondary">Allocation order: unpaid penalties, overdue principal, due principal, then future eligible principal. Ownership transfers only after valid completion.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <Input label={isUsd ? 'Current schedule principal (USD)' : 'Amount (NGN)'} type="number" min="1" max={maxPayable} value={isUsd ? String(selectedItem?.remainingAmount ?? '') : amount} readOnly={isUsd} onChange={(event) => setAmount(event.target.value)} error={!isUsd && invalidAmount ? `Enter an amount up to ${formatCurrency(maxPayable)}.` : undefined} />
        <Input label="Target milestone" value={targetMilestoneLabel} readOnly className="cursor-not-allowed opacity-75" />
        <div className="flex items-end">
          <Button type="button" fullWidth disabled={paying || invalidAmount || blockedByConditions || !currency || (isUsd && (!fxConfirmationId || getOutstandingPenaltyAmount(installment) > 0)) || outcomeUnknown || paymentStepUp.busy || Boolean(paymentStepUp.challenge)} onClick={() => void initialize()}>
            {outcomeUnknown ? 'Payment outcome unresolved' : paying || paymentStepUp.busy ? 'Preparing secure payment…' : 'Continue to payment'}
          </Button>
        </div>
      </div>
      {blockedByConditions ? <p className="mt-3 text-sm text-error">Required milestone conditions must be satisfied before paying this targeted item.</p> : null}
      {isUsd ? <><p className="mt-3 text-sm text-secondary">This payment uses the selected confirmed FX agreement for the current schedule principal. Outstanding penalties cannot be combined in this FX checkout.</p><PropertyFxAgreement installment={{ id: installment._id, scheduleItemId, listedAmountMinor }} onSelect={(id) => setSelectedFx(id ? { scheduleItemId, id } : null)} /></> : <p className="mt-3 text-sm text-secondary">Maximum payable now: {formatCurrency(maxPayable)}.</p>}
      {!currency ? <p role="alert" className="mt-3 text-sm text-error">The plan's listing currency is unavailable. Refresh the plan before payment.</p> : null}
      {outcomeUnknown ? <div role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p>{statusMessage || 'A previous payment attempt must be reconciled before another initialization.'}</p><p className="mt-1">Reference: {paymentService.getPendingPaymentReference(paymentResourceKey) || 'not available'}</p><Button type="button" variant="secondary" className="mt-2" disabled={checkingStatus || !paymentService.getPendingPaymentReference(paymentResourceKey)} onClick={() => void refreshPaymentStatus()}>{checkingStatus ? 'Checking…' : 'Check payment status'}</Button></div> : statusMessage ? <p role="status" className="mt-3 text-sm text-secondary">{statusMessage}</p> : null}
      {paymentStepUp.error && !paymentStepUp.challenge ? <p role="alert" className="mt-3 text-sm text-error">{paymentStepUp.error}</p> : null}
      <StepUpDialog challenge={paymentStepUp.challenge} busy={paymentStepUp.busy || paying} error={paymentStepUp.error} onCancel={paymentStepUp.cancel} onSubmit={completePaymentStepUp} />
    </section>
  );
};

const ScheduleTable = ({
  installment,
  role,
  onSatisfy,
}: {
  installment: Installment;
  role?: 'buyer' | 'owner' | 'admin';
  onSatisfy: (item: InstallmentScheduleItem, condition: InstallmentCondition) => Promise<void>;
}) => {
  const schedule = getScheduleItems(installment);
  if (!schedule.length) {
    return <div className="rounded-lg border border-outline-variant/20 p-4 text-sm text-secondary sm:p-5">This legacy plan has no structured schedule yet.</div>;
  }
  return (
    <section className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
      <h3 className="text-lg font-bold">Schedule and milestones</h3>
      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-secondary">
            <tr>
              <th className="py-2 pr-4">Milestone</th>
              <th className="py-2 pr-4">Due</th>
              <th className="py-2 pr-4">Amounts</th>
              <th className="py-2 pr-4">Conditions</th>
              <th className="py-2 pr-4">Audit</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((item) => (
              <tr key={item._id ?? item.sequence} className="border-t border-outline-variant/20 align-top">
                <td className="py-3 pr-4">
                  <p className="font-bold">{item.sequence}. {item.title}</p>
                  <p className="text-xs capitalize text-secondary">{labelize(item.milestoneType)}</p>
                  <div className="mt-2"><StatusBadge status={item.status ?? 'pending'} /></div>
                </td>
                <td className="py-3 pr-4">{formatDateTime(item.dueDate)}</td>
                <td className="py-3 pr-4">
                  <p>Expected: {formatCurrency(item.expectedAmount)}</p>
                  <p>Paid: {formatCurrency(item.paidAmount)}</p>
                  <p>Principal remaining: {formatCurrency(item.remainingAmount)}</p>
                  <p>Penalty outstanding: {formatCurrency(item.outstandingPenaltyAmount)}</p>
                  {item.paymentIds?.length ? <p className="text-xs text-secondary">Payments: {item.paymentIds.length}</p> : null}
                </td>
                <td className="py-3 pr-4">
                  {item.conditions?.length ? (
                    <div className="space-y-2">
                      {item.conditions.map((condition) => (
                        <div key={condition._id ?? condition.type} className="rounded-lg bg-surface-container-low p-2">
                          <p className="font-semibold capitalize">{labelize(condition.type)} {condition.required === false ? '(optional)' : ''}</p>
                          {condition.description ? <p className="text-xs text-secondary">{condition.description}</p> : null}
                          <p className="text-xs text-secondary">{condition.satisfied ? `Satisfied ${formatDateTime(condition.satisfiedAt)}` : 'Not satisfied'}</p>
                          {condition._id && canRoleSatisfyCondition(role, condition) ? (
                            <Button type="button" variant="secondary" className="mt-2 px-3 py-2" onClick={() => void onSatisfy(item, condition)}>
                              Satisfy
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-secondary">No conditions</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {role === 'admin' && item.notificationHistory?.length ? (
                    <div className="space-y-1 text-xs text-secondary">
                      {item.notificationHistory.map((notice, index) => (
                        <p key={`${notice.notificationKey ?? notice.type}-${index}`}>{labelize(notice.type)}: {notice.status ?? 'recorded'} {formatDateTime(notice.sentAt ?? notice.attemptedAt)}</p>
                      ))}
                    </div>
                  ) : (
                    <span className="text-secondary">No audit entries</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const HistoryPanel = ({
  payments,
  penalties,
  role,
  canWaive,
  onWaive,
}: {
  payments: InstallmentPaymentRecord[];
  penalties: InstallmentPenaltyRecord[];
  role?: string;
  canWaive: boolean;
  onWaive: (penalty: InstallmentPenaltyRecord) => Promise<void>;
}) => (
  <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
    <section className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
      <h3 className="text-lg font-bold">Payment history</h3>
      {payments.length ? (
        <div className="mt-3 space-y-3">
          {payments.map((payment, index) => (
            <div key={payment._id ?? payment.reference ?? index} className="rounded-lg bg-surface-container-low p-3 text-sm">
              <p className="font-bold">{formatCurrency(payment.amount)} - {payment.status ?? 'pending'}</p>
              <p className="text-xs text-secondary">Recorded: {formatDateTime(payment.paidAt ?? payment.createdAt)}</p>
            </div>
          ))}
        </div>
      ) : <p className="mt-3 text-sm text-secondary">No payment records yet.</p>}
    </section>
    <section className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
      <h3 className="text-lg font-bold">Penalty history</h3>
      <p className="mt-1 text-xs text-secondary">0.5% every completed 24-hour interval after due date plus grace period, non-compounding, calculated on unpaid schedule-item principal, rounded to whole naira.</p>
      {penalties.length ? (
        <div className="mt-3 space-y-3">
          {penalties.map((penalty) => (
            <div key={penalty._id} className="min-w-0 rounded-lg bg-surface-container-low p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-bold">Interval {penalty.intervalNumber ?? 'n/a'} - {penalty.status ?? 'outstanding'}</p>
                {role === 'admin' && penalty.status !== 'waived' && Number(penalty.outstandingAmount || 0) > 0 ? (
                  <Button type="button" variant="secondary" className="px-3 py-2" disabled={!canWaive} title={!canWaive ? 'Refresh: the current installment version was not returned.' : undefined} onClick={() => void onWaive(penalty)}>Waive with authenticator</Button>
                ) : null}
              </div>
              <p>Rate: {penalty.percentageValue ?? 0.5}% {penalty.penaltyType ?? 'percentage'}</p>
              <p>Calculated against: {formatCurrency(penalty.calculatedAgainstAmount)}</p>
              <p>Penalty: {formatCurrency(penalty.penaltyAmount)} | Paid: {formatCurrency(penalty.paidAmount)} | Outstanding: {formatCurrency(penalty.outstandingAmount)}</p>
              <p className="text-xs text-secondary">Applied: {formatDateTime(penalty.appliedAt)}</p>
              {penalty.waivedAt ? <p className="text-xs text-secondary">Waived: {formatDateTime(penalty.waivedAt)} - {penalty.waiverReason}</p> : null}
            </div>
          ))}
        </div>
      ) : <p className="mt-3 text-sm text-secondary">No penalty records yet.</p>}
    </section>
  </div>
);

const InstallmentDetail = ({
  installment,
  role,
  payments,
  penalties,
  loading,
  canManageAdmin,
  onRefresh,
}: {
  installment: Installment | null;
  role?: 'buyer' | 'owner' | 'admin';
  payments: InstallmentPaymentRecord[];
  penalties: InstallmentPenaltyRecord[];
  loading: boolean;
  canManageAdmin: boolean;
  onRefresh: () => Promise<void>;
}) => {
  const [adminStatus, setAdminStatus] = useState<InstallmentStatus>('defaulted');
  const [adminNote, setAdminNote] = useState('');
  const [mutating, setMutating] = useState(false);
  const protectedSuccessMessage = useRef('');
  const protectedStepUp = useBoundStepUp<Installment | { installment: Installment; penalty: InstallmentPenaltyRecord }>();

  if (loading) return <LoadingState label="Loading installment details..." />;
  if (!installment) return <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-8 text-secondary">Select an installment plan to view details.</div>;

  const property = resolveInstallmentProperty(installment);
  const currentFxItem = getNextPayableScheduleItem(installment);
  const currentFxMinor = Number(currentFxItem?.remainingAmount) * 100;
  const cancel = async () => {
    const result = await Swal.fire<string>({ title: 'Cancel installment plan?', text: 'Cancellation does not process a refund or transfer ownership.', input: 'textarea', inputLabel: 'Note (optional)', inputPlaceholder: 'Add context for the audit history', showCancelButton: true, confirmButtonText: 'Cancel plan', confirmButtonColor: '#9f1239' });
    if (!result.isConfirmed) return;
    const note = result.value?.trim() ?? '';
    setMutating(true);
    try {
      await installmentService.cancelInstallment(installment._id, { note });
      toast.success('Installment plan cancelled.');
      await onRefresh();
    } catch (error) {
      if (!(await conflictToast(error, onRefresh))) toast.error(apiMessage(error, 'Unable to cancel installment plan.'));
    } finally {
      setMutating(false);
    }
  };
  const satisfy = async (item: InstallmentScheduleItem, condition: InstallmentCondition) => {
    if (!item._id || !condition._id) return;
    const result = await Swal.fire<string>({ title: 'Satisfy this condition?', input: 'textarea', inputLabel: 'Note (optional)', inputPlaceholder: 'Add a note for the schedule record', showCancelButton: true, confirmButtonText: 'Confirm condition' });
    if (!result.isConfirmed) return;
    const note = result.value?.trim() ?? '';
    setMutating(true);
    try {
      await installmentService.satisfyCondition(installment._id, item._id, condition._id, { note });
      toast.success('Condition satisfied.');
      await onRefresh();
    } catch (error) {
      if (!(await conflictToast(error, onRefresh))) toast.error(apiMessage(error, 'Unable to satisfy condition.'));
    } finally {
      setMutating(false);
    }
  };
  const updateStatus = async () => {
    const body = { status: adminStatus, ...(adminNote.trim() ? { note: adminNote.trim() } : {}) };
    protectedSuccessMessage.current = 'Installment status updated.';
    await protectedStepUp.begin({ method: 'PATCH', path: `/api/installments/${encodeURIComponent(installment._id)}/admin/status`, body, label: 'Update installment status', execute: async (challengeId, exactBody) => {
      setMutating(true);
      try { return await installmentService.updateInstallmentStatus(installment._id, exactBody, challengeId); }
      finally { setMutating(false); }
    } });
  };
  const waive = async (penalty: InstallmentPenaltyRecord) => {
    const result = await Swal.fire<string>({ title: 'Waive this penalty?', text: Number.isSafeInteger(installment.version) ? `Current installment version ${installment.version} will be checked by the server.` : 'The server will validate the current installment before applying a waiver.', input: 'textarea', inputLabel: 'Reason (required)', inputPlaceholder: 'Explain why this penalty should be waived', showCancelButton: true, confirmButtonText: 'Continue to authenticator', confirmButtonColor: '#173d32', inputValidator: (value) => !value.trim() ? 'A waiver reason is required.' : undefined });
    if (!result.isConfirmed || !result.value?.trim()) return;
    const body = { reason: result.value.trim() };
    protectedSuccessMessage.current = 'Penalty waiver recorded.';
    await protectedStepUp.begin({ method: 'PATCH', path: `/api/installments/${encodeURIComponent(installment._id)}/penalties/${encodeURIComponent(penalty._id)}/waive`, body, label: 'Waive installment penalty', execute: async (challengeId, exactBody) => {
      setMutating(true);
      try { return await installmentService.waivePenalty(installment._id, penalty._id, exactBody, challengeId); }
      finally { setMutating(false); }
    } });
  };

  const completeProtectedMutation = async (code: string) => {
    const result = await protectedStepUp.complete(code);
    if (!result.ok) {
      toast.error(result.error ?? 'The installment action was not confirmed.');
      if (result.code?.startsWith('CONFLICT_')) await onRefresh();
      return false;
    }
    toast.success(protectedSuccessMessage.current || 'Installment updated.');
    protectedSuccessMessage.current = '';
    await onRefresh();
    return true;
  };

  return (
    <div className="min-w-0 space-y-5">
      <section className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Installment detail</p>
            <h2 className="mt-1 break-words text-xl font-extrabold sm:text-2xl">{resolveInstallmentPropertyLabel(installment)}</h2>
            <p className="break-words text-sm text-secondary">Buyer: {resolveInstallmentBuyerLabel(installment)}</p>
            {property ? <p className="break-words text-sm text-secondary">Location: {property.location}</p> : null}
          </div>
          <StatusBadge status={installment.status} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <Stat label="Property principal" value={formatCurrency(getPrincipalAmount(installment))} />
          <Stat label="Principal paid" value={formatCurrency(getPrincipalPaidAmount(installment))} />
          <Stat label="Principal remaining" value={formatCurrency(getPrincipalRemainingBalance(installment))} />
          <Stat label="Outstanding penalties" value={formatCurrency(getOutstandingPenaltyAmount(installment))} />
          <Stat label="Total outstanding" value={formatCurrency(getTotalOutstandingBalance(installment))} />
          <Stat label="Next due" value={formatDateTime(installment.nextPaymentDueDate)} />
          <Stat label="Grace period" value={`${installment.gracePeriodHours ?? DEFAULT_GRACE_PERIOD_HOURS} hours`} />
          <Stat label="Default thresholds" value={`${installment.defaultAfterDays ?? 30} days / ${installment.maximumMissedPayments ?? 3} missed`} />
        </div>
        <p className="mt-4 text-sm text-secondary">A payment becomes due at the stated date and time, and overdue after the grace period. Default status is based on RealtIQ's payment policy, not a single missed due date.</p>
      </section>

      {role === 'buyer' ? <PaymentPanel installment={installment} /> : null}
      {role === 'owner' && property?.currency === 'USD' && currentFxItem?._id && Number.isSafeInteger(currentFxMinor) && currentFxMinor > 0 ?
        <PropertyFxAgreement installment={{ id: installment._id, scheduleItemId: currentFxItem._id, listedAmountMinor: currentFxMinor }} onSelect={() => {}} /> : null}
      <ScheduleTable installment={installment} role={role} onSatisfy={satisfy} />
      <HistoryPanel payments={payments} penalties={penalties} role={role} canWaive={canManageAdmin} onWaive={waive} />

      <section className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
        <h3 className="text-lg font-bold">Actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => void onRefresh()} disabled={mutating}>Refresh</Button>
          {canCancelInstallment(installment, role) ? <Button type="button" variant="secondary" onClick={() => void cancel()} disabled={mutating}>Cancel plan</Button> : null}
        </div>
        {canManageAdmin ? (
          <div className="mt-5 rounded-lg bg-surface-container-low p-4">
            <p className="text-sm font-bold">Exceptional manual status management</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              <select className="rounded-lg bg-surface-container-lowest px-4 py-3 text-sm" disabled={protectedStepUp.busy || Boolean(protectedStepUp.challenge)} value={adminStatus} onChange={(event) => setAdminStatus(event.target.value as InstallmentStatus)}>
                {adminStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
              </select>
              <input className="rounded-lg bg-surface-container-lowest px-4 py-3 text-sm" disabled={protectedStepUp.busy || Boolean(protectedStepUp.challenge)} placeholder="Administrative note" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} />
              <Button type="button" onClick={() => void updateStatus()} disabled={mutating || protectedStepUp.busy || Boolean(protectedStepUp.challenge) || adminStatus === installment.status}>Update status with authenticator</Button>
            </div>
          </div>
        ) : null}
      </section>
      <StepUpDialog challenge={protectedStepUp.challenge} busy={protectedStepUp.busy || mutating} error={protectedStepUp.error} onCancel={protectedStepUp.cancel} onSubmit={completeProtectedMutation} />
    </div>
  );
};

const InstallmentsContent = () => {
  const { activeProfile, adminAccess } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const isCurrentStaffProfile = activeProfile?.kind === 'staff' && adminAccess?.profileId === activeProfile.id;
  const role: 'buyer' | 'owner' | 'admin' | undefined = activeProfile?.kind === 'buyer'
    ? 'buyer'
    : ['owner', 'agency', 'developer'].includes(activeProfile?.kind ?? '')
      ? 'owner'
      : isCurrentStaffProfile
        ? 'admin'
        : undefined;
  const canManageAdminInstallments = Boolean(role === 'admin' && adminAccess?.isExecutive && !adminAccess.readOnly);
  const [query, setQuery] = useState('');
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [selected, setSelected] = useState<Installment | null>(null);
  const [payments, setPayments] = useState<InstallmentPaymentRecord[]>([]);
  const [penalties, setPenalties] = useState<InstallmentPenaltyRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await installmentService.getInstallments();
      setInstallments(Array.isArray(data) ? data : []);
    } catch (error) {
      setListError(apiMessage(error, 'Unable to load installments.'));
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (installmentId: string) => {
    setLoadingDetail(true);
    try {
      const [plan, history, penaltyRecords] = await Promise.all([
        installmentService.getInstallmentById(installmentId),
        installmentService.getPaymentHistory(installmentId).catch(() => []),
        installmentService.getPenalties(installmentId).catch(() => []),
      ]);
      setSelected(plan);
      setPayments(history);
      setPenalties(penaltyRecords);
    } catch (error) {
      toast.error(apiMessage(error, 'Unable to load installment details.'));
      setSelected(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await loadList();
    if (id) await loadDetail(id);
  }, [id, loadDetail, loadList]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (id) {
      void loadDetail(id);
    } else {
      const focusId = searchParams.get('installmentId');
      const focusPropertyId = searchParams.get('propertyId');
      const next =
        (focusId ? installments.find((installment) => installment._id === focusId) : null) ??
        (focusPropertyId ? installments.find((installment) => resolveInstallmentPropertyId(installment) === focusPropertyId) : null) ??
        null;
      setSelected(next);
      setPayments([]);
      setPenalties([]);
    }
  }, [id, installments, loadDetail, searchParams]);

  const searchInput = (
    <div className="relative w-full max-w-md min-w-0">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</span>
      <input className="w-full rounded-lg bg-surface-container-low py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-surface-tint/20" placeholder="Search installments..." type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
    </div>
  );

  const body = (
    <div className="mx-auto max-w-7xl min-w-0 px-3 py-4 sm:px-5 sm:py-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">Installments</h1>
          <p className="text-sm text-secondary">
            {role === 'admin' ? 'All milestone-based installment plans.' : role === 'owner' ? 'Plans on your properties.' : 'Review your agreed payment schedules and current payment status.'}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-3 sm:w-auto">{searchInput}</div>
      </header>

      {role === 'buyer' ? <InstallmentAgreementNotice propertyId={searchParams.get('propertyId') ?? undefined} /> : null}

      {loadingList ? <LoadingState label="Loading installment plans..." /> : null}
      {listError ? <ErrorState message={listError} onRetry={() => void loadList()} /> : null}

      {!loadingList && !listError ? (
        <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.45fr)] 2xl:gap-6">
          <InstallmentList installments={installments} selectedId={selected?._id ?? id} role={role} query={query} />
          <InstallmentDetail
            installment={selected}
            role={role}
            payments={payments}
            penalties={penalties}
            loading={loadingDetail}
            canManageAdmin={canManageAdminInstallments}
            onRefresh={refreshAll}
          />
        </div>
      ) : null}
    </div>
  );

  if (role === 'owner') {
    return (
      <LandlordPortalLayout active="installments" title="Installments" topLeft={searchInput}>
        {body}
      </LandlordPortalLayout>
    );
  }
  if (role === 'admin') return <AdminLayout>{body}</AdminLayout>;
  return (
    <BuyerPortalLayout
      pageEyebrow="Buyer Portal"
      pageTitle="Installments"
      pageSubtitle="Milestone schedules, penalties, and payment status."
      topbarRight={searchInput}
    >
      {body}
    </BuyerPortalLayout>
  );
};

export default function Installments() {
  const { activeProfile } = useAuth();
  return <InstallmentsContent key={activeProfile?.id ?? 'no-profile'} />;
}
