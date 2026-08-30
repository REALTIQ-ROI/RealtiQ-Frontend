import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import MapListLayout from '../../../components/property/map/MapListLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useProperties } from '../../../contexts/PropertiesContext';
import { propertyDisplayReference, propertyRouteReference, resolvePropertyOwnerId } from '../../../types';

const statusConfig = {
  available: { label: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  sold: { label: 'Sold', className: 'bg-slate-100 text-slate-800' },
};

const approvalLabel = (status?: string) => {
  if (!status || status === 'approved') return 'Approved';
  if (status === 'pending_review') return 'Pending admin approval';
  if (status === 'rejected') return 'Listing rejected';
  return status.replace('_', ' ');
};

const LandlordMyProperties = () => {
  const { user } = useAuth();
  const { properties, deleteProperty } = useProperties();
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const myProperties = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return properties.filter((item) => {
      const matchesOwner = resolvePropertyOwnerId(item) === user?._id;
      const matchesStatus = activeFilter === 'all' || item.status === activeFilter;
      const matchesQuery = !needle || `${item.title} ${item.location} ${item.propertyType}`.toLowerCase().includes(needle);
      return matchesOwner && matchesStatus && matchesQuery;
    });
  }, [activeFilter, properties, query, user?._id]);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Property?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    if (result.isConfirmed) void deleteProperty(id);
  };

  const totalValue = myProperties.reduce((sum, p) => sum + p.price, 0);
  const portfolioValue =
    totalValue >= 1_000_000 ? `₦${(totalValue / 1_000_000).toFixed(1)}M` : `₦${totalValue.toLocaleString()}`;
  const occupancyRate = myProperties.length > 0
    ? Math.round((myProperties.filter((property) => property.status === 'sold').length / myProperties.length) * 100)
    : 0;

  return (
    <LandlordPortalLayout
      active="my-properties"
      title="My Properties"
      topLeft={
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <span className="material-symbols-outlined text-xl">search</span>
          </span>
          <input
            className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-64 focus:ring-2 focus:ring-surface-tint/20 transition-all outline-none"
            placeholder="Search properties..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      }
      topRight={
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard/landlord/inquiries" className="text-slate-500 hover:text-slate-900 transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </Link>
            <Link to="/dashboard/landlord/settings" className="text-slate-500 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </Link>
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-900 text-right hidden sm:block">
              {user?.name ?? 'Landlord'}
              <br />
              <span className="font-medium text-slate-500">Portfolio Manager</span>
            </span>
            <div className="w-10 h-10 rounded-full bg-slate-300 border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-600 text-sm">
              {user?.name?.charAt(0) ?? 'L'}
            </div>
          </div>
        </div>
      }
    >
      <main className="p-8">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-label text-secondary mb-2">
            <span className="uppercase tracking-widest text-[10px]">Portal</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="uppercase tracking-widest text-[10px] text-primary font-bold">My Properties</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 mb-2">Property Portfolio</h1>
              <p className="text-secondary max-w-md">
                Manage your architectural collection, track occupancy, and monitor performance across all active listings.
              </p>
            </div>
            <Link
              to="/dashboard/landlord/add-property"
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-md font-bold transition-transform active:scale-95 shadow-lg shadow-black/10"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              <span>List New Property</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary">
            <p className="text-label text-secondary font-medium uppercase tracking-tighter text-xs mb-1">Total Assets</p>
            <p className="text-3xl font-black text-slate-900">{myProperties.length}</p>
            <p className="mt-4 text-xs text-secondary">Portfolio values pulled from the live property API.</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl">
            <p className="text-label text-secondary font-medium uppercase tracking-tighter text-xs mb-1">Portfolio Value</p>
            <p className="text-3xl font-black text-slate-900">{portfolioValue}</p>
            <p className="mt-4 text-xs text-secondary">Estimated market valuation</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl">
            <p className="text-label text-secondary font-medium uppercase tracking-tighter text-xs mb-1">Occupancy</p>
            <p className="text-3xl font-black text-slate-900">{occupancyRate}%</p>
            <p className="mt-4 text-xs text-secondary">Sold properties as a share of the filtered portfolio</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 text-sm font-bold rounded-full flex items-center gap-2 ${
                activeFilter === 'all' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'hover:bg-surface-container-low text-secondary'
              }`}
            >
              All <span className="bg-white/40 px-2 rounded-full text-[10px]">{myProperties.length}</span>
            </button>
            <button
              onClick={() => setActiveFilter('available')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeFilter === 'available' ? 'bg-secondary-fixed text-on-secondary-fixed font-bold' : 'hover:bg-surface-container-low text-secondary'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveFilter('sold')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeFilter === 'sold' ? 'bg-secondary-fixed text-on-secondary-fixed font-bold' : 'hover:bg-surface-container-low text-secondary'
              }`}
            >
              Sold
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="p-2 hover:bg-surface-container-low rounded-lg text-secondary transition-colors"
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setQuery('');
              }}
              title="Reset filters"
            >
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-surface-container-high text-primary' : 'hover:bg-surface-container-low text-secondary'}`}
              type="button"
            >
              <span className="material-symbols-outlined">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-surface-container-high text-primary' : 'hover:bg-surface-container-low text-secondary'}`}
              type="button"
            >
              <span className="material-symbols-outlined">list</span>
            </button>
          </div>
        </div>

        <MapListLayout
          properties={myProperties}
          detailsPath={(property) => {
            const reference = propertyRouteReference(property);
            return reference ? `/dashboard/landlord/property-details/${reference}` : '/dashboard/landlord/my-properties';
          }}
          actions={(property) => (
            <>
              <Link className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-primary" to={`/dashboard/landlord/edit-property/${propertyRouteReference(property)}`}>Edit</Link>
              <button type="button" className="rounded-lg bg-error-container px-3 py-2 text-xs font-bold text-error" onClick={() => void handleDelete(propertyRouteReference(property))}>Delete</button>
            </>
          )}
        >
        {(visibleProperties) => (
        <div className="bg-white rounded-xl overflow-x-auto">
          {viewMode === 'list' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest">Property Details</th>
                  <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest">Asking Price</th>
                  <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest">Performance</th>
                  <th className="px-6 py-4 text-label text-secondary font-bold text-[11px] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {visibleProperties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-secondary text-sm">
                      {myProperties.length ? 'No properties are visible in the current map view.' : 'No properties match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  visibleProperties.map((property) => {
                    const cfg = statusConfig[property.status] ?? statusConfig.available;
                    return (
                      <tr key={propertyRouteReference(property)} className="group hover:bg-surface-bright transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                              <MediaPreview media={property.media?.[0]} alt={property.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{property.title}</h3>
                              <p className="text-sm text-secondary">{property.location}</p>
                              <p className="mt-1 text-xs font-semibold text-secondary">{propertyDisplayReference(property)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.className}`}>
                              {cfg.label}
                            </span>
                            <span className="block text-xs font-semibold text-secondary">{approvalLabel(property.approvalStatus)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-black text-slate-900">₦{property.price.toLocaleString()}</span>
                          <p className="text-[10px] text-secondary font-medium uppercase mt-0.5">Total sale price</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="w-24 bg-surface-container h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${property.status === 'available' ? 'bg-primary w-[90%]' : 'bg-primary-container w-[0%]'}`} />
                          </div>
                          <p className="text-[10px] text-secondary font-medium uppercase mt-1">
                            {property.status === 'available' ? 'Active Listing' : 'Sold Listing'}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-all"
                              title="View"
                              to={`/dashboard/landlord/property-details/${propertyRouteReference(property)}`}
                            >
                              <span className="material-symbols-outlined text-xl">visibility</span>
                            </Link>
                            <Link
                              className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-all"
                              title="Edit"
                              to={`/dashboard/landlord/edit-property/${propertyRouteReference(property)}`}
                            >
                              <span className="material-symbols-outlined text-xl">edit</span>
                            </Link>
                            <button
                              className="p-2 text-secondary hover:text-error hover:bg-error-container/20 rounded-lg transition-all"
                              title="Delete"
                              onClick={() => void handleDelete(propertyRouteReference(property))}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
              {visibleProperties.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3 py-16 text-center text-secondary text-sm">
                  {myProperties.length ? 'No properties are visible in the current map view.' : 'No properties match the current filters.'}
                </div>
              ) : (
                visibleProperties.map((property) => {
                  const cfg = statusConfig[property.status] ?? statusConfig.available;
                  return (
                    <div key={propertyRouteReference(property)} className="group bg-surface-container-lowest rounded-xl overflow-hidden">
                      <div className="h-56 bg-slate-200">
                        <MediaPreview media={property.media?.[0]} alt={property.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{property.title}</h3>
                            <p className="text-sm text-secondary">{property.location}</p>
                            <p className="mt-1 text-xs font-semibold text-secondary">{propertyDisplayReference(property)}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-secondary">{approvalLabel(property.approvalStatus)}</p>
                        <div className="flex items-center justify-between text-sm text-secondary">
                          <span>{property.bedrooms} Beds</span>
                          <span>{property.bathrooms} Baths</span>
                          <span>₦{property.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Link
                            className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-all"
                            title="View"
                            to={`/dashboard/landlord/property-details/${propertyRouteReference(property)}`}
                          >
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </Link>
                          <Link
                            className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-all"
                            title="Edit"
                            to={`/dashboard/landlord/edit-property/${propertyRouteReference(property)}`}
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </Link>
                          <button
                            className="p-2 text-secondary hover:text-error hover:bg-error-container/20 rounded-lg transition-all"
                            title="Delete"
                            onClick={() => void handleDelete(propertyRouteReference(property))}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="px-6 py-6 border-t border-surface-container flex items-center justify-between">
            <p className="text-xs text-secondary font-medium">
              Showing <span className="text-primary font-bold">1 to {Math.min(visibleProperties.length, 4)}</span> of {visibleProperties.length} visible properties
            </p>
            <div className="flex items-center gap-1">
              <button className="p-2 text-slate-400 hover:text-primary transition-colors disabled:opacity-50" disabled type="button">
                <span className="material-symbols-outlined">navigate_before</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary text-xs font-bold" type="button">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container text-xs font-bold text-secondary transition-colors" type="button">
                2
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container text-xs font-bold text-secondary transition-colors" type="button">
                3
              </button>
              <button className="p-2 text-slate-400 hover:text-primary transition-colors" type="button">
                <span className="material-symbols-outlined">navigate_next</span>
              </button>
            </div>
          </div>
        </div>
        )}
        </MapListLayout>
      </main>

      <footer className="mt-auto p-8 text-center">
        <p className="text-[10px] text-secondary font-medium uppercase tracking-[0.2em]">RealtIQ © 2026</p>
      </footer>

      <Link
        to="/dashboard/landlord/add-property"
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center md:hidden z-50"
      >
        <span className="material-symbols-outlined">add</span>
      </Link>
    </LandlordPortalLayout>
  );
};

export default LandlordMyProperties;
