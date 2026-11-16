import { describe, expect, it } from 'vitest';
import { adoptCanonicalQuery, canonicalQueryParams, catalogueFilterFormKey, cataloguePageFromQuery, defaultCatalogueQuery, readCatalogueQuery, sameCanonicalCriteria, writeCatalogueQuery } from './catalogueQuery';

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

  it('serializes canonical numeric zero and explicit false filters without retaining conflicting aliases', () => {
    const base = new URLSearchParams('toilets=2&min_beds=1&state=lagos&page=4');
    const next = writeCatalogueQuery({ powderRooms: 0, minBedrooms: 0, allBedroomsEnSuite: false }, { base, resetPage: true });
    expect(next.get('powderRooms')).toBe('0');
    expect(next.has('toilets')).toBe(false);
    expect(next.get('minBedrooms')).toBe('0');
    expect(next.has('min_beds')).toBe(false);
    expect(next.get('allBedroomsEnSuite')).toBe('false');
    expect(next.get('state')).toBe('lagos');
    expect(next.has('page')).toBe(false);
  });

  it('restores full canonical defaults when Clear All is selected', () => {
    const cleared = writeCatalogueQuery({ sort: 'recommended' }, { base: new URLSearchParams('search=homes&includeSold=true&page=8'), clearAll: true });
    expect(cleared).toEqual(defaultCatalogueQuery());
    expect(cleared.toString()).toBe('queryVersion=canonical-v1&sort=recommended&status=available&includeUnpriced=true&withPhotosOnly=true&includeUnderOffer=false&includeSold=false');
  });

  it('canonicalizes supported URL aliases and preserves repeated values, explicit false and zero', () => {
    const params = canonicalQueryParams({ queryVersion: 'canonical-v1', min_price: 0, amenities: ['pool', 'lift'], verified: false });
    expect(params.get('minPrice')).toBe('0');
    expect(params.has('min_price')).toBe(false);
    expect(params.getAll('amenities')).toEqual(['pool', 'lift']);
    expect(params.get('verified')).toBe('false');
  });

  it('maps documented sort aliases to their canonical key', () => {
    const params = canonicalQueryParams(new URLSearchParams('sort=recent'));
    expect(params.get('sort')).toBe('newest');
    expect(readCatalogueQuery(new URLSearchParams('sort=price_low_to_high')).sort).toBe('price_asc');
  });

  it('restores bathroom aliases as the exact full-bathroom filter and rejects conflicts', () => {
    expect(canonicalQueryParams(new URLSearchParams('bathrooms=2')).get('exactFullBathrooms')).toBe('2');
    expect(canonicalQueryParams(new URLSearchParams('fullBathrooms=2')).get('exactFullBathrooms')).toBe('2');
    expect(() => canonicalQueryParams(new URLSearchParams('bathrooms=2&exactFullBathrooms=3'))).toThrow(/conflicting/i);
  });

  it('rejects conflicting alias and canonical values before sending a request', () => {
    expect(() => canonicalQueryParams(new URLSearchParams('beds=2&bedrooms=3'))).toThrow(/conflicting bedrooms and beds/i);
    expect(canonicalQueryParams(new URLSearchParams('beds=3')).get('bedrooms')).toBe('3');
  });

  it('adopts server normalization, clears dependent criteria, and retains map and page UI state', () => {
    const current = new URLSearchParams('queryVersion=canonical-v1&readyToMoveIn=true&constructionMilestone=roofing&north=7&south=6&east=4&west=3&mapActive=true&mapZoom=9&page=2&limit=10');
    const normalized = adoptCanonicalQuery(current, { queryVersion: 'canonical-v1', readyToMoveIn: true, sort: 'recommended', status: 'available' });
    expect(normalized.has('constructionMilestone')).toBe(false);
    expect(normalized.get('mapActive')).toBe('true');
    expect(normalized.get('north')).toBe('7');
    expect(normalized.get('page')).toBe('2');
    expect(normalized.get('includeUnpriced')).toBe('true');
    expect(normalized.get('includeSold')).toBe('false');
  });

  it('compares criteria without treating pagination as a different search', () => {
    expect(sameCanonicalCriteria(new URLSearchParams('search=homes&page=1'), new URLSearchParams('queryVersion=canonical-v1&search=homes&page=4&limit=20'))).toBe(true);
    expect(sameCanonicalCriteria(new URLSearchParams('search=homes'), new URLSearchParams('search=flats'))).toBe(false);
  });

  it('keeps the filter form mounted while search text, pagination, or map bounds change', () => {
    const first = new URLSearchParams('search=homes&state=state-id&page=1&mapActive=true&north=7&south=6&east=4&west=3&mapZoom=9');
    const next = new URLSearchParams('search=flats&state=state-id&page=4&mapActive=true&north=8&south=7&east=5&west=4&mapZoom=10');
    expect(catalogueFilterFormKey(first)).toBe(catalogueFilterFormKey(next));
    expect(catalogueFilterFormKey(new URLSearchParams('search=homes&state=another-state'))).not.toBe(catalogueFilterFormKey(first));
  });
});
