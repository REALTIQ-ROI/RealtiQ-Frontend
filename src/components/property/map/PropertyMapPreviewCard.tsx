import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Property } from '../../../types';
import MediaPreview from '../MediaPreview';
import PaymentTypeBadges from '../PaymentTypeBadges';
import { normalizePropertyPaymentTypes } from '../../../utils/propertyPaymentTypes';

interface Props {
  property: Property;
  detailsPath: (property: Property) => string;
  actions?: (property: Property) => ReactNode;
  onClose: () => void;
}

const formatPrice = (property: Property) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: property.currency || 'NGN',
    maximumFractionDigits: 0,
  }).format(property.price);

const PropertyMapPreviewCard = ({ property, detailsPath, actions, onClose }: Props) => (
  <article className="absolute bottom-4 left-4 right-4 z-[1000] overflow-hidden rounded-xl bg-white shadow-2xl sm:left-auto sm:w-80">
    <button
      type="button"
      aria-label="Close property preview"
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-on-surface shadow"
      onClick={onClose}
    >
      <span className="material-symbols-outlined text-lg">close</span>
    </button>
    <div className="h-32 bg-surface-container-low">
      <MediaPreview media={property.media?.[0]} alt={property.title} className="h-full w-full object-cover" />
    </div>
    <div className="space-y-2 p-4">
      <div>
        <h3 className="truncate font-bold text-on-surface">{property.title}</h3>
        <p className="truncate text-xs text-secondary">{property.location}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <strong className="text-primary">{formatPrice(property)}</strong>
        <span className="rounded-full bg-surface-container-low px-2 py-1 text-[10px] font-bold uppercase text-secondary">
          {property.propertyType}
        </span>
      </div>
      {(property.bedrooms > 0 || property.bathrooms > 0) && (
        <p className="text-xs font-medium text-secondary">
          {property.bedrooms > 0 ? `${property.bedrooms} beds` : ''}
          {property.bedrooms > 0 && property.bathrooms > 0 ? ' · ' : ''}
          {property.bathrooms > 0 ? `${property.bathrooms} baths` : ''}
        </p>
      )}
      <PaymentTypeBadges paymentTypes={normalizePropertyPaymentTypes(property.paymentTypes, property.price)} />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary" to={detailsPath(property)}>
          View Details
        </Link>
        {actions?.(property)}
      </div>
    </div>
  </article>
);

export default PropertyMapPreviewCard;
