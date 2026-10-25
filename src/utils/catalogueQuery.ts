import type { PropertyFilters } from '../types';

const numericKeys = ['minPrice', 'maxPrice', 'bedrooms', 'bathrooms', 'north', 'south', 'east', 'west', 'mapZoom'] as const;
const originalQuery = Symbol('originalCatalogueQuery');

type QueryValue = string | number | boolean | readonly (string | number | boolean)[] | null | undefined;
export type CatalogueQueryChanges = Record<string, QueryValue>;
type ReadFilters = PropertyFilters & { [originalQuery]?: URLSearchParams };

// The canonical service rejects conflicting alias/canonical pairs.
const replacedAliases: Record<string, readonly string[]> = {
  propertyType: ['type'],
  minPrice: ['min_price'],
  maxPrice: ['max_price'],
  bedrooms: ['beds', 'exact_beds', 'min_beds', 'max_beds', 'minBedrooms', 'maxBedrooms'],
  bathrooms: ['fullBathrooms', 'minBathrooms', 'maxBathrooms', 'exactBathrooms'],
  completionStage: ['buildStage'],
  mapZoom: ['zoom'],
  mapActive: ['search_as_i_move_the_map'],
};

export const readCatalogueQuery = (params: URLSearchParams): PropertyFilters => {
  // The form displays a typed subset; the complete URL remains authoritative.
  const filters = { ...Object.fromEntries(params), sort: params.get('sort') ?? 'recommended' } as ReadFilters;
  for (const [key, alias] of [['propertyType', 'type'], ['minPrice', 'min_price'], ['maxPrice', 'max_price'], ['completionStage', 'buildStage']] as const) {
    if (!params.has(key) && params.has(alias)) Object.assign(filters, { [key]: params.get(alias) });
  }
  if (!params.has('queryVersion')) filters.queryVersion = 'canonical-v1';
  if (params.get('mapActive') === 'true') filters.mapActive = true;
  if (params.get('mapActive') === 'false') filters.mapActive = false;
  numericKeys.forEach((key) => {
    const alias = key === 'minPrice' ? 'min_price' : key === 'maxPrice' ? 'max_price' : null;
    const values = params.has(key) ? params.getAll(key) : alias ? params.getAll(alias) : [];
    const raw = values[0];
    if (values.length === 1 && raw !== '' && Number.isFinite(Number(raw))) filters[key] = Number(raw);
  });
  Object.defineProperty(filters, originalQuery, { value: new URLSearchParams(params) });
  return filters;
};

export const writeCatalogueQuery = (
  changes: CatalogueQueryChanges | PropertyFilters,
  options: { base?: URLSearchParams; resetPage?: boolean; clearAll?: boolean } = {},
): URLSearchParams => {
  const source = options.base ?? (changes as ReadFilters)[originalQuery];
  const params = options.clearAll ? new URLSearchParams() : new URLSearchParams(source);
  if (!params.has('queryVersion')) params.set('queryVersion', 'canonical-v1');

  for (const [key, value] of Object.entries(changes)) {
    // Keep repeated values intact on an unchanged read/write round trip.
    if (!options.base && source && !options.clearAll && source.has(key)) {
      const previous = source.getAll(key);
      if (String(value) === previous.at(-1)) continue;
    }
    if (!options.base && source && !options.clearAll && !source.has(key) &&
      (replacedAliases[key] ?? []).some((alias) => source.get(alias) === String(value))) continue;
    params.delete(key);
    for (const alias of replacedAliases[key] ?? []) params.delete(alias);
    if (value === null || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }

  if (options.resetPage) params.delete('page');
  if (!params.has('queryVersion')) params.set('queryVersion', 'canonical-v1');
  return params;
};

export const cataloguePageFromQuery = (params: URLSearchParams): number => {
  const raw = params.get('page');
  const page = raw === null ? 1 : Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
};
