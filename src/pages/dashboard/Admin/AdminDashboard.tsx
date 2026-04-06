import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';
import { useProperties } from '../../../contexts/PropertiesContext';
import { inquiryService } from '../../../services/inquiryService';
import { paymentService } from '../../../services/paymentService';

const AdminDashboard = () => {
  const { properties } = useProperties();
  const { data: users } = useAsync(() => userService.getUsers(), true);
  const { data: inquiries } = useAsync(() => inquiryService.getInquiries(), true);
  const { data: payments } = useAsync(() => paymentService.getPayments(), true);

  return (
    <DashboardLayout>
      <section className="space-y-8">
        <header>
          <h1 className="text-3xl font-headline font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="text-secondary mt-1">Platform-wide overview and controls.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20"><p className="text-xs text-secondary uppercase">Users</p><p className="text-3xl font-black">{users?.length ?? 0}</p></div>
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20"><p className="text-xs text-secondary uppercase">Properties</p><p className="text-3xl font-black">{properties.length}</p></div>
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20"><p className="text-xs text-secondary uppercase">Inquiries</p><p className="text-3xl font-black">{inquiries?.length ?? 0}</p></div>
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20"><p className="text-xs text-secondary uppercase">Payments</p><p className="text-3xl font-black">{payments?.length ?? 0}</p></div>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default AdminDashboard;