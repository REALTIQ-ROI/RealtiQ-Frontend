import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { configureMapbox, MAPBOX_STYLE } from '../../../lib/mapbox';
import { loadGoogleMapsSdk, type GoogleMapInstance, type GoogleMapsApi } from '../../../lib/googleMaps';
import { useMapConfig } from '../../../contexts/MapConfigContext';
import Button from '../../ui/Button';

interface Props {
  coordinates: { lat: number; lng: number };
  title: string;
  className?: string;
}

/** A single location, using the same provider as the catalog and analytics maps. */
const LocationMap = ({ coordinates: { lat, lng }, title, className = '' }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state: mapConfigState, refresh, hasCredential } = useMapConfig();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapConfigState.status !== 'ready') return undefined;
    let dispose: () => void = () => {};
    setError(null);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setError('This location does not have a valid map position.');
      return undefined;
    }
    const provider = mapConfigState.config.provider;
    if (!hasCredential(provider)) {
      setError(`${mapConfigState.config.supportedProviders.find((item) => item.id === provider)?.label ?? provider} is selected, but its browser SDK credential is not configured.`);
      return undefined;
    }
    if (provider === 'mapbox') {
      try {
        if (!configureMapbox()) { setError('Mapbox is selected, but its browser SDK credential is not configured.'); return undefined; }
        const map = new mapboxgl.Map({ container, style: MAPBOX_STYLE, center: [lng, lat], zoom: 14 });
        dispose = () => map.remove();
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        const marker = new mapboxgl.Marker({ color: '#173d32' }).setLngLat([lng, lat]).addTo(map);
        marker.getElement().setAttribute('aria-label', title);
        marker.getElement().setAttribute('title', title);
        map.on('error', () => setError('The location map could not be loaded.'));
        const resize = new ResizeObserver(() => map.resize());
        resize.observe(container);
        dispose = () => { resize.disconnect(); marker.remove(); map.remove(); };
      } catch {
        setError('The location map could not be loaded.');
      }
      return () => dispose();
    }
    let cancelled = false;
    let googleMap: GoogleMapInstance | null = null;
    let maps: GoogleMapsApi | null = null;
    let marker: InstanceType<GoogleMapsApi['Marker']> | null = null;
    let resize: ResizeObserver | null = null;
    void loadGoogleMapsSdk().then((googleMaps) => {
      if (cancelled) return;
      maps = googleMaps;
      googleMap = new googleMaps.Map(container, {
        center: { lat, lng }, zoom: 14, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, clickableIcons: false,
      });
      marker = new googleMaps.Marker({ map: googleMap, position: { lat, lng }, title });
      googleMap.addListener('tilesloaded', () => setError(null));
      resize = new ResizeObserver(() => { if (maps && googleMap) maps.event.trigger(googleMap, 'resize'); });
      resize.observe(container);
    }).catch(() => {
      if (!cancelled) setError('Google Maps could not be loaded.');
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      if (marker) marker.setMap(null);
      if (maps && googleMap) maps.event.clearInstanceListeners(googleMap);
    };
  }, [lat, lng, title, mapConfigState, hasCredential]);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-surface-container-low ${className}`} role="region" aria-label={`${title} map`}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {mapConfigState.status === 'loading' ? <p role="status" className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-white p-3 text-sm text-secondary shadow">Loading active map settings…</p> : null}
      {mapConfigState.status === 'error' ? <div role="alert" className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-white p-3 text-sm text-secondary shadow"><p>{mapConfigState.error}</p><Button type="button" variant="secondary" className="mt-2" onClick={() => void refresh()}>Retry map settings</Button></div> : null}
      {error ? <p role="alert" className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-white p-3 text-sm text-secondary shadow">{error}</p> : null}
    </div>
  );
};

export default LocationMap;
