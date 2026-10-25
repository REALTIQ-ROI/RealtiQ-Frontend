import type { PropertyFilters } from '../types';

const numericKeys = ['minPrice', 'maxPrice', 'bedrooms', 'bathrooms', 'north', 'south', 'east', 'west', 'mapZoom'] as const;

export const readCatalogueQuery = (params: URLSearchParams): PropertyFilters => {
  // Forward unknown/invalid criteria so the server can reject them. Silently dropping
  // a URL atom would broaden the search without telling the user.
  const filters = { ...Object.fromEntries(params), queryVersion: 'canonical-v1', sort: params.get('sort') ?? 'recommended' } as PropertyFilters;
  if (params.get('mapActive') === 'true') filters.mapActive = true;
  numericKeys.forEach((key) => {
    const raw = params.get(key);
    if (raw !== null && raw !== '' && Number.isFinite(Number(raw))) filters[key] = Number(raw);
  });
  return filters;
};

export const writeCatalogueQuery = (filters: PropertyFilters): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('queryVersion', 'canonical-v1');
  for (const key of ['search', 'propertyType', 'minPrice', 'maxPrice', 'bedrooms', 'bathrooms', 'completionStage', 'status', 'sort', 'north', 'south', 'east', 'west', 'mapActive', 'mapZoom'] as const) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params;
};
