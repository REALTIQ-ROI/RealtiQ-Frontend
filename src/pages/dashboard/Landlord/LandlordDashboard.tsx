import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';
import { paymentService } from '../../../services/paymentService';

const LandlordDashboard = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const { data: inquiries } = useAsync(() => inquiryService.getInquiries(), true);
  const { data: payments } = useAsync(() => paymentService.getPayments(), true);

  const myProperties = properties.filter((item) => item.ownerId === user?._id);
  const myInquiries = (inquiries ?? []).filter((item) => item.ownerId === user?._id);
  const mySales = myProperties.filter((item) => item.status === 'sold');
  const myPayments = (payments ?? []).filter((item) => myProperties.some((prop) => prop._id === item.propertyId));

  return (
    <DashboardLayout>
      <section className="space-y-8">
        <header>
          <h1 className="text-3xl font-headline font-extrabold tracking-tight">Landlord Dashboard</h1>
          <p className="text-secondary mt-1">Manage listings, inquiries, and revenue.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <p className="text-xs uppercase tracking-wider text-secondary">Total Listings</p>
            <p className="text-3xl font-black mt-2">{myProperties.length}</p>
          </div>
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <p className="text-xs uppercase tracking-wider text-secondary">Sold Listings</p>
            <p className="text-3xl font-black mt-2">{mySales.length}</p>
          </div>
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <p className="text-xs uppercase tracking-wider text-secondary">Inquiries</p>
            <p className="text-3xl font-black mt-2">{myInquiries.length}</p>
          </div>
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <p className="text-xs uppercase tracking-wider text-secondary">Payments</p>
            <p className="text-3xl font-black mt-2">{myPayments.length}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link className="px-4 py-2 rounded bg-primary text-on-primary text-sm font-semibold" to="/dashboard/landlord/add-property">
            Add Property
          </Link>
          <Link className="px-4 py-2 rounded bg-surface-container-low text-sm font-semibold" to="/dashboard/landlord/my-properties">
            Manage Properties
          </Link>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default LandlordDashboard;