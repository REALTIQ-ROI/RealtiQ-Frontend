import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { resolveBuyerId } from '../../../types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

const MyProperties = () => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'residential' | 'commercial'>('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const myProperties = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return properties.filter((item) => {
      const matchesBuyer = resolveBuyerId(item.buyerId) === user?._id;
      const matchesQuery = !needle || `${item.title} ${item.location} ${item.propertyType}`.toLowerCase().includes(needle);
      const matchesCategory =
        category === 'all' ||
        (category === 'commercial' ? item.propertyType === 'commercial' : item.propertyType !== 'commercial');
      return matchesBuyer && matchesQuery && matchesCategory;
    });
  }, [category, properties, query, user?._id]);

  const paginated = myProperties.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalValue = myProperties.reduce((sum, item) => sum + item.price, 0);

  const topbarSearch = (
    <div className="hidden md:flex items-center bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/20">
      <span className="material-symbols-outlined text-sm mr-2">search</span>
      <input
        className="bg-transparent border-none focus:ring-0 text-sm w-48 font-medium"
        placeholder="Search portfolio..."
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(1);
        }}
      />
    </div>
  );

  return (
    <BuyerPortalLayout
      pageEyebrow="Portfolio Overview"
      pageTitle="My Properties"
      pageSubtitle="View the properties currently tied to your account and compare their value."
      topbarRight={topbarSearch}
    >
      <section className="mb-12">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-4">
            {[
              { key: 'all', label: `All Assets (${myProperties.length})` },
              { key: 'residential', label: 'Residential' },
              { key: 'commercial', label: 'Commercial' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setCategory(item.key as typeof category);
                  setPage(1);
                }}
                className={`px-6 py-2 text-sm font-bold rounded-full transition-colors ${
                  category === item.key ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Link
            className="bg-primary text-on-primary px-6 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
            to="/properties"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Browse Properties
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginated.map((property) => (
          <div key={property._id} className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden hover:translate-y-[-4px] transition-all duration-300">
            <div className="relative h-64 overflow-hidden">
              <MediaPreview
                media={property.media[0]}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-primary text-on-primary text-[10px] font-bold tracking-widest uppercase rounded-full">Owned</span>
              </div>
            </div>
            <div className="p-8 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-primary tracking-tight">{property.title}</h3>
                <p className="text-secondary text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  {property.location}
                </p>
              </div>
              <div className="pt-4 border-t border-outline-variant/10 flex items-end justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Purchase Value</span>
                  <span className="text-2xl font-black text-primary">₦{(property.price / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex flex-col items-end gap-3 text-secondary">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1 text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-sm">bed</span> {property.bedrooms}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-sm">bathtub</span> {property.bathrooms}
                    </span>
                  </div>
                  <Link className="text-xs font-bold text-primary hover:underline" to={`/dashboard/buyer/property-details/${property._id}`}>
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {myProperties.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 bg-surface-container-lowest rounded-xl p-12 text-center text-secondary">
            <span className="material-symbols-outlined text-6xl opacity-30 mb-4 block">domain_disabled</span>
            <p className="font-bold text-primary">No purchased properties found</p>
            <p className="text-sm mt-1">Browse available listings to start your portfolio.</p>
          </div>
        ) : null}

        <Link
          className="group flex flex-col items-center justify-center bg-surface-container-low border-2 border-dashed border-outline-variant/40 rounded-xl p-8 hover:bg-surface-container-highest transition-all duration-300 cursor-pointer min-h-[400px]"
          to="/properties"
        >
          <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center mb-6 shadow-sm">
            <span className="material-symbols-outlined text-3xl text-primary">add_business</span>
          </div>
          <h3 className="text-lg font-bold text-primary tracking-tight">Expand Portfolio</h3>
          <p className="text-secondary text-xs text-center mt-2 max-w-[180px]">Browse our curated collection of off-market properties worldwide.</p>
          <span className="mt-6 text-xs font-bold text-primary underline underline-offset-4 tracking-wider uppercase">Explore New Listings</span>
        </Link>
      </div>

      <footer className="mt-20 flex flex-col md:flex-row items-center justify-between border-t border-outline-variant/20 pt-10">
        <div className="flex gap-12">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Total Assets</span>
            <span className="text-xl font-bold text-primary tracking-tight">{myProperties.length} Properties</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Portfolio Value</span>
            <span className="text-xl font-bold text-primary tracking-tight">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </footer>
    </BuyerPortalLayout>
  );
};

export default MyProperties;
