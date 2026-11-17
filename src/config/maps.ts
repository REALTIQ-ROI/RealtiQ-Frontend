import type { MapProviderId } from '../services/mapsConfigService';

export type MapProvider = MapProviderId;

/** Browser SDK credentials are public deployment settings; never send them to the API. */
export const hasMapProviderCredential = (provider: MapProviderId): boolean => {
  if (provider === 'google_maps') return Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim());
  return Boolean(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim());
};
