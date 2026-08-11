import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import AdminLayout from '../../../components/layout/AdminLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import MapListLayout from '../../../components/property/map/MapListLayout';
import { useProperties } from '../../../contexts/PropertiesContext';
import type { Property } from '../../../types';
import { propertyDisplayReference, propertyRouteReference } from '../../../types';
import { labelize } from '../../../utils/projectFormatters';

type FilterType = 'all' | 'available' | 'sold';

const statusBadge = (status: Property['status']) => {
  if (status === 'available') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 tracking-wider">
        Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-600 tracking-wider">
      Sold
    </span>
  );
};

const ITEMS_PER_PAGE = 10;

const ownerDisplay = (property: Property) => {
  const owner = property.owner ?? property.ownerId;
  if (!owner) return { initials: 'NA', label: 'Owner unavailable' };

  if (typeof owner === 'string') {
    return owner.trim()
      ? { initials: owner.slice(0, 2).toUpperCase(), label: `...${owner.slice(-8)}` }
      : { initials: 'NA', label: 'Owner unavailable' };
  }

  const ownerId = owner._id || owner.id || '';
  const name = owner.name || owner.email || ownerId;
  return {
    initials: name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'NA',
    label: owner.name || owner.email || (ownerId ? `...${ownerId.slice(-8)}` : 'Owner unavailable'),
  };
};

