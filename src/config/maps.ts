export type MapProvider = 'leaflet' | 'mapbox';

/** Legacy provider helper retained for compatibility. Runtime maps do not use it to switch providers. */
export const resolveMapProvider = (requestedProvider: MapProvider, mapboxToken?: string): MapProvider =>
  requestedProvider === 'mapbox' && !mapboxToken?.trim() ? 'leaflet' : requestedProvider;

// Mapbox is the source-defined maps provider. Missing configuration is shown as
// unavailable by map surfaces; the UI must not substitute an unapproved provider.
export const MAP_PROVIDER: MapProvider = 'mapbox';
