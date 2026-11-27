import { useEffect, useMemo, useRef, useState } from 'react';
import { loadGoogleMapsSdk, type GoogleMapInstance, type GoogleMapsApi } from '../../../lib/googleMaps';
import { propertyRouteReference, type Property } from '../../../types';
import type { CanonicalMapMarker } from '../../../types/canonicalMap';
import { effectiveCanonicalValue } from '../../../utils/propertyVocabulary';
import type { PropertyMapProps } from './PropertyMap';
import PropertyMapPreviewCard from './PropertyMapPreviewCard';
import Button from '../../ui/Button';
import { useFxDisplay } from '../../../contexts/FxDisplayContext';
import { formatCompactCurrencyAmount, getPricePresentation, type FxRateValue } from '../../../utils/fxDisplay';

const isMappable = (property: Property) => {
  const lat = property.coordinates?.lat;
  const lng = property.coordinates?.lng;
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
};

const priceLabel = (price: number, currency: string | undefined, displayCurrency: 'NGN' | 'USD' | null, rate: FxRateValue | null) => {
  if (!Number.isFinite(price) || !currency) return 'View';
  const result = getPricePresentation(price, currency, displayCurrency, rate);
  return result.unsupportedCurrency ? result.displayText : formatCompactCurrencyAmount(result.displayAmount, result.displayCurrency);
};

const validMarker = (marker: CanonicalMapMarker) =>
  Number.isFinite(marker.lat) && marker.lat >= -90 && marker.lat <= 90 &&
  Number.isFinite(marker.lng) && marker.lng >= -180 && marker.lng <= 180;

