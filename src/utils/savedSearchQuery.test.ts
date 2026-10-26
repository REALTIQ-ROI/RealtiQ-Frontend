import { describe, expect, it } from 'vitest';
import { savedSearchFiltersFromUrl, savedSearchFiltersToUrl } from './savedSearchQuery';

describe('saved search query round trips', () => {
  it('preserves repeated values, zero, false and canonical query version while excluding pagination', () => {
    const filters = savedSearchFiltersFromUrl(new URLSearchParams('bedrooms=0&amenities=pool&amenities=security&verified=false&page=4&limit=10'));
    expect(filters).toEqual({ queryVersion: 'canonical-v1', bedrooms: '0', amenities: ['pool', 'security'], verified: 'false' });
    const serialized = savedSearchFiltersToUrl(filters);
    expect([...serialized.entries()]).toEqual([['bedrooms', '0'], ['amenities', 'pool'], ['amenities', 'security'], ['verified', 'false'], ['queryVersion', 'canonical-v1']]);
    expect(savedSearchFiltersFromUrl(serialized)).toEqual(filters);
  });

  it('does not broaden a search by stripping an unsupported exact-reference criterion', () => {
    expect(() => savedSearchFiltersFromUrl(new URLSearchParams('reference=RTQ-PROP-1'))).toThrow(/Exact-reference searches cannot be saved/);
  });
});
