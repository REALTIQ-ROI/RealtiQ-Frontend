import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { propertyRouteReference, type Property } from '../../../types';
import PropertyMapPreviewCard from './PropertyMapPreviewCard';

interface Props {
  properties: Property[];
  detailsPath: (property: Property) => string;
  actions?: (property: Property) => ReactNode;
  className?: string;
  onVisiblePropertiesChange?: (properties: Property[]) => void;
  onViewportChange?: (bounds: { north: number; south: number; east: number; west: number; zoom: number }) => void;
  onSelectProperty?: (property: Property) => void;
}

const isMappable = (property: Property) => {
  const lat = property.coordinates?.lat;
  const lng = property.coordinates?.lng;
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
};

const priceLabel = (price: number) => {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `₦${Math.round(price / 1_000)}K`;
  return `₦${price}`;
};

const PropertyMap = ({ properties, detailsPath, actions, className = '', onVisiblePropertiesChange, onViewportChange, onSelectProperty }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const mappable = useMemo(() => properties.filter(isMappable), [properties]);
  // The preview is intentionally map-owned: selecting or hovering a card may
  // synchronize the highlighted property, but must not open this map preview.
  const selected = useMemo(() => mappable.find((property) => propertyRouteReference(property) === internalSelectedId) ?? null, [mappable, internalSelectedId]);
  const initialFit = useRef(false);
  const missingCount = properties.length - mappable.length;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([9.082, 8.6753], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).on('tileerror', () => setMapError(true)).addTo(map);
    const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

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
      marker.on('click', () => { setInternalSelectedId(propertyRouteReference(property)); onSelectProperty?.(property); });
      cluster.addLayer(marker);
      bounds.extend([lat, lng]);
    });
    if (bounds.isValid() && !initialFit.current) { initialFit.current = true; map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }); }
  }, [mappable, onSelectProperty]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || (!onVisiblePropertiesChange && !onViewportChange)) return;
    const updateVisible = () => {
      const bounds = map.getBounds();
      onVisiblePropertiesChange?.(mappable.filter((property) => bounds.contains([property.coordinates!.lat, property.coordinates!.lng])));
      onViewportChange?.({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest(), zoom: map.getZoom() });
    };
    let timer = 0;
    const settled = () => { window.clearTimeout(timer); timer = window.setTimeout(updateVisible, 300); };
    const first = window.setTimeout(updateVisible, 0);
    map.on('moveend zoomend', settled);
    return () => {
      window.clearTimeout(first); window.clearTimeout(timer);
      map.off('moveend zoomend', settled);
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
      {selected ? <PropertyMapPreviewCard property={selected} detailsPath={detailsPath} actions={actions} onClose={() => setInternalSelectedId(null)} /> : null}
    </section>
  );
};

export default PropertyMap;
