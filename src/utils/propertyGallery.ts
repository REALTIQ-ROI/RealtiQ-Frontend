import type { Property } from '../types';

export const hasPropertyMap = (property: Pick<Property, 'coordinates'> | null | undefined): boolean => {
  const coordinates = property?.coordinates;
  return Boolean(coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)
    && Math.abs(coordinates.lat) <= 90 && Math.abs(coordinates.lng) <= 180);
};

export const propertyGallerySlideCount = (property: Pick<Property, 'media' | 'coordinates'> | null | undefined) =>
  (property?.media?.length ?? 0) + (hasPropertyMap(property) ? 1 : 0);
