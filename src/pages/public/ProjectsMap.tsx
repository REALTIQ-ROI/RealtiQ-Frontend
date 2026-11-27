import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Link, useLocation } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { projectService, type ProjectMapItem } from '../../services/projectService';
import { projectMapPricePresentation } from '../../utils/projectFormatters';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { configureMapbox, MAPBOX_STYLE, nigeriaCenter } from '../../lib/mapbox';
import { loadGoogleMapsSdk, type GoogleMapInstance, type GoogleMapsApi } from '../../lib/googleMaps';
import { useMapConfig } from '../../contexts/MapConfigContext';
import { writeCatalogueMapViewport } from '../../utils/catalogueMapViewport';
import { adoptCanonicalQuery, catalogueQueryForDisplay, hasFeaturedFilterIgnoredNotice, sameCanonicalCriteria, writeCatalogueQuery, withoutUnsupportedCatalogueFilters } from '../../utils/catalogueQuery';
import CatalogueResultInsights from '../../components/property/CatalogueResultInsights';
import { useAuth } from '../../contexts/AuthContext';
import { useBuyerCatalogueSearchParams } from '../../hooks/useBuyerCatalogueSearchParams';
import FxDisplayControl from '../../components/property/FxDisplayControl';
import { useFxDisplay } from '../../contexts/FxDisplayContext';
import { formatPriceRangeForDisplay } from '../../utils/fxDisplay';

const emptyProjects: ProjectMapItem[] = [];

