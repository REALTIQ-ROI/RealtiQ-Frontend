import AdminLayout from '../../../components/layout/AdminLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import ErrorState from '../../../components/ui/ErrorState';
import { useAsync } from '../../../hooks/useAsync';
import { useProperties } from '../../../contexts/PropertiesContext';
// import { inquiryService } from '../../../services/inquiryService';
import { adminService } from '../../../services/adminService';
import type { Property } from '../../../types';

// const barHeights = [30, 45, 40, 65, 50, 35, 60, 85, 45, 55, 70, 40, 30, 50, 95, 45, 60, 35, 75, 55];

const emptyStats = {
  totalUsers: 0,
  totalProperties: 0,
  activeListings: 0,
  soldProperties: 0,
  totalInquiries: 0,
  totalRevenue: 0,
};

const formatNGN = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: string }) => (
  <div className="bg-surface-container-lowest p-6 rounded-xl transition-all hover:-translate-y-1">
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-fixed">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
    </div>
    <div className="mt-4">
      <p className="text-secondary text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-extrabold tracking-tight mt-1 font-headline">{value}</h3>
    </div>
  </div>
);

const StatSkeleton = () => (
  <div className="bg-surface-container-lowest p-6 rounded-xl animate-pulse">
    <div className="w-12 h-12 rounded-full bg-surface-container-high mb-4" />
    <div className="h-4 w-28 bg-surface-container-high rounded mb-3" />
    <div className="h-8 w-20 bg-surface-container-high rounded" />
  </div>
);

const PropertyCard = ({ property }: { property: Property }) => {
  const image = property.media?.[0];
  return (
    <div className="group bg-surface-container-lowest rounded-xl overflow-hidden">
      <div className="relative h-48 bg-surface-container-high">
        <MediaPreview
          media={image}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-on-surface">
            {property.featured ? 'Featured' : property.status}
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-lg tracking-tight">{property.title}</h4>
            <p className="text-secondary text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">location_on</span>
              {property.location}
            </p>
          </div>
          <p className="font-extrabold text-primary">
            ₦{property.price.toLocaleString()}
            <span className="text-[10px] text-secondary font-normal">/mo</span>
          </p>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between text-secondary text-xs">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">bed</span> {property.bedrooms} Beds
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">bathtub</span> {property.bathrooms} Baths
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">square_foot</span>{' '}
            {property.squareFeet?.toLocaleString() ?? '—'} sqft
          </span>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { properties } = useProperties();
  const { data: statsData, loading: statsLoading, error: statsError, execute: refreshStats } = useAsync(
    () => adminService.fetchAdminStats(),
    true,
  );
  const stats = statsData ?? emptyStats;

  const featuredProperties = properties.filter((p) => p.featured).slice(0, 3);
  const displayProperties = featuredProperties.length > 0 ? featuredProperties : properties.slice(0, 3);

  return (
    <AdminLayout>
      <div className="pt-8 pb-12 px-8 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-secondary tracking-[0.1rem] uppercase font-bold text-[10px]">Overview</span>
            <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface mt-1 font-headline">
              Admin Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="bg-surface-container-lowest text-on-surface px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-surface-container-high transition-colors"
              onClick={() => void refreshStats()}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">calendar_today</span>
              <span>Last 30 Days</span>
            </button>
            <button
              className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all"
              onClick={() => void refreshStats()}
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              <span>Refresh Stats</span>
            </button>
          </div>
        </section>

        {/* Metrics Grid */}
        {statsError ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20">
            <ErrorState message="Unable to load dashboard stats" onRetry={() => void refreshStats()} />
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {statsLoading ? (
              Array.from({ length: 6 }, (_, index) => <StatSkeleton key={index} />)
            ) : (
              <>
                <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon="group" />
                <StatCard title="Total Properties" value={stats.totalProperties.toLocaleString()} icon="home_work" />
                <StatCard title="Active Listings" value={stats.activeListings.toLocaleString()} icon="real_estate_agent" />
                <StatCard title="Sold Properties" value={stats.soldProperties.toLocaleString()} icon="verified" />
                <StatCard title="Total Inquiries" value={stats.totalInquiries.toLocaleString()} icon="mail" />
                <StatCard title="Total Revenue" value={formatNGN(stats.totalRevenue)} icon="payments" />
              </>
            )}
          </section>
        )}

        {/* Featured Properties */}
        <section className="space-y-6 pb-12">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-extrabold tracking-tight font-headline">Active Featured Listings</h3>
          </div>

          {displayProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {displayProperties.map((property) => (
                <PropertyCard key={property._id} property={property} />
              ))}
            </div>
          ) : (
            <p className="text-secondary text-sm">No properties to display.</p>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
