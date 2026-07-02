import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';

const formatNGN = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const LandlordPaymentHistory = () => {
  const { data, loading, error, execute } = useAsync(() => paymentService.getPayments(), true);

  const payments = data ?? [];
  const totalRevenue = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <LandlordPortalLayout active="payment-history" title="Payment History">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-surface-container-lowest p-8 rounded-xl">
            <p className="text-secondary text-xs font-bold tracking-widest uppercase mb-2">Total Revenue</p>
            <h3 className="text-3xl font-black text-primary">{formatNGN(totalRevenue)}</h3>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl">
            <p className="text-secondary text-xs font-bold tracking-widest uppercase mb-2">Active Sales</p>
            <h3 className="text-3xl font-black text-primary">{payments.filter((p) => p.status === 'paid').length}</h3>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl">
            <p className="text-secondary text-xs font-bold tracking-widest uppercase mb-2">Pending Deposits</p>
            <h3 className="text-3xl font-black text-primary">{formatNGN(pendingAmount)}</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl overflow-hidden mb-8">
          <div className="p-8 border-b border-surface-container-low">
            <h3 className="text-xl font-bold mb-1">Recent Transactions</h3>
            <p className="text-secondary text-sm">Payments received for your properties.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-secondary">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="text-sm">Loading transactions…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error_outline</span>
              <p className="text-sm font-semibold text-slate-700 mb-3">{error}</p>
              <button
                onClick={() => void execute()}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-secondary">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-30">receipt_long</span>
              <p className="text-sm font-semibold">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary">Property</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary">Buyer</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary">Reference</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary">Date</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary text-right">Amount</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="group hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900">{payment.property.title}</p>
                        <p className="text-xs text-secondary">{payment.property.location}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-medium text-slate-700">{payment.user.name}</p>
                        <p className="text-xs text-secondary">{payment.user.email}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-mono text-secondary">{payment.reference}</span>
                      </td>
                      <td className="px-8 py-6 text-sm font-medium text-slate-600">{formatDate(payment.createdAt)}</td>
                      <td className="px-8 py-6 text-right font-bold text-slate-900">{formatNGN(payment.amount)}</td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          payment.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : payment.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordPaymentHistory;
import { LoaderCircle } from 'lucide-react';
