export type MapProvider = 'leaflet' | 'mapbox';

/**
 * Keep public maps usable when the optional Mapbox build setting is absent.
 * Deployments should provide a Mapbox token only after the provider's licensing
 * and data-handling approvals are complete. Leaflet is the existing fallback.
 */
export const resolveMapProvider = (requestedProvider: MapProvider, mapboxToken?: string): MapProvider =>
  requestedProvider === 'mapbox' && !mapboxToken?.trim() ? 'leaflet' : requestedProvider;

export const MAP_PROVIDER: MapProvider = resolveMapProvider('mapbox', import.meta.env.VITE_MAPBOX_ACCESS_TOKEN);
