import { describe, expect, it } from 'vitest';
import { writeCatalogueMapViewport } from './catalogueMapViewport';

const viewport = { north: 7.2, south: 6.1, east: 4.1, west: 2.8, zoom: 9 };

describe('writeCatalogueMapViewport', () => {
  it('preserves active criteria and the list page when restoring programmatic bounds', () => {
    const next = writeCatalogueMapViewport(new URLSearchParams('amenities=pool&amenities=lift&minPrice=0&page=3&custom=kept'), viewport, false);
    expect(next.getAll('amenities')).toEqual(['pool', 'lift']);
    expect(next.get('minPrice')).toBe('0');
    expect(next.get('page')).toBe('3');
    expect(next.get('custom')).toBe('kept');
    expect(next.get('mapActive')).toBe('true');
    expect(next.get('mapZoom')).toBe('9');
  });

  it('resets pagination after an explicit user viewport change', () => {
    const next = writeCatalogueMapViewport(new URLSearchParams('status=available&page=4'), viewport, true);
    expect(next.get('status')).toBe('available');
    expect(next.has('page')).toBe(false);
    expect(next.get('north')).toBe('7.2');
  });
});
