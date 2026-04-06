import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
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
    <LandlordPortalLayout
      active="overview"
      title="Landlord Dashboard"
      topLeft={
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-slate-200 outline-none"
            placeholder="Search properties or tenants..."
            type="text"
          />
        </div>
      }
    >
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] font-bold text-secondary mb-2">Architectural Dashboard</p>
          <h2 className="text-4xl font-extrabold text-primary tracking-tighter">Welcome back, {user?.name?.split(' ')[0] ?? 'Landlord'}.</h2>
          <p className="text-secondary mt-2 font-medium">Your portfolio is currently performing at 94% occupancy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-surface-container-lowest rounded-xl p-8">
            <h3 className="text-secondary text-sm font-semibold tracking-tight uppercase mb-1">Total Properties</h3>
            <p className="text-5xl font-extrabold text-primary tracking-tighter">{myProperties.length}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-8">
            <h3 className="text-secondary text-sm font-semibold tracking-tight uppercase mb-1">Total Inquiries</h3>
            <p className="text-5xl font-extrabold text-primary tracking-tighter">{myInquiries.length}</p>
          </div>
          <div className="bg-primary-container rounded-xl p-8 text-white">
            <h3 className="text-on-primary-container text-sm font-semibold tracking-tight uppercase mb-1">Total Payments</h3>
            <p className="text-5xl font-extrabold tracking-tighter">${myPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
            <p className="text-xs mt-2 text-slate-300">Sold properties: {mySales.length}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3 flex flex-col gap-6">
            <div className="bg-surface-container-low rounded-xl overflow-hidden relative min-h-[400px] flex items-end">
              <div className="absolute inset-0 bg-gradient-to-t from-primary-container/90 via-primary-container/20 to-transparent" />
              <div className="relative z-10 p-10 text-white w-full">
                <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] uppercase font-bold tracking-widest mb-4">
                  Property Highlight
                </span>
                <h3 className="text-4xl font-extrabold tracking-tighter mb-2">The Obsidian House</h3>
                <p className="text-slate-300 max-w-md font-medium">Most viewed listing this week with active buyer activity.</p>
              </div>
            </div>
          </div>

          <div className="lg:w-1/3">
            <div className="bg-surface-container-lowest rounded-xl p-8 h-full">
              <h3 className="text-xl font-bold tracking-tight mb-8">Recent Activity</h3>
              <div className="space-y-6 text-sm">
                <p className="font-bold text-primary">New inquiry received for one of your listings.</p>
                <p className="font-bold text-primary">Recent payment captured successfully.</p>
                <p className="font-bold text-primary">Viewing scheduled for tomorrow morning.</p>
              </div>
              <div className="mt-10 p-6 bg-surface-container rounded-xl">
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Portfolio Insight</p>
                <p className="text-sm text-primary leading-relaxed">
                  Your premium listings are seeing increased demand this month.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordDashboard;
