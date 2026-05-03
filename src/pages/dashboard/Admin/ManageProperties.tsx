import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import AdminLayout from '../../../components/layout/AdminLayout';
import { useProperties } from '../../../contexts/PropertiesContext';
import type { Property } from '../../../types';
import { resolveOwnerId } from '../../../types';

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

const ManageProperties = () => {
  const { properties, updateProperty, deleteProperty } = useProperties();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'price-desc' | 'price-asc'>('recent');
  const [page, setPage] = useState(1);

  const filtered = properties
    .filter((p) => {
      if (activeFilter === 'all') return true;
      return p.status === activeFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'price-asc') return a.price - b.price;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleFilterChange = (f: FilterType) => {
    setActiveFilter(f);
    setPage(1);
  };

  const handleViewDetails = (property: Property) => {
    void navigate(`/dashboard/admin/property-details/${property._id}`);
  };

  const handleDelete = async (property: Property) => {
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
      await deleteProperty(property._id);
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

        {/* Table */}
        <div className="bg-surface-container-low rounded-xl overflow-hidden">
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
                    No properties found.
                  </td>
                </tr>
              ) : (
                paginated.map((property) => {
                  const imageUrl = property.media?.[0]?.url;
                  const ownerInitials = property.ownerId
                    ? resolveOwnerId(property.ownerId).slice(0, 2).toUpperCase()
                    : '??';
                  return (
                    <tr key={property._id} className="group hover:bg-surface-container-lowest transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                            {imageUrl ? (
                              <img className="h-full w-full object-cover" src={imageUrl} alt={property.title} />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-secondary/40">home_work</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h4
                              className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer"
                              onClick={() => handleViewDetails(property)}
                            >
                              {property.title}
                            </h4>
                            <p className="text-xs text-secondary">ID: {property._id.slice(-6).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-fixed">
                            {ownerInitials}
                          </div>
                          <span className="text-sm font-medium text-secondary">
                            {property.ownerId ? `…${resolveOwnerId(property.ownerId).slice(-8)}` : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-on-surface-variant">{property.location}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold">${property.price.toLocaleString()}</span>
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
                            onClick={() => void updateProperty(property._id, { featured: !property.featured })}
                          >
                            <span
                              className="material-symbols-outlined text-lg"
                              style={property.featured ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                              star
                            </span>
                          </button>
                          <button
                            className="p-2 text-secondary hover:text-error hover:bg-error-container rounded-lg transition-all"
                            title="Delete"
                            onClick={() => void handleDelete(property)}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
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
              {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} properties
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

        {/* Bento Info Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>
      </section>
    </AdminLayout>
  );
};

export default ManageProperties;
