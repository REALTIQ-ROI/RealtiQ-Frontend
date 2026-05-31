import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../../components/layout/AdminLayout';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import LandlordPortalLayout from '../../components/layout/LandlordPortalLayout';
import PropertySearchSelect from '../../components/forms/PropertySearchSelect';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { installmentService } from '../../services/installmentService';
import { propertyService } from '../../services/propertyService';
import type { Installment, InstallmentStatus } from '../../types';
import {
  calculateInstallmentAmount,
  frequencyToInstallmentCount,
  getInstallmentSummary,
  isInstallmentActive,
  resolveInstallmentPropertyId,
  resolveInstallmentPropertyLabel,
  resolveInstallmentProperty,
} from '../../utils/installment';

const statusClasses: Record<InstallmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-700',
  defaulted: 'bg-red-100 text-red-700',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

const InstallmentProgress = ({ installment }: { installment: Installment }) => {
  const summary = getInstallmentSummary(installment);
  const property = resolveInstallmentProperty(installment);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Progress</p>
          <p className="text-sm font-semibold text-on-surface">
            {summary.paymentCount} / {summary.totalInstallments || 'n/a'} installments completed
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-secondary">
          {summary.progressPercent}%
        </span>
      </div>

      <div className="h-3 rounded-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${summary.progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Total Installments</p>
          <p className="mt-1 font-semibold text-on-surface">{summary.totalInstallments || 'Not available'}</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Paid Installments</p>
          <p className="mt-1 font-semibold text-on-surface">{summary.paymentCount}</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Remaining Installments</p>
          <p className="mt-1 font-semibold text-on-surface">{summary.installmentsRemaining}</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Total Property Price</p>
          <p className="mt-1 font-semibold text-on-surface">{property ? formatCurrency(property.price) : formatCurrency(installment.totalAmount)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Amount Paid</p>
          <p className="mt-1 font-semibold text-on-surface">{formatCurrency(summary.paidAmount)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Remaining Balance</p>
          <p className="mt-1 font-semibold text-on-surface">{formatCurrency(installment.remainingBalance)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Installment Amount</p>
          <p className="mt-1 font-semibold text-on-surface">
            {summary.installmentAmount > 0 ? formatCurrency(summary.installmentAmount) : 'Not available'}
          </p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Next Due Amount</p>
          <p className="mt-1 font-semibold text-on-surface">
            {summary.installmentAmount > 0 ? formatCurrency(summary.installmentAmount) : 'Not available'}
          </p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Next Due Date</p>
          <p className="mt-1 font-semibold text-on-surface">Not available</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest/80 p-4 border border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-secondary">Status</p>
          <p className="mt-1 font-semibold text-on-surface capitalize">{summary.completed ? 'completed' : installment.status}</p>
        </div>
      </div>
    </div>
  );
};

const Installments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const focusPropertyId = searchParams.get('propertyId') ?? '';
  const focusInstallmentId = searchParams.get('installmentId') ?? '';
  const hasMounted = useRef(false);

  const { data, loading, error, execute } = useAsync(() => installmentService.getInstallments(), true);
  const {
    data: selectedInstallment,
    // loading: selectedLoading,
    // error: selectedError,
    execute: refreshSelected,
  } = useAsync(() => installmentService.getInstallmentById(id ?? ''), Boolean(id));
  const {
    data: propertyResponse,
    loading: propertiesLoading,
    error: propertiesError,
    execute: refreshEligibleProperties,
  } = useAsync(() => propertyService.getProperties({ status: 'available', limit: 500 }), user?.role === 'buyer');

  const installments = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const availableProperties = useMemo(() => propertyResponse?.properties ?? [], [propertyResponse]);

  const installmentsByProperty = useMemo(() => {
    const map = new Map<string, Installment>();
    installments.filter(isInstallmentActive).forEach((installment) => {
      const propertyId = resolveInstallmentPropertyId(installment);
      if (propertyId && !map.has(propertyId)) {
        map.set(propertyId, installment);
      }
    });
    return map;
  }, [installments]);

  const eligibleProperties = useMemo(
    () =>
      availableProperties.filter(
        (property) => property.status === 'available' && !installmentsByProperty.has(property._id),
      ),
    [availableProperties, installmentsByProperty],
  );

  const selectedDetail = useMemo(() => {
    if (selectedInstallment) return selectedInstallment;
    if (id) return null;
    if (focusInstallmentId) {
      return installments.find((installment) => installment._id === focusInstallmentId) ?? null;
    }
    if (focusPropertyId) {
      return installments.find((installment) => resolveInstallmentPropertyId(installment) === focusPropertyId) ?? null;
    }
    return null;
  }, [focusInstallmentId, focusPropertyId, id, installments, selectedInstallment]);

  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'biannually' | 'annually'>('monthly');
  const [creating, setCreating] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, InstallmentStatus>>({});
  const [query, setQuery] = useState('');

  const selectedProperty = useMemo(
    () => eligibleProperties.find((property) => property._id === selectedPropertyId) ?? null,
    [eligibleProperties, selectedPropertyId],
  );

  useEffect(() => {
    if (eligibleProperties.length === 0) {
      setSelectedPropertyId('');
      return;
    }

    const matchedFocus = focusPropertyId ? eligibleProperties.find((property) => property._id === focusPropertyId) : null;
    const nextSelection =
      matchedFocus ?? eligibleProperties.find((property) => property._id === selectedPropertyId) ?? eligibleProperties[0];

    if (nextSelection && nextSelection._id !== selectedPropertyId) {
      setSelectedPropertyId(nextSelection._id);
    }
  }, [eligibleProperties, focusPropertyId, selectedPropertyId]);

  useEffect(() => {
    if (hasMounted.current) {
      void refreshSelected();
    } else {
      hasMounted.current = true;
    }
  }, [id, refreshSelected]);

  const filteredInstallments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return installments;
    return installments.filter((installment) => {
      const haystack = [
        installment._id,
        resolveInstallmentPropertyLabel(installment),
        installment.status,
        installment.schedule?.frequency ?? '',
        installment.schedule?.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [installments, query]);

  const currentInstallment = selectedDetail;
  const selectedPropertyExists = Boolean(selectedProperty);
  const selectedPropertyPrice = selectedProperty?.price ?? 0;
  const selectedInstallmentAmount = calculateInstallmentAmount(selectedPropertyPrice, frequency);
  const selectedInstallmentCount = frequencyToInstallmentCount(frequency);

  const handleCreatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || user.role !== 'buyer') {
      toast.error('Only buyers can create installment plans.');
      return;
    }

    if (selectedInstallmentCount <= 0) {
      toast.error('Select a valid installment frequency.');
      return;
    }

    if (selectedPropertyPrice <= 0 || selectedInstallmentAmount <= 0) {
      toast.error('Property price must be greater than zero.');
      return;
    }

    if (!selectedPropertyId) {
      toast.error('Please select a property.');
      return;
    }

    const property = selectedProperty ?? availableProperties.find((item) => item._id === selectedPropertyId) ?? null;
    if (!property) {
      toast.error('The selected property is no longer available.');
      return;
    }

    if (property.status === 'sold') {
      toast.error('This property has already been purchased in full.');
      return;
    }

    if (installmentsByProperty.has(selectedPropertyId)) {
      toast.error('An installment plan already exists for this property.');
      return;
    }

    setCreating(true);
    try {
      const plan = await installmentService.createInstallmentPlan({
        propertyId: selectedPropertyId,
        totalAmount: selectedPropertyPrice,
        schedule: {
          frequency,
          notes: String(selectedInstallmentAmount),
        },
      });
      toast.success('Installment plan created.');
      await execute();
      navigate(`/dashboard/buyer/installments/${plan._id}?propertyId=${selectedPropertyId}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to create installment plan.');
    } finally {
      setCreating(false);
    }
  };

  const handleInitializePayment = async (installment: Installment) => {
    const summary = getInstallmentSummary(installment);
    if (summary.completed) {
      toast.info('Installment plan completed.');
      return;
    }

    try {
      const amount = summary.installmentAmount;
      if (amount <= 0) {
        toast.error('Installment amount is not available.');
        return;
      }
      const result = await installmentService.initializePayment(
        installment._id,
        amount > 0 ? { amount } : undefined,
      );
      window.location.href = result.redirectUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to initialize payment.');
    }
  };

  const updateStatus = async (installment: Installment) => {
    const nextStatus = statusUpdates[installment._id];
    if (!nextStatus || nextStatus === installment.status) return;

    try {
      await installmentService.updateInstallmentStatus(installment._id, { status: nextStatus });
      toast.success('Installment status updated.');
      await execute();
      if (id) {
        await refreshSelected();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update installment status.');
    }
  };

  const isCompleted = (installment: Installment) => {
    const summary = getInstallmentSummary(installment);
    return (
      summary.completed ||
      installment.totalAmount <= summary.paidAmount
    );
  };

  const searchInput = (
    <div className="relative w-full max-w-md">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
        search
      </span>
      <input
        className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20 outline-none"
        placeholder="Search installments..."
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );

  const buyerForm = (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 mb-8"
      onSubmit={(event) => void handleCreatePlan(event)}
    >
      {propertiesLoading ? (
        <div className="md:col-span-2">
          <LoadingState label="Loading eligible properties..." />
        </div>
      ) : propertiesError ? (
        <div className="md:col-span-2">
          <ErrorState message={propertiesError} onRetry={() => void refreshEligibleProperties()} />
        </div>
      ) : eligibleProperties.length === 0 ? (
        <div className="md:col-span-2 rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-low p-6 text-center">
          <p className="font-semibold text-on-surface">No eligible properties available.</p>
          <p className="text-sm text-secondary mt-1">
            Properties that are already sold or already under installment cannot be selected here.
          </p>
        </div>
      ) : (
        <>
          <div className="md:col-span-2">
              <PropertySearchSelect
                label="Property"
                properties={eligibleProperties}
                value={selectedPropertyId}
                onChange={(property) => {
                  if (!property) return;
                  setSelectedPropertyId(property._id);
                }}
                loading={propertiesLoading}
                emptyMessage="No eligible properties available."
                helperText="Choose a property by name. The real property ID is submitted behind the scenes."
              />
            {selectedProperty ? (
              <p className="mt-2 text-xs text-secondary">
                Selected property: <span className="font-semibold text-on-surface">{selectedProperty.title}</span>
              </p>
            ) : null}
            {!selectedPropertyExists && selectedPropertyId ? (
              <p className="mt-2 text-xs text-secondary">The selected property is no longer available.</p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
            >
              <option value="biannually">Biannually</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Total Amount</label>
            <input
              readOnly
              value={selectedProperty ? formatCurrency(selectedPropertyPrice) : 'Select a property'}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm outline-none cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Installment Count</label>
            <input
              readOnly
              value={selectedInstallmentCount > 0 ? String(selectedInstallmentCount) : 'Not available'}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm outline-none cursor-not-allowed"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Installment Amount</label>
            <input
              readOnly
              value={selectedInstallmentAmount > 0 ? formatCurrency(selectedInstallmentAmount) : 'Select a property and frequency'}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm outline-none cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-secondary">
              This amount is automatically stored in schedule notes and used for every installment payment.
            </p>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Installment Plan'}
            </Button>
          </div>
        </>
      )}
    </form>
  );

  const detailPanel = currentInstallment || id ? (
    null
    // <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 space-y-6 mb-8">
    //   <div className="flex items-center justify-between gap-3 flex-wrap">
    //     <div>
    //       <span className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Installment Detail</span>
    //       <h2 className="text-2xl font-extrabold tracking-tighter mt-1">{currentInstallment?._id ?? 'Loading...'}</h2>
    //       <p className="text-sm text-secondary mt-1">
    //         {currentInstallment ? resolveInstallmentPropertyLabel(currentInstallment) : 'Fetching installment details...'}
    //       </p>
    //     </div>
    //     <Button type="button" variant="secondary" onClick={() => void execute()}>
    //       Refresh
    //     </Button>
    //   </div>

    //   {selectedLoading && id ? (
    //     <LoadingState label="Loading installment details..." />
    //   ) : selectedError ? (
    //     <ErrorState message={selectedError} onRetry={() => void refreshSelected()} />
    //   ) : currentInstallment ? (
    //     <div className="space-y-6">
    //       <div className="flex flex-wrap gap-2">
    //         <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClasses[currentInstallment.status]}`}>
    //           {currentInstallment.status}
    //         </span>
    //         {isCompleted(currentInstallment) ? (
    //           <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-700">
    //             Installment Plan Completed
    //           </span>
    //         ) : null}
    //       </div>

    //       <InstallmentProgress installment={currentInstallment} />

    //       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    //         <div>
    //           <p className="text-[10px] uppercase tracking-widest text-secondary">Property</p>
    //           <p className="font-semibold">{resolveInstallmentPropertyLabel(currentInstallment)}</p>
    //         </div>
    //         <div>
    //           <p className="text-[10px] uppercase tracking-widest text-secondary">Remaining Balance</p>
    //           <p className="font-semibold">{formatCurrency(currentInstallment.remainingBalance)}</p>
    //         </div>
    //         <div>
    //           <p className="text-[10px] uppercase tracking-widest text-secondary">Property Price</p>
    //           <p className="font-semibold">
    //             {resolveInstallmentProperty(currentInstallment)
    //               ? formatCurrency(resolveInstallmentProperty(currentInstallment)!.price)
    //               : formatCurrency(currentInstallment.totalAmount)}
    //           </p>
    //         </div>
    //       </div>

    //       {!isCompleted(currentInstallment) ? (
    //         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    //           <div>
    //             <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
    //               Next Installment Amount
    //             </label>
    //             <input
    //               readOnly
    //               value={
    //                 getInstallmentSummary(currentInstallment).installmentAmount > 0
    //                   ? formatCurrency(getInstallmentSummary(currentInstallment).installmentAmount)
    //                   : 'Not available'
    //               }
    //               className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm outline-none cursor-not-allowed"
    //             />
    //           </div>
    //           <div className="flex items-end">
    //             <Button type="button" variant="secondary" onClick={() => void handleInitializePayment(currentInstallment)} className="w-full">
    //               Pay with Paystack
    //             </Button>
    //           </div>
    //         </div>
    //       ) : (
    //         <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
    //           Installment Plan Completed. Payment actions are disabled.
    //         </div>
    //       )}

    //       {currentInstallment.paymentHistory?.length ? (
    //         <div className="text-sm text-secondary">Payment history entries: {currentInstallment.paymentHistory.length}</div>
    //       ) : null}

    //       {user?.role !== 'buyer' ? (
    //         <div className="flex flex-col sm:flex-row gap-3">
    //           <select
    //             className="bg-surface-container-low rounded-lg px-4 py-3 text-sm"
    //             value={statusUpdates[currentInstallment._id] ?? currentInstallment.status}
    //             onChange={(e) =>
    //               setStatusUpdates((current) => ({
    //                 ...current,
    //                 [currentInstallment._id]: e.target.value as InstallmentStatus,
    //               }))
    //             }
    //           >
    //             <option value="pending">Pending</option>
    //             <option value="active">Active</option>
    //             <option value="completed">Completed</option>
    //             <option value="defaulted">Defaulted</option>
    //           </select>
    //           <Button type="button" variant="secondary" onClick={() => void updateStatus(currentInstallment)}>
    //             Update Status
    //           </Button>
    //         </div>
    //       ) : null}
    //     </div>
    //   ) : null}
    // </section>
  ) : null;

  const body = (
    <div className="p-8 max-w-6xl mx-auto">
      {user?.role === 'admin' ? (
        <header className="mb-8 flex flex-col gap-3">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-primary">Installments</h2>
              <p className="text-sm font-medium text-secondary tracking-widest uppercase">Installment Module</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {searchInput}
              <Link
                className="px-4 py-2 rounded-lg bg-surface-container-low text-sm font-bold"
                to={user?.role === 'admin' ? '/dashboard/admin/tours' : '/dashboard/buyer/tours'}
              >
                Tours
              </Link>
            </div>
          </div>
          <p className="text-secondary text-sm">
            Track installment plans, remaining balances, and payment redirects from Paystack.
          </p>
        </header>
      ) : null}

      {user?.role === 'buyer' ? buyerForm : null}
      {detailPanel}

      {loading ? <LoadingState label="Loading installments..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}

      {!loading && !error ? (
        filteredInstallments.length > 0 ? (
          <div className="space-y-4">
            {filteredInstallments.map((installment) => {
              const summary = getInstallmentSummary(installment);
              const completed = isCompleted(installment);
              return (
                <article
                  key={installment._id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg">{installment._id}</h3>
                      <p className="text-sm text-secondary">{resolveInstallmentPropertyLabel(installment)}</p>
                    </div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClasses[installment.status]}`}>
                      {installment.status}
                    </span>
                  </div>

                  <InstallmentProgress installment={installment} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-secondary">Schedule</p>
                      <p className="font-semibold">
                        {installment.schedule?.frequency ?? 'n/a'}
                        {installment.schedule?.notes ? ` - ${installment.schedule.notes}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-secondary">Next Due Amount</p>
                      <p className="font-semibold">
                        {summary.installmentAmount > 0 ? formatCurrency(summary.installmentAmount) : 'Not available'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-secondary">Next Due Date</p>
                      <p className="font-semibold">Not available</p>
                    </div>
                  </div>

                  {!completed ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
                          Next Installment Amount
                        </label>
                        <input
                          readOnly
                          value={summary.installmentAmount > 0 ? formatCurrency(summary.installmentAmount) : 'Not available'}
                          className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm outline-none cursor-not-allowed"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" variant="secondary" onClick={() => void handleInitializePayment(installment)} className="w-full">
                          Pay with Paystack
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      Installment Plan Completed. Payment actions are disabled.
                    </div>
                  )}

                  {installment.paymentHistory?.length ? (
                    <div className="text-sm text-secondary">Payment history entries: {installment.paymentHistory.length}</div>
                  ) : null}

                  {user?.role !== 'buyer' ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        className="bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                        value={statusUpdates[installment._id] ?? installment.status}
                        onChange={(e) =>
                          setStatusUpdates((current) => ({
                            ...current,
                            [installment._id]: e.target.value as InstallmentStatus,
                          }))
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="defaulted">Defaulted</option>
                      </select>
                      <Button type="button" variant="secondary" onClick={() => void updateStatus(installment)}>
                        Update Status
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-12 text-center">
            <p className="text-secondary">No installments found.</p>
          </div>
        )
      ) : null}
    </div>
  );

  if (user?.role === 'landlord') {
    return (
      <LandlordPortalLayout active="installments" title="Installments" topLeft={searchInput}>
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
      pageTitle="Installments"
      pageSubtitle="Create and monitor installment plans tied to your selected properties."
      topbarRight={searchInput}
    >
      {body}
    </BuyerPortalLayout>
  );
};

export default Installments;
