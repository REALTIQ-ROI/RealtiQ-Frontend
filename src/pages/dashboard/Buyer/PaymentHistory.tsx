import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';
import type { ApiPayment } from '../../../types';

const formatNGN = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const statusBadge = (status: ApiPayment['status']) => {
  const cfg: Record<ApiPayment['status'], string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    canceled: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${cfg[status]}`}>
      {status}
    </span>
  );
};

type FilterTab = 'all' | 'paid' | 'pending' | 'failed' | 'canceled';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { data, loading, error, execute } = useAsync(() => paymentService.getPayments(), true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);

  const payments = data ?? [];
  const filtered = payments.filter((payment) => {
    const matchesTab = activeTab === 'all' || payment.status === activeTab;
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      `${payment.reference} ${payment.property?.title ?? ''} ${payment.property?.location ?? ''} ${payment.amount}`.toLowerCase().includes(needle);
    return matchesTab && matchesQuery;
  });

  const totalInvested = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
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

  const handleRefresh = async (payment: ApiPayment) => {
    setVerifying(payment._id);
    try {
      await execute();
      toast.success('Status refreshed');
    } catch {
      toast.error('Failed to refresh status');
    } finally {
      setVerifying(null);
    }
  };

  const topbarSearch = (
    <div className="relative w-full max-w-md">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
      <input
        className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20"
        placeholder="Search transactions..."
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );

  return (
    <BuyerPortalLayout
      pageEyebrow="Transaction Records"
      pageTitle="Payment History"
      pageSubtitle="Track verified, pending, and failed property payments in one place."
      topbarRight={topbarSearch}
    >
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-surface-container-low p-8 rounded-xl">
          <p className="font-semibold text-secondary uppercase tracking-widest mb-2 text-xs">Total Invested</p>
          <h3 className="text-3xl font-bold text-primary">{formatNGN(totalInvested)}</h3>
          <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-medium">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>Confirmed payments</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-xl">
          <p className="font-semibold text-secondary uppercase tracking-widest mb-2 text-xs">Active Escrows</p>
          <h3 className="text-3xl font-bold text-primary">{pendingCount}</h3>
          <div className="mt-4 flex items-center gap-2 text-secondary text-sm font-medium">
            <span className="material-symbols-outlined text-sm">pending_actions</span>
            <span>Totaling {formatNGN(pendingAmount)}</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-xl border border-dashed border-outline-variant/30">
          <p className="font-semibold text-secondary uppercase tracking-widest mb-2 text-xs">Total Transactions</p>
          <h3 className="text-3xl font-bold text-primary">{payments.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-secondary text-sm font-medium">
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            <span>{payments.filter((p) => p.status === 'failed').length} failed</span>
          </div>
        </div>
      </section>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-low/50">
          <div className="flex gap-2">
            {(['all', 'paid', 'pending', 'failed'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-secondary-fixed text-on-secondary-fixed'
                    : 'bg-surface-container-high text-secondary hover:bg-surface-container-highest'
                }`}
              >
                {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-secondary">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="text-sm font-medium">Loading payments…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error_outline</span>
            <p className="text-sm font-semibold text-slate-700 mb-2">{error}</p>
            <button onClick={() => void execute()} className="mt-2 px-5 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined text-5xl mb-4 opacity-30">receipt_long</span>
            <p className="text-sm font-semibold">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/30">
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Property</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Reference</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filtered.map((payment) => {
                  const isBusy = verifying === payment._id;
                  return (
                    <tr key={payment._id} className="hover:bg-surface-container-low/20 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="font-bold text-primary">{payment.property?.title ?? 'Property unavailable'}</p>
                        <p className="text-xs text-secondary">{payment.property?.location ?? 'Related record unavailable'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-mono text-xs text-secondary">{payment.reference}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-primary">{formatNGN(payment.amount)}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-medium text-on-surface">{formatDate(payment.createdAt)}</p>
                      </td>
                      <td className="px-8 py-6">{statusBadge(payment.status)}</td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.status === 'paid' && (
                            <button
                              onClick={() => void navigate(`/dashboard/buyer/payment-details/${payment._id}`)}
                              className="px-3 py-1.5 bg-surface-container-low hover:bg-primary hover:text-on-primary text-secondary rounded-lg text-xs font-bold transition-all"
                            >
                              View Details
                            </button>
                          )}
                          {payment.status === 'pending' && (
                            <>
                              <button
                                disabled={isBusy}
                                onClick={() => void handleVerify(payment)}
                                className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                              >
                                {isBusy ? '…' : 'Verify'}
                              </button>
                              <button
                                disabled={isBusy}
                                onClick={() => void handleRefresh(payment)}
                                className="p-1.5 text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-all disabled:opacity-50"
                                title="Refresh status"
                              >
                                <span className={`material-symbols-outlined text-lg ${isBusy ? 'animate-spin' : ''}`}>refresh</span>
                              </button>
                            </>
                          )}
                          {payment.status === 'failed' && (
                            <button
                              disabled={isBusy}
                              onClick={() => void handleVerify(payment)}
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 disabled:opacity-50 transition-all"
                            >
                              Retry Verification
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-8 py-6 flex justify-between items-center bg-surface-container-low/30">
          <p className="text-sm text-secondary font-medium">
            Showing {filtered.length} of {payments.length} transactions
          </p>
        </div>
      </div>

      <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <span className="font-bold text-secondary tracking-widest uppercase block mb-4 text-xs">Security First</span>
          <h3 className="text-3xl font-black text-primary mb-6 leading-tight">Your financial data is protected by bank-grade encryption.</h3>
          <p className="text-on-surface-variant leading-relaxed mb-8">Every transaction through the RealtiQ platform is monitored and verified.</p>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <div>
              <p className="font-bold text-primary">PCI-DSS Compliant</p>
              <p className="text-sm text-secondary">Secure payment processing via Paystack</p>
            </div>
          </div>
        </div>
        <div className="order-1 md:order-2 bg-primary-container h-64 rounded-2xl flex items-center justify-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-50" />
          <div className="relative z-10 text-center">
            <span className="material-symbols-outlined text-6xl text-surface mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_balance_wallet
            </span>
            <h4 className="text-white text-xl font-bold mb-2">Transaction Security</h4>
            <p className="text-on-primary-container text-sm max-w-xs mx-auto">All payments processed securely through Paystack.</p>
          </div>
        </div>
      </section>
    </BuyerPortalLayout>
  );
};

export default PaymentHistory;
