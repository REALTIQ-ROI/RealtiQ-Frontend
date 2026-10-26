import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useAsync } from '../../../hooks/useAsync';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { paymentService } from '../../../services/paymentService';
import type { ApiPayment } from '../../../types';

const formatNGN = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

type FilterTab = 'all' | 'paid' | 'pending' | 'failed' | 'canceled';

const statusBadge = (status: ApiPayment['status']) => {
  const cfg: Record<ApiPayment['status'], string> = {
    paid: 'bg-emerald-50 text-emerald-600',
    pending: 'bg-amber-50 text-amber-600',
    failed: 'bg-rose-50 text-rose-600',
    canceled: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${cfg[status]}`}>
      {status}
    </span>
  );
};

const ManagePayments = () => {
  const navigate = useNavigate();
  const { data, loading, error, execute } = useAsync(() => paymentService.getPayments(), true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportStepUp = useBoundStepUp<Blob>();
  const cancelStepUp = useBoundStepUp<Awaited<ReturnType<typeof paymentService.cancelPayment>>>();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const payments = data ?? [];
  const filtered = activeTab === 'all' ? payments : payments.filter((p) => p.status === activeTab);

  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const canceledCount = payments.filter((p) => p.status === 'canceled').length;

  const handleVerify = async (payment: ApiPayment) => {
    const confirmed = await Swal.fire({
      title: 'Verify Payment?',
      text: 'This will check payment status with Paystack',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Verify',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#000000',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    if (!confirmed.isConfirmed) return;

    setVerifying(payment._id);
    try {
      const result = await paymentService.verifyPayment(payment.reference);
      if (result.verified) {
        toast.success('Payment verified successfully');
        void execute();
      } else {
        toast.info('The provider has not confirmed this payment yet. No success or failure is assumed.');
        void execute();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to verify payment');
    } finally {
      setVerifying(null);
    }
  };

  const beginExport = async () => {
    if (exporting || exportStepUp.busy || exportStepUp.challenge) return;
    const body = { limit: 2000 };
    await exportStepUp.begin({
      method: 'POST', path: '/api/payments/export.csv', body,
      label: 'Download the authorized payment CSV export',
      execute: (challengeId, exactBody) => paymentService.exportPaymentsCsv(exactBody, challengeId),
    });
  };

  const completeExport = async (code: string): Promise<boolean> => {
    setExporting(true);
    const result = await exportStepUp.complete(code);
    if (result.ok) {
      const url = URL.createObjectURL(result.value);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'payments.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('The authorized payment export has been downloaded.');
    } else if (result.error) toast.error(result.error);
    setExporting(false);
    return result.ok;
  };

  const beginCancelPayment = async (payment: ApiPayment) => {
    if (payment.status !== 'pending' || cancelling || cancelStepUp.busy || cancelStepUp.challenge) return;
    const review = await Swal.fire({
      title: 'Cancel pending payment?',
      text: 'This action requires Finance authorization and a fresh authenticator check. Cancellation does not issue a refund.',
      input: 'textarea', inputLabel: 'Reason (optional)', inputAttributes: { maxlength: '1000' },
      showCancelButton: true, confirmButtonText: 'Review with authenticator', confirmButtonColor: '#9f1239',
      inputValidator: (value) => value.length > 1000 ? 'The reason must be 1,000 characters or fewer.' : undefined,
    });
    if (!review.isConfirmed) return;
    const reason = typeof review.value === 'string' ? review.value.trim() : '';
    const body = reason ? { reason } : {};
    setCancelling(payment._id);
    await cancelStepUp.begin({
      method: 'PATCH', path: `/api/admin/payments/${encodeURIComponent(payment._id)}/cancel`, body,
      label: 'Cancel this pending payment attempt',
      execute: (challengeId, exactBody) => paymentService.cancelPayment(payment._id, exactBody, challengeId),
    });
  };

  const completeCancelPayment = async (code: string): Promise<boolean> => {
    const result = await cancelStepUp.complete(code);
    if (result.ok) {
      toast.success(result.value.alreadyCanceled ? 'Payment was already canceled.' : result.value.message || 'Payment canceled. No refund was issued.');
      setCancelling(null);
      await execute();
    } else if (result.error && !(result.error.includes('not accepted') || result.error.includes('locked'))) {
      toast.error(result.error);
      if (!cancelStepUp.challenge) setCancelling(null);
    }
    return result.ok;
  };

  return (
    <AdminLayout>
      <div className="min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Hero Summary */}
          <section className="mb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="text-[0.65rem] uppercase tracking-[0.2em] font-bold text-secondary mb-3 block">Financial Ledger</span>
              <h2 className="text-4xl font-extrabold tracking-tighter text-primary mb-4 leading-none">Payments Management</h2>
              <p className="text-secondary max-w-md leading-relaxed text-sm">
                Comprehensive overview of platform liquidity and individual asset performance.
              </p>
              <p className="mt-3 text-sm text-secondary">Payment cancellation requires the current Finance staff profile and a bound authenticator challenge. It cancels only a pending attempt and does not issue a refund.</p>
              <button type="button" className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={exporting || exportStepUp.busy || Boolean(exportStepUp.challenge)} onClick={() => void beginExport()}>{exporting || exportStepUp.busy ? 'Preparing protected export…' : 'Export payments CSV'}</button>
              {exportStepUp.error && !exportStepUp.challenge ? <p role="alert" className="mt-2 text-sm text-error">{exportStepUp.error}</p> : null}
            </div>
            <div className="lg:col-span-5">
              <Link to="/dashboard/admin/wallet" className="block bg-primary-container p-8 rounded-xl relative overflow-hidden hover:opacity-95">
                <div className="relative z-10">
                  <span className="text-on-primary-container/60 text-xs font-medium uppercase tracking-widest block mb-1">Authoritative finance summary</span>
                  <span className="text-3xl font-bold text-white tracking-tighter">Open platform ledger</span>
                  <div className="mt-6 flex gap-6 text-xs text-on-primary-container/70">
                    <span><span className="text-white font-bold">{paidCount}</span> successful</span>
                    <span><span className="text-amber-300 font-bold">{pendingCount}</span> pending</span>
                    <span><span className="text-rose-300 font-bold">{payments.filter((p) => p.status === 'failed').length}</span> failed</span>
                    <span><span className="text-slate-300 font-bold">{canceledCount}</span> canceled</span>
                  </div>
                </div>
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
              </Link>
            </div>
          </section>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              {(['all', 'paid', 'pending', 'failed', 'canceled'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-xs font-bold rounded-full transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-secondary hover:bg-surface-container-low'
                  }`}
                >
                  {tab === 'all' ? 'All Transactions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="overflow-x-auto rounded-xl bg-surface-container-low">
            <table className="w-full min-w-[1120px] text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Reference</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Property</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Buyer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loading ? (
                  <tr>
                    <td colSpan={7}>
                      <LoadingState label="Loading payments..." />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7}>
                      <ErrorState message={error} onRetry={() => void execute()} />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <span className="material-symbols-outlined text-4xl text-secondary/30 block mb-2">receipt_long</span>
                      <p className="text-sm text-secondary">No payments found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((payment) => {
                    const isBusy = verifying === payment._id;
                    return (
                      <tr key={payment._id} className="hover:bg-surface-container-lowest transition-colors group">
                        <td className="px-6 py-5">
                          <span className="text-xs font-mono text-slate-500">{payment.reference}</span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-primary">
                            {payment.property?.title ?? 'Property unavailable'}
                          </p>
                          <p className="text-[10px] text-secondary">
                            {payment.property?.location ?? 'Related record unavailable'}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-primary">
                            {payment.user?.name ?? 'Guest'}
                          </p>
                          <p className="text-[10px] text-secondary">
                            {payment.user?.email ?? 'Secure guest payment'}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-sm text-secondary">{formatDate(payment.createdAt)}</td>
                        <td className="px-6 py-5 text-sm font-bold text-primary">{formatNGN(payment.amount)}</td>
                        <td className="px-6 py-5">{statusBadge(payment.status)}</td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex min-w-max items-center justify-end gap-2 whitespace-nowrap">
                            {(payment.status === 'paid' || payment.status === 'canceled') && (
                              <button
                                onClick={() => void navigate(`/dashboard/admin/payment-details/${payment._id}`)}
                                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-all"
                              >
                                View Details
                              </button>
                            )}
                            {(payment.status === 'pending' || payment.status === 'failed') && (
                              <>
                                <button
                                  onClick={() => void navigate(`/dashboard/admin/payment-details/${payment._id}`)}
                                  className="whitespace-nowrap px-3 py-1.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-all"
                                >
                                  Details
                                </button>
                                <button
                                  disabled={isBusy}
                                  onClick={() => void handleVerify(payment)}
                                  aria-busy={verifying === payment._id || undefined}
                                  className="inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs font-bold bg-primary text-on-primary rounded-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                >
                                  {verifying === payment._id ? (
                                    <>
                                      <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">progress_activity</span>
                                      Verifying...
                                    </>
                                  ) : 'Verify'}
                                </button>
                                {payment.status === 'pending' ? <button
                                  disabled={Boolean(isBusy || cancelling || cancelStepUp.busy || cancelStepUp.challenge)}
                                  onClick={() => void beginCancelPayment(payment)}
                                  className="inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs font-bold border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                >
                                  {cancelling === payment._id ? 'Awaiting authorization…' : 'Cancel payment'}
                                </button> : null}
                                <button
                                  disabled={isBusy}
                                  onClick={() => void execute()}
                                  className="p-1.5 text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-all disabled:opacity-50"
                                  title="Refresh"
                                >
                                  <span className={`material-symbols-outlined text-sm ${isBusy ? 'animate-spin' : ''}`}>refresh</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="px-6 py-4 flex items-center justify-between bg-surface-container-high/20">
              <span className="text-xs text-secondary">
                Showing {filtered.length} of {payments.length} transactions
              </span>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-slate-900">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Pending payment records</h4>
              <div className="text-2xl font-bold tracking-tight">{pendingCount}</div>
              <div className="text-[10px] text-secondary mt-1">{pendingCount} pending transactions</div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-emerald-500">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Successful Payments</h4>
              <div className="text-2xl font-bold tracking-tight">{paidCount}</div>
              <div className="text-[10px] text-emerald-600 mt-1 font-semibold">{paidCount} transactions</div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-rose-500">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Failed Payments</h4>
              <div className="text-2xl font-bold tracking-tight">{payments.filter((p) => p.status === 'failed').length}</div>
              <div className="text-[10px] text-rose-600 mt-1 font-semibold">Require attention</div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-slate-500">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Canceled Payments</h4>
              <div className="text-2xl font-bold tracking-tight">{canceledCount}</div>
              <div className="text-[10px] text-slate-600 mt-1 font-semibold">Preserved for audit</div>
            </div>
          </div>
        </div>
      </div>
      <StepUpDialog challenge={exportStepUp.challenge} busy={exporting || exportStepUp.busy} error={exportStepUp.error} onCancel={exportStepUp.cancel} onSubmit={completeExport} />
      <StepUpDialog challenge={cancelStepUp.challenge} busy={cancelStepUp.busy} error={cancelStepUp.error} onCancel={() => { cancelStepUp.cancel(); setCancelling(null); }} onSubmit={completeCancelPayment} />
    </AdminLayout>
  );
};

export default ManagePayments;
