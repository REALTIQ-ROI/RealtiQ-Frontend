import { Link } from 'react-router-dom';
import { propertyPublicReference, type Property } from '../../types';
import TitleVerificationBadge from '../title/TitleVerificationBadge';
import PaymentTypeBadges from './PaymentTypeBadges';
import { normalizePropertyPaymentTypes } from '../../utils/propertyPaymentTypes';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

const PropertyCard = ({
  property,
  showSaveAction = false,
  onSave,
}: {
  property: Property;
  showSaveAction?: boolean;
  onSave?: (property: Property) => void;
}) => {
  const cover = property.media?.[0];
  const coverUrl = cover?.url;
  const isVideo = cover?.type === 'video';
  const routeReference = propertyPublicReference(property);
  const paymentTypes = normalizePropertyPaymentTypes(property.paymentTypes, property.price);

  return (
    <article className="group bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10 hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-surface-container-low relative">
        {coverUrl ? (
          isVideo ? (
            <video
              src={coverUrl}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={coverUrl}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">
              apartment
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {property.featured && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-wide shadow">
              <span className="material-symbols-outlined text-xs">star</span>
              Featured
            </span>
          )}
          <span
            className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide shadow ${
              property.status === 'available'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {property.status}
          </span>
          {property.currency ? (
            <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide shadow bg-surface-container-lowest text-on-surface">
              {property.currency}
            </span>
          ) : null}
        </div>
        {showSaveAction && onSave ? (
          <button
            type="button"
            onClick={() => onSave(property)}
            className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 text-white text-[10px] font-black uppercase tracking-wide backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">bookmark_add</span>
            Save
          </button>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3
              className="font-bold text-base leading-tight text-on-surface truncate"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {property.title}
            </h3>
            <p className="text-secondary text-xs mt-1 flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-xs shrink-0">location_on</span>
              {property.location}
            </p>
          </div>
          <span
            className="font-black text-base text-on-surface shrink-0"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {formatCurrency(property.price)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <TitleVerificationBadge summary={property.titleVerification} context="public" />
          {property.featured ? (
            <span className="px-2 py-1 rounded-full bg-amber-400/15 text-amber-700 text-[10px] font-black uppercase tracking-wide">
              Featured
            </span>
          ) : null}
          {property.category ? (
            <span className="px-2 py-1 rounded-full bg-surface-container-low text-on-surface text-[10px] font-black uppercase tracking-wide">
              {property.category}
            </span>
          ) : null}
          {property.completionStage ? (
            <span className="px-2 py-1 rounded-full bg-surface-container-low text-on-surface text-[10px] font-black uppercase tracking-wide">
              {property.completionStage}
            </span>
          ) : null}
        </div>
        <PaymentTypeBadges paymentTypes={paymentTypes} />

        <div className="flex items-center gap-3 text-xs text-on-surface-variant pt-3 border-t border-outline-variant/20">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">bed</span>
            {property.bedrooms} Beds
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">bathtub</span>
            {property.bathrooms} Baths
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">square_foot</span>
            {property.squareFeet.toLocaleString()} sqft
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">visibility</span>
            {property.views ?? 0}
          </span>
        </div>

        {routeReference ? (
          <Link to={`/properties/${routeReference}`} className="inline-flex items-center gap-1 text-primary font-bold text-sm hover:underline underline-offset-4">
            View details
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-secondary">Reference pending</span>
        )}
      </div>
    </article>
  );
};

export default PropertyCard;
