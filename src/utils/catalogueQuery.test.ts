import { describe, expect, it } from 'vitest';
import { readCatalogueQuery, writeCatalogueQuery } from './catalogueQuery';

describe('canonical catalogue URL', () => {
  it('round-trips supported filters and sort', () => {
    const query = writeCatalogueQuery({ queryVersion: 'canonical-v1', search: 'Lekki flats', minPrice: 0, bedrooms: 3, sort: 'highest_rated', status: 'under_offer' });
    expect(readCatalogueQuery(query)).toMatchObject({ queryVersion: 'canonical-v1', search: 'Lekki flats', minPrice: 0, bedrooms: 3, sort: 'highest_rated', status: 'under_offer' });
  });

  it('passes unknown URL criteria through to the API for an explicit rejection', () => {
    const filters = readCatalogueQuery(new URLSearchParams('sort=unsupported&unrecognized=value'));
    expect(filters).toMatchObject({ queryVersion: 'canonical-v1', sort: 'unsupported', unrecognized: 'value' });
  });
});
