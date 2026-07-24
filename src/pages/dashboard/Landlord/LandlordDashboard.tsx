import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';
import { paymentService } from '../../../services/paymentService';
import { propertyRouteReference, resolvePropertyOwnerId } from '../../../types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

const formatRelativeDate = (date?: string) => {
  if (!date) return 'Recently';
  const delta = Date.now() - new Date(date).getTime();
  const hours = Math.max(1, Math.round(delta / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.max(1, Math.round(hours / 24))}d ago`;
};

const LandlordDashboard = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const { data: inquiries } = useAsync(() => inquiryService.getInquiries(), true);
  const { data: payments } = useAsync(() => paymentService.getPayments(), true);
  const [query, setQuery] = useState('');

  const myProperties = useMemo(
    () => properties.filter((item) => resolvePropertyOwnerId(item) === user?._id),
    [properties, user?._id],
  );
  const myInquiries = useMemo(
    () => (inquiries ?? []).filter((item) => item.ownerId === user?._id),
    [inquiries, user?._id],
  );
  const myPayments = useMemo(
    () => (payments ?? []).filter((item) => myProperties.some((property) => property._id === item.property?._id)),
    [myProperties, payments],
  );

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return myProperties.filter((property) =>
      `${property.title} ${property.location} ${property.propertyType}`.toLowerCase().includes(needle),
    );
  }, [myProperties, query]);

  const openInquiries = myInquiries.filter((item) => item.status === 'open').length;
  const soldProperties = myProperties.filter((item) => item.status === 'sold');
  const featuredProperty =
    searchResults[0] ??
    myProperties.find((property) => property.featured) ??
    myProperties[0] ??
    null;

  const latestInquiry = [...myInquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  const latestPayment = [...myPayments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

  return (
    <LandlordPortalLayout
      active="overview"
      title="Landlord Dashboard"
      topLeft={
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-slate-200 outline-none"
            placeholder="Search your properties..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      }
    >
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.2em] font-bold text-secondary mb-2">Portfolio Overview</p>
            <h2 className="text-4xl font-extrabold text-primary tracking-tighter">
              Welcome back, {user?.name?.split(' ')[0] ?? 'Landlord'}.
            </h2>
            <p className="text-secondary mt-2 font-medium max-w-2xl">
              Review live portfolio data, inquiry flow, and payments captured for your listings.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              to="/dashboard/landlord/add-property"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Property
            </Link>
            <Link
              to="/tools/roi-calculator"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface rounded-lg text-sm font-bold hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">monitoring</span>
              Analyze ROI
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-8">
            <h3 className="text-secondary text-sm font-semibold tracking-tight uppercase mb-1">Total Properties</h3>
            <p className="text-5xl font-extrabold text-primary tracking-tighter">{myProperties.length}</p>
            <p className="text-sm text-secondary mt-2">{searchResults.length > 0 ? `${searchResults.length} matching search results` : 'All live properties from the API.'}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-8">
            <h3 className="text-secondary text-sm font-semibold tracking-tight uppercase mb-1">Open Inquiries</h3>
            <p className="text-5xl font-extrabold text-primary tracking-tighter">{openInquiries}</p>
            <p className="text-sm text-secondary mt-2">Active conversations waiting for your response.</p>
          </div>
          <div className="bg-primary-container rounded-xl p-8 text-white">
            <h3 className="text-on-primary-container text-sm font-semibold tracking-tight uppercase mb-1">Revenue Captured</h3>
            <p className="text-4xl font-extrabold tracking-tighter">{formatCurrency(myPayments.reduce((sum, item) => sum + item.amount, 0))}</p>
            <p className="text-xs mt-2 text-slate-300">Sold properties: {soldProperties.length}</p>
          </div>
        </section>

        {query.trim() ? (
          <section className="bg-surface-container-lowest rounded-xl p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-xl font-bold tracking-tight">Search Results</h3>
              <span className="text-xs font-bold uppercase tracking-widest text-secondary">{searchResults.length} matches</span>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {searchResults.map((property) => (
                  <Link
                    key={propertyRouteReference(property)}
                    to={`/dashboard/landlord/property-details/${propertyRouteReference(property)}`}
                    className="bg-surface-container-low rounded-xl overflow-hidden border border-transparent hover:border-outline-variant/10 transition-colors"
                  >
                    <div className="h-44 bg-surface-container-high">
                      <MediaPreview media={property.media?.[0]} alt={property.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-lg truncate">{property.title}</h4>
                      <p className="text-sm text-secondary truncate">{property.location}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-bold text-primary">{formatCurrency(property.price)}</span>
                        <span className="text-xs uppercase tracking-widest text-secondary">{property.status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary">No properties matched the search term.</p>
            )}
          </section>
        ) : null}

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl overflow-hidden">
            <div className="relative h-80 bg-surface-container-high">
              {featuredProperty ? (
                <MediaPreview media={featuredProperty.media?.[0]} alt={featuredProperty.title} className="w-full h-full object-cover" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <span className="inline-flex px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full text-[10px] uppercase font-bold tracking-widest mb-4">
                  Live Portfolio Highlight
                </span>
                {featuredProperty ? (
                  <>
                    <h3 className="text-3xl font-extrabold tracking-tight mb-2">{featuredProperty.title}</h3>
                    <p className="text-sm text-slate-200 max-w-xl">{featuredProperty.location}</p>
                  </>
                ) : (
                  <h3 className="text-3xl font-extrabold tracking-tight">No live property available</h3>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 space-y-5">
            <h3 className="text-2xl font-bold tracking-tight">Recent Activity</h3>
            {latestInquiry ? (
              <Link
                to={`/dashboard/landlord/inquiry-details/${latestInquiry._id}`}
                className="block p-4 rounded-xl hover:bg-surface-container-low transition-colors"
              >
                <p className="text-[10px] uppercase tracking-widest text-secondary mb-1">Latest Inquiry</p>
                <p className="font-bold">{latestInquiry.fullName}</p>
                <p className="text-sm text-secondary">{latestInquiry.inquiryType}</p>
                <p className="text-xs text-secondary mt-2">{formatRelativeDate(latestInquiry.createdAt)}</p>
              </Link>
            ) : null}
            {latestPayment ? (
              <Link to="/dashboard/landlord/payment-history" className="block p-4 rounded-xl hover:bg-surface-container-low transition-colors">
                <p className="text-[10px] uppercase tracking-widest text-secondary mb-1">Latest Payment</p>
                <p className="font-bold">{latestPayment.property.title}</p>
                <p className="text-sm text-secondary">{formatCurrency(latestPayment.amount)}</p>
                <p className="text-xs text-secondary mt-2">{formatRelativeDate(latestPayment.createdAt)}</p>
              </Link>
            ) : null}
            {!latestInquiry && !latestPayment ? <p className="text-sm text-secondary">No recent activity from the API yet.</p> : null}

            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Portfolio Insight</p>
              <p className="text-sm text-on-surface leading-relaxed">
                {myProperties.length > 0
                  ? `${soldProperties.length} of your listings are sold and ${openInquiries} inquiries remain open.`
                  : 'No landlord portfolio data is currently linked to your account.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordDashboard;
