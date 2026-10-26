import { describe, expect, it } from 'vitest';
import { summarizeCatalogueFacets } from './catalogueFacets';

describe('summarizeCatalogueFacets', () => {
  it('summarizes only finite server facet counts', () => {
    expect(summarizeCatalogueFacets({ property_types: { apartment: 4, house: 2, villa: Number.NaN }, status: { available: 6 } }))
      .toBe('property types: apartment 4, house 2 · status: available 6');
  });

  it('ignores absent or unsupported facet projections', () => {
    expect(summarizeCatalogueFacets(null)).toBe('');
    expect(summarizeCatalogueFacets({ private: ['not', 'counts'], unsupported: 1 })).toBe('');
  });
});
