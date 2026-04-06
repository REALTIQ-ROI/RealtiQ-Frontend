import DashboardLayout from '../../../components/layout/DashboardLayout';
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

  return (
    <DashboardLayout>
      <section>
        <h1 className="text-3xl font-extrabold">Payment History</h1>
        <div className="mt-6 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="py-2">Payment ID</th>
                <th className="py-2">Property</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((item) => (
                <tr key={item.id} className="border-b border-outline-variant/20">
                  <td className="py-2">{item.id}</td>
                  <td className="py-2">{item.propertyId}</td>
                  <td className="py-2">${item.amount.toLocaleString()}</td>
                  <td className="py-2">{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default LandlordPaymentHistory;