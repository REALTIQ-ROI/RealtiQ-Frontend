import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { useAsync } from '../../../hooks/useAsync';
import { inquiryService } from '../../../services/inquiryService';
import { resolveBuyerId } from '../../../types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

const formatRelativeDate = (date?: string) => {
  if (!date) return 'Recently';
  const current = new Date(date).getTime();
  const delta = Date.now() - current;
  const hours = Math.max(1, Math.round(delta / (1000 * 60 * 60)));
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.max(1, Math.round(hours / 24));
  return `${days}d ago`;
};

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const { data: inquiries } = useAsync(() => inquiryService.getInquiries(), true);
  const [query, setQuery] = useState('');

  const buyerProperties = useMemo(
    () => properties.filter((property) => resolveBuyerId(property.buyerId) === user?._id),
    [properties, user?._id],
  );
  const buyerInquiries = useMemo(
    () =>
      (inquiries ?? []).filter(
        (item) => item.userId === user?._id || item.email.toLowerCase() === (user?.email ?? '').toLowerCase(),
      ),
    [inquiries, user?._id, user?.email],
  );

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return properties.filter((property) =>
      `${property.title} ${property.location} ${property.propertyType}`.toLowerCase().includes(needle),
    );
  }, [properties, query]);

  const featuredProperty =
    buyerProperties[0] ??
    searchResults[0] ??
    properties.find((property) => property.featured) ??
    properties[0] ??
    null;

  const recentInquiry = [...buyerInquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  const recentProperty = [...buyerProperties].sort(
    (a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
  )[0] ?? null;
  const openInquiries = buyerInquiries.filter((item) => item.status === 'open').length;

  const topbarSearch = (
    <div className="relative w-full max-w-md">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
      <input
        className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-surface-tint/20 transition-all outline-none"
        placeholder="Search listings, locations, property types..."
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );

  return (
    <BuyerPortalLayout
      pageEyebrow="Buyer Portal"
      pageTitle="Dashboard"
      pageSubtitle="Track your portfolio, review inquiries, and jump back into live listings."
      topbarRight={topbarSearch}
    >
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Owned Properties</p>
          <p className="mt-3 text-4xl font-black tracking-tighter text-primary">{buyerProperties.length}</p>
          <p className="text-sm text-secondary mt-2">Live properties currently tied to your account.</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Open Inquiries</p>
          <p className="mt-3 text-4xl font-black tracking-tighter text-primary">{openInquiries}</p>
          <p className="text-sm text-secondary mt-2">Messages waiting for a response.</p>
        </div>
        <div className="bg-primary-container p-6 rounded-xl text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-on-primary-container">Portfolio Value</p>
          <p className="mt-3 text-4xl font-black tracking-tighter">{formatCurrency(buyerProperties.reduce((sum, item) => sum + item.price, 0))}</p>
          <p className="text-sm text-white/80 mt-2">Based on the live property data returned by the API.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl overflow-hidden">
          <div className="p-6 flex items-center justify-between gap-4 border-b border-outline-variant/10">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight">Recent Activity</h3>
              <p className="text-sm text-secondary">Derived from your portfolio and inquiry history.</p>
            </div>
            <Link className="text-sm font-bold text-primary hover:underline" to="/dashboard/buyer/inquiry-history">
              View all
            </Link>
          </div>

          <div className="p-6 space-y-4">
            {recentInquiry ? (
              <Link
                className="flex items-center gap-4 p-4 rounded-xl border border-transparent hover:border-outline-variant/10 hover:bg-surface-container-low transition-colors"
                to={`/dashboard/buyer/inquiry-details/${recentInquiry._id}`}
              >
                <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    forum
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold truncate">{recentInquiry.fullName}</h4>
                    <span className="text-xs text-secondary">{formatRelativeDate(recentInquiry.createdAt)}</span>
                  </div>
                  <p className="text-sm text-secondary truncate">{recentInquiry.inquiryType}</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-secondary">{recentInquiry.status}</span>
              </Link>
            ) : null}

            {recentProperty ? (
              <Link
                className="flex items-center gap-4 p-4 rounded-xl border border-transparent hover:border-outline-variant/10 hover:bg-surface-container-low transition-colors"
                to={`/dashboard/buyer/property-details/${recentProperty._id}`}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-high">
                  <MediaPreview media={recentProperty.media?.[0]} alt={recentProperty.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold truncate">{recentProperty.title}</h4>
                    <span className="text-xs text-secondary">{formatRelativeDate(recentProperty.updatedAt ?? recentProperty.createdAt)}</span>
                  </div>
                  <p className="text-sm text-secondary truncate">{recentProperty.location}</p>
                </div>
                <span className="font-bold text-primary">{formatCurrency(recentProperty.price)}</span>
              </Link>
            ) : null}

            {!recentInquiry && !recentProperty ? (
              <p className="text-sm text-secondary">No portfolio activity yet.</p>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10">
            <h3 className="text-2xl font-extrabold tracking-tight">Quick Actions</h3>
            <p className="text-sm text-secondary">Jump to the core buyer workflows.</p>
          </div>
          <div className="p-6 space-y-3">
            <Link className="block px-4 py-3 rounded-lg bg-primary text-on-primary font-bold" to="/properties">
              Browse properties
            </Link>
            <Link className="block px-4 py-3 rounded-lg bg-surface-container-low text-on-surface font-bold" to="/dashboard/buyer/tours">
              Manage tours
            </Link>
            <Link className="block px-4 py-3 rounded-lg bg-surface-container-low text-on-surface font-bold" to="/dashboard/buyer/installments">
              Review installments
            </Link>
            <Link className="block px-4 py-3 rounded-lg bg-surface-container-low text-on-surface font-bold" to="/dashboard/buyer/profile-settings">
              Settings
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-extrabold tracking-tight">Search Results</h3>
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">
              {query.trim() ? `${searchResults.length} matches` : 'Live data'}
            </span>
          </div>
          {query.trim() ? (
            searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.slice(0, 4).map((property) => (
                  <Link
                    key={property._id}
                    className="group bg-surface-container-lowest rounded-xl overflow-hidden border border-transparent hover:border-outline-variant/10 transition-colors"
                    to={`/dashboard/buyer/property-details/${property._id}`}
                  >
                    <div className="h-44 bg-surface-container-high">
                      <MediaPreview media={property.media?.[0]} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-lg truncate">{property.title}</h4>
                      <p className="text-sm text-secondary truncate">{property.location}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="font-bold text-primary">{formatCurrency(property.price)}</span>
                        <span className="text-xs uppercase tracking-widest text-secondary">{property.propertyType}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-xl p-8 text-secondary text-sm">
                No properties matched your search.
              </div>
            )
          ) : featuredProperty ? (
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
              <div className="relative h-72 bg-surface-container-high">
                <MediaPreview media={featuredProperty.media?.[0]} alt={featuredProperty.title} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary/90 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest backdrop-blur-md">
                    Featured Property
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-1">{featuredProperty.location}</p>
                    <h4 className="text-2xl font-black tracking-tight">{featuredProperty.title}</h4>
                    <p className="text-sm text-secondary mt-2">{featuredProperty.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-secondary">Listing Value</p>
                    <p className="text-3xl font-black text-primary">{formatCurrency(featuredProperty.price)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl p-8 text-secondary text-sm">No live properties are available right now.</div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="bg-surface-container-lowest rounded-xl p-6">
            <h3 className="text-2xl font-extrabold tracking-tight mb-4">Portfolio Snapshot</h3>
            <div className="space-y-4">
              {buyerProperties.slice(0, 3).map((property) => (
                <Link
                  key={property._id}
                  to={`/dashboard/buyer/property-details/${property._id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                    <MediaPreview media={property.media?.[0]} alt={property.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold truncate">{property.title}</h4>
                    <p className="text-sm text-secondary truncate">{property.location}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatCurrency(property.price)}</span>
                </Link>
              ))}

              {buyerProperties.length === 0 ? (
                <p className="text-sm text-secondary">You do not have any purchased properties yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </BuyerPortalLayout>
  );
};

export default BuyerDashboard;
