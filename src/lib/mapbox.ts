import mapboxgl from 'mapbox-gl';

export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? '';
export const MAPBOX_STYLE = import.meta.env.VITE_MAPBOX_STYLE?.trim() || 'mapbox://styles/mapbox/streets-v12';

export const configureMapbox = () => {
  if (!MAPBOX_ACCESS_TOKEN) return false;
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  return true;
};

export const nigeriaCenter: [number, number] = [8.6753, 9.082];

export const fitCoordinates = (map: mapboxgl.Map, coordinates: Array<[number, number]>, options: mapboxgl.FitBoundsOptions = {}) => {
  if (!coordinates.length) return;
  const bounds = coordinates.reduce((next, coordinate) => next.extend(coordinate), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
  map.fitBounds(bounds, { padding: 40, maxZoom: 14, ...options });
};
