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
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Category</p>
        <p className="font-bold">{property.category ?? 'Residential'}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Stage</p>
        <p className="font-bold">{property.completionStage ?? 'Finished'}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Currency</p>
        <p className="font-bold">{property.currency ?? 'NGN'}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Views</p>
        <p className="font-bold">{property.views ?? 0}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-secondary">Saves</p>
        <p className="font-bold">{property.saves ?? 0}</p>
      </div>
    </div>
  );
};

export default PropertyMeta;
