import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import { configureMapbox, fitCoordinates, MAPBOX_STYLE, nigeriaCenter } from '../../../lib/mapbox';
import { propertyPublicReference, propertyRouteReference, type Property } from '../../../types';
import PropertyMapPreviewCard from './PropertyMapPreviewCard';
import LeafletPropertyMap from './LeafletPropertyMap';
import { MAP_PROVIDER } from '../../../config/maps';
import type { CanonicalMapMarker } from '../../../types/canonicalMap';

interface Props {
  properties: Property[];
  detailsPath: (property: Property) => string;
  actions?: (property: Property) => ReactNode;
  className?: string;
  onVisiblePropertiesChange?: (properties: Property[]) => void;
  onViewportChange?: (bounds: { north: number; south: number; east: number; west: number; zoom: number }, userInitiated?: boolean) => void;
  requestedViewport?: { north: number; south: number; east: number; west: number; zoom: number } | null;
  onSelectProperty?: (property: Property) => void;
  resolveProperty?: (property: Property) => Promise<Property>;
  onDetailsNavigate?: () => void;
  canonicalMarkers?: CanonicalMapMarker[];
  onSelectCanonicalMarker?: (marker: Extract<CanonicalMapMarker, { kind: 'property' }>) => void | Property | Promise<Property | void>;
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

const MapboxPropertyMap = ({ properties, detailsPath, actions, className = '', onVisiblePropertiesChange, onViewportChange, requestedViewport, onSelectProperty, resolveProperty, onDetailsNavigate, canonicalMarkers, onSelectCanonicalMarker }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const propertyLookupRef = useRef(new Map<string, Property>());
  const canonicalLookupRef = useRef(new Map<string, CanonicalMapMarker>());
  const selectPropertyRef = useRef<(property: Property) => void>(() => undefined);
  const selectCanonicalRef = useRef<Props['onSelectCanonicalMarker']>(onSelectCanonicalMarker);
  const visiblePropertiesRef = useRef(onVisiblePropertiesChange);
  const viewportChangeRef = useRef(onViewportChange);
  const userViewportChangeRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<Property | null>(null);
  const [canonicalPreviewLoading, setCanonicalPreviewLoading] = useState(false);
  const canonicalPreviewRequest = useRef(0);
  const [mapError, setMapError] = useState(!configureMapbox());
  const mappable = useMemo(() => canonicalMarkers === undefined ? properties.filter(isMappable) : [], [properties, canonicalMarkers]);
  const mappableRef = useRef(mappable);
  // The preview is intentionally map-owned: selecting or hovering a card may
  // synchronize the highlighted property, but must not open this map preview.
  const initialFit = useRef(false);
  const missingCount = canonicalMarkers === undefined ? properties.length - mappable.length : 0;
  useEffect(() => { selectCanonicalRef.current = onSelectCanonicalMarker; }, [onSelectCanonicalMarker]);
  useEffect(() => {
    visiblePropertiesRef.current = onVisiblePropertiesChange;
    viewportChangeRef.current = onViewportChange;
    mappableRef.current = mappable;
  }, [mappable, onVisiblePropertiesChange, onViewportChange]);
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
      // Stretch the badge around its price without distorting the corners or tip.
      const badge = document.createElement('canvas');
      badge.width = 160;
      badge.height = 88;
      const context = badge.getContext('2d');
      if (!context) { setMapError(true); return; }
      context.shadowColor = 'rgba(15, 35, 28, 0.25)';
      context.shadowBlur = 6;
      context.shadowOffsetY = 3;
      context.beginPath();
      context.moveTo(22, 6);
      context.lineTo(138, 6);
      context.quadraticCurveTo(154, 6, 154, 22);
      context.lineTo(154, 50);
      context.quadraticCurveTo(154, 66, 138, 66);
      context.lineTo(90, 66);
      context.lineTo(80, 78);
      context.lineTo(70, 66);
      context.lineTo(22, 66);
      context.quadraticCurveTo(6, 66, 6, 50);
      context.lineTo(6, 22);
      context.quadraticCurveTo(6, 6, 22, 6);
      context.closePath();
      context.fillStyle = '#173d32';
      context.fill();
      context.shadowColor = 'transparent';
      context.strokeStyle = '#ffffff';
      context.lineWidth = 3;
      context.stroke();
      map.addImage('property-price-pin', context.getImageData(0, 0, 160, 88), {
        pixelRatio: 2,
        content: [20, 12, 140, 60],
        stretchX: [[32, 68], [92, 128]],
        stretchY: [[26, 46]],
      });
      map.addSource('properties', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
      map.addSource('canonical-markers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'canonical-clusters', type: 'circle', source: 'canonical-markers', filter: ['==', ['get', 'kind'], 'cluster'], paint: { 'circle-color': '#173d32', 'circle-radius': 24, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'canonical-cluster-count', type: 'symbol', source: 'canonical-markers', filter: ['==', ['get', 'kind'], 'cluster'], layout: { 'text-field': ['get', 'label'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
      map.addLayer({ id: 'canonical-points', type: 'symbol', source: 'canonical-markers', filter: ['==', ['get', 'kind'], 'property'], layout: { 'icon-image': 'property-price-pin', 'icon-text-fit': 'both', 'icon-text-fit-padding': [7, 12, 7, 12], 'text-field': ['get', 'label'], 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-size': 12, 'text-offset': [0, -2] }, paint: { 'text-color': '#ffffff' } });
      map.addLayer({ id: 'property-clusters', type: 'circle', source: 'properties', filter: ['has', 'point_count'], paint: { 'circle-color': '#173d32', 'circle-radius': ['step', ['get', 'point_count'], 20, 25, 25, 100, 32], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'property-cluster-count', type: 'symbol', source: 'properties', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
      map.addLayer({
        id: 'property-points', type: 'symbol', source: 'properties',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'property-price-pin',
          'icon-text-fit': 'both',
          'icon-text-fit-padding': [7, 12, 7, 12],
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-offset': [0, -2],
          'text-padding': 4,
          'icon-padding': 4,
        },
        paint: { 'text-color': '#ffffff' },
      });
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
      map.on('click', 'canonical-clusters', (event) => {
        const key = String(event.features?.[0]?.properties?.key ?? '');
        const marker = canonicalLookupRef.current.get(key);
        if (marker?.kind === 'cluster') map.easeTo({ center: [marker.lng, marker.lat], zoom: Math.min(22, map.getZoom() + 2) });
      });
      map.on('click', 'canonical-points', (event) => {
        const key = String(event.features?.[0]?.properties?.key ?? '');
        const marker = canonicalLookupRef.current.get(key);
        if (marker?.kind === 'property') {
          const request = ++canonicalPreviewRequest.current;
          setSelectedPreview(null);
          setCanonicalPreviewLoading(true);
          Promise.resolve(selectCanonicalRef.current?.(marker)).then((property) => {
            if (request === canonicalPreviewRequest.current && property && propertyPublicReference(property) === marker.reference) setSelectedPreview(property);
          }).catch(() => undefined).finally(() => {
            if (request === canonicalPreviewRequest.current) setCanonicalPreviewLoading(false);
          });
        }
      });
      for (const layer of ['property-clusters', 'property-points', 'canonical-clusters', 'canonical-points']) {
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
    if (!map || !mapLoaded) return;
    const lookup = new Map<string, CanonicalMapMarker>();
    const features = (canonicalMarkers ?? []).map((marker, index) => {
      const key = `${marker.kind}-${marker.id}-${index}`;
      lookup.set(key, marker);
      return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [marker.lng, marker.lat] }, properties: { key, kind: marker.kind, label: marker.kind === 'cluster' ? (marker.sponsoredCount ? `${marker.count}\n${marker.sponsoredCount} sponsored` : String(marker.count)) : marker.label } };
    });
    canonicalLookupRef.current = lookup;
    (map.getSource('canonical-markers') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
  }, [mapLoaded, canonicalMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !requestedViewport) return;
    const current = map.getBounds();
    if (current && Math.abs(current.getNorth() - requestedViewport.north) < 0.0001 &&
      Math.abs(current.getSouth() - requestedViewport.south) < 0.0001 &&
      Math.abs(current.getEast() - requestedViewport.east) < 0.0001 &&
      Math.abs(current.getWest() - requestedViewport.west) < 0.0001 && Math.abs(map.getZoom() - requestedViewport.zoom) < 0.01) return;
    map.fitBounds([[requestedViewport.west, requestedViewport.south], [requestedViewport.east, requestedViewport.north]], { duration: 0, maxZoom: requestedViewport.zoom });
  }, [mapLoaded, requestedViewport?.north, requestedViewport?.south, requestedViewport?.east, requestedViewport?.west, requestedViewport?.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const markUserViewportChange = () => { userViewportChangeRef.current = true; };
    const canvas = map.getCanvasContainer();
    canvas.addEventListener('wheel', markUserViewportChange, { passive: true });
    canvas.addEventListener('touchstart', markUserViewportChange, { passive: true });
    map.on('dragstart', markUserViewportChange);
    map.on('dblclick', markUserViewportChange);
    const updateVisible = (userInitiated: boolean) => {
      const bounds = map.getBounds();
      if (!bounds) return;
      visiblePropertiesRef.current?.(mappableRef.current.filter((property) => bounds.contains([property.coordinates!.lng, property.coordinates!.lat])));
      viewportChangeRef.current?.({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest(), zoom: map.getZoom() }, userInitiated);
    };
    let timer = 0;
    const settled = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const userInitiated = userViewportChangeRef.current;
        userViewportChangeRef.current = false;
        updateVisible(userInitiated);
      }, 300);
    };
    const first = window.setTimeout(() => updateVisible(false), 0);
    map.on('moveend', settled);
    return () => {
      window.clearTimeout(first); window.clearTimeout(timer);
      map.off('moveend', settled);
      map.off('dragstart', markUserViewportChange);
      map.off('dblclick', markUserViewportChange);
      canvas.removeEventListener('wheel', markUserViewportChange);
      canvas.removeEventListener('touchstart', markUserViewportChange);
    };
  }, [mapLoaded]);

  return (
    <section className={`relative min-h-[55vh] overflow-hidden rounded-xl bg-surface-container-low sm:min-h-[420px] ${className}`} aria-label="Property map">
      {/* Explicit positioning prevents the Mapbox stylesheet from collapsing the host. */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {canonicalMarkers === undefined && mappable.length === 0 && !mapError ? (
        <div className="absolute left-3 top-3 z-[900] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-secondary shadow">
          No property markers in this area
        </div>
      ) : null}
      {mapError ? <div className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-error-container p-3 text-sm text-on-error-container">The map tiles could not be loaded. List results are still available.</div> : null}
      {missingCount > 0 ? <div className="absolute left-3 top-3 z-[900] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-secondary shadow">{missingCount} {missingCount === 1 ? 'property is' : 'properties are'} list-only (no coordinates).</div> : null}
      {canonicalPreviewLoading ? <div role="status" className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white/95 px-4 py-3 text-sm font-semibold text-secondary shadow">Loading property preview…</div> : null}
      {selectedPreview ? <PropertyMapPreviewCard property={selectedPreview} detailsPath={detailsPath} actions={actions} onClose={() => setSelectedPreview(null)} onDetailsNavigate={onDetailsNavigate} /> : null}
    </section>
  );
};

const PropertyMap = (props: Props) => MAP_PROVIDER === 'leaflet' ? <LeafletPropertyMap {...props} /> : <MapboxPropertyMap {...props} />;

export default PropertyMap;
