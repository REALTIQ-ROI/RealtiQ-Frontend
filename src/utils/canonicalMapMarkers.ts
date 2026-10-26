import type { CanonicalPropertyMapResponse } from '../services/propertyService';
import type { CanonicalMapMarker } from '../types/canonicalMap';

const validPoint = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
  typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;

const priceLabel = (price: number | null | undefined, currency: string | undefined): string => {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return 'View';
  if (!currency) return 'View';
  try {
    const symbol = new Intl.NumberFormat('en-NG', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 })
      .formatToParts(0).find((part) => part.type === 'currency')?.value;
    if (!symbol) return 'View';
    if (price >= 1_000_000_000) return `${symbol}${(price / 1_000_000_000).toFixed(1)}B`;
    if (price >= 1_000_000) return `${symbol}${(price / 1_000_000).toFixed(1)}M`;
    if (price >= 1_000) return `${symbol}${Math.round(price / 1_000)}K`;
    return `${symbol}${price}`;
  } catch { return 'View'; }
};

export const canonicalMapMarkers = (response: CanonicalPropertyMapResponse): { markers: CanonicalMapMarker[]; skipped: number } => {
  const markers: CanonicalMapMarker[] = [];
  let skipped = 0;
  if (response.mode === 'clusters') {
    for (const cluster of response.clusters) {
      if (!validPoint(cluster.lat, cluster.lng) || !Number.isFinite(cluster.propertyCount) || cluster.propertyCount < 0) {
        skipped += 1;
        continue;
      }
      markers.push({ kind: 'cluster', id: cluster.clusterId, lat: cluster.lat, lng: cluster.lng, count: cluster.propertyCount,
        sponsoredCount: typeof cluster.sponsoredCount === 'number' && Number.isFinite(cluster.sponsoredCount) && cluster.sponsoredCount >= 0 ? cluster.sponsoredCount : undefined });
    }
  } else {
    for (const property of response.properties) {
      const coordinates = property.locationPoint?.coordinates;
      const lng = coordinates?.[0];
      const lat = coordinates?.[1];
      if (!validPoint(lat, lng) || typeof property.publicReference !== 'string' || !property.publicReference) {
        skipped += 1;
        continue;
      }
      markers.push({ kind: 'property', id: property._id, reference: property.publicReference, title: property.title ?? 'Property', lat, lng: lng as number,
        label: priceLabel(property.canonicalEffectiveFields?.askingPrice, property.canonicalEffectiveFields?.currency) });
    }
  }
  return { markers, skipped };
};