const ManageProperties = () => {
  const { properties, updateProperty, deleteProperty } = useProperties();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'price-desc' | 'price-asc'>('recent');
  const [query, setQuery] = useState('');
  const [listingType, setListingType] = useState('');
  const [developmentStatus, setDevelopmentStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [minProgress, setMinProgress] = useState('');
  const [maxProgress, setMaxProgress] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = [...properties]
    .filter((p) => {
      const matchesStatus = activeFilter === 'all' || p.status === activeFilter;
      const needle = query.trim().toLowerCase();
      const matchesQuery = !needle || `${p.title} ${p.location} ${p.propertyType}`.toLowerCase().includes(needle);
      const matchesListingType = !listingType || p.listingType === listingType;
      const matchesDevelopmentStatus = !developmentStatus || p.offPlanSummary?.developmentStatus === developmentStatus || p.offPlan?.developmentStatus === developmentStatus;
      const matchesProject = !projectId.trim() || p.project?._id === projectId.trim() || p.project?.slug === projectId.trim();
      const progress = p.offPlanSummary?.constructionProgress ?? p.offPlan?.constructionProgress;
      const matchesMinProgress = !minProgress || (typeof progress === 'number' && progress >= Number(minProgress));
      const matchesMaxProgress = !maxProgress || (typeof progress === 'number' && progress <= Number(maxProgress));
      return matchesStatus && matchesQuery && matchesListingType && matchesDevelopmentStatus && matchesProject && matchesMinProgress && matchesMaxProgress;
    })
    .sort((a, b) => {
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'price-asc') return a.price - b.price;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

  const handleFilterChange = (f: FilterType) => {
    setActiveFilter(f);
    setPage(1);
  };

  const handleViewDetails = (property: Property) => {
    const reference = propertyRouteReference(property);
    if (reference) void navigate(`/dashboard/admin/property-details/${reference}`);
  };

  const handleFeature = async (property: Property) => {
    const reference = propertyRouteReference(property);
    if (!reference || updatingId) return;
    setUpdatingId(reference);
    try {
      await updateProperty(reference, { featured: !property.featured });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (property: Property) => {
    const reference = propertyRouteReference(property);
    if (!reference || deletingId) return;
    const confirmed = await Swal.fire({
      title: 'Delete this property?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete Property',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });
    if (confirmed.isConfirmed) {
      setDeletingId(reference);
      try {
        await deleteProperty(reference);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All Properties', value: 'all' },
    { label: 'Available', value: 'available' },
    { label: 'Sold', value: 'sold' },
  ];

  return (
    <AdminLayout>
      <section className="pt-8 pb-12 px-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="text-secondary text-xs font-bold tracking-[0.15em] uppercase block mb-2">
              Inventory Overview
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Manage Properties</h2>
          </div>
          <div className="flex gap-4">
            <div className="bg-surface-container-low px-5 py-3 rounded-xl">
              <span className="text-[10px] uppercase tracking-widest text-secondary font-bold block mb-1">Total Assets</span>
              <span className="text-xl font-bold font-headline">{properties.length}</span>
            </div>
            <div className="bg-surface-container-low px-5 py-3 rounded-xl">
              <span className="text-[10px] uppercase tracking-widest text-secondary font-bold block mb-1">Vacancy Rate</span>
              <span className="text-xl font-bold font-headline">
                {properties.length > 0
                  ? `${Math.round((properties.filter((p) => p.status === 'available').length / properties.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <label className="flex min-w-[240px] items-center gap-2 rounded-full bg-surface-container-low px-4 py-2">
            <span className="material-symbols-outlined text-lg text-secondary">search</span>
            <input
              className="w-full border-0 bg-transparent text-sm outline-none"
              type="search"
              placeholder="Search title, location, or type"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            />
          </label>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                activeFilter === f.value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-secondary font-medium">Sort by:</span>
            <select
              className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as typeof sortBy);
                setPage(1);
              }}
            >
              <option value="recent">Recently Added</option>
              <option value="price-desc">Price (High to Low)</option>
              <option value="price-asc">Price (Low to High)</option>
            </select>
          </div>
        </div>

        <div className="mb-8 grid gap-3 rounded-xl bg-surface-container-lowest p-4 md:grid-cols-5">
          <select value={listingType} onChange={(event) => { setListingType(event.target.value); setPage(1); }} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none">
            <option value="">Any listing type</option>
            <option value="ready">Ready</option>
            <option value="off_plan">Off-plan</option>
          </select>
          <select value={developmentStatus} onChange={(event) => { setDevelopmentStatus(event.target.value); setPage(1); }} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none">
            <option value="">Any construction stage</option>
            {['planned', 'pre_construction', 'foundation', 'structural', 'roofing', 'finishing', 'completed'].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
          </select>
          <input value={projectId} onChange={(event) => { setProjectId(event.target.value); setPage(1); }} placeholder="Project id or slug" className="rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none" />
          <input type="number" min={0} max={100} value={minProgress} onChange={(event) => { setMinProgress(event.target.value); setPage(1); }} placeholder="Min progress" className="rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none" />
          <input type="number" min={0} max={100} value={maxProgress} onChange={(event) => { setMaxProgress(event.target.value); setPage(1); }} placeholder="Max progress" className="rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none" />
        </div>

        <MapListLayout
          properties={filtered}
          detailsPath={(property) => {
            const reference = propertyRouteReference(property);
            return reference ? `/dashboard/admin/property-details/${reference}` : '';
          }}
          actions={(property) => (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleFeature(property)}
                disabled={!propertyRouteReference(property) || Boolean(updatingId)}
                aria-busy={updatingId === propertyRouteReference(property) || undefined}
              >
                {updatingId === propertyRouteReference(property) ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">progress_activity</span>
                    Updating...
                  </>
                ) : property.featured ? 'Unfeature' : 'Feature'}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-error-container px-3 py-2 text-xs font-bold text-error disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleDelete(property)}
                disabled={!propertyRouteReference(property) || Boolean(deletingId)}
                aria-busy={deletingId === propertyRouteReference(property) || undefined}
              >
                {deletingId === propertyRouteReference(property) ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">progress_activity</span>
                    Deleting...
                  </>
                ) : 'Delete'}
              </button>
            </>
          )}
        >
        {(visibleProperties) => {
          const totalPages = Math.max(1, Math.ceil(visibleProperties.length / ITEMS_PER_PAGE));
          const paginated = visibleProperties.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
          return (
        <div className="bg-surface-container-low rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/50">
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-secondary">Property Detail</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-secondary">Owner ID</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-secondary">Location</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-secondary">Price</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-secondary">Status</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-secondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/30">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-secondary text-sm">
                    {filtered.length ? 'No properties are visible in the current map view.' : 'No properties found.'}
                  </td>
                </tr>
              ) : (
                paginated.map((property) => {
                  const propertyReference = propertyRouteReference(property);
                  const displayReference = property._id
                    ? `ID: ${property._id.slice(-6).toUpperCase()}`
                    : propertyDisplayReference(property);
                  const image = property.media?.[0];
                  const owner = ownerDisplay(property);
                  return (
                    <tr key={propertyReference || `${property.title}-${property.location}`} className="group hover:bg-surface-container-lowest transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                            <MediaPreview media={image} alt={property.title} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <h4
                              className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer"
                              onClick={() => handleViewDetails(property)}
                            >
                              {property.title}
                            </h4>
                            <p className="text-xs text-secondary">{displayReference}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-fixed">
                            {owner.initials}
                          </div>
                          <span className="text-sm font-medium text-secondary">
                            {owner.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-on-surface-variant">{property.location}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold">₦{property.price.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-5">{statusBadge(property.status)}</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-secondary hover:text-primary hover:bg-slate-100 rounded-lg transition-all"
                            title="View Details"
                            onClick={() => handleViewDetails(property)}
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button
                            className={`p-2 rounded-lg transition-all ${
                              property.featured
                                ? 'text-primary hover:bg-primary-fixed'
                                : 'text-secondary hover:text-primary hover:bg-slate-100'
                            }`}
                            title={property.featured ? 'Unfeature' : 'Feature Listing'}
                            disabled={!propertyReference || Boolean(updatingId)}
                            aria-busy={updatingId === propertyReference || undefined}
                            onClick={() => void handleFeature(property)}
                          >
                            <span
                              className={`material-symbols-outlined text-lg ${updatingId === propertyReference ? 'animate-spin' : ''}`}
                              style={property.featured ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                              {updatingId === propertyReference ? 'progress_activity' : 'star'}
                            </span>
                          </button>
                          <button
                            className="p-2 text-secondary hover:text-error hover:bg-error-container rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-60"
                            title="Delete"
                            disabled={!propertyReference || Boolean(deletingId)}
                            aria-busy={deletingId === propertyReference || undefined}
                            onClick={() => void handleDelete(property)}
                          >
                            <span className={`material-symbols-outlined text-lg ${deletingId === propertyReference ? 'animate-spin' : ''}`}>
                              {deletingId === propertyReference ? 'progress_activity' : 'delete'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-surface-container flex items-center justify-between border-t border-surface-variant/20">
            <p className="text-xs text-secondary font-medium">
              Showing {filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(page * ITEMS_PER_PAGE, visibleProperties.length)} of {visibleProperties.length} visible properties
            </p>
            <div className="flex items-center gap-1">
              <button
                className="p-2 text-secondary hover:text-primary transition-colors disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    page === n
                      ? 'bg-primary text-on-primary'
                      : 'hover:bg-surface-container-highest text-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
              {totalPages > 3 && (
                <>
                  <span className="px-2 text-secondary text-xs font-bold">...</span>
                  <button
                    onClick={() => setPage(totalPages)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      page === totalPages
                        ? 'bg-primary text-on-primary'
                        : 'hover:bg-surface-container-highest text-secondary'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                className="p-2 text-secondary hover:text-primary transition-colors disabled:opacity-40"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

          );
        }}
        </MapListLayout>

        {/* Bento Info Cards */}
        {/* <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-primary-container text-on-primary-container p-8 rounded-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-4 font-headline">Portfolio Performance Report</h3>
              <p className="opacity-80 mb-6 max-w-lg text-sm">
                Your properties have shown increased inquiry rates this month. Consider featuring more listings to
                capitalize on current market trends.
              </p>
              <button className="bg-surface-container-lowest text-primary px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-white transition-all">
                Download PDF Report
              </button>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 scale-150">
              <span className="material-symbols-outlined text-[300px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                analytics
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-surface-tint mb-4 text-3xl block">priority_high</span>
              <h3 className="text-xl font-bold mb-2 font-headline">System Alert</h3>
              <p className="text-secondary text-sm">
                Review property documents that may be expiring soon. Notify relevant landlords to keep listings
                compliant.
              </p>
            </div>
            <button className="text-primary font-bold text-sm flex items-center gap-2 mt-4">
              Review Documents{' '}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div> */}
      </section>
    </AdminLayout>
  );
};

export default ManageProperties;
