import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyCard from '../../components/property/PropertyCard';
import MediaPreview from '../../components/property/MediaPreview';
import Button from '../../components/ui/Button';
import { useProperties } from '../../contexts/PropertiesContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { propertyRouteReference } from '../../types';
import { MARKET_ACCESS_PATH, marketAuthPath } from '../../hooks/useMarketAccessIntent';

const Home = () => {
  const { properties, loading, error, refreshProperties } = useProperties();
  const { user, isAuthenticated } = useAuth();
  const canViewMediaMissingProperties = user?.role === 'admin' || user?.role === 'landlord';
  const homepageProperties = canViewMediaMissingProperties
    ? properties
    : properties.filter((property) => property.media?.some((media) =>
      (media.type === 'image' || media.type === 'video') && Boolean(media.url?.trim()),
    ));
  const featuredProperty = homepageProperties[0] ?? null;

  return (
    <PublicLayout>
      <section className="px-8 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-semibold">Exclusively Curated Spaces</span>
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] text-primary">
              Find your next <br /> <span className="text-secondary-container bg-primary px-2">masterpiece.</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-lg leading-relaxed">
              Moving beyond the commodity marketplace. We curate properties that define architectural excellence.
            </p>
            <div className="flex gap-4">
              <Link to="/properties">
                <Button>Browse Listings</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary">Create Account</Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] rounded-xl overflow-hidden shadow-2xl">
              <MediaPreview
                media={featuredProperty?.media?.[0]}
                alt={featuredProperty?.title ?? 'featured property'}
                className="w-full h-full object-cover"
                controls
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="market-analysis-heading" className="px-8 py-12 max-w-7xl mx-auto">
        <div className="grid gap-8 rounded-2xl bg-primary p-6 text-on-primary sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-container">Property Market Analysis</span>
            <h2 id="market-analysis-heading" className="mt-3 font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">Know the market before your next move.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-on-primary/80">Explore property price trends, activity heatmaps, and market summaries to make more informed property decisions.</p>
            <Link
              to={isAuthenticated ? MARKET_ACCESS_PATH : marketAuthPath('/register', MARKET_ACCESS_PATH)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-secondary-container px-6 py-3 text-sm font-bold text-on-secondary-container"
            >
              {isAuthenticated ? 'Explore Market Analysis' : 'Sign Up for Market Analysis'}
              <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
            <p className="mt-3 text-xs text-on-primary/70">Paid access. {isAuthenticated ? 'Continue to view your access or pay to unlock.' : 'Create an account, then continue to payment.'}</p>
          </div>
          <div className="space-y-3">
            {[
              ['trending_up', 'Price trends', 'See how listed property prices change over time.'],
              ['map', 'Activity heatmaps', 'Explore where property interest is concentrated.'],
              ['query_stats', 'Market summaries', 'Compare activity across areas and property types.'],
            ].map(([icon, title, description]) => (
              <div key={title} className="flex gap-4 rounded-xl bg-white/10 p-5">
                <span aria-hidden="true" className="material-symbols-outlined text-secondary-container">{icon}</span>
                <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-on-primary/75">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-12 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight">Featured Curations</h2>
            <p className="text-secondary mt-2">Hand-picked architectural marvels available this week.</p>
          </div>
          <Link to="/properties" className="text-primary font-bold flex items-center gap-2">
            View Catalog
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>

        {loading ? <LoadingState label="Loading featured properties..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void refreshProperties()} /> : null}

        {!loading && !error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {homepageProperties.slice(0, 3).map((property) => (
              <PropertyCard key={propertyRouteReference(property)} property={property} />
            ))}
          </div>
        ) : null}
      </section>
    </PublicLayout>
  );
};

export default Home;
