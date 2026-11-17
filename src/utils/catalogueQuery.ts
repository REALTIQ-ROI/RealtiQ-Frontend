import type { PropertyFilters } from '../types';

const numericKeys = ['minPrice', 'maxPrice', 'bedrooms', 'bathrooms', 'exactFullBathrooms', 'north', 'south', 'east', 'west', 'mapZoom'] as const;
const originalQuery = Symbol('originalCatalogueQuery');

type QueryValue = string | number | boolean | readonly (string | number | boolean)[] | null | undefined;
export type CatalogueQueryChanges = Record<string, QueryValue>;
type ReadFilters = PropertyFilters & { [originalQuery]?: URLSearchParams };

/** Removes the legacy Featured search parameter without changing any other URL state. */
export const withoutFeaturedSearchFilter = (source: URLSearchParams): URLSearchParams => {
  const params = new URLSearchParams(source);
  params.delete('featured');
  return params;
};

const canonicalDefaults = {
  queryVersion: 'canonical-v1',
  sort: 'recommended',
  status: 'available',
  includeUnpriced: true,
  withPhotosOnly: true,
  includeUnderOffer: false,
  includeSold: false,
} as const;

const queryAliases: Record<string, readonly string[]> = {
  propertyType: ['type'], bedrooms: ['beds'], exactBedrooms: ['exact_beds'], minBedrooms: ['min_beds'], maxBedrooms: ['max_beds'],
  exactFullBathrooms: ['fullBathrooms', 'bathrooms', 'exactBathrooms', 'exact_bathrooms'],
  powderRooms: ['toilets'], reference: ['exactReference', 'title'], paymentOptions: ['payment_type'],
  negotiable: ['price_negotiable'], reducedSinceListing: ['price_reduced'], mapActive: ['search_as_i_move_the_map'], mapZoom: ['zoom'],
  minPrice: ['min_price'], maxPrice: ['max_price'], minInternalFloorArea: ['min_internal_floor_area'],
  maxInternalFloorArea: ['max_internal_floor_area'], minBuiltUpArea: ['min_built_up_area'], maxBuiltUpArea: ['max_built_up_area'],
  minPlotArea: ['min_plot_area'], maxPlotArea: ['max_plot_area'], buildStage: ['completionStage', 'stages'], constructionMilestone: ['milestone'],
};

const sortAliases: Record<string, string> = {
  newest_most_recent: 'newest', recent: 'newest',
  price_low_to_high: 'price_asc', price_high_to_low: 'price_desc',
  handover_date_soonest: 'handover_soonest', price_reduced_largest_drop: 'largest_reduction',
  bedrooms_most: 'bedrooms_desc', bedrooms: 'bedrooms_desc', floor_area_largest: 'floor_area_desc', floor_area: 'floor_area_desc',
};

const canonicalizeQueryAliases = (params: URLSearchParams): URLSearchParams => {
  for (const [canonical, aliases] of Object.entries(queryAliases)) {
    const presentKeys = [canonical, ...aliases].filter((key) => params.has(key));
    if (presentKeys.length > 1) {
      const firstValues = params.getAll(presentKeys[0]);
      const conflicting = presentKeys.find((key) => {
        const values = params.getAll(key);
        return values.length !== firstValues.length || values.some((value, index) => value !== firstValues[index]);
      });
      if (conflicting) throw new Error(`The search URL contains conflicting ${presentKeys[0]} and ${conflicting} values. Review the filter before searching.`);
    }
    if (!params.has(canonical)) {
      const source = aliases.find((key) => params.has(key));
      if (source) params.getAll(source).forEach((value) => params.append(canonical, value));
    }
    aliases.forEach((alias) => params.delete(alias));
  }
  const sorts = params.getAll('sort');
  if (sorts.length === 1 && sortAliases[sorts[0]]) params.set('sort', sortAliases[sorts[0]]);
  return params;
};

export const defaultCatalogueQuery = (): URLSearchParams => new URLSearchParams(
  Object.entries(canonicalDefaults).map(([key, value]) => [key, String(value)]),
);

const appendQueryValue = (params: URLSearchParams, key: string, value: unknown) => {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') params.append(key, String(item));
    });
    return;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') params.append(key, String(value));
};

/** Serializes the plain canonical query object returned by the catalogue API without losing false, zero, or arrays. */
export const canonicalQueryParams = (query: unknown): URLSearchParams => {
  if (query instanceof URLSearchParams) {
    const params = canonicalizeQueryAliases(new URLSearchParams(query));
    if (!params.has('queryVersion')) params.set('queryVersion', 'canonical-v1');
    for (const [key, value] of Object.entries(canonicalDefaults)) if (!params.has(key)) params.set(key, String(value));
    return params;
  }
  if (!query || typeof query !== 'object' || Array.isArray(query)) return defaultCatalogueQuery();
  const params = new URLSearchParams();
  Object.entries(query as Record<string, unknown>).forEach(([key, value]) => appendQueryValue(params, key, value));
  canonicalizeQueryAliases(params);
  if (!params.has('queryVersion')) params.set('queryVersion', 'canonical-v1');
  for (const [key, value] of Object.entries(canonicalDefaults)) {
    if (!params.has(key)) params.set(key, String(value));
  }
  return params;
};

/** Canonicalizes buyer catalogue criteria while excluding Featured, which is display-only. */
export const canonicalCatalogueSearchParams = (query: unknown): URLSearchParams =>
  withoutFeaturedSearchFilter(canonicalQueryParams(query));

