import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { Property } from '../../../types';
import PropertyMapPreviewCard from './PropertyMapPreviewCard';

interface Props {
  properties: Property[];
  detailsPath: (property: Property) => string;
  actions?: (property: Property) => ReactNode;
  className?: string;
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

const PropertyMap = ({ properties, detailsPath, actions, className = '' }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const mappable = useMemo(() => properties.filter(isMappable), [properties]);
  const selected = useMemo(() => mappable.find((property) => property._id === selectedId) ?? null, [mappable, selectedId]);
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
      marker.on('click', () => setSelectedId(property._id));
      cluster.addLayer(marker);
      bounds.extend([lat, lng]);
    });
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [mappable]);

  return (
    <section className={`relative min-h-[420px] overflow-hidden rounded-xl bg-surface-container-low ${className}`} aria-label="Property map">
      <div ref={containerRef} className="absolute inset-0" />
      {mappable.length === 0 && !mapError ? (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-surface-container-low/90 p-8 text-center">
          <div><span className="material-symbols-outlined mb-2 block text-4xl text-secondary">location_off</span><p className="font-bold">No map locations available</p><p className="mt-1 text-sm text-secondary">These properties remain available in list view.</p></div>
        </div>
      ) : null}
      {mapError ? <div className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-error-container p-3 text-sm text-on-error-container">The map tiles could not be loaded. List results are still available.</div> : null}
      {missingCount > 0 ? <div className="absolute left-3 top-3 z-[900] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-secondary shadow">{missingCount} {missingCount === 1 ? 'property is' : 'properties are'} list-only (no coordinates).</div> : null}
      {selected ? <PropertyMapPreviewCard property={selected} detailsPath={detailsPath} actions={actions} onClose={() => setSelectedId(null)} /> : null}
    </section>
  );
};

export default PropertyMap;
