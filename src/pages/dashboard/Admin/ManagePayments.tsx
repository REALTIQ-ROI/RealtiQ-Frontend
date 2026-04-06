import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAsync } from '../../../hooks/useAsync';
import { paymentService } from '../../../services/paymentService';

const ManagePayments = () => {
  const { data: payments } = useAsync(() => paymentService.getPayments(), true);

  return (
    <DashboardLayout>
      <section>
        <h1 className="text-3xl font-extrabold">Manage Payments</h1>
        <div className="mt-6 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="py-2">ID</th>
                <th className="py-2">Property</th>
                <th className="py-2">Buyer</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((payment) => (
                <tr key={payment.id} className="border-b border-outline-variant/20">
                  <td className="py-2">{payment.id}</td>
                  <td className="py-2">{payment.propertyId}</td>
                  <td className="py-2">{payment.buyerId}</td>
                  <td className="py-2">${payment.amount.toLocaleString()}</td>
                  <td className="py-2">{payment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default ManagePayments;