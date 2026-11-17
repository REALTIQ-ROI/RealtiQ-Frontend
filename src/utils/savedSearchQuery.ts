import type { SavedSearchFilters } from '../types';
import { canonicalCatalogueSearchParams } from './catalogueQuery';

const exactReferenceKeys = ['reference', 'exactReference'];

export const savedSearchFiltersFromUrl = (params: URLSearchParams): SavedSearchFilters => {
  const canonical = canonicalCatalogueSearchParams(params);
  if (exactReferenceKeys.some((key) => canonical.has(key))) {
    throw new Error('Exact-reference searches cannot be saved. Remove the reference criterion before saving this search.');
  }
  const filters: Record<string, string | readonly string[]> = {};
  for (const key of new Set(canonical.keys())) {
    if (key === 'page' || key === 'limit') continue;
    const values = canonical.getAll(key);
    filters[key] = values.length > 1 ? values : values[0] ?? '';
  }
  if (!Object.prototype.hasOwnProperty.call(filters, 'queryVersion')) filters.queryVersion = 'canonical-v1';
  return filters as SavedSearchFilters;
};

export const savedSearchFiltersToUrl = (filters: SavedSearchFilters): URLSearchParams => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  params.delete('featured');
  if (!params.has('queryVersion')) params.set('queryVersion', 'canonical-v1');
  return params;
};
