import type { PropertiesResponse } from '../services/propertyService';
import type { Property } from '../types';

export const INSTALLMENT_PROPERTY_PAGE_SIZE = 100;
export const INSTALLMENT_PROPERTY_LOAD_LIMIT = 500;
const MAX_PROPERTY_PAGE = 10_000;

type PropertyPageLoader = (page: number, limit: number) => Promise<PropertiesResponse>;

const getPropertyIdentity = (property: Property): string | undefined =>
  property._id || property.id || property.publicReference || undefined;

/** Load the same requested total through valid API pages, ignoring duplicate records. */
export const loadInstallmentProperties = async (
  loadPage: PropertyPageLoader,
  options: { totalLimit?: number; isCurrent?: () => boolean } = {},
): Promise<Property[]> => {
  const requestedTotal = Number.isFinite(options.totalLimit)
    ? Math.max(0, Math.floor(options.totalLimit!))
    : INSTALLMENT_PROPERTY_LOAD_LIMIT;
  if (requestedTotal === 0) return [];

  const pageSize = Math.min(INSTALLMENT_PROPERTY_PAGE_SIZE, requestedTotal);
  const isCurrent = options.isCurrent ?? (() => true);
  const properties: Property[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PROPERTY_PAGE && properties.length < requestedTotal && isCurrent(); page += 1) {
    const response = await loadPage(page, pageSize);
    if (!isCurrent()) break;

    const pageProperties = Array.isArray(response.properties) ? response.properties : [];
    if (pageProperties.length === 0) break;

    for (const property of pageProperties) {
      const identity = getPropertyIdentity(property);
      if (identity && seen.has(identity)) continue;
      if (identity) seen.add(identity);
      properties.push(property);
    }

    if (properties.length >= requestedTotal) break;

    const reachedReportedEnd = Number.isFinite(response.total) &&
      (properties.length >= response.total || page * pageSize >= response.total);
    if (reachedReportedEnd || pageProperties.length < pageSize) break;
  }

  return properties.slice(0, requestedTotal);
};