export const isFeaturedFilterIgnoredNotice = (notice: unknown): boolean =>
  typeof notice === 'object' && notice !== null && !Array.isArray(notice) &&
  (notice as Record<string, unknown>).code === 'FEATURED_FILTER_IGNORED';

export const hasFeaturedFilterIgnoredNotice = (notices: unknown): boolean =>
  Array.isArray(notices) && notices.some(isFeaturedFilterIgnoredNotice);

export const visibleCatalogueNotices = (notices: unknown): unknown[] =>
  Array.isArray(notices) ? notices.filter((notice) => !isFeaturedFilterIgnoredNotice(notice)) : [];

export const withoutFeaturedSavedSearchFilters = <T extends Record<string, unknown>>(filters: T): T => {
  const cleaned = { ...filters };
  delete cleaned.featured;
  return cleaned;
};

/**
 * Adopts server-normalized filters while retaining pagination and map UI state
 * that the server may omit from its canonical filter projection.
 */
export const adoptCanonicalQuery = (current: URLSearchParams, serverQuery: unknown): URLSearchParams => {
  const params = canonicalCatalogueSearchParams(serverQuery);
  for (const key of ['page', 'limit', 'mapActive', 'north', 'south', 'east', 'west', 'mapZoom'] as const) {
    if (!params.has(key) && current.has(key)) current.getAll(key).forEach((value) => params.append(key, value));
  }
  params.set('queryVersion', 'canonical-v1');
  return params;
};

/** Returns true when two requests represent the same criteria, ignoring result pagination. */
export const sameCanonicalCriteria = (left: URLSearchParams, right: URLSearchParams): boolean => {
  const normalizedEntries = (source: URLSearchParams) => {
    const params = canonicalCatalogueSearchParams(source);
    params.delete('page');
    params.delete('limit');
    return [...params.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  };
  return JSON.stringify(normalizedEntries(left)) === JSON.stringify(normalizedEntries(right));
};

// The canonical service rejects conflicting alias/canonical pairs.
const replacedAliases: Record<string, readonly string[]> = {
  propertyType: ['type'],
  minPrice: ['min_price'],
  maxPrice: ['max_price'],
  bedrooms: ['beds'],
  exactBedrooms: ['exact_beds'],
  minBedrooms: ['min_beds'],
  maxBedrooms: ['max_beds'],
  bathrooms: ['fullBathrooms', 'exactBathrooms', 'exact_bathrooms'],
  exactFullBathrooms: ['bathrooms', 'fullBathrooms', 'exactBathrooms', 'exact_bathrooms'],
  minBathrooms: ['min_bathrooms'],
  maxBathrooms: ['max_bathrooms'],
  powderRooms: ['toilets'],
  minPowderRooms: ['min_powder_rooms'],
  maxPowderRooms: ['max_powder_rooms'],
  minInternalFloorArea: ['min_internal_floor_area'],
  maxInternalFloorArea: ['max_internal_floor_area'],
  minBuiltUpArea: ['min_built_up_area'],
  maxBuiltUpArea: ['max_built_up_area'],
  minPlotArea: ['min_plot_area'],
  maxPlotArea: ['max_plot_area'],
  buildStage: ['completionStage', 'stages'],
  mapZoom: ['zoom'],
  mapActive: ['search_as_i_move_the_map'],
  reference: ['exactReference', 'title'],
  paymentOptions: ['payment_type'],
  negotiable: ['price_negotiable'],
  reducedSinceListing: ['price_reduced'],
  constructionMilestone: ['milestone'],
};

export const catalogueQueryForDisplay = (source: URLSearchParams): URLSearchParams => {
  const params = withoutFeaturedSearchFilter(source);
  for (const [canonical, aliases] of Object.entries(replacedAliases)) {
    if (params.has(canonical)) continue;
    const alias = aliases.find((candidate) => params.has(candidate));
    if (alias) params.getAll(alias).forEach((value) => params.append(canonical, value));
  }
  const sorts = params.getAll('sort');
  if (sorts.length === 1 && sortAliases[sorts[0]]) params.set('sort', sortAliases[sorts[0]]);
  return params;
};

/** A form remount key that ignores search text, pagination and map movement. */
export const catalogueFilterFormKey = (source: URLSearchParams): string => {
  const params = catalogueQueryForDisplay(source);
  ['search', 'page', 'limit', 'mapActive', 'mapZoom', 'zoom', 'north', 'south', 'east', 'west'].forEach((key) => params.delete(key));
  return params.toString();
};

export const readCatalogueQuery = (params: URLSearchParams): PropertyFilters => {
  // The form displays a typed subset; the complete URL remains authoritative.
  const displayParams = catalogueQueryForDisplay(params);
  const filters = { ...Object.fromEntries(displayParams), sort: displayParams.get('sort') ?? 'recommended' } as ReadFilters;
  if (!displayParams.has('queryVersion')) filters.queryVersion = 'canonical-v1';
  if (displayParams.get('mapActive') === 'true') filters.mapActive = true;
  if (displayParams.get('mapActive') === 'false') filters.mapActive = false;
  numericKeys.forEach((key) => {
    const values = displayParams.getAll(key);
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
  const params = options.clearAll ? defaultCatalogueQuery() : withoutFeaturedSearchFilter(source ?? new URLSearchParams());
  if (!params.has('queryVersion')) params.set('queryVersion', 'canonical-v1');

  for (const [key, value] of Object.entries(changes)) {
    if (key === 'featured') continue;
    if (options.clearAll && Object.prototype.hasOwnProperty.call(canonicalDefaults, key) && String(value) === String(canonicalDefaults[key as keyof typeof canonicalDefaults])) continue;
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
