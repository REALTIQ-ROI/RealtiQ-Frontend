import { describe, expect, it } from 'vitest';
import { hasMapProviderCredential } from './maps';

describe('map browser SDK configuration', () => {
  it('checks credentials for only the server-supported renderers', () => {
    expect(typeof hasMapProviderCredential('google_maps')).toBe('boolean');
    expect(typeof hasMapProviderCredential('mapbox')).toBe('boolean');
  });
});
