import { Link } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import MediaPreview from '../../../components/property/MediaPreview';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useProperties } from '../../../contexts/PropertiesContext';

const formatNGN = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

const FeaturedListings = () => {
  const { properties, loading, error, refreshProperties, updateProperty } = useProperties();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const candidates = properties.filter((property) => property.status === 'available');
  const featured = candidates.filter((property) => property.featured);

  const toggleFeatured = async (id: string, featuredState: boolean) => {
    if (updatingId) return;
    setUpdatingId(id);
    try {
      await updateProperty(id, { featured: !featuredState });
      toast.success(featuredState ? 'Listing removed from featured.' : 'Listing marked as featured.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update featured listing.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen">
        <div className="p-8 max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-secondary uppercase">
                Management Portal
              </span>
              <h2 className="font-headline text-4xl font-extrabold tracking-tighter mt-2">
                Featured Listings Control
              </h2>
              <p className="text-secondary mt-2 max-w-xl">
                Promote available properties on public listing surfaces using the live property API.
              </p>
            </div>
            <Link
              to="/properties"
              className="px-5 py-3 bg-surface-container-lowest text-primary rounded-lg text-sm font-bold hover:bg-surface-container-low transition-colors"
            >
              Open Live Preview
            </Link>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary-container text-on-primary p-6 rounded-xl">
              <p className="text-xs uppercase tracking-widest text-on-primary-container mb-1">Featured</p>
              <h3 className="text-3xl font-extrabold">{featured.length}</h3>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl">
              <p className="text-xs uppercase tracking-widest text-secondary mb-1">Available Candidates</p>
              <h3 className="text-3xl font-extrabold">{candidates.length}</h3>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl">
              <p className="text-xs uppercase tracking-widest text-secondary mb-1">Sold Excluded</p>
              <h3 className="text-3xl font-extrabold">{properties.length - candidates.length}</h3>
            </div>
          </section>

          <section className="bg-surface-container-low rounded-xl overflow-hidden">
            <div className="p-6 bg-surface-container-lowest flex items-center justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl font-bold">Featured Candidates</h3>
                <p className="text-sm text-secondary">Toggle listings that should appear as featured.</p>
              </div>
              <button
                onClick={() => void refreshProperties()}
                className="px-4 py-2 rounded-lg bg-surface-container-low text-sm font-bold hover:bg-surface-container transition-colors"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <LoadingState label="Loading properties..." />
            ) : error ? (
              <ErrorState message={error} onRetry={() => void refreshProperties()} />
            ) : candidates.length === 0 ? (
              <div className="py-16 text-center text-secondary">
                <span className="material-symbols-outlined text-5xl opacity-30 mb-3 block">star_off</span>
                <p className="font-semibold">No available properties can be featured.</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-container">
                {candidates.map((property) => {
                  const image = property.media?.[0];
                  return (
                    <article key={property._id} className="p-5 flex flex-col md:flex-row md:items-center gap-5 bg-surface-container-lowest">
                      <div className="w-full md:w-36 h-28 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                        <MediaPreview media={image} alt={property.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-headline font-bold text-lg text-primary">{property.title}</h4>
                          {property.featured ? (
                            <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase">
                              Featured
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-secondary">{property.location}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-secondary">
                          <span>{property.bedrooms} Beds</span>
                          <span>{property.bathrooms} Baths</span>
                          <span>{property.squareFeet?.toLocaleString() ?? 'N/A'} sqft</span>
                          <span className="text-primary">{formatNGN(property.price)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          className="px-4 py-2 bg-surface-container-low text-primary text-sm font-bold rounded-lg hover:bg-surface-container transition-colors"
                          to={`/dashboard/admin/property-details/${property._id}`}
                        >
                          View
                        </Link>
                        <button
                          disabled={Boolean(updatingId)}
                          aria-busy={updatingId === property._id || undefined}
                          onClick={() => void toggleFeatured(property._id, Boolean(property.featured))}
                          className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            property.featured
                              ? 'bg-surface-container-low text-secondary hover:bg-surface-container'
                              : 'bg-primary text-on-primary hover:opacity-90'
                          }`}
                        >
                          {updatingId === property._id ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">progress_activity</span>
                              Updating...
                            </>
                          ) : property.featured ? 'Remove' : 'Feature'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* <section className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
            <h3 className="font-bold mb-1">Ordering and auto-rotation are not live yet</h3>
            <p className="text-sm">
              The current backend supports the featured flag only. Rotation rules, manual ordering, and analytics are
              documented in NOT_LIVE_FEATURES.md.
            </p>
          </section> */}
        </div>
      </div>
    </AdminLayout>
  );
};

export default FeaturedListings;
