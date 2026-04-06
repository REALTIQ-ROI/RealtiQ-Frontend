import type { Property } from '../../types';

const PropertyMeta = ({ property }: { property: Property }) => {
  return (
    <div className="flex flex-wrap gap-8 py-6 border-y border-outline-variant/20">
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Bedrooms</p>
        <p className="font-bold">{property.bedrooms}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Bathrooms</p>
        <p className="font-bold">{property.bathrooms}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Total Area</p>
        <p className="font-bold">{property.squareFeet.toLocaleString()} sq ft</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Type</p>
        <p className="font-bold">{property.propertyType}</p>
      </div>
    </div>
  );
};

export default PropertyMeta;