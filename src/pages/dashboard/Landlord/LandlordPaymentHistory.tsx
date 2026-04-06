import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';
import { useProperties } from '../../../contexts/PropertiesContext';

const LandlordPaymentHistory = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const { data } = useAsync(() => paymentService.getPayments(), true);

  const myPropertyIds = properties.filter((item) => item.ownerId === user?._id).map((item) => item._id);
  const payments = (data ?? []).filter((item) => myPropertyIds.includes(item.propertyId));
  const total = payments.reduce((sum, item) => sum + item.amount, 0);

  return (
    <LandlordPortalLayout active="payment-history" title="Payment History">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-surface-container-lowest p-8 rounded-xl">
            <p className="text-secondary text-xs font-bold tracking-widest uppercase">Total Revenue</p>
            <h3 className="text-3xl font-black text-primary">${total.toLocaleString()}</h3>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl">
            <p className="text-secondary text-xs font-bold tracking-widest uppercase">Active Sales</p>
            <h3 className="text-3xl font-black text-primary">{payments.length}</h3>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl">
            <p className="text-secondary text-xs font-bold tracking-widest uppercase">Pending Deposits</p>
            <h3 className="text-3xl font-black text-primary">$0.00</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl overflow-hidden mb-8">
          <div className="p-8 border-b border-surface-container-low">
            <h3 className="text-xl font-bold mb-1">Recent Transactions</h3>
            <p className="text-secondary text-sm">Detailed list of all property-related payments.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary">Property</th>
                  <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary">Date</th>
                  <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary text-right">Amount</th>
                  <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {payments.map((item) => (
                  <tr key={item.id} className="group hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900">{item.propertyId}</p>
                      <p className="text-xs text-secondary">ID: {item.id}</p>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-slate-600 italic">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-8 py-6 text-right font-bold text-slate-900">${item.amount.toLocaleString()}</td>
                    <td className="px-8 py-6 text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-emerald-100">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordPaymentHistory;
