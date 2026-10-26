import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { propertyPublicReference, propertyRouteReference, type Property } from '../../../types';
import PropertyMapPreviewCard from './PropertyMapPreviewCard';
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

const LeafletPropertyMap = ({ properties, detailsPath, actions, className = '', onVisiblePropertiesChange, onViewportChange, requestedViewport, onSelectProperty, resolveProperty, onDetailsNavigate, canonicalMarkers, onSelectCanonicalMarker }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const canonicalLayerRef = useRef<L.LayerGroup | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<Property | null>(null);
  const [canonicalPreviewLoading, setCanonicalPreviewLoading] = useState(false);
  const canonicalPreviewRequest = useRef(0);
  const visiblePropertiesRef = useRef(onVisiblePropertiesChange);
  const viewportChangeRef = useRef(onViewportChange);
  const userViewportChangeRef = useRef(false);
  const [mapError, setMapError] = useState(false);
  const mappable = useMemo(() => canonicalMarkers === undefined ? properties.filter(isMappable) : [], [properties, canonicalMarkers]);
  const mappableRef = useRef(mappable);
  // The preview is intentionally map-owned: selecting or hovering a card may
  // synchronize the highlighted property, but must not open this map preview.
  const initialFit = useRef(false);
  const missingCount = canonicalMarkers === undefined ? properties.length - mappable.length : 0;

  useEffect(() => {
    visiblePropertiesRef.current = onVisiblePropertiesChange;
    viewportChangeRef.current = onViewportChange;
    mappableRef.current = mappable;
  }, [mappable, onVisiblePropertiesChange, onViewportChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([9.082, 8.6753], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).on('tileerror', () => setMapError(true)).addTo(map);
    const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
    const canonicalLayer = L.layerGroup();
    map.addLayer(cluster);
    map.addLayer(canonicalLayer);
    mapRef.current = map;
    clusterRef.current = cluster;
    canonicalLayerRef.current = canonicalLayer;
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      canonicalLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !requestedViewport) return;
    const current = map.getBounds();
    if (Math.abs(current.getNorth() - requestedViewport.north) < 0.0001 &&
      Math.abs(current.getSouth() - requestedViewport.south) < 0.0001 &&
      Math.abs(current.getEast() - requestedViewport.east) < 0.0001 &&
      Math.abs(current.getWest() - requestedViewport.west) < 0.0001 && Math.abs(map.getZoom() - requestedViewport.zoom) < 0.01) return;
    map.fitBounds([[requestedViewport.south, requestedViewport.west], [requestedViewport.north, requestedViewport.east]], { animate: false, maxZoom: requestedViewport.zoom });
  }, [requestedViewport?.north, requestedViewport?.south, requestedViewport?.east, requestedViewport?.west, requestedViewport?.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;
    cluster.clearLayers();
    const bounds = L.latLngBounds([]);
    mappable.forEach((property) => {
      const { lat, lng } = property.coordinates!;
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'realtiq-map-marker',
          html: `<span>${priceLabel(property.price)}</span>`,
          iconSize: [76, 32],
          iconAnchor: [38, 32],
        }),
        title: property.title,
      });
      marker.on('click', () => {
        const reference = propertyRouteReference(property);
        setSelectedPreview(property);
        onSelectProperty?.(property);
        if (resolveProperty) {
          void resolveProperty(property).then((resolved) => {
            if (resolved && propertyRouteReference(resolved) === reference) setSelectedPreview(resolved);
          }).catch(() => undefined);
        }
      });
      cluster.addLayer(marker);
      bounds.extend([lat, lng]);
    });
    if (bounds.isValid() && !initialFit.current) { initialFit.current = true; map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }); }
  }, [mappable, onSelectProperty, resolveProperty]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = canonicalLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const marker of canonicalMarkers ?? []) {
      const isCluster = marker.kind === 'cluster';
      const clusterLabel = isCluster ? `${marker.count}${marker.sponsoredCount ? ` · ${marker.sponsoredCount} sponsored` : ''}` : '';
      const icon = L.divIcon({ className: isCluster ? 'realtiq-map-marker realtiq-map-cluster' : 'realtiq-map-marker',
        html: `<span>${isCluster ? clusterLabel : marker.label}</span>`, iconSize: [isCluster && marker.sponsoredCount ? 116 : 76, 32], iconAnchor: [isCluster && marker.sponsoredCount ? 58 : 38, 32] });
      const point = L.marker([marker.lat, marker.lng], { icon, title: isCluster ? `${marker.count} properties` : marker.title });
      point.on('click', () => {
        if (marker.kind === 'cluster') map.setView([marker.lat, marker.lng], Math.min(19, map.getZoom() + 2));
        else {
          const request = ++canonicalPreviewRequest.current;
          setSelectedPreview(null);
          setCanonicalPreviewLoading(true);
          Promise.resolve().then(() => onSelectCanonicalMarker?.(marker)).then((property) => {
            if (request === canonicalPreviewRequest.current && property && propertyPublicReference(property) === marker.reference) setSelectedPreview(property);
          }).catch(() => undefined).finally(() => {
            if (request === canonicalPreviewRequest.current) setCanonicalPreviewLoading(false);
          });
        }
      });
      layer.addLayer(point);
    }
  }, [canonicalMarkers, onSelectCanonicalMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markUserViewportChange = () => { userViewportChangeRef.current = true; };
    const container = map.getContainer();
    const zoomButtons = Array.from(container.querySelectorAll<HTMLElement>('.leaflet-control-zoom a'));
    container.addEventListener('wheel', markUserViewportChange, { passive: true });
    container.addEventListener('touchstart', markUserViewportChange, { passive: true });
    container.addEventListener('keydown', markUserViewportChange);
    zoomButtons.forEach((button) => button.addEventListener('click', markUserViewportChange));
    map.on('dragstart', markUserViewportChange);
    const updateVisible = (userInitiated: boolean) => {
      const bounds = map.getBounds();
      visiblePropertiesRef.current?.(mappableRef.current.filter((property) => bounds.contains([property.coordinates!.lat, property.coordinates!.lng])));
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
    map.on('moveend zoomend', settled);
    return () => {
      window.clearTimeout(first); window.clearTimeout(timer);
      container.removeEventListener('wheel', markUserViewportChange);
      container.removeEventListener('touchstart', markUserViewportChange);
      container.removeEventListener('keydown', markUserViewportChange);
      zoomButtons.forEach((button) => button.removeEventListener('click', markUserViewportChange));
      map.off('dragstart', markUserViewportChange);
      map.off('moveend zoomend', settled);
    };
  }, []);

  return <section className={'relative min-h-[55vh] overflow-hidden rounded-xl bg-surface-container-low ' + className}>
    <div ref={containerRef} className={'absolute inset-0'} />
    {canonicalMarkers === undefined && mappable.length === 0 && !mapError ? <div className={'absolute left-3 top-3 z-[900] rounded-lg bg-white p-3 text-xs'}>No property markers in this area</div> : null}
    {mapError ? <div className={'absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-error-container p-3 text-sm'}>The map tiles could not be loaded. List results are still available.</div> : null}
    {missingCount > 0 ? <div className={'absolute left-3 top-3 z-[900] rounded-lg bg-white p-3 text-xs'}>{missingCount} properties are list-only (no coordinates).</div> : null}
    {canonicalPreviewLoading ? <div role="status" className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white/95 px-4 py-3 text-sm font-semibold text-secondary shadow">Loading property preview…</div> : null}
    {selectedPreview ? <PropertyMapPreviewCard property={selectedPreview} detailsPath={detailsPath} actions={actions} onClose={() => setSelectedPreview(null)} onDetailsNavigate={onDetailsNavigate} /> : null}
  </section>;
};

export default LeafletPropertyMap;
