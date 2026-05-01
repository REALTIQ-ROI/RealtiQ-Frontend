import { Link } from 'react-router-dom';
import PropertyCard from '../../components/property/PropertyCard';
import PropertyFilters from '../../components/property/PropertyFilters';
import { useProperties } from '../../hooks/useProperties';

const LIMIT = 12;

const SkeletonCard = () => (
  <div className="rounded-xl bg-white overflow-hidden border border-outline-variant/10 animate-pulse">
    <div className="aspect-[4/3] bg-slate-200" />
    <div className="p-5 space-y-3">
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
      </div>
      <div className="flex gap-3 pt-3 border-t border-slate-100">
        <div className="h-3 bg-slate-200 rounded w-16" />
        <div className="h-3 bg-slate-200 rounded w-16" />
        <div className="h-3 bg-slate-200 rounded w-20" />
      </div>
      <div className="h-3 bg-slate-200 rounded w-24" />
    </div>
  </div>
);

const AllProperties = () => {
  const { properties, total, page, loading, error, applyFilters, goToPage } = useProperties({
    autoFetch: true,
    limit: LIMIT,
  });

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 py-5 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-black tracking-tighter text-slate-900"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            RealtiQ
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-secondary">
            <Link to="/properties" className="text-primary">Properties</Link>
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </nav>
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="py-16 px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #000000 0%, #111c2d 100%)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h1
            className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-4"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Exceptional Residences
          </h1>
          <p className="text-white/60 text-base">
            {total > 0 ? `${total} properties available` : 'Discover premium properties'}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-screen-xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl p-6 border border-outline-variant/10 lg:sticky lg:top-24">
              <PropertyFilters onApply={applyFilters} />
            </div>
          </aside>

          {/* Properties Grid */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="material-symbols-outlined text-5xl text-red-400 mb-4">wifi_off</span>
                <p className="text-lg font-bold text-slate-700 mb-2">Unable to load properties</p>
                <p className="text-slate-500 text-sm">{error}</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4">
                  apartment
                </span>
                <p className="text-lg font-bold text-slate-700 mb-2">No properties found</p>
                <p className="text-slate-500 text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <p className="text-secondary text-sm mb-5">
                  Showing {properties.length} of {total} properties
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {properties.map((property) => (
                    <PropertyCard key={property._id} property={property} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                      className="w-10 h-10 rounded-lg bg-white border border-outline-variant/20 flex items-center justify-center disabled:opacity-40 hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                          p === page
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-white border border-outline-variant/20 text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                      className="w-10 h-10 rounded-lg bg-white border border-outline-variant/20 flex items-center justify-center disabled:opacity-40 hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 mt-16">
        <div className="max-w-screen-xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white font-black text-xl tracking-tighter" style={{ fontFamily: 'Manrope, sans-serif' }}>
            RealtiQ
          </div>
          <p className="text-slate-500 text-xs">© 2024 RealtiQ Architectural Curation.</p>
        </div>
      </footer>
    </div>
  );
};

export default AllProperties;