const GooglePropertyMap = ({
  properties, className = '', onVisiblePropertiesChange, onViewportChange, requestedViewport,
  onSelectProperty, resolveProperty, onDetailsNavigate, detailsPath, actions, canonicalMarkers, onSelectCanonicalMarker, suppressPreview = false,
}: PropertyMapProps) => {
  const { displayCurrency, officialRate } = useFxDisplay();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const mapsRef = useRef<GoogleMapsApi | null>(null);
  const propertyLookupRef = useRef(new Map<string, Property>());
  const canonicalLookupRef = useRef(new Map<string, CanonicalMapMarker>());
  const propertyClickRef = useRef<(property: Property) => void>(() => undefined);
  const canonicalClickRef = useRef<PropertyMapProps['onSelectCanonicalMarker']>(onSelectCanonicalMarker);
  const visibleRef = useRef(onVisiblePropertiesChange);
  const viewportRef = useRef(onViewportChange);
  const propertiesRef = useRef<Property[]>([]);
  const initialFit = useRef(false);
  const userViewportChange = useRef(false);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [tilesAvailable, setTilesAvailable] = useState(false);
  const [sdkAttempt, setSdkAttempt] = useState(0);
  const [mapZoom, setMapZoom] = useState(5.2);
  const [selectedPreview, setSelectedPreview] = useState<Property | null>(null);

  const mappable = useMemo(() => canonicalMarkers === undefined ? properties.filter(isMappable) : [], [properties, canonicalMarkers]);

  useEffect(() => {
    propertyClickRef.current = (property) => {
      const reference = propertyRouteReference(property);
      setSelectedPreview(property);
      onSelectProperty?.(property);
      if (resolveProperty) void resolveProperty(property).then((resolved) => {
        if (resolved && propertyRouteReference(resolved) === reference) { setSelectedPreview(resolved); onSelectProperty?.(resolved); }
      }).catch(() => undefined);
    };
    canonicalClickRef.current = onSelectCanonicalMarker;
    visibleRef.current = onVisiblePropertiesChange;
    viewportRef.current = onViewportChange;
    propertiesRef.current = mappable;
  }, [mappable, onSelectProperty, resolveProperty, onSelectCanonicalMarker, onVisiblePropertiesChange, onViewportChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let disposed = false;
    let maps: GoogleMapsApi | null = null;
    let map: GoogleMapInstance | null = null;
    let resize: ResizeObserver | null = null;
    let tileTimeout = 0;
    let viewportTimeout = 0;
    let pendingUserViewportChange = false;
    const listeners: Array<{ remove(): void }> = [];
    const markUserViewportChange = () => { userViewportChange.current = true; };
    const markGoogleControlClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('.gm-bundled-control')) markUserViewportChange();
    };
    setMapError(false);
    setTilesAvailable(false);
    void loadGoogleMapsSdk().then((googleMaps) => {
      if (disposed) return;
      maps = googleMaps;
      map = new googleMaps.Map(container, {
        center: { lat: 9.082, lng: 8.6753 },
        zoom: 5.2,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      mapsRef.current = googleMaps;
      mapRef.current = map;
      listeners.push(map.addListener('tilesloaded', () => { window.clearTimeout(tileTimeout); setTilesAvailable(true); setMapError(false); }));
      listeners.push(map.addListener('zoom_changed', () => setMapZoom(map?.getZoom() ?? 5.2)));
      listeners.push(map.addListener('idle', () => {
        pendingUserViewportChange ||= userViewportChange.current;
        userViewportChange.current = false;
        window.clearTimeout(viewportTimeout);
        viewportTimeout = window.setTimeout(() => {
          if (disposed || !map) return;
          const bounds = map.getBounds();
          const zoom = map.getZoom();
          if (!bounds || typeof zoom !== 'number') return;
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          visibleRef.current?.(propertiesRef.current.filter((property) => bounds.contains({ lat: property.coordinates!.lat, lng: property.coordinates!.lng })));
          const userInitiated = pendingUserViewportChange;
          pendingUserViewportChange = false;
          viewportRef.current?.({ north: northEast.lat(), south: southWest.lat(), east: northEast.lng(), west: southWest.lng(), zoom }, userInitiated);
        }, 300);
      }));
      listeners.push(map.addListener('dragstart', markUserViewportChange));
      listeners.push(map.addListener('dblclick', markUserViewportChange));
      container.addEventListener('wheel', markUserViewportChange, { passive: true });
      container.addEventListener('touchstart', markUserViewportChange, { passive: true });
      container.addEventListener('click', markGoogleControlClick);
      resize = new ResizeObserver(() => googleMaps.event.trigger(map!, 'resize'));
      resize.observe(container);
      tileTimeout = window.setTimeout(() => setMapError(true), 15_000);
      setReady(true);
    }).catch(() => {
      if (!disposed) setMapError(true);
    });
    return () => {
      disposed = true;
      window.clearTimeout(tileTimeout);
      window.clearTimeout(viewportTimeout);
      resize?.disconnect();
      container.removeEventListener('wheel', markUserViewportChange);
      container.removeEventListener('touchstart', markUserViewportChange);
      container.removeEventListener('click', markGoogleControlClick);
      listeners.forEach((listener) => listener.remove());
      if (maps && map) maps.event.clearInstanceListeners(map);
      mapsRef.current = null;
      mapRef.current = null;
      setReady(false);
    };
  }, [sdkAttempt]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps || !ready) return;
    const validProperties = mappable;
    const groups = new Map<string, Property[]>();
    const zoom = map.getZoom() ?? 5;
    const cellSize = 360 / (2 ** Math.max(0, zoom)) * 1.4;
    validProperties.forEach((property) => {
      const lat = property.coordinates!.lat;
      const lng = property.coordinates!.lng;
      const key = zoom < 15 ? `${Math.floor(lat / cellSize)}:${Math.floor(lng / cellSize)}` : propertyRouteReference(property);
      groups.set(key, [...(groups.get(key) ?? []), property]);
    });
    const nextLookup = new Map<string, Property>();
    const markers: Array<{ marker: InstanceType<GoogleMapsApi['Marker']>; listener?: { remove(): void } }> = [];
    groups.forEach((group, key) => {
      const first = group[0];
      if (!first) return;
      const cluster = group.length > 1;
      const label = cluster ? String(group.length) : effectiveCanonicalValue(first, 'priceOnApplication') === true ? 'POA' : priceLabel(first.price, first.currency, displayCurrency, officialRate ? { amount: officialRate.amount } : null);
      group.forEach((property, index) => nextLookup.set(cluster ? `${key}:${index}` : key, property));
      const marker = new maps.Marker({
        map,
        position: { lat: first.coordinates!.lat, lng: first.coordinates!.lng },
        title: cluster ? `${group.length} properties` : first.title,
        label: { text: label, color: '#ffffff', fontWeight: '700', fontSize: cluster ? '12px' : '10px' },
        icon: { path: maps.SymbolPath.CIRCLE, scale: cluster ? 20 : 19, fillColor: '#173d32', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
        zIndex: cluster ? 2 : 1,
      });
      const listener = marker.addListener('click', () => {
        if (cluster) {
          map.panTo({ lat: first.coordinates!.lat, lng: first.coordinates!.lng });
          map.setZoom(Math.min(20, (map.getZoom() ?? 5) + 2));
          return;
        }
        propertyClickRef.current(first);
      });
      markers.push({ marker, listener });
    });
    propertyLookupRef.current = nextLookup;

    const canonical: Array<{ marker: InstanceType<GoogleMapsApi['Marker']>; listener?: { remove(): void } }> = [];
    const nextCanonical = new Map<string, CanonicalMapMarker>();
    (canonicalMarkers ?? []).filter(validMarker).forEach((entry, index) => {
      const key = `${entry.kind}-${entry.id}-${index}`;
      nextCanonical.set(key, entry);
      const marker = new maps.Marker({
        map,
        position: { lat: entry.lat, lng: entry.lng },
        title: entry.kind === 'cluster' ? `${entry.count} properties` : entry.title,
        label: { text: entry.kind === 'cluster' ? String(entry.count) : entry.label, color: '#ffffff', fontWeight: '700', fontSize: '10px' },
        icon: { path: maps.SymbolPath.CIRCLE, scale: entry.kind === 'cluster' ? 21 : 19, fillColor: '#173d32', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
        zIndex: entry.kind === 'cluster' ? 2 : 1,
      });
      const listener = marker.addListener('click', () => {
        if (entry.kind === 'cluster') {
          map.panTo({ lat: entry.lat, lng: entry.lng });
          map.setZoom(Math.min(20, (map.getZoom() ?? 5) + 2));
        } else {
          const request = ++canonicalPreviewRequest.current;
          setSelectedPreview(null);
          setCanonicalLoading(true);
          Promise.resolve(canonicalClickRef.current?.(entry)).then((property) => {
            if (request === canonicalPreviewRequest.current && property) setSelectedPreview(property);
          }).catch(() => undefined).finally(() => {
            if (request === canonicalPreviewRequest.current) setCanonicalLoading(false);
          });
        }
      });
      canonical.push({ marker, listener });
    });
    canonicalLookupRef.current = nextCanonical;

    if (validProperties.length && !initialFit.current && !requestedViewport) {
      initialFit.current = true;
      const bounds = new maps.LatLngBounds();
      validProperties.forEach((property) => bounds.extend({ lat: property.coordinates!.lat, lng: property.coordinates!.lng }));
      map.fitBounds(bounds, 40);
    }
    if (canonicalMarkers?.length && !initialFit.current && !requestedViewport) {
      initialFit.current = true;
      const bounds = new maps.LatLngBounds();
      canonicalMarkers.filter(validMarker).forEach((entry) => bounds.extend({ lat: entry.lat, lng: entry.lng }));
      map.fitBounds(bounds, 40);
    }
    return () => [...markers, ...canonical].forEach(({ marker, listener }) => { listener?.remove(); marker.setMap(null); });
  }, [ready, mappable, canonicalMarkers, mapZoom, displayCurrency, officialRate?.amount]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps || !ready || !requestedViewport) return;
    const bounds = map.getBounds();
    const currentZoom = map.getZoom();
    if (bounds && typeof currentZoom === 'number') {
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
      if (Math.abs(northEast.lat() - requestedViewport.north) < 0.0001 &&
        Math.abs(southWest.lat() - requestedViewport.south) < 0.0001 &&
        Math.abs(northEast.lng() - requestedViewport.east) < 0.0001 &&
        Math.abs(southWest.lng() - requestedViewport.west) < 0.0001 &&
        Math.abs(currentZoom - requestedViewport.zoom) < 0.01) return;
    }
    map.panTo({ lat: (requestedViewport.north + requestedViewport.south) / 2, lng: (requestedViewport.east + requestedViewport.west) / 2 });
    map.setZoom(requestedViewport.zoom);
  }, [ready, requestedViewport]);

  const [canonicalLoading, setCanonicalLoading] = useState(false);
  const canonicalPreviewRequest = useRef(0);
  const missingCount = canonicalMarkers === undefined ? properties.length - mappable.length : 0;
  return <section className={`relative min-h-[55vh] overflow-hidden rounded-xl bg-surface-container-low sm:min-h-[420px] ${className}`} aria-label="Property map">
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    {(!ready || !tilesAvailable) && !mapError ? <p role="status" className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-white/95 p-3 text-sm text-secondary shadow">Loading Google Maps…</p> : null}
    {mapError ? <div role="alert" className="absolute left-3 right-3 top-3 z-[1000] rounded-lg bg-error-container p-3 text-sm text-on-error-container"><p>Google Maps could not be loaded. List results are still available.</p><Button type="button" variant="secondary" className="mt-2" onClick={() => setSdkAttempt((attempt) => attempt + 1)}>Retry map</Button></div> : null}
    {canonicalMarkers === undefined && mappable.length === 0 && !mapError ? <div className="absolute left-3 top-3 z-[900] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-secondary shadow">No property markers in this area</div> : null}
    {missingCount > 0 ? <div className="absolute left-3 top-3 z-[900] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-secondary shadow">{missingCount} {missingCount === 1 ? 'property is' : 'properties are'} list-only (no coordinates).</div> : null}
    {canonicalLoading ? <div role="status" className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white/95 px-4 py-3 text-sm font-semibold text-secondary shadow">Loading property preview…</div> : null}
    {!suppressPreview && selectedPreview ? <PropertyMapPreviewCard property={selectedPreview} detailsPath={detailsPath} actions={actions} onClose={() => setSelectedPreview(null)} onDetailsNavigate={onDetailsNavigate} /> : null}
  </section>;
};

export default GooglePropertyMap;

