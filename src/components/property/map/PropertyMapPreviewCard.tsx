import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Property } from '../../../types';
import MediaPreview from '../MediaPreview';
import PaymentTypeBadges from '../PaymentTypeBadges';
import { normalizePropertyPaymentTypes } from '../../../utils/propertyPaymentTypes';
import { useCanonicalFieldDictionary } from '../../../hooks/useCanonicalFieldDictionary';
import { effectiveCanonicalValue, fieldVocabularyLabel, vocabularyLabel } from '../../../utils/propertyVocabulary';

interface Props {
  property: Property;
  detailsPath: (property: Property) => string;
  actions?: (property: Property) => ReactNode;
  onClose: () => void;
  onDetailsNavigate?: () => void;
}

const formatPrice = (property: Property) => typeof property.price === 'number' && Number.isFinite(property.price) && typeof property.currency === 'string'
  ? (() => {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: property.currency,
        maximumFractionDigits: 0,
      }).format(property.price);
    } catch {
      return 'Price unavailable';
    }
  })()
  : 'Price unavailable';

const PropertyMapPreviewCard = ({ property, detailsPath, actions, onClose, onDetailsNavigate }: Props) => {
  const location = useLocation();
  const { dictionary } = useCanonicalFieldDictionary();
  const typeLabel = fieldVocabularyLabel(dictionary, 'propertyType', property.propertyType)
    ?? vocabularyLabel(dictionary, 'propertyTypes', property.propertyType)
    ?? 'Property type unavailable';
  const priceLabel = effectiveCanonicalValue(property, 'priceOnApplication') === true
    ? 'Price on application'
    : formatPrice(property);
  return <article className="absolute bottom-4 left-4 right-4 z-[1000] overflow-hidden rounded-xl bg-white shadow-2xl sm:left-auto sm:w-80">
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
        <p className="truncate text-xs text-secondary">{property.location || 'Location unavailable'}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <strong className="text-primary">{priceLabel}</strong>
        <span className="rounded-full bg-surface-container-low px-2 py-1 text-[10px] font-bold uppercase text-secondary">
          {typeLabel}
        </span>
      </div>
      {(typeof property.bedrooms === 'number' && Number.isFinite(property.bedrooms) || typeof property.bathrooms === 'number' && Number.isFinite(property.bathrooms)) && (
        <p className="text-xs font-medium text-secondary">
          {typeof property.bedrooms === 'number' && Number.isFinite(property.bedrooms) ? `${property.bedrooms} beds` : ''}
          {typeof property.bedrooms === 'number' && Number.isFinite(property.bedrooms) && typeof property.bathrooms === 'number' && Number.isFinite(property.bathrooms) ? ' · ' : ''}
          {typeof property.bathrooms === 'number' && Number.isFinite(property.bathrooms) ? `${property.bathrooms} baths` : ''}
        </p>
      )}
      {Array.isArray(property.paymentTypes) && property.paymentTypes.length ? <PaymentTypeBadges paymentTypes={normalizePropertyPaymentTypes(property.paymentTypes, property.price)} /> : null}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary" to={detailsPath(property)} state={{ from: `${location.pathname}${location.search}` }} onClick={onDetailsNavigate}>
          View Details
        </Link>
        {actions?.(property)}
      </div>
    </div>
  </article>
};

export default PropertyMapPreviewCard;
