import { describe, expect, it } from 'vitest';
import { resolveMapProvider } from './maps';

describe('resolveMapProvider', () => {
  it('uses the existing Leaflet renderer when Mapbox has no configured token', () => {
    expect(resolveMapProvider('mapbox')).toBe('leaflet');
    expect(resolveMapProvider('mapbox', '  ')).toBe('leaflet');
  });

  it('keeps Mapbox selected when the public token is configured', () => {
    expect(resolveMapProvider('mapbox', 'public-token')).toBe('mapbox');
  });

  it('keeps an explicitly selected Leaflet renderer regardless of token state', () => {
    expect(resolveMapProvider('leaflet', 'public-token')).toBe('leaflet');
  });
});
