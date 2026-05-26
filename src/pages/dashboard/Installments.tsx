import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { installmentService } from '../../services/installmentService';
import type { Installment, InstallmentStatus } from '../../types';

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

const Installments = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') ?? '';
  const { data, loading, error, execute } = useAsync(() => installmentService.getInstallments(), true);
  const {
    data: selectedInstallment,
    loading: selectedLoading,
    error: selectedError,
    execute: refreshSelected,
  } = useAsync(() => installmentService.getInstallmentById(id ?? ''), Boolean(id));
  const hasMounted = useRef(false);
  const installments = data ?? [];
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [totalAmount, setTotalAmount] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly'>('monthly');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [statusUpdates, setStatusUpdates] = useState<Record<string, InstallmentStatus>>({});

  const visibleInstallments = installments;

  useEffect(() => {
    if (hasMounted.current) {
      void refreshSelected();
    } else {
      hasMounted.current = true;
    }
  }, [id, refreshSelected]);

  const handleCreatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyId.trim()) {
      toast.error('Property ID is required.');
      return;
    }
    if (!totalAmount || Number(totalAmount) <= 0) {
      toast.error('Total amount is required.');
      return;
    }

    if (!user || user.role !== 'buyer') {
      toast.error('Only buyers can create installment plans.');
      return;
    }

    setCreating(true);
    try {
      const plan = await installmentService.createInstallmentPlan({
        propertyId: propertyId.trim(),
        totalAmount: Number(totalAmount),
        schedule: {
          frequency,
          notes: notes.trim() || undefined,
        },
      });
      toast.success('Installment plan created.');
      setTotalAmount('');
      setNotes('');
      setPropertyId(plan.propertyId && typeof plan.propertyId === 'string' ? plan.propertyId : propertyId);
      await execute();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to create installment plan.');
    } finally {
      setCreating(false);
    }
  };

  const handleInitializePayment = async (installment: Installment) => {
    try {
      const amountInput = paymentAmounts[installment._id];
      const amount = amountInput ? Number(amountInput) : undefined;
      const result = await installmentService.initializePayment(installment._id, amount ? { amount } : undefined);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update installment status.');
    }
  };

  return (
    <DashboardLayout>
      <section className="space-y-8">
        <header className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Installment Module</span>
          <h1 className="text-3xl font-extrabold tracking-tighter">Installments</h1>
          <p className="text-secondary text-sm">
            Track installment plans, remaining balances, and payment redirects from Paystack.
          </p>
        </header>

        {user?.role === 'buyer' ? (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10" onSubmit={(event) => void handleCreatePlan(event)}>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Property ID</label>
              <input
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                placeholder="Property ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Total Amount</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                placeholder="15000000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm resize-none"
                placeholder="12 monthly payments"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Installment Plan'}
              </Button>
            </div>
          </form>
        ) : null}

        {id ? (
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Installment Detail</span>
                <h2 className="text-2xl font-extrabold tracking-tighter mt-1">
                  {selectedInstallment ? selectedInstallment._id : id}
                </h2>
              </div>
              <Button type="button" variant="secondary" onClick={() => void execute()}>
                Refresh
              </Button>
            </div>
            {selectedLoading ? (
              <LoadingState label="Loading installment details..." />
            ) : selectedError ? (
              <ErrorState message={selectedError} onRetry={() => void refreshSelected()} />
            ) : selectedInstallment ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Property</p>
                    <p className="font-semibold">
                      {typeof selectedInstallment.propertyId === 'string'
                        ? selectedInstallment.propertyId
                        : selectedInstallment.propertyId.title ?? selectedInstallment.propertyId._id}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Remaining</p>
                    <p className="font-semibold">{formatCurrency(selectedInstallment.remainingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Status</p>
                    <p className="font-semibold capitalize">{selectedInstallment.status}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" onClick={() => void handleInitializePayment(selectedInstallment)}>
                    Pay Remaining Balance
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void refreshSelected()}>
                    Reload Detail
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-secondary">Select an installment to view details.</p>
            )}
          </section>
        ) : null}

        {loading ? <LoadingState label="Loading installments..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}

        {!loading && !error ? (
          visibleInstallments.length > 0 ? (
            <div className="space-y-4">
              {visibleInstallments.map((installment) => (
                <article key={installment._id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg">{installment._id}</h3>
                      <p className="text-sm text-secondary">
                        {typeof installment.propertyId === 'string'
                          ? installment.propertyId
                          : installment.propertyId.title ?? installment.propertyId._id}
                      </p>
                    </div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClasses[installment.status]}`}>
                      {installment.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-secondary">Total</p>
                      <p className="font-semibold">{formatCurrency(installment.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-secondary">Remaining</p>
                      <p className="font-semibold">{formatCurrency(installment.remainingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-secondary">Schedule</p>
                      <p className="font-semibold">
                        {installment.schedule?.frequency ?? 'n/a'}
                        {installment.schedule?.notes ? ` • ${installment.schedule.notes}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Pay Amount</label>
                      <input
                        type="number"
                        value={paymentAmounts[installment._id] ?? ''}
                        onChange={(e) =>
                          setPaymentAmounts((current) => ({
                            ...current,
                            [installment._id]: e.target.value,
                          }))
                        }
                        className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm"
                        placeholder={String(installment.remainingBalance)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="secondary" onClick={() => void handleInitializePayment(installment)} className="w-full">
                        Pay with Paystack
                      </Button>
                    </div>
                  </div>

                  {installment.paymentHistory?.length ? (
                    <div className="text-sm text-secondary">
                      Payment history entries: {installment.paymentHistory.length}
                    </div>
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
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-12 text-center">
              <p className="text-secondary">No installments found.</p>
            </div>
          )
        ) : null}
      </section>
    </DashboardLayout>
  );
};

export default Installments;
