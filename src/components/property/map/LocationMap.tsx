import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import L from 'leaflet';
import { MAP_PROVIDER } from '../../../config/maps';
import { configureMapbox, MAPBOX_STYLE } from '../../../lib/mapbox';

interface Props {
  coordinates: { lat: number; lng: number };
  title: string;
  className?: string;
}

/** A single location, using the same provider as the catalog and analytics maps. */
const LocationMap = ({ coordinates: { lat, lng }, title, className = '' }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let dispose = () => {};
    setError(false);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setError(true);
      return;
    }
    try {
      if (MAP_PROVIDER === 'mapbox') {
        if (!configureMapbox()) { setError(true); return; }
        const map = new mapboxgl.Map({ container, style: MAPBOX_STYLE, center: [lng, lat], zoom: 14 });
        dispose = () => map.remove();
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        const marker = new mapboxgl.Marker({ color: '#173d32' }).setLngLat([lng, lat]).addTo(map);
        marker.getElement().setAttribute('aria-label', title);
        marker.getElement().setAttribute('title', title);
        map.on('error', () => setError(true));
        map.on('load', () => setError(false));
        const resize = new ResizeObserver(() => map.resize());
        resize.observe(container);
        dispose = () => { resize.disconnect(); marker.remove(); map.remove(); };
      } else {
        const map = L.map(container).setView([lat, lng], 14);
        dispose = () => map.remove();
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
        }).on('tileerror', () => setError(true)).addTo(map);
        L.marker([lat, lng], { title, alt: title }).addTo(map);
        const resize = new ResizeObserver(() => map.invalidateSize());
        resize.observe(container);
        dispose = () => { resize.disconnect(); map.remove(); };
      }
    } catch {
      dispose();
      setError(true);
      return;
    }
    return () => dispose();
  }, [lat, lng, title]);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-surface-container-low ${className}`} role="region" aria-label={`${title} map`}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {error ? <p role="alert" className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-white p-3 text-sm text-secondary shadow">The location map could not be loaded. Please try refreshing the page.</p> : null}
    </div>
  );
};

export default LocationMap;
