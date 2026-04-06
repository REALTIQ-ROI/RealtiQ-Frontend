import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyCard from '../../components/property/PropertyCard';
import Button from '../../components/ui/Button';
import { useProperties } from '../../contexts/PropertiesContext';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';

const Home = () => {
  const { properties, loading, error, refreshProperties } = useProperties();

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
              <img
                className="w-full h-full object-cover"
                src={properties[0]?.media[0]?.url}
                alt={properties[0]?.title ?? 'featured property'}
              />
            </div>
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
            {properties.slice(0, 3).map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        ) : null}
      </section>
    </PublicLayout>
  );
};

export default Home;