import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyCard from '../../components/property/PropertyCard';
import PropertyFiltersPanel from '../../components/property/PropertyFiltersPanel';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useProperties as usePropertyCatalog } from '../../hooks/useProperties';
import { propertyService } from '../../services/propertyService';
import type { Property } from '../../types';

const formatRange = (page: number, limit: number, total: number) => {
  if (total === 0) return '0 results';
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return `Showing ${start} to ${end} of ${total}`;
};

const Listings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    properties,
    loading,
    error,
    total,
    page,
    filters,
    fetchProperties,
    applyFilters,
    goToPage,
  } = usePropertyCatalog({ autoFetch: true, limit: 12 });

  const handleSave = async (property: Property) => {
    if (!user) {
      navigate('/login-required');
      return;
    }

    try {
      await propertyService.saveProperty(property._id);
      toast.success('Property saved to your profile.');
      void fetchProperties(filters, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save property.');
    }
  };

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-8">
        <header className="mb-10">
          <span className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Discover Listings</span>
          <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface mt-2">
            Exceptional Residences
          </h1>
          <p className="text-secondary mt-3 max-w-2xl">
            Search by price, type, category, stage, currency, and featured status. Results are loaded from the live
            backend with pagination.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <PropertyFiltersPanel initialFilters={filters} onApply={applyFilters} />

          <section className="flex-1 w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-secondary">{formatRange(page, 12, total)}</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                onClick={() => void fetchProperties(filters, page)}
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Refresh
              </button>
            </div>

            {loading ? <LoadingState label="Loading properties..." /> : null}
            {error ? <ErrorState message={error} onRetry={() => void fetchProperties(filters, page)} /> : null}

            {!loading && !error && properties.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-secondary/30 mb-3 block">search_off</span>
                <h2 className="text-xl font-bold text-on-surface mb-2">No properties match your filters</h2>
                <p className="text-secondary text-sm mb-6">Try adjusting the search, price range, or category filters.</p>
                <button type="button" onClick={() => applyFilters({})} className="px-5 py-3 rounded-lg bg-primary text-on-primary font-bold">
                  Clear Filters
                </button>
              </div>
            ) : null}

            {!loading && !error && properties.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {properties.map((property) => (
                    <PropertyCard key={property._id} property={property} showSaveAction onSave={handleSave} />
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant/20 pt-6">
                  <p className="text-xs text-secondary font-medium">
                    {formatRange(page, 12, total)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-surface-container-low text-sm font-bold disabled:opacity-40"
                      onClick={() => goToPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </button>
                    <span className="text-sm font-bold text-on-surface">Page {page}</span>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-surface-container-low text-sm font-bold disabled:opacity-40"
                      onClick={() => goToPage(page + 1)}
                      disabled={page * 12 >= total}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Listings;
