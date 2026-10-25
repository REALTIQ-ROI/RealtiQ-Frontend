import { describe, expect, it } from 'vitest';
import { cataloguePageFromQuery, readCatalogueQuery, writeCatalogueQuery } from './catalogueQuery';

describe('canonical catalogue URL', () => {
  it('round-trips supported filters and sort', () => {
    const query = writeCatalogueQuery({ queryVersion: 'canonical-v1', search: 'Lekki flats', minPrice: 0, bedrooms: 3, sort: 'highest_rated', status: 'under_offer' });
    expect(readCatalogueQuery(query)).toMatchObject({ queryVersion: 'canonical-v1', search: 'Lekki flats', minPrice: 0, bedrooms: 3, sort: 'highest_rated', status: 'under_offer' });
  });

  it('passes unknown URL criteria through to the API for an explicit rejection', () => {
    const filters = readCatalogueQuery(new URLSearchParams('sort=unsupported&unrecognized=value'));
    expect(filters).toMatchObject({ queryVersion: 'canonical-v1', sort: 'unsupported', unrecognized: 'value' });
  });

  it('applies one filter without removing unrelated canonical or unknown criteria', () => {
    const base = new URLSearchParams('state=lagos&amenities=pool&amenities=gym&unrecognized=value&sort=newest&page=3');
    const next = writeCatalogueQuery({ minPrice: 0 }, { base, resetPage: true });
    expect(next.getAll('amenities')).toEqual(['pool', 'gym']);
    expect(next.get('state')).toBe('lagos');
    expect(next.get('unrecognized')).toBe('value');
    expect(next.get('sort')).toBe('newest');
    expect(next.get('minPrice')).toBe('0');
    expect(next.has('page')).toBe(false);
  });

  it('changes map viewport without changing filters or leaving a zoom alias conflict', () => {
    const base = new URLSearchParams('state=lagos&paymentOptions=outright&paymentOptions=instalment&zoom=8&page=4');
    const next = writeCatalogueQuery({ north: 6.7, south: 6.2, east: 3.7, west: 3.1, mapActive: true, mapZoom: 11 }, { base, resetPage: true });
    expect(next.getAll('paymentOptions')).toEqual(['outright', 'instalment']);
    expect(next.get('state')).toBe('lagos');
    expect(next.get('mapZoom')).toBe('11');
    expect(next.has('zoom')).toBe(false);
    expect(next.get('mapActive')).toBe('true');
    expect(next.has('page')).toBe(false);
  });

  it('clears only the selected filter and its alias', () => {
    const base = new URLSearchParams('type=house&propertyType=house&state=lagos&minPrice=0');
    const next = writeCatalogueQuery({ propertyType: undefined }, { base, resetPage: true });
    expect(next.has('type')).toBe(false);
    expect(next.has('propertyType')).toBe(false);
    expect(next.get('state')).toBe('lagos');
    expect(next.get('minPrice')).toBe('0');
  });

  it('keeps repeated and empty parameters on an unchanged URL round trip', () => {
    const original = new URLSearchParams('amenities=pool&amenities=gym&custom=&includeUnpriced=false&minPrice=0');
    const next = writeCatalogueQuery(readCatalogueQuery(original));
    expect(next.getAll('amenities')).toEqual(['pool', 'gym']);
    expect(next.get('custom')).toBe('');
    expect(next.get('includeUnpriced')).toBe('false');
    expect(next.get('minPrice')).toBe('0');
  });

  it('preserves repeated values when a different key changes and replaces only a changed repeated key', () => {
    const base = new URLSearchParams('amenities=pool&amenities=gym&state=lagos');
    const kept = writeCatalogueQuery({ sort: 'newest' }, { base });
    expect(kept.getAll('amenities')).toEqual(['pool', 'gym']);
    const replaced = writeCatalogueQuery({ amenities: ['garden', 'parking'] }, { base });
    expect(replaced.getAll('amenities')).toEqual(['garden', 'parking']);
  });

  it('keeps an explicit page until a filter action resets it', () => {
    const base = new URLSearchParams('state=lagos&page=5');
    expect(cataloguePageFromQuery(base)).toBe(5);
    expect(cataloguePageFromQuery(writeCatalogueQuery({ status: 'under_offer' }, { base, resetPage: true }))).toBe(1);
    expect(cataloguePageFromQuery(new URLSearchParams('page=invalid'))).toBe(1);
  });

  it('retains a supported legacy alias until its control is explicitly changed', () => {
    const base = new URLSearchParams('type=house&min_price=0&state=lagos');
    const current = readCatalogueQuery(base);
    expect(current.propertyType).toBe('house');
    expect(current.minPrice).toBe(0);
    expect(writeCatalogueQuery(current).get('type')).toBe('house');
    const changed = writeCatalogueQuery({ propertyType: 'apartment' }, { base, resetPage: true });
    expect(changed.get('propertyType')).toBe('apartment');
    expect(changed.has('type')).toBe(false);
    expect(changed.get('min_price')).toBe('0');
  });

  it('replaces the legacy build stage when canonical multi-stage selection changes', () => {
    const base = new URLSearchParams('completionStage=finished&state=lagos&page=2');
    const next = writeCatalogueQuery({ buildStage: ['Newly built', 'Renovated'] }, { base, resetPage: true });
    expect(next.getAll('buildStage')).toEqual(['Newly built', 'Renovated']);
    expect(next.has('completionStage')).toBe(false);
    expect(next.get('state')).toBe('lagos');
    expect(next.has('page')).toBe(false);
  });
});
