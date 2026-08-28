import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../../components/layout/AdminLayout';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import LandlordPortalLayout from '../../components/layout/LandlordPortalLayout';
import PropertySearchSelect from '../../components/forms/PropertySearchSelect';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import Input from '../../components/ui/Input';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import { installmentService } from '../../services/installmentService';
import { paymentService } from '../../services/paymentService';
import { propertyService } from '../../services/propertyService';
import { propertyRouteReference } from '../../types';
import { normalizePropertyPaymentTypes } from '../../utils/propertyPaymentTypes';
import type {
  CustomInstallmentCreatePayload,
  Installment,
  InstallmentCondition,
  InstallmentConditionType,
  InstallmentFrequency,
  InstallmentMilestoneType,
  InstallmentPaymentRecord,
  InstallmentPenaltyRecord,
  InstallmentScheduleItem,
  InstallmentStatus,
  Property,
} from '../../types';
import {
  canCancelInstallment,
  canPayInstallment,
  canRoleSatisfyCondition,
  frequencyToInstallmentCount,
  getNextPayableScheduleItem,
  getOutstandingPenaltyAmount,
  getPrincipalAmount,
  getPrincipalPaidAmount,
  getPrincipalRemainingBalance,
  getScheduleItems,
  getTotalOutstandingBalance,
  hasUnsatisfiedRequiredConditions,
  isInstallmentActive,
  resolveInstallmentBuyerLabel,
  resolveInstallmentProperty,
  resolveInstallmentPropertyId,
  resolveInstallmentPropertyLabel,
} from '../../utils/installment';

const frequencies: Array<Exclude<InstallmentFrequency, 'custom'>> = ['weekly', 'biweekly', 'monthly', 'quarterly'];
const DEFAULT_GRACE_PERIOD_HOURS = 72;
const milestoneTypes: InstallmentMilestoneType[] = [
  'initial_deposit',
  'scheduled_payment',
  'inspection_completed',
  'document_verified',
  'construction_stage',
  'handover',
  'final_payment',
  'custom',
];
const conditionTypes: InstallmentConditionType[] = [
  'buyer_confirmation',
  'seller_confirmation',
  'inspection_completed',
  'document_verified',
  'construction_stage',
  'handover',
  'admin_approval',
  'custom',
];
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
const toLocalInputValue = (date = new Date(Date.now() + 24 * 60 * 60 * 1000)) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};
const fromLocalInputValue = (value: string) => new Date(value).toISOString();

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

type CustomRow = {
  id: string;
  sequence: number;
  title: string;
  milestoneType: InstallmentMilestoneType;
  expectedAmount: string;
  dueDate: string;
  conditions: Array<{ id: string; type: InstallmentConditionType; description: string; required: boolean }>;
};

const defaultCustomRow = (sequence: number, amount = ''): CustomRow => ({
  id: crypto.randomUUID(),
  sequence,
  title: sequence === 1 ? 'Initial Deposit' : `Milestone ${sequence}`,
  milestoneType: sequence === 1 ? 'initial_deposit' : 'scheduled_payment',
  expectedAmount: amount,
  dueDate: toLocalInputValue(new Date(Date.now() + sequence * 24 * 60 * 60 * 1000)),
  conditions: [],
});

