import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { installmentService } from '../../services/installmentService';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
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

const formatPropertyRef = (propertyId: Installment['propertyId']) => {
  if (!propertyId) return 'Property unavailable';
  if (typeof propertyId === 'string') return propertyId;
  return propertyId.title ?? propertyId._id ?? 'Property unavailable';
};

const Installments = () => {
  const { user, logout } = useAuth();
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
  const installments = Array.isArray(data) ? data : [];
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [totalAmount, setTotalAmount] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly'>('monthly');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [statusUpdates, setStatusUpdates] = useState<Record<string, InstallmentStatus>>({});

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
    <div className="bg-surface text-on-background antialiased min-h-screen">
      <aside className="fixed left-0 top-0 h-screen w-64 z-50 bg-white dark:bg-slate-950 flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50 dark:shadow-none">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900">Curator</h1>
          <p className="text-xs font-semibold tracking-widest text-secondary uppercase opacity-60">Premium Real Estate</p>
        </div>
        <nav className="flex-1 space-y-1">
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer"><span className="material-symbols-outlined">dashboard</span><span>Overview</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/my-properties"><span className="material-symbols-outlined">domain</span><span>My Properties</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/tours"><span className="material-symbols-outlined">tour</span><span>Tours</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold text-sm" to="/dashboard/buyer/installments"><span className="material-symbols-outlined">schedule</span><span>Installments</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/payment-history"><span className="material-symbols-outlined">payments</span><span>Payment History</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/inquiry-history"><span className="material-symbols-outlined">chat_bubble</span><span>Inquiry History</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/profile-settings"><span className="material-symbols-outlined">settings</span><span>Settings</span></Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 space-y-1">
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold">
            <span className="material-symbols-outlined">help</span>
            <span>Help Center</span>
          </button>
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold" onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 ml-64 max-w-[calc(100%-16rem)]">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20" placeholder="Search installments..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button className="text-slate-500 hover:text-slate-900 transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </button>
            <button className="text-slate-500 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined">mail</span>
            </button>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <span className="text-sm font-bold text-slate-900">{user?.name ?? 'Buyer'}</span>
          </div>
        </div>
      </header>

      <main className="ml-64 pt-24 pb-12 px-12 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <div className="flex items-end justify-between mb-2">
              <h2 className="text-4xl font-extrabold tracking-tight text-primary">Installments</h2>
              <p className="text-sm font-medium text-secondary tracking-widest uppercase">Installment Module</p>
            </div>
            <div className="h-1 w-24 bg-primary" />
            <p className="text-secondary text-sm mt-4">Track installment plans, remaining balances, and payment redirects from Paystack.</p>
          </header>

          {user?.role === 'buyer' ? (
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 mb-8" onSubmit={(event) => void handleCreatePlan(event)}>
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
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 space-y-4 mb-8">
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
                        {formatPropertyRef(selectedInstallment.propertyId)}
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
            installments.length > 0 ? (
              <div className="space-y-4">
                {installments.map((installment) => (
                  <article key={installment._id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg">{installment._id}</h3>
                      <p className="text-sm text-secondary">
                          {formatPropertyRef(installment.propertyId)}
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
        </div>
      </main>
    </div>
  );
};

export default Installments;
