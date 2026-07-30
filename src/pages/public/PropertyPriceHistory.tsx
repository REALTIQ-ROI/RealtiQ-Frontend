import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PriceHistorySection from '../../components/property/PriceHistorySection';

const PropertyPriceHistory = () => {
  const { id = '' } = useParams();

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-8 py-8">
        <Link to={id ? `/properties/${id}` : '/properties'} className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to property
        </Link>
        {id ? (
          <PriceHistorySection propertyId={id} />
        ) : (
          <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-8 text-center text-sm text-secondary">
            No property reference was provided.
          </div>
        )}
      </section>
    </PublicLayout>
  );
};

export default PropertyPriceHistory;
