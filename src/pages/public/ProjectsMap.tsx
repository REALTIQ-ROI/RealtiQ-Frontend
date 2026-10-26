import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import L from 'leaflet';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { projectService, type ProjectMapItem } from '../../services/projectService';
import { projectMapPricePresentation } from '../../utils/projectFormatters';
import { ApiRequestError } from '../../lib/axios';
import { MAP_PROVIDER } from '../../config/maps';
import { configureMapbox, MAPBOX_STYLE, nigeriaCenter } from '../../lib/mapbox';
import { writeCatalogueMapViewport } from '../../utils/catalogueMapViewport';

const emptyProjects: ProjectMapItem[] = [];

const ProjectsMap = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<L.LayerGroup | null>(null);
  const [mapResult, setMapResult] = useState<{ requestKey: string; projects: ProjectMapItem[]; total: number; error: string }>({ requestKey: '', projects: emptyProjects, total: 0, error: '' });
  const [selectedProject, setSelectedProject] = useState<{ requestKey: string; project: ProjectMapItem } | null>(null);
  const [mapTilesError, setMapTilesError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const queryKey = searchParams.toString();
  const requestKey = JSON.stringify([queryKey, refreshVersion]);
  const mapActive = searchParams.get('mapActive') === 'true';
  const mapQueryHasBounds = ['north', 'south', 'east', 'west', 'mapZoom'].every((key) => {
    const value = searchParams.get(key);
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
    if (!keys.every((key) => searchParams.has(key))) return null;
    const [north, south, east, west, zoom] = keys.map((key) => Number(searchParams.get(key)));
    if (![north, south, east, west, zoom].every(Number.isFinite) || north! <= south! || east! <= west! || zoom! < 0) return null;
    return { north: north!, south: south!, east: east!, west: west!, zoom: zoom! };
  }, [searchParams]);

  useEffect(() => {
    if (MAP_PROVIDER !== 'mapbox' || !containerRef.current || mapRef.current) return;
    if (!configureMapbox()) return;
    const map = new mapboxgl.Map({ container: containerRef.current, style: MAPBOX_STYLE, center: nigeriaCenter, zoom: 5.2 });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('error', () => setMapTilesError('Map tiles are unavailable. Use list view to continue browsing projects.'));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (MAP_PROVIDER !== 'leaflet' || !containerRef.current || leafletMapRef.current) return;
    const map = L.map(containerRef.current).setView([9.082, 8.6753], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' })
      .on('tileerror', () => setMapTilesError('Map tiles are unavailable. Use list view to continue browsing projects.'))
      .addTo(map);
    leafletMapRef.current = map; leafletMarkersRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); leafletMapRef.current = null; leafletMarkersRef.current = null; };
  }, []);

  useEffect(() => {
    if (!requestedViewport) return;
    const mapbox = mapRef.current;
    const leaflet = leafletMapRef.current;
    if (mapbox) {
      const bounds = mapbox.getBounds();
      if (bounds && Math.abs(bounds.getNorth() - requestedViewport.north) < 0.0001 && Math.abs(bounds.getSouth() - requestedViewport.south) < 0.0001 && Math.abs(bounds.getEast() - requestedViewport.east) < 0.0001 && Math.abs(bounds.getWest() - requestedViewport.west) < 0.0001 && Math.abs(mapbox.getZoom() - requestedViewport.zoom) < 0.01) return;
      mapbox.fitBounds([[requestedViewport.west, requestedViewport.south], [requestedViewport.east, requestedViewport.north]], { duration: 0, maxZoom: requestedViewport.zoom });
    } else if (leaflet) {
      const bounds = leaflet.getBounds();
      if (Math.abs(bounds.getNorth() - requestedViewport.north) < 0.0001 && Math.abs(bounds.getSouth() - requestedViewport.south) < 0.0001 && Math.abs(bounds.getEast() - requestedViewport.east) < 0.0001 && Math.abs(bounds.getWest() - requestedViewport.west) < 0.0001 && Math.abs(leaflet.getZoom() - requestedViewport.zoom) < 0.01) return;
      leaflet.fitBounds([[requestedViewport.south, requestedViewport.west], [requestedViewport.north, requestedViewport.east]], { animate: false, maxZoom: requestedViewport.zoom });
    }
  }, [requestedViewport]);

  useEffect(() => {
    const mapbox = mapRef.current;
    const leaflet = leafletMapRef.current;
    if (!mapbox && !leaflet) return;
    const markUserViewportChange = () => { userViewportChangeRef.current = true; };
    const container = mapbox ? mapbox.getCanvasContainer() : leaflet!.getContainer();
    container.addEventListener('wheel', markUserViewportChange, { passive: true });
    container.addEventListener('touchstart', markUserViewportChange, { passive: true });
    container.addEventListener('keydown', markUserViewportChange);
    if (mapbox) {
      mapbox.on('dragstart', markUserViewportChange);
      mapbox.on('dblclick', markUserViewportChange);
      container.querySelectorAll<HTMLElement>('.mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out').forEach((button) => button.addEventListener('click', markUserViewportChange));
    } else {
      leaflet!.on('dragstart', markUserViewportChange);
      container.querySelectorAll<HTMLElement>('.leaflet-control-zoom a').forEach((button) => button.addEventListener('click', markUserViewportChange));
    }
    const updateViewport = (userInitiated: boolean) => {
      const bounds = mapbox ? mapbox.getBounds() : leaflet!.getBounds();
      const zoom = mapbox ? mapbox.getZoom() : leaflet!.getZoom();
      if (!bounds) return;
      const current = searchParamsRef.current;
      const next = writeCatalogueMapViewport(current, {
        north: bounds.getNorth(), south: bounds.getSouth(),
        east: bounds.getEast(), west: bounds.getWest(), zoom,
      }, userInitiated);
      if (next.toString() !== current.toString()) setSearchParamsRef.current(next, { replace: true });
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
    else leaflet!.on('moveend zoomend', settled);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(timer);
      if (mapbox) mapbox.off('moveend', settled);
      else leaflet?.off('moveend zoomend', settled);
      if (mapbox) {
        mapbox.off('dragstart', markUserViewportChange);
        mapbox.off('dblclick', markUserViewportChange);
        container.querySelectorAll<HTMLElement>('.mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out').forEach((button) => button.removeEventListener('click', markUserViewportChange));
      } else {
        leaflet?.off('dragstart', markUserViewportChange);
        container.querySelectorAll<HTMLElement>('.leaflet-control-zoom a').forEach((button) => button.removeEventListener('click', markUserViewportChange));
      }
      container.removeEventListener('wheel', markUserViewportChange);
      container.removeEventListener('touchstart', markUserViewportChange);
      container.removeEventListener('keydown', markUserViewportChange);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(queryKey);
    const required = ['north', 'south', 'east', 'west', 'mapZoom'];
    if (params.get('mapActive') !== 'true' || !required.every((key) => params.has(key) && Number.isFinite(Number(params.get(key))))) return;
    const controller = new AbortController();
    void projectService.getProjectMap(params, controller.signal)
      .then((response) => { if (!controller.signal.aborted) setMapResult({ requestKey, projects: response.projects ?? emptyProjects, total: response.total ?? 0, error: '' }); })
      .catch((raw: unknown) => { if (!controller.signal.aborted) setMapResult({ requestKey, projects: emptyProjects, total: 0, error: raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})` : raw instanceof Error ? raw.message : 'Unable to load project map.' }); });
    return () => controller.abort();
  }, [queryKey, requestKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (MAP_PROVIDER !== 'mapbox' || !map) return;
    markersRef.current.forEach((marker) => marker.remove());
    const mapped = projects.filter((project) => project.coordinates && Number.isFinite(project.coordinates.lat) && project.coordinates.lat >= -90 && project.coordinates.lat <= 90 && Number.isFinite(project.coordinates.lng) && project.coordinates.lng >= -180 && project.coordinates.lng <= 180);
    markersRef.current = mapped.map((project) => {
      const element = document.createElement('button');
      element.type = 'button'; element.className = 'realtiq-map-marker'; element.title = project.name;
      const label = document.createElement('span'); label.textContent = `${project.availableUnitCount} units`; element.appendChild(label);
      element.addEventListener('click', () => setSelectedProject({ requestKey, project }));
      return new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat([project.coordinates!.lng, project.coordinates!.lat]).addTo(map);
    });
  }, [projects, requestKey]);

  useEffect(() => {
    const map = leafletMapRef.current; const markers = leafletMarkersRef.current;
    if (MAP_PROVIDER !== 'leaflet' || !map || !markers) return;
    markers.clearLayers();
    projects.forEach((project) => { if (!project.coordinates || !Number.isFinite(project.coordinates.lat) || project.coordinates.lat < -90 || project.coordinates.lat > 90 || !Number.isFinite(project.coordinates.lng) || project.coordinates.lng < -180 || project.coordinates.lng > 180) return; const marker = L.marker([project.coordinates.lat, project.coordinates.lng], { title: project.name, icon: L.divIcon({ className: 'realtiq-map-marker', html: `<span>${project.availableUnitCount} units</span>`, iconSize: [86, 32], iconAnchor: [43, 32] }) }); marker.on('click', () => setSelectedProject({ requestKey, project })); markers.addLayer(marker); });
  }, [projects, requestKey]);

  const discoveryFrom = (location.state as { discoveryFrom?: string } | null)?.discoveryFrom ?? `/projects${location.search}`;
  const selectedPrice = selected
    ? projectMapPricePresentation(selected.minimumPrice, selected.maximumPrice, selected.currency, selected.priceAggregateState)
    : null;
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
        {loading ? <LoadingState label="Loading project map..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => setRefreshVersion((version) => version + 1)} /> : null}
        <div className="relative min-h-[640px] overflow-hidden rounded-xl bg-surface-container-low">
          <div ref={containerRef} className="absolute inset-0" />
          {mapTilesError ? <p role="alert" className="absolute left-4 right-4 top-4 z-[1000] rounded-lg bg-error-container p-3 text-sm text-on-error-container">{mapTilesError}</p> : null}
          {!loading && !error && mapRequestEnabled && total === 0 ? <div role="status" className="absolute left-4 top-4 z-[1000] rounded-lg bg-white/95 px-4 py-3 text-sm font-semibold text-secondary shadow">No projects match this map area.</div> : null}
          {selected ? (
            <div className="absolute bottom-5 left-5 z-[1000] max-w-sm rounded-xl bg-white p-5 shadow-xl">
              <button type="button" onClick={() => setSelectedProject(null)} className="absolute right-3 top-3 text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="pr-8 text-lg font-black">{selected.name}</h2>
              <p className="mt-1 text-sm text-secondary">{selected.projectType.replaceAll('_', ' ')}</p>
              <p className="mt-3 font-bold">{selectedPrice?.label}</p>
              {selectedPrice?.notice ? <p role="status" className="mt-1 text-xs text-amber-800">{selectedPrice.notice}</p> : null}
              <p className="text-sm text-secondary">{selected.availableUnitCount} available · {selected.underOfferUnitCount} under offer · {selected.matchingUnitCount} matching units</p>
              <Link to={`/projects/${selected.slug || selected._id}`} state={{ from: `${location.pathname}${location.search}`, discoveryFrom }} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">View project</Link>
            </div>
          ) : null}
        </div>
      </section>
    </PublicLayout>
  );
};

export default ProjectsMap;