const ProjectsMap = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useBuyerCatalogueSearchParams();
  const displaySearchParams = useMemo(() => catalogueQueryForDisplay(searchParams), [searchParams]);
  const { activeProfile } = useAuth();
  const { displayCurrency, officialRate } = useFxDisplay();
  const { state: mapConfigState, refresh: refreshMapConfig, hasCredential } = useMapConfig();
  const mapProvider = mapConfigState.status === 'ready' ? mapConfigState.config.provider : null;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const googleMapRef = useRef<GoogleMapInstance | null>(null);
  const googleMapsRef = useRef<GoogleMapsApi | null>(null);
  const googleMarkersRef = useRef<Array<{ marker: InstanceType<GoogleMapsApi['Marker']>; listener?: { remove(): void } }>>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapInstanceVersion, setMapInstanceVersion] = useState(0);
  const [mapRetryVersion, setMapRetryVersion] = useState(0);
  const [mapResult, setMapResult] = useState<{ requestKey: string; projects: ProjectMapItem[]; total: number; error: string; truncated: boolean; limit: number; facets: Record<string, unknown>; diagnostics: unknown }>({ requestKey: '', projects: emptyProjects, total: 0, error: '', truncated: false, limit: 0, facets: {}, diagnostics: null });
  const [selectedProject, setSelectedProject] = useState<{ requestKey: string; project: ProjectMapItem } | null>(null);
  const [mapTilesError, setMapTilesError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const queryKey = searchParams.toString();
  const requestKey = JSON.stringify([queryKey, refreshVersion, activeProfile?.id ?? null]);
  const mapActive = displaySearchParams.get('mapActive') === 'true';
  const mapQueryHasBounds = ['north', 'south', 'east', 'west', 'mapZoom'].every((key) => {
    const value = displaySearchParams.get(key);
    return value !== null && Number.isFinite(Number(value));
  });
  const mapRequestEnabled = mapActive && mapQueryHasBounds;
  const activeMapResult = mapResult.requestKey === requestKey ? mapResult : null;
  const projects = activeMapResult?.projects ?? emptyProjects;
  const total = activeMapResult?.total ?? 0;
  const loading = mapRequestEnabled && activeMapResult === null;
  const error = activeMapResult?.error ?? '';
  const selected = selectedProject?.requestKey === requestKey ? selectedProject.project : null;
  const searchParamsRef = useRef(searchParams);
  const setSearchParamsRef = useRef(setSearchParams);
  const userViewportChangeRef = useRef(false);
  useEffect(() => {
    searchParamsRef.current = searchParams;
    setSearchParamsRef.current = setSearchParams;
  }, [searchParams, setSearchParams]);
  const requestedViewport = useMemo(() => {
    const keys = ['north', 'south', 'east', 'west', 'mapZoom'] as const;
    if (!keys.every((key) => displaySearchParams.has(key))) return null;
    const [north, south, east, west, zoom] = keys.map((key) => Number(displaySearchParams.get(key)));
    if (![north, south, east, west, zoom].every(Number.isFinite) || north! <= south! || east! <= west! || zoom! < 0) return null;
    return { north: north!, south: south!, east: east!, west: west!, zoom: zoom! };
  }, [displaySearchParams]);

  useEffect(() => {
    if (mapProvider !== 'mapbox' || !containerRef.current || mapRef.current) return;
    if (!hasCredential('mapbox') || !configureMapbox()) {
      setMapTilesError('Mapbox is selected, but its restricted browser SDK credential is not configured. Use list view to continue browsing projects.');
      return;
    }
    setMapTilesError('');
    const map = new mapboxgl.Map({ container: containerRef.current, style: MAPBOX_STYLE, center: nigeriaCenter, zoom: 5.2 });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('error', () => setMapTilesError('Map tiles are unavailable. Use list view to continue browsing projects.'));
    mapRef.current = map;
    setMapInstanceVersion((version) => version + 1);
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [mapProvider, hasCredential, mapRetryVersion]);

  useEffect(() => {
    if (mapProvider !== 'google_maps' || !containerRef.current || googleMapRef.current) return undefined;
    if (!hasCredential('google_maps')) {
      setMapTilesError('Google Maps is selected, but its restricted browser SDK credential is not configured. Use list view to continue browsing projects.');
      return undefined;
    }
    let disposed = false;
    setMapTilesError('');
    void loadGoogleMapsSdk().then((maps) => {
      if (disposed || !containerRef.current) return;
      const map = new maps.Map(containerRef.current, {
        center: { lat: nigeriaCenter[1], lng: nigeriaCenter[0] }, zoom: 5.2,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false,
      });
      googleMapsRef.current = maps;
      googleMapRef.current = map;
      map.addListener('tilesloaded', () => setMapTilesError(''));
      setMapInstanceVersion((version) => version + 1);
    }).catch(() => {
      if (!disposed) setMapTilesError('Google Maps could not be loaded. Use list view to continue browsing projects.');
    });
    return () => {
      disposed = true;
      googleMarkersRef.current.forEach(({ marker, listener }) => { listener?.remove(); marker.setMap(null); });
      googleMarkersRef.current = [];
      if (googleMapRef.current && googleMapsRef.current) googleMapsRef.current.event.clearInstanceListeners(googleMapRef.current);
      googleMapRef.current = null;
      googleMapsRef.current = null;
    };
  }, [mapProvider, hasCredential, mapRetryVersion]);

  useEffect(() => {
    if (!requestedViewport) return;
    const mapbox = mapRef.current;
    const googleMap = googleMapRef.current;
    if (mapbox) {
      const bounds = mapbox.getBounds();
      if (bounds && Math.abs(bounds.getNorth() - requestedViewport.north) < 0.0001 && Math.abs(bounds.getSouth() - requestedViewport.south) < 0.0001 && Math.abs(bounds.getEast() - requestedViewport.east) < 0.0001 && Math.abs(bounds.getWest() - requestedViewport.west) < 0.0001 && Math.abs(mapbox.getZoom() - requestedViewport.zoom) < 0.01) return;
      mapbox.fitBounds([[requestedViewport.west, requestedViewport.south], [requestedViewport.east, requestedViewport.north]], { duration: 0, maxZoom: requestedViewport.zoom });
    } else if (googleMap) {
      googleMap.panTo({ lat: (requestedViewport.north + requestedViewport.south) / 2, lng: (requestedViewport.east + requestedViewport.west) / 2 });
      googleMap.setZoom(requestedViewport.zoom);
    }
  }, [requestedViewport, mapInstanceVersion]);

  useEffect(() => {
    const mapbox = mapRef.current;
    const googleMap = googleMapRef.current;
    const googleMaps = googleMapsRef.current;
    if (!mapbox && !googleMap) return;
    const markUserViewportChange = () => { userViewportChangeRef.current = true; };
    const markMapControlClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('.gm-bundled-control, .mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out')) {
        userViewportChangeRef.current = true;
      }
    };
    const container = mapbox ? mapbox.getCanvasContainer() : googleMap!.getDiv();
    const mapContainer = mapbox ? mapbox.getContainer() : googleMap!.getDiv();
    container.addEventListener('wheel', markUserViewportChange, { passive: true });
    container.addEventListener('touchstart', markUserViewportChange, { passive: true });
    container.addEventListener('keydown', markUserViewportChange);
    mapContainer.addEventListener('click', markMapControlClick);
    if (mapbox) {
      mapbox.on('dragstart', markUserViewportChange);
      mapbox.on('dblclick', markUserViewportChange);
      container.querySelectorAll<HTMLElement>('.mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out').forEach((button) => button.addEventListener('click', markUserViewportChange));
    } else {
      googleMap!.addListener('dragstart', markUserViewportChange);
      googleMap!.addListener('dblclick', markUserViewportChange);
    }
    const updateViewport = (userInitiated: boolean) => {
      // Applying URL bounds to the map also emits moveend/idle. Only user
      // movement should change the search URL and trigger another map request.
      if (!userInitiated) return;
      const zoom = mapbox ? mapbox.getZoom() : googleMap!.getZoom();
      if (typeof zoom !== 'number') return;
      let north: number; let south: number; let east: number; let west: number;
      if (mapbox) {
        const bounds = mapbox.getBounds();
        if (!bounds) return;
        north = bounds.getNorth(); south = bounds.getSouth(); east = bounds.getEast(); west = bounds.getWest();
      } else {
        const bounds = googleMap!.getBounds();
        if (!bounds) return;
        const northEast = bounds.getNorthEast(); const southWest = bounds.getSouthWest();
        north = northEast.lat(); south = southWest.lat(); east = northEast.lng(); west = southWest.lng();
      }
      const current = searchParamsRef.current;
      const next = writeCatalogueMapViewport(current, {
        north, south, east, west, zoom,
      }, userInitiated);
      if (next.toString() !== current.toString()) { searchParamsRef.current = next; setSearchParamsRef.current(next, { replace: true }); }
    };
    let timer = 0;
    const settled = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const userInitiated = userViewportChangeRef.current;
        userViewportChangeRef.current = false;
        updateViewport(userInitiated);
      }, 300);
    };
    const first = window.setTimeout(() => updateViewport(false), 0);
    if (mapbox) mapbox.on('moveend', settled);
    else googleMap!.addListener('idle', settled);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(timer);
      if (mapbox) mapbox.off('moveend', settled);
      else if (googleMap && googleMaps) googleMaps.event.clearInstanceListeners(googleMap);
      if (mapbox) {
        mapbox.off('dragstart', markUserViewportChange);
        mapbox.off('dblclick', markUserViewportChange);
        container.querySelectorAll<HTMLElement>('.mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out').forEach((button) => button.removeEventListener('click', markUserViewportChange));
      }
      container.removeEventListener('wheel', markUserViewportChange);
      container.removeEventListener('touchstart', markUserViewportChange);
      container.removeEventListener('keydown', markUserViewportChange);
      mapContainer.removeEventListener('click', markMapControlClick);
    };
  }, [mapInstanceVersion]);

  useEffect(() => {
    const params = catalogueQueryForDisplay(new URLSearchParams(queryKey));
    const required = ['north', 'south', 'east', 'west', 'mapZoom'];
    if (params.get('mapActive') !== 'true' || !required.every((key) => params.has(key) && Number.isFinite(Number(params.get(key))))) return;
    const controller = new AbortController();
    void projectService.getProjectMap(params, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setMapResult({ requestKey, projects: response.projects ?? emptyProjects, total: response.total ?? 0, error: '', truncated: response.truncated, limit: response.limit, facets: response.facets ?? {}, diagnostics: response.diagnostics ?? null });
        if (response.normalization?.query !== undefined || hasFeaturedFilterIgnoredNotice(response.normalization?.notices)) {
          const current = searchParamsRef.current;
          if (sameCanonicalCriteria(current, params)) {
            const normalized = adoptCanonicalQuery(current, response.normalization?.query ?? withoutUnsupportedCatalogueFilters(params));
            if (normalized.toString() !== current.toString()) { searchParamsRef.current = normalized; setSearchParams(normalized, { replace: true }); }
          }
        }
      })
      .catch((raw: unknown) => { if (!controller.signal.aborted) setMapResult({ requestKey, projects: emptyProjects, total: 0, error: apiErrorMessage(raw, 'Unable to load project map.'), truncated: false, limit: 0, facets: {}, diagnostics: null }); });
    return () => controller.abort();
  }, [queryKey, requestKey, activeProfile?.id, setSearchParams]);

  useEffect(() => {
    const map = mapRef.current;
    if (mapProvider !== 'mapbox' || !map) return;
    markersRef.current.forEach((marker) => marker.remove());
    const mapped = projects.filter((project) => project.coordinates && Number.isFinite(project.coordinates.lat) && project.coordinates.lat >= -90 && project.coordinates.lat <= 90 && Number.isFinite(project.coordinates.lng) && project.coordinates.lng >= -180 && project.coordinates.lng <= 180);
    markersRef.current = mapped.map((project) => {
      const element = document.createElement('button');
      element.type = 'button'; element.className = 'realtiq-map-marker'; element.title = project.name;
      const label = document.createElement('span'); label.textContent = `${project.availableUnitCount} units`; element.appendChild(label);
      element.addEventListener('click', () => setSelectedProject({ requestKey, project }));
      return new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat([project.coordinates!.lng, project.coordinates!.lat]).addTo(map);
    });
  }, [projects, requestKey, mapInstanceVersion, mapProvider]);

  useEffect(() => {
    const map = googleMapRef.current;
    const maps = googleMapsRef.current;
    if (mapProvider !== 'google_maps' || !map || !maps) return;
    googleMarkersRef.current.forEach(({ marker, listener }) => { listener?.remove(); marker.setMap(null); });
    const mapped = projects.filter((project) => project.coordinates && Number.isFinite(project.coordinates.lat) && project.coordinates.lat >= -90 && project.coordinates.lat <= 90 && Number.isFinite(project.coordinates.lng) && project.coordinates.lng >= -180 && project.coordinates.lng <= 180);
    googleMarkersRef.current = mapped.map((project) => {
      const marker = new maps.Marker({
        map, position: { lat: project.coordinates!.lat, lng: project.coordinates!.lng }, title: project.name,
        label: { text: `${project.availableUnitCount} units`, color: '#ffffff', fontWeight: '700', fontSize: '11px' },
        icon: { path: maps.SymbolPath.CIRCLE, scale: 24, fillColor: '#173d32', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
      });
      const listener = marker.addListener('click', () => setSelectedProject({ requestKey, project }));
      return { marker, listener };
    });
  }, [projects, requestKey, mapInstanceVersion, mapProvider]);

  const discoveryFrom = (location.state as { discoveryFrom?: string } | null)?.discoveryFrom ?? `/projects${location.search}`;
  const selectedPrice = selected
    ? projectMapPricePresentation(selected.minimumPrice, selected.maximumPrice, selected.currency, selected.priceAggregateState)
    : null;
  const selectedDisplayPrice = selectedPrice?.notice
    ? selectedPrice.label
    : selected && selected.currency && (typeof selected.minimumPrice === 'number' || typeof selected.maximumPrice === 'number')
    ? formatPriceRangeForDisplay(selected.minimumPrice, selected.maximumPrice, selected.currency, displayCurrency, officialRate)
    : selectedPrice?.label;
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Projects Map</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Project locations</h1>
          </div>
          <div className="flex items-center gap-3"><span className="text-sm font-semibold text-secondary">{total.toLocaleString()} matching projects</span><button type="button" onClick={() => setRefreshVersion((version) => version + 1)} className="text-sm font-bold text-primary">Refresh</button><Link to={{ pathname: '/projects', search: location.search }} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-bold text-primary">List view</Link></div>
        </header>
        <FxDisplayControl className="mb-4" />
        {loading ? <LoadingState label="Loading project map..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => setRefreshVersion((version) => version + 1)} /> : null}
        {!loading && !error && activeMapResult?.truncated ? <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">The map returned the current configured limit of {activeMapResult.limit} project markers. Zoom in or narrow the map area to see a smaller result set.</p> : null}
        {!loading && !error && activeMapResult ? <CatalogueResultInsights facets={activeMapResult.facets} diagnostics={activeMapResult.diagnostics} onApplySuggestion={(patch) => { const next = writeCatalogueQuery(patch, { base: searchParams, resetPage: true }); searchParamsRef.current = next; setSearchParams(next); }} /> : null}
        <div className="relative min-h-[640px] overflow-hidden rounded-xl bg-surface-container-low">
          <div ref={containerRef} className="absolute inset-0" />
          {mapConfigState.status === 'loading' ? <p role="status" className="absolute left-4 right-4 top-4 z-[1000] rounded-lg bg-white/95 p-3 text-sm text-secondary shadow">Loading active map settings…</p> : null}
          {mapConfigState.status === 'error' ? <div role="alert" className="absolute left-4 right-4 top-4 z-[1000] rounded-lg bg-error-container p-3 text-sm text-on-error-container"><p>{mapConfigState.error}</p><button type="button" className="mt-2 font-bold underline" onClick={() => void refreshMapConfig()}>Retry map settings</button></div> : null}
          {mapTilesError && mapConfigState.status === 'ready' ? <div role="alert" className="absolute left-4 right-4 top-4 z-[1000] rounded-lg bg-error-container p-3 text-sm text-on-error-container"><p>{mapTilesError}</p>{hasCredential(mapConfigState.config.provider) ? <button type="button" className="mt-2 font-bold underline" onClick={() => setMapRetryVersion((version) => version + 1)}>Retry map</button> : null}</div> : null}
          {!loading && !error && mapRequestEnabled && total === 0 ? <div role="status" className="absolute left-4 top-4 z-[1000] rounded-lg bg-white/95 px-4 py-3 text-sm font-semibold text-secondary shadow">No projects match this map area.</div> : null}
          {selected ? (
            <div className="absolute bottom-5 left-5 z-[1000] max-w-sm rounded-xl bg-white p-5 shadow-xl">
              <button type="button" onClick={() => setSelectedProject(null)} className="absolute right-3 top-3 text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="pr-8 text-lg font-black">{selected.name}</h2>
              <p className="mt-1 text-sm text-secondary">{selected.projectType.replaceAll('_', ' ')}</p>
              <p className="mt-3 font-bold">{selectedDisplayPrice}</p>
              {selectedPrice?.notice ? <p role="status" className="mt-1 text-xs text-amber-800">{selectedPrice.notice}</p> : null}
              <p className="text-sm text-secondary">{selected.availableUnitCount} available · {selected.underOfferUnitCount} under offer · {selected.soldUnitCount} sold · {selected.matchingUnitCount} matching units</p>
              <Link to={`/projects/${selected.slug || selected._id}`} state={{ from: `${location.pathname}${location.search}`, discoveryFrom }} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">View project</Link>
            </div>
          ) : null}
        </div>
      </section>
    </PublicLayout>
  );
};

export default ProjectsMap;