const InstallmentCreateForm = ({
  properties,
  loading,
  error,
  installments,
  onCreated,
  onRetryProperties,
  initialPropertyId,
  initialFrequency,
}: {
  properties: Property[];
  loading: boolean;
  error: string | null;
  installments: Installment[];
  onCreated: (plan: Installment) => Promise<void>;
  onRetryProperties: () => void;
  initialPropertyId?: string;
  initialFrequency?: string;
}) => {
  const [mode, setMode] = useState<'automatic' | 'custom'>('automatic');
  const [propertyId, setPropertyId] = useState('');
  const [frequency, setFrequency] = useState<Exclude<InstallmentFrequency, 'custom'>>('monthly');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [startDate, setStartDate] = useState(toLocalInputValue());
  const [rows, setRows] = useState<CustomRow[]>([defaultCustomRow(1), defaultCustomRow(2)]);
  const [creating, setCreating] = useState(false);

  const activePropertyIds = useMemo(() => {
    const ids = new Set<string>();
    installments.filter(isInstallmentActive).forEach((installment) => {
      const id = resolveInstallmentPropertyId(installment);
      if (id) ids.add(id);
    });
    return ids;
  }, [installments]);

  const eligibleProperties = useMemo(
    () => properties.filter((property) => {
      const refs = [property._id, propertyRouteReference(property)].filter(Boolean);
      const offersInstallment = normalizePropertyPaymentTypes(
        property.paymentTypes,
        property.price,
      ).includes('installment');
      return (
        property.status === 'available' &&
        (!property.approvalStatus || property.approvalStatus === 'approved') &&
        offersInstallment &&
        refs.every((ref) => !activePropertyIds.has(ref))
      );
    }),
    [activePropertyIds, properties],
  );
  const selectedProperty = eligibleProperties.find((property) => propertyRouteReference(property) === propertyId) ?? null;
  const selectedPropertyReference = selectedProperty ? propertyRouteReference(selectedProperty) : '';
  const price = selectedProperty?.price ?? 0;
  const numberOfInstallments = frequencyToInstallmentCount(frequency);
  const scheduled = rows.reduce((sum, row) => sum + Number(row.expectedAmount || 0), 0);
  const unorderedDates = rows.some((row, index) => index > 0 && new Date(row.dueDate) <= new Date(rows[index - 1].dueDate));
  const invalidRows = rows.some(
    (row) => !row.title.trim() || !row.dueDate || !Number.isFinite(Number(row.expectedAmount)) || Number(row.expectedAmount) <= 0,
  );
  const automaticInvalid =
    !selectedProperty ||
    !startDate ||
    numberOfInstallments <= 0 ||
    Number(initialDeposit || 0) < 0 ||
    Number(initialDeposit || 0) >= price;
  const customInvalid =
    !selectedProperty || invalidRows || unorderedDates || scheduled !== price;
  const formInvalid = mode === 'automatic' ? automaticInvalid : customInvalid;

  useEffect(() => {
    const focused = initialPropertyId ? eligibleProperties.find((property) => [property._id, propertyRouteReference(property)].includes(initialPropertyId)) : null;
    const focusedReference = focused ? propertyRouteReference(focused) : '';
    if (focusedReference && focusedReference !== propertyId) {
      setPropertyId(focusedReference);
      return;
    }
    if (!propertyId && eligibleProperties[0]) setPropertyId(propertyRouteReference(eligibleProperties[0]));
  }, [eligibleProperties, initialPropertyId, propertyId]);

  useEffect(() => {
    if (initialFrequency && frequencies.includes(initialFrequency as Exclude<InstallmentFrequency, 'custom'>)) {
      setFrequency(initialFrequency as Exclude<InstallmentFrequency, 'custom'>);
    }
  }, [initialFrequency]);

  const updateRow = (id: string, patch: Partial<CustomRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addCondition = (rowId: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              conditions: [
                ...row.conditions,
                { id: crypto.randomUUID(), type: 'admin_approval', description: '', required: true },
              ],
            }
          : row,
      ),
    );
  };

  const updateCondition = (
    rowId: string,
    conditionId: string,
    patch: Partial<CustomRow['conditions'][number]>,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              conditions: row.conditions.map((condition) =>
                condition.id === conditionId ? { ...condition, ...patch } : condition,
              ),
            }
          : row,
      ),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProperty || formInvalid) return;
    setCreating(true);
    try {
      const payload =
        mode === 'automatic'
          ? {
              propertyId: selectedPropertyReference,
              frequency,
              numberOfInstallments,
              initialDeposit: Number(initialDeposit || 0),
              startDate: fromLocalInputValue(startDate),
              gracePeriodHours: DEFAULT_GRACE_PERIOD_HOURS,
            }
          : ({
              propertyId: selectedPropertyReference,
              totalAmount: selectedProperty.price,
              gracePeriodHours: DEFAULT_GRACE_PERIOD_HOURS,
              schedule: rows.map((row, index) => ({
                sequence: index + 1,
                title: row.title.trim(),
                milestoneType: row.milestoneType,
                expectedAmount: Number(row.expectedAmount),
                dueDate: fromLocalInputValue(row.dueDate),
                conditions: row.conditions.map((condition) => ({
                  type: condition.type,
                  description: condition.description.trim() || labelize(condition.type),
                  required: condition.required,
                })),
              })),
            } satisfies CustomInstallmentCreatePayload);
      const plan = await installmentService.createInstallmentPlan(payload);
      toast.success('Installment plan created.');
      await onCreated(plan);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        toast.error(`Duplicate or active plan conflict: ${error.message}`);
      } else {
        toast.error(apiMessage(error, 'Unable to create installment plan.'));
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="mb-6 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 sm:mb-8 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-on-surface">Create installment plan</h2>
          <p className="text-sm text-secondary">Choose automatic dates or define milestone rows.</p>
        </div>
        <div className="inline-flex w-full rounded-lg bg-surface-container-low p-1 sm:w-auto">
          {(['automatic', 'custom'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`min-w-0 flex-1 rounded-md px-3 py-2 text-sm font-bold capitalize sm:flex-none sm:px-4 ${mode === item ? 'bg-primary text-on-primary' : 'text-secondary'}`}
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {loading ? <LoadingState label="Loading eligible properties..." /> : null}
      {error ? <ErrorState message={error} onRetry={onRetryProperties} /> : null}
      {!loading && !error ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          {eligibleProperties.length ? (
            <PropertySearchSelect
              label="Property"
              properties={eligibleProperties}
              value={propertyId}
              onChange={(property) => setPropertyId(property ? propertyRouteReference(property) : '')}
              emptyMessage="No eligible properties currently offer installment payments."
              helperText="Only available properties without an active installment plan are shown."
            />
          ) : (
            <div className="rounded-lg border border-dashed border-outline-variant/30 p-4 text-sm text-secondary sm:p-5">
              No eligible properties currently offer installment payments.
            </div>
          )}

          {mode === 'automatic' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">Frequency</span>
                <select className="w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm" value={frequency} onChange={(event) => setFrequency(event.target.value as typeof frequency)}>
                  {frequencies.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                </select>
              </label>
              <Input label="Number of installments" type="number" min="1" value={numberOfInstallments} readOnly className="cursor-not-allowed opacity-75" />
              <Input label="Initial deposit" type="number" min="0" value={initialDeposit} onChange={(event) => setInitialDeposit(event.target.value)} />
              <Input label="Start date and time" type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <Input label="Grace period hours" type="number" min="0" value={DEFAULT_GRACE_PERIOD_HOURS} readOnly className="cursor-not-allowed opacity-75" />
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={row.id} className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-low p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-6">
                    <Input label="Sequence" type="number" min="1" value={index + 1} readOnly className="cursor-not-allowed opacity-75" />
                    <Input label="Title" value={row.title} onChange={(event) => updateRow(row.id, { title: event.target.value })} className="md:col-span-2" />
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary">Milestone type</span>
                      <select className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm" value={row.milestoneType} onChange={(event) => updateRow(row.id, { milestoneType: event.target.value as InstallmentMilestoneType })}>
                        {milestoneTypes.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                      </select>
                    </label>
                    <Input label="Expected amount" type="number" min="1" value={row.expectedAmount} onChange={(event) => updateRow(row.id, { expectedAmount: event.target.value })} />
                    <Input label="Due date and time" type="datetime-local" value={row.dueDate} onChange={(event) => updateRow(row.id, { dueDate: event.target.value })} />
                  </div>
                  <div className="mt-3 space-y-2">
                    {row.conditions.map((condition) => (
                      <div key={condition.id} className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                        <select className="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm" value={condition.type} onChange={(event) => updateCondition(row.id, condition.id, { type: event.target.value as InstallmentConditionType })}>
                          {conditionTypes.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                        </select>
                        <input className="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm md:col-span-2" placeholder="Condition description" value={condition.description} onChange={(event) => updateCondition(row.id, condition.id, { description: event.target.value })} />
                        <label className="flex items-center gap-2 text-sm text-secondary">
                          <input type="checkbox" checked={condition.required} onChange={(event) => updateCondition(row.id, condition.id, { required: event.target.checked })} />
                          Required
                        </label>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" onClick={() => addCondition(row.id)}>Add condition</Button>
                      {rows.length > 1 ? <Button type="button" variant="ghost" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remove row</Button> : null}
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setRows((current) => [...current, defaultCustomRow(current.length + 1)])}>Add milestone</Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <Stat label="Property price" value={selectedProperty ? formatCurrency(price) : 'Select property'} />
            <Stat label="Principal total" value={selectedProperty ? formatCurrency(price) : 'Select property'} />
            <Stat label="Principal scheduled" value={mode === 'custom' ? formatCurrency(scheduled) : 'Calculated automatically'} />
            <Stat label="Difference" value={mode === 'custom' ? formatCurrency(scheduled - price) : formatCurrency(0)} tone={mode === 'custom' && scheduled !== price ? 'text-error' : ''} />
            <Stat label="Grace period" value={`${DEFAULT_GRACE_PERIOD_HOURS} hours`} />
          </div>
          <div className="text-xs text-secondary">
            {unorderedDates ? 'Milestone due dates must be ordered. ' : ''}
            {mode === 'custom' && scheduled !== price ? 'Scheduled principal must equal the property price. ' : ''}
            Estimated first due date: {mode === 'custom' ? formatDateTime(fromLocalInputValue(rows[0]?.dueDate)) : formatDateTime(fromLocalInputValue(startDate))}
          </div>
          <Button type="submit" disabled={creating || formInvalid || !eligibleProperties.length}>
            {creating ? 'Creating...' : 'Create plan'}
          </Button>
        </form>
      ) : null}
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
          to={`/dashboard/${role === 'admin' ? 'admin' : role === 'landlord' ? 'landlord' : 'buyer'}/installments/${installment._id}`}
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
  onRefresh,
}: {
  installment: Installment;
  onRefresh: () => Promise<void>;
}) => {
  const [amount, setAmount] = useState(String(getNextPayableScheduleItem(installment)?.remainingAmount || getTotalOutstandingBalance(installment)));
  const [paying, setPaying] = useState(false);
  const selectedItem = getNextPayableScheduleItem(installment);
  const scheduleItemId = selectedItem?._id ?? '';
  const targetMilestoneLabel = selectedItem ? `${selectedItem.sequence}. ${selectedItem.title}` : 'No specific milestone';
  const maxPayable = getTotalOutstandingBalance(installment);
  const numericAmount = Number(amount);
  const blockedByConditions = hasUnsatisfiedRequiredConditions(selectedItem);
  const invalidAmount = !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > maxPayable;

  useEffect(() => {
    setAmount(String(getNextPayableScheduleItem(installment)?.remainingAmount || getTotalOutstandingBalance(installment)));
  }, [installment]);

  const initialize = async () => {
    if (invalidAmount || blockedByConditions || !canPayInstallment(installment)) return;
    setPaying(true);
    try {
      const response = await installmentService.initializePayment(installment._id, {
        amount: numericAmount,
        scheduleItemId: scheduleItemId || undefined,
      });
      paymentService.persistPaymentReference(response.reference, resolveInstallmentPropertyId(installment));
      window.location.href = response.redirectUrl;
    } catch (error) {
      if (!(await conflictToast(error, onRefresh))) {
        toast.error(apiMessage(error, 'Unable to initialize installment payment.'));
      }
    } finally {
      setPaying(false);
    }
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
        <Input label="Amount" type="number" min="1" max={maxPayable} value={amount} onChange={(event) => setAmount(event.target.value)} error={invalidAmount ? `Enter an amount up to ${formatCurrency(maxPayable)}.` : undefined} />
        <Input label="Target milestone" value={targetMilestoneLabel} readOnly className="cursor-not-allowed opacity-75" />
        <div className="flex items-end">
          <Button type="button" fullWidth disabled={paying || invalidAmount || blockedByConditions} onClick={() => void initialize()}>
            {paying ? 'Initializing...' : 'Pay with Paystack'}
          </Button>
        </div>
      </div>
      {blockedByConditions ? <p className="mt-3 text-sm text-error">Required milestone conditions must be satisfied before paying this targeted item.</p> : null}
      <p className="mt-3 text-sm text-secondary">Maximum payable now: {formatCurrency(maxPayable)}.</p>
    </section>
  );
};

const ScheduleTable = ({
  installment,
  role,
  onSatisfy,
}: {
  installment: Installment;
  role?: 'buyer' | 'landlord' | 'admin';
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
  onWaive,
}: {
  payments: InstallmentPaymentRecord[];
  penalties: InstallmentPenaltyRecord[];
  role?: string;
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
                  <Button type="button" variant="secondary" className="px-3 py-2" onClick={() => void onWaive(penalty)}>Waive</Button>
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
  onRefresh,
}: {
  installment: Installment | null;
  role?: 'buyer' | 'landlord' | 'admin';
  payments: InstallmentPaymentRecord[];
  penalties: InstallmentPenaltyRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}) => {
  const [adminStatus, setAdminStatus] = useState<InstallmentStatus>('defaulted');
  const [adminNote, setAdminNote] = useState('');
  const [mutating, setMutating] = useState(false);

  if (loading) return <LoadingState label="Loading installment details..." />;
  if (!installment) return <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-8 text-secondary">Select an installment plan to view details.</div>;

  const property = resolveInstallmentProperty(installment);
  const cancel = async () => {
    const note = window.prompt('Confirm cancellation note. Cancellation does not process a refund or transfer ownership.', '');
    if (note === null) return;
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
    const note = window.prompt('Add a note before satisfying this installment condition.', '');
    if (note === null) return;
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
    setMutating(true);
    try {
      await installmentService.updateInstallmentStatus(installment._id, { status: adminStatus, note: adminNote.trim() || undefined });
      toast.success('Installment status updated.');
      await onRefresh();
    } catch (error) {
      if (!(await conflictToast(error, onRefresh))) toast.error(apiMessage(error, 'Unable to update status.'));
    } finally {
      setMutating(false);
    }
  };
  const waive = async (penalty: InstallmentPenaltyRecord) => {
    const reason = window.prompt('Waiver reason is required.', '');
    if (!reason?.trim()) return;
    setMutating(true);
    try {
      await installmentService.waivePenalty(installment._id, penalty._id, { reason: reason.trim() });
      toast.success('Penalty waived.');
      await onRefresh();
    } catch (error) {
      if (!(await conflictToast(error, onRefresh))) toast.error(apiMessage(error, 'Unable to waive penalty.'));
    } finally {
      setMutating(false);
    }
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
        <p className="mt-4 text-sm text-secondary">A payment becomes due at the stated date and time, and overdue after the grace period. Default status is based on RealTIQ's payment policy, not a single missed due date.</p>
      </section>

      {role === 'buyer' ? <PaymentPanel installment={installment} onRefresh={onRefresh} /> : null}
      <ScheduleTable installment={installment} role={role} onSatisfy={satisfy} />
      <HistoryPanel payments={payments} penalties={penalties} role={role} onWaive={waive} />

      <section className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
        <h3 className="text-lg font-bold">Actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => void onRefresh()} disabled={mutating}>Refresh</Button>
          {canCancelInstallment(installment, role) ? <Button type="button" variant="secondary" onClick={() => void cancel()} disabled={mutating}>Cancel plan</Button> : null}
        </div>
        {role === 'admin' ? (
          <div className="mt-5 rounded-lg bg-surface-container-low p-4">
            <p className="text-sm font-bold">Exceptional manual status management</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              <select className="rounded-lg bg-surface-container-lowest px-4 py-3 text-sm" value={adminStatus} onChange={(event) => setAdminStatus(event.target.value as InstallmentStatus)}>
                {adminStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
              </select>
              <input className="rounded-lg bg-surface-container-lowest px-4 py-3 text-sm" placeholder="Administrative note" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} />
              <Button type="button" onClick={() => void updateStatus()} disabled={mutating || adminStatus === installment.status}>Update status</Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};

const Installments = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [selected, setSelected] = useState<Installment | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<InstallmentPaymentRecord[]>([]);
  const [penalties, setPenalties] = useState<InstallmentPenaltyRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(user?.role === 'buyer');
  const [listError, setListError] = useState<string | null>(null);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  const role = user?.role === 'proxy_inspector' ? undefined : user?.role;
  const routeBase = role === 'admin' ? '/dashboard/admin/installments' : role === 'landlord' ? '/dashboard/landlord/installments' : '/dashboard/buyer/installments';

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

  const loadProperties = useCallback(async () => {
    if (role !== 'buyer') return;
    setLoadingProperties(true);
    setPropertyError(null);
    try {
      const response = await propertyService.getProperties({ status: 'available', limit: 500 });
      setProperties(response.properties ?? []);
    } catch (error) {
      setPropertyError(apiMessage(error, 'Unable to load eligible properties.'));
    } finally {
      setLoadingProperties(false);
    }
  }, [role]);

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
    void loadProperties();
  }, [loadList, loadProperties]);

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
            {role === 'admin' ? 'All milestone-based installment plans.' : role === 'landlord' ? 'Plans on your properties.' : 'Create, track, and pay your plans.'}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-3 sm:w-auto">{searchInput}</div>
      </header>

      {role === 'buyer' ? (
        <InstallmentCreateForm
          properties={properties}
          loading={loadingProperties}
          error={propertyError}
          installments={installments}
          onRetryProperties={() => void loadProperties()}
          initialPropertyId={searchParams.get('propertyId') ?? undefined}
          initialFrequency={searchParams.get('frequency') ?? undefined}
          onCreated={async (plan) => {
            await loadList();
            navigate(`${routeBase}/${plan._id}`, { replace: true });
          }}
        />
      ) : null}

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
            onRefresh={refreshAll}
          />
        </div>
      ) : null}
    </div>
  );

  if (role === 'landlord') {
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
      pageSubtitle="Milestone schedules, penalties, and Paystack payments."
      topbarRight={searchInput}
    >
      {body}
    </BuyerPortalLayout>
  );
};

export default Installments;
