import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import { configureMapbox, fitCoordinates, MAPBOX_STYLE, nigeriaCenter } from '../../../lib/mapbox';
import { propertyRouteReference, type Property } from '../../../types';
import PropertyMapPreviewCard from './PropertyMapPreviewCard';
import LeafletPropertyMap from './LeafletPropertyMap';
import { MAP_PROVIDER } from '../../../config/maps';

interface Props {
  properties: Property[];
  detailsPath: (property: Property) => string;
  actions?: (property: Property) => ReactNode;
  className?: string;
  onVisiblePropertiesChange?: (properties: Property[]) => void;
  onViewportChange?: (bounds: { north: number; south: number; east: number; west: number; zoom: number }) => void;
  onSelectProperty?: (property: Property) => void;
  resolveProperty?: (property: Property) => Promise<Property>;
  onDetailsNavigate?: () => void;
}

const isMappable = (property: Property) => {
  const lat = property.coordinates?.lat;
  const lng = property.coordinates?.lng;
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
};

const priceLabel = (price: number) => {
  if (!Number.isFinite(price) || price <= 0) return 'View';
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `₦${Math.round(price / 1_000)}K`;
  return `₦${price}`;
};

const MapboxPropertyMap = ({ properties, detailsPath, actions, className = '', onVisiblePropertiesChange, onViewportChange, onSelectProperty, resolveProperty, onDetailsNavigate }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const propertyLookupRef = useRef(new Map<string, Property>());
  const selectPropertyRef = useRef<(property: Property) => void>(() => undefined);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<Property | null>(null);
  const [mapError, setMapError] = useState(!configureMapbox());
  const mappable = useMemo(() => properties.filter(isMappable), [properties]);
  // The preview is intentionally map-owned: selecting or hovering a card may
  // synchronize the highlighted property, but must not open this map preview.
  const initialFit = useRef(false);
  const missingCount = properties.length - mappable.length;
  useEffect(() => {
    selectPropertyRef.current = (property) => {
      const reference = propertyRouteReference(property);
      setSelectedPreview(property); onSelectProperty?.(property);
      if (resolveProperty) void resolveProperty(property).then((resolved) => {
        if (resolved && propertyRouteReference(resolved) === reference) setSelectedPreview(resolved);
      }).catch(() => undefined);
    };
  }, [onSelectProperty, resolveProperty]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !configureMapbox()) return;
    const map = new mapboxgl.Map({ container: containerRef.current, style: MAPBOX_STYLE, center: nigeriaCenter, zoom: 5.2 });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('error', () => setMapError(true));
    map.on('load', () => {
      map.addSource('properties', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
      map.addLayer({ id: 'property-clusters', type: 'circle', source: 'properties', filter: ['has', 'point_count'], paint: { 'circle-color': '#173d32', 'circle-radius': ['step', ['get', 'point_count'], 20, 25, 25, 100, 32], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'property-cluster-count', type: 'symbol', source: 'properties', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
      map.addLayer({ id: 'property-points', type: 'circle', source: 'properties', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#173d32', 'circle-radius': 20, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'property-price-labels', type: 'symbol', source: 'properties', filter: ['!', ['has', 'point_count']], layout: { 'text-field': ['get', 'label'], 'text-size': 11 }, paint: { 'text-color': '#ffffff' } });
      map.on('click', 'property-clusters', (event) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: ['property-clusters'] })[0];
        const clusterId = Number(feature?.properties?.cluster_id); const coordinates = (feature?.geometry as GeoJSON.Point)?.coordinates;
        const source = map.getSource('properties') as mapboxgl.GeoJSONSource;
        if (!coordinates || !Number.isFinite(clusterId)) return;
        source.getClusterExpansionZoom(clusterId, (error, zoom) => {
          if (!error && zoom !== null && zoom !== undefined) map.easeTo({ center: coordinates as [number, number], zoom });
        });
      });
      map.on('click', 'property-points', (event) => {
        const key = String(event.features?.[0]?.properties?.key ?? ''); const property = propertyLookupRef.current.get(key);
        if (property) selectPropertyRef.current(property);
      });
      for (const layer of ['property-clusters', 'property-points']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
      setMapLoaded(true);
    });
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const lookup = new Map<string, Property>();
    const features = mappable.map((property, index) => {
      const key = `${propertyRouteReference(property)}-${index}`; lookup.set(key, property);
      return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [property.coordinates!.lng, property.coordinates!.lat] }, properties: { key, label: priceLabel(property.price), title: property.title } };
    });
    propertyLookupRef.current = lookup;
    (map.getSource('properties') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
    if (mappable.length && !initialFit.current) { initialFit.current = true; fitCoordinates(map, mappable.map((property) => [property.coordinates!.lng, property.coordinates!.lat])); }
  }, [mapLoaded, mappable]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || (!onVisiblePropertiesChange && !onViewportChange)) return;
    const updateVisible = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      onVisiblePropertiesChange?.(mappable.filter((property) => bounds.contains([property.coordinates!.lng, property.coordinates!.lat])));
      onViewportChange?.({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest(), zoom: map.getZoom() });
    };
    let timer = 0;
    const settled = () => { window.clearTimeout(timer); timer = window.setTimeout(updateVisible, 300); };
    const first = window.setTimeout(updateVisible, 0);
    map.on('moveend', settled);
    return () => {
      window.clearTimeout(first); window.clearTimeout(timer);
      map.off('moveend', settled);
    };
  }, [mappable, onVisiblePropertiesChange, onViewportChange]);

  return (
    <section className={`relative min-h-[55vh] overflow-hidden rounded-xl bg-surface-container-low sm:min-h-[420px] ${className}`} aria-label="Property map">
      <div ref={containerRef} className="absolute inset-0" />
      {mappable.length === 0 && !mapError ? (
        <div className="absolute left-3 top-3 z-[900] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-secondary shadow">
          No property markers in this area
        </div>
      ) : null}
      {mapError ? <div className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-error-container p-3 text-sm text-on-error-container">The map tiles could not be loaded. List results are still available.</div> : null}
      {missingCount > 0 ? <div className="absolute left-3 top-3 z-[900] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-secondary shadow">{missingCount} {missingCount === 1 ? 'property is' : 'properties are'} list-only (no coordinates).</div> : null}
      {selectedPreview ? <PropertyMapPreviewCard property={selectedPreview} detailsPath={detailsPath} actions={actions} onClose={() => setSelectedPreview(null)} onDetailsNavigate={onDetailsNavigate} /> : null}
    </section>
  );
};

const PropertyMap = (props: Props) => MAP_PROVIDER === 'leaflet' ? <LeafletPropertyMap {...props} /> : <MapboxPropertyMap {...props} />;

export default PropertyMap;
