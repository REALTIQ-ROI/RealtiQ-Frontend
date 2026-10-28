import { describe, expect, it, vi } from 'vitest';
import type { Property } from '../types';
import type { PropertiesResponse } from '../services/propertyService';
import { INSTALLMENT_PROPERTY_PAGE_SIZE, loadInstallmentProperties } from './installmentProperties';

const property = (id: string) => ({ _id: id } as Property);
const page = (properties: Property[], total: number, pageNumber: number, limit: number): PropertiesResponse => ({
  properties,
  total,
  page: pageNumber,
  limit,
});

describe('loadInstallmentProperties', () => {
  it('uses valid page sizes and continues through multiple pages', async () => {
    const loadPage = vi.fn(async (pageNumber: number, limit: number) => {
      const start = (pageNumber - 1) * limit;
      const items = Array.from({ length: Math.min(limit, 230 - start) }, (_, index) => property(`property-${start + index + 1}`));
      return page(items, 230, pageNumber, limit);
    });

    const result = await loadInstallmentProperties(loadPage);

    expect(result).toHaveLength(230);
    expect(loadPage).toHaveBeenCalledTimes(3);
    expect(loadPage.mock.calls.map(([pageNumber, limit]) => [pageNumber, limit])).toEqual([
      [1, INSTALLMENT_PROPERTY_PAGE_SIZE],
      [2, INSTALLMENT_PROPERTY_PAGE_SIZE],
      [3, INSTALLMENT_PROPERTY_PAGE_SIZE],
    ]);
    expect(loadPage.mock.calls.every(([, limit]) => limit >= 1 && limit <= 100)).toBe(true);
  });

  it('stops after loading the requested total and deduplicates overlapping page results', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => property(`property-${index + 1}`));
    const secondPage = [property('property-100'), ...Array.from({ length: 100 }, (_, index) => property(`property-${index + 101}`))];
    const loadPage = vi.fn(async (pageNumber: number, limit: number) =>
      page(pageNumber === 1 ? firstPage : secondPage, 500, pageNumber, limit));

    const result = await loadInstallmentProperties(loadPage, { totalLimit: 150 });

    expect(result).toHaveLength(150);
    expect(new Set(result.map((item) => item._id)).size).toBe(150);
    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(loadPage.mock.calls.map(([pageNumber, limit]) => [pageNumber, limit])).toEqual([[1, 100], [2, 100]]);
  });

  it('stops when the backend reports there are no more results', async () => {
    const loadPage = vi.fn(async (_pageNumber: number, limit: number) => page([property('last-property')], 1, 1, limit));

    const result = await loadInstallmentProperties(loadPage);

    expect(result.map((item) => item._id)).toEqual(['last-property']);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it('does not continue or return a stale profile response', async () => {
    let current = true;
    const loadPage = vi.fn(async (_pageNumber: number, limit: number) => {
      current = false;
      return page([property('old-profile-property')], 500, 1, limit);
    });

    const result = await loadInstallmentProperties(loadPage, { isCurrent: () => current });

    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });
});
