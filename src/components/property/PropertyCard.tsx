import { Link } from 'react-router-dom';
import type { Property } from '../../types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);

const PropertyCard = ({ property }: { property: Property }) => {
  return (
    <article className="group bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10">
      <div className="aspect-[4/3] overflow-hidden bg-surface-container-low">
        <img
          src={property.media[0]?.url}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 className="font-headline font-bold text-xl leading-tight">{property.title}</h3>
            <p className="text-secondary text-sm mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {property.location}
            </p>
          </div>
          <span className="font-headline font-black text-xl">{formatCurrency(property.price)}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-on-surface-variant pt-4 border-t border-outline-variant/20">
          <span>{property.bedrooms} Beds</span>
          <span>{property.bathrooms} Baths</span>
          <span>{property.squareFeet.toLocaleString()} sqft</span>
        </div>

        <Link to={`/properties/${property._id}`} className="inline-flex items-center gap-2 text-primary font-bold text-sm">
          View details
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </div>
    </article>
  );
};

export default PropertyCard;