import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';
import type { ApiPayment } from '../../../types';

const formatNGN = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const statusBadge = (status: ApiPayment['status']) => {
  const cfg: Record<ApiPayment['status'], string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${cfg[status]}`}>
      {status}
    </span>
  );
};

type FilterTab = 'all' | 'paid' | 'pending' | 'failed';

const PaymentHistory = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, execute } = useAsync(() => paymentService.getPayments(), true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [verifying, setVerifying] = useState<string | null>(null);

  const payments = data ?? [];
  const filtered = activeTab === 'all' ? payments : payments.filter((p) => p.status === activeTab);

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
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold text-sm" to="/dashboard/buyer/payment-history"><span className="material-symbols-outlined">payments</span><span>Payment History</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/inquiry-history"><span className="material-symbols-outlined">chat_bubble</span><span>Inquiry History</span></Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 rounded-md text-sm font-semibold" to="/dashboard/buyer/profile-settings"><span className="material-symbols-outlined">settings</span><span>Settings</span></Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 space-y-1">
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold"><span className="material-symbols-outlined">help</span><span>Help Center</span></button>
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold" onClick={logout}><span className="material-symbols-outlined">logout</span><span>Logout</span></button>
        </div>
      </aside>

      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 ml-64 max-w-[calc(100%-16rem)]">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20" placeholder="Search transactions..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button className="text-slate-500 hover:text-slate-900 transition-colors relative"><span className="material-symbols-outlined">notifications</span><span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-white" /></button>
            <button className="text-slate-500 hover:text-slate-900 transition-colors"><span className="material-symbols-outlined">mail</span></button>
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
              <h2 className="text-4xl font-extrabold tracking-tight text-primary">Payment History</h2>
              <p className="text-sm font-medium text-secondary tracking-widest uppercase">Transaction Records</p>
            </div>
            <div className="h-1 w-24 bg-primary" />
          </header>

          {/* Stats */}
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

          {/* Table */}
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
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                <span className="text-sm font-medium">Loading payments…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error_outline</span>
                <p className="text-sm font-semibold text-slate-700 mb-2">{error}</p>
                <button
                  onClick={() => void execute()}
                  className="mt-2 px-5 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold"
                >
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
                            <p className="font-bold text-primary">{payment.property.title}</p>
                            <p className="text-xs text-secondary">{payment.property.location}</p>
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

          {/* Security section */}
          <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <span className="font-bold text-secondary tracking-widest uppercase block mb-4 text-xs">Security First</span>
              <h3 className="text-3xl font-black text-primary mb-6 leading-tight">Your financial data is protected by bank-grade encryption.</h3>
              <p className="text-on-surface-variant leading-relaxed mb-8">Every transaction through the RealtiQ platform is monitored and verified.</p>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <div>
                  <p className="font-bold text-primary">PCI-DSS Compliant</p>
                  <p className="text-sm text-secondary">Secure payment processing via Paystack</p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 bg-primary-container h-64 rounded-2xl flex items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-50" />
              <div className="relative z-10 text-center">
                <span className="material-symbols-outlined text-6xl text-surface mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                <h4 className="text-white text-xl font-bold mb-2">Transaction Security</h4>
                <p className="text-on-primary-container text-sm max-w-xs mx-auto">All payments processed securely through Paystack.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PaymentHistory;
