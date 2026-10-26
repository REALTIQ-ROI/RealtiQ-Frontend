import { writeCatalogueQuery } from './catalogueQuery';

export interface CatalogueMapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

export const writeCatalogueMapViewport = (
  base: URLSearchParams,
  viewport: CatalogueMapViewport,
  userInitiated: boolean,
): URLSearchParams => writeCatalogueQuery({
  north: viewport.north,
  south: viewport.south,
  east: viewport.east,
  west: viewport.west,
  mapActive: true,
  mapZoom: viewport.zoom,
}, { base, resetPage: userInitiated });
