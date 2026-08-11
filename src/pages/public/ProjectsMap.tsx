import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { projectService, type ProjectMapItem } from '../../services/projectService';
import { formatPriceRange } from '../../utils/projectFormatters';

const defaultBounds = { north: 14.5, south: 4.0, east: 14.7, west: 2.6, zoom: 6 };

const ProjectsMap = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [projects, setProjects] = useState<ProjectMapItem[]>([]);
  const [selected, setSelected] = useState<ProjectMapItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([9.082, 8.6753], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const markers = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersRef.current = markers;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    projectService
      .getProjectMap(defaultBounds)
      .then((response) => setProjects(response.projects ?? []))
      .catch((raw) => setError(raw instanceof Error ? raw.message : 'Unable to load project map.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;
    markers.clearLayers();
    const bounds = L.latLngBounds([]);
    projects.forEach((project) => {
      if (!project.coordinates) return;
      const marker = L.marker([project.coordinates.lat, project.coordinates.lng], {
        title: project.name,
        icon: L.divIcon({
          className: 'realtiq-map-marker',
          html: `<span>${project.availableUnits ?? 0} units</span>`,
          iconSize: [86, 32],
          iconAnchor: [43, 32],
        }),
      });
      marker.on('click', () => setSelected(project));
      markers.addLayer(marker);
      bounds.extend([project.coordinates.lat, project.coordinates.lng]);
    });
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [projects]);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Projects Map</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Project locations</h1>
          </div>
          <Link to="/projects" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-bold text-primary">List view</Link>
        </header>
        {loading ? <LoadingState label="Loading project map..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        <div className="relative min-h-[640px] overflow-hidden rounded-xl bg-surface-container-low">
          <div ref={containerRef} className="absolute inset-0" />
          {selected ? (
            <div className="absolute bottom-5 left-5 z-[1000] max-w-sm rounded-xl bg-white p-5 shadow-xl">
              <button type="button" onClick={() => setSelected(null)} className="absolute right-3 top-3 text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="pr-8 text-lg font-black">{selected.name}</h2>
              <p className="mt-1 text-sm text-secondary">{selected.projectType.replaceAll('_', ' ')}</p>
              <p className="mt-3 font-bold">{formatPriceRange(selected.minimumPrice, selected.maximumPrice)}</p>
              <p className="text-sm text-secondary">{selected.availableUnits ?? 0} available units</p>
              <Link to={`/projects/${selected.slug || selected._id}`} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">View project</Link>
            </div>
          ) : null}
        </div>
      </section>
    </PublicLayout>
  );
};

export default ProjectsMap;
