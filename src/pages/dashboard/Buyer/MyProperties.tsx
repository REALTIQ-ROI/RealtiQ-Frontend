import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import MediaPreview from '../../../components/property/MediaPreview';
import { resolveBuyerId } from '../../../types';
import { useMemo, useState } from 'react';

const MyProperties = () => {
  const { user, logout } = useAuth();
  const { properties } = useProperties();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'residential' | 'commercial'>('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const myProperties = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return properties.filter((item) => {
      const matchesBuyer = resolveBuyerId(item.buyerId) === user?._id;
      const matchesQuery =
        !needle ||
        `${item.title} ${item.location} ${item.propertyType}`.toLowerCase().includes(needle);
      const matchesCategory =
        category === 'all' ||
        (category === 'commercial' ? item.propertyType === 'commercial' : item.propertyType !== 'commercial');
      return matchesBuyer && matchesQuery && matchesCategory;
    });
  }, [category, properties, query, user?._id]);
  const totalPages = Math.max(1, Math.ceil(myProperties.length / itemsPerPage));
  const paginated = myProperties.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalValue = myProperties.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="bg-surface text-on-background">
      <aside className="fixed left-0 top-0 h-screen w-64 z-50 bg-white dark:bg-slate-950 flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50 dark:shadow-none">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Curator</h1>
          <p className="text-xs tracking-widest font-semibold text-slate-500 uppercase mt-1">Premium Real Estate</p>
        </div>
        <nav className="flex-1 space-y-1">
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold" to="/dashboard/buyer">
            <span className="material-symbols-outlined">dashboard</span>
            Overview
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold scale-98 transition-all text-sm" to="/dashboard/buyer/my-properties">
            <span className="material-symbols-outlined">domain</span>
            My Properties
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold" to="/dashboard/buyer/tours">
            <span className="material-symbols-outlined">tour</span>
            Tours
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold" to="/dashboard/buyer/installments">
            <span className="material-symbols-outlined">schedule</span>
            Installments
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold" to="/dashboard/buyer/payment-history">
            <span className="material-symbols-outlined">payments</span>
            Payment History
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold" to="/dashboard/buyer/inquiry-history">
            <span className="material-symbols-outlined">chat_bubble</span>
            Inquiry History
          </Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:translate-x-1 transition-transform duration-200 text-sm font-semibold" to="/dashboard/buyer/profile-settings">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100">
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold">
            <span className="material-symbols-outlined">help</span>
            Help Center
          </button>
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold" onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl h-16 ml-64 flex justify-between items-center px-8">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-slate-900">Architectural Curator</span>
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
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-slate-500">
            <button className="hover:text-slate-900 transition-colors"><span className="material-symbols-outlined">notifications</span></button>
            <button className="hover:text-slate-900 transition-colors"><span className="material-symbols-outlined">mail</span></button>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden">
            <img alt="User profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxoujxu1D1lxiJLw_dcMMLXCEz6X39QkBco8t-Y3kpw3wWvOtrJmlGzGITkdkxaqLD4dKB2E7heUmdjHDItXgPnGzAERakuX83YTuB6rrS27q0Sm4o_UjKHsaRnV4gJlSELMnBo-bf22h75HumAORsI9yAyd3UMQRrB8_DPg8eZ_4Mklyyasd_YwOYmWiRgMvTEMHR-N50CgxzRh3jy1LsXx16XtMDbP7MrU8F_8crcEmC5799QlqOj0Y7eHYudFtemoyr-zGCAw" />
          </div>
        </div>
      </header>

      <main className="ml-64 pt-24 px-12 pb-16 min-h-screen">
        <section className="mb-12">
          <div className="flex flex-col gap-1">
            <span className="text-secondary font-bold tracking-widest text-[0.65rem] uppercase">Portfolio Overview</span>
            <h2 className="text-4xl font-extrabold text-primary tracking-tight">My Properties</h2>
          </div>
          <div className="mt-8 flex items-center justify-between">
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
                  className={`px-6 py-2 text-sm font-bold rounded-full ${
                    category === item.key
                      ? 'bg-secondary-fixed text-on-secondary-fixed'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Link className="bg-primary text-on-primary px-6 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity" to="/properties">
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
                    <Link
                      className="text-xs font-bold text-primary hover:underline"
                      to={`/dashboard/buyer/property-details/${property._id}`}
                    >
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

          <Link className="group flex flex-col items-center justify-center bg-surface-container-low border-2 border-dashed border-outline-variant/40 rounded-xl p-8 hover:bg-surface-container-highest transition-all duration-300 cursor-pointer min-h-[400px]" to="/properties">
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
              <span className="text-xl font-bold text-primary tracking-tight">&#x20A6;{(totalValue / 1000000).toFixed(1)}M</span>
            </div>
          </div>
          <div className="flex gap-2 mt-6 md:mt-0">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-md bg-surface-container-lowest text-primary border border-outline-variant/10 hover:bg-surface-container-high transition-colors disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="px-4 text-xs font-bold text-secondary">Page {page} of {totalPages}</span>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-md bg-surface-container-lowest text-primary border border-outline-variant/10 hover:bg-surface-container-high transition-colors disabled:opacity-40"
              disabled={page === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default MyProperties;
