import { useState } from 'react';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyCard from '../../components/property/PropertyCard';
import PropertyFiltersPanel from '../../components/property/PropertyFiltersPanel';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useProperties } from '../../contexts/PropertiesContext';
import type { PropertyFilters } from '../../types';

const Listings = () => {
  const { properties, loading, error, refreshProperties } = useProperties();
  const [filters, setFilters] = useState<PropertyFilters>({});

  const filteredProperties = properties.filter((property) => {
    if (!filters.search) {
      return true;
    }

    const text = `${property.title} ${property.location} ${property.propertyType}`.toLowerCase();
    return text.includes(filters.search.toLowerCase());
  });

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-8">
        <header className="mb-10">
          <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface">Exceptional Residences</h1>
          <p className="text-secondary mt-3">Curated listings ready for your next move.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-10">
          <PropertyFiltersPanel onApply={setFilters} />

          <section className="flex-grow">
            {loading ? <LoadingState label="Loading properties..." /> : null}
            {error ? <ErrorState message={error} onRetry={() => void refreshProperties()} /> : null}

            {!loading && !error ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredProperties.map((property) => (
                  <PropertyCard key={property._id} property={property} />
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Listings;