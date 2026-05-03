import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';
import type { ApiPayment } from '../../../types';

const formatNGN = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

type FilterTab = 'all' | 'paid' | 'pending' | 'failed';

const statusBadge = (status: ApiPayment['status']) => {
  const cfg: Record<ApiPayment['status'], string> = {
    paid: 'bg-emerald-50 text-emerald-600',
    pending: 'bg-amber-50 text-amber-600',
    failed: 'bg-rose-50 text-rose-600',
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

  const payments = data ?? [];
  const filtered = activeTab === 'all' ? payments : payments.filter((p) => p.status === activeTab);

  const totalVolume = payments.reduce((s, p) => s + p.amount, 0);
  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;

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
        toast.error('Payment verification failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to verify payment');
    } finally {
      setVerifying(null);
    }
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
            </div>
            <div className="lg:col-span-5">
              <div className="bg-primary-container p-8 rounded-xl relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-on-primary-container/60 text-xs font-medium uppercase tracking-widest block mb-1">Total Volume</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white tracking-tighter">{formatNGN(totalVolume)}</span>
                  </div>
                  <div className="mt-6 flex gap-6 text-xs text-on-primary-container/70">
                    <span><span className="text-white font-bold">{paidCount}</span> successful</span>
                    <span><span className="text-amber-300 font-bold">{pendingCount}</span> pending</span>
                    <span><span className="text-rose-300 font-bold">{payments.filter((p) => p.status === 'failed').length}</span> failed</span>
                  </div>
                </div>
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
              </div>
            </div>
          </section>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              {(['all', 'paid', 'pending', 'failed'] as FilterTab[]).map((tab) => (
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
          <div className="bg-surface-container-low rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
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
                          <p className="text-sm font-bold text-primary">{payment.property.title}</p>
                          <p className="text-[10px] text-secondary">{payment.property.location}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-primary">{payment.user.name}</p>
                          <p className="text-[10px] text-secondary">{payment.user.email}</p>
                        </td>
                        <td className="px-6 py-5 text-sm text-secondary">{formatDate(payment.createdAt)}</td>
                        <td className="px-6 py-5 text-sm font-bold text-primary">{formatNGN(payment.amount)}</td>
                        <td className="px-6 py-5">{statusBadge(payment.status)}</td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {payment.status === 'paid' && (
                              <button
                                onClick={() => void navigate(`/dashboard/admin/payment-details/${payment._id}`)}
                                className="px-3 py-1.5 text-xs font-bold text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-all"
                              >
                                View Details
                              </button>
                            )}
                            {(payment.status === 'pending' || payment.status === 'failed') && (
                              <>
                                <button
                                  disabled={isBusy}
                                  onClick={() => void handleVerify(payment)}
                                  className="px-3 py-1.5 text-xs font-bold bg-primary text-on-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                                >
                                  {isBusy ? '…' : 'Verify'}
                                </button>
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
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-slate-900">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Pending Payouts</h4>
              <div className="text-2xl font-bold tracking-tight">{formatNGN(payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0))}</div>
              <div className="text-[10px] text-secondary mt-1">{pendingCount} pending transactions</div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-emerald-500">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Successful Payments</h4>
              <div className="text-2xl font-bold tracking-tight">{formatNGN(payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0))}</div>
              <div className="text-[10px] text-emerald-600 mt-1 font-semibold">{paidCount} transactions</div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-rose-500">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-[0.1em] mb-4">Failed Payments</h4>
              <div className="text-2xl font-bold tracking-tight">{payments.filter((p) => p.status === 'failed').length}</div>
              <div className="text-[10px] text-rose-600 mt-1 font-semibold">Require attention</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagePayments;
