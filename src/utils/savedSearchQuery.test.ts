import { describe, expect, it } from 'vitest';
import { savedSearchFiltersFromUrl, savedSearchFiltersToUrl } from './savedSearchQuery';

describe('saved search query round trips', () => {
  it('preserves repeated values, zero, false and canonical query version while excluding pagination', () => {
    const filters = savedSearchFiltersFromUrl(new URLSearchParams('bedrooms=0&amenities=pool&amenities=security&verified=false&page=4&limit=10'));
    expect(filters).toMatchObject({ queryVersion: 'canonical-v1', bedrooms: '0', amenities: ['pool', 'security'], verified: 'false', sort: 'recommended', status: 'available', includeUnpriced: 'true', withPhotosOnly: 'true', includeUnderOffer: 'false', includeSold: 'false' });
    expect(filters).not.toHaveProperty('page');
    expect(filters).not.toHaveProperty('limit');
    const serialized = savedSearchFiltersToUrl(filters);
    expect(serialized.get('bedrooms')).toBe('0');
    expect(serialized.getAll('amenities')).toEqual(['pool', 'security']);
    expect(serialized.get('verified')).toBe('false');
    expect(savedSearchFiltersFromUrl(serialized)).toEqual(filters);
  });

  it('does not broaden a search by stripping an unsupported exact-reference criterion', () => {
    expect(() => savedSearchFiltersFromUrl(new URLSearchParams('reference=RTQ-PROP-1'))).toThrow(/Exact-reference searches cannot be saved/);
  });

  it('rejects the exact-reference legacy title alias too', () => {
    expect(() => savedSearchFiltersFromUrl(new URLSearchParams('title=RTQ-PROP-1'))).toThrow(/Exact-reference searches cannot be saved/);
  });
});
