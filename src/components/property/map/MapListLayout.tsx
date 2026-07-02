import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Property } from '../../../types';
import MediaPreview from '../MediaPreview';
import MobileMapListToggle, { type MapListView } from './MobileMapListToggle';
import PropertyMap from './PropertyMap';

interface Props {
  properties: Property[];
  detailsPath: (property: Property) => string;
  actions?: (property: Property) => ReactNode;
  children: ReactNode;
  mapClassName?: string;
}

const matchesSearch = (property: Property, query: string) =>
  !query || `${property.title} ${property.location} ${property.propertyType}`.toLowerCase().includes(query.toLowerCase());

const MapListLayout = ({ properties, detailsPath, actions, children, mapClassName = '' }: Props) => {
  const [mobileView, setMobileView] = useState<MapListView>('list');
  const [fullscreen, setFullscreen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [fullscreen]);

  const fullscreenProperties = useMemo(
    () => properties.filter((property) =>
      matchesSearch(property, debouncedQuery) &&
      (!propertyType || property.propertyType === propertyType) &&
      (!status || property.status === status),
    ),
    [debouncedQuery, properties, propertyType, status],
  );
  const propertyTypes = useMemo(() => [...new Set(properties.map((property) => property.propertyType))].sort(), [properties]);

  const fullscreenFilters = (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <select aria-label="Filter by property type" value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="min-w-0 rounded-lg bg-surface-container-low px-2 py-2 text-xs outline-none"><option value="">All types</option>{propertyTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
      <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-0 rounded-lg bg-surface-container-low px-2 py-2 text-xs outline-none"><option value="">Any status</option><option value="available">Available</option><option value="sold">Sold</option></select>
    </div>
  );

  const resultCards = (
    <div className="space-y-3 p-3">
      {fullscreenProperties.length ? fullscreenProperties.map((property) => (
        <article key={property._id} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-container-low"><MediaPreview media={property.media?.[0]} alt={property.title} className="h-full w-full object-cover" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-on-surface">{property.title}</h3>
            <p className="truncate text-xs text-secondary">{property.location}</p>
            <p className="mt-1 text-sm font-black text-primary">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: property.currency || 'NGN', maximumFractionDigits: 0 }).format(property.price)}</p>
            <Link to={detailsPath(property)} className="mt-1 inline-block text-xs font-bold text-primary hover:underline">View Details</Link>
          </div>
        </article>
      )) : <div className="p-8 text-center text-sm text-secondary">No properties match your search.</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1"><MobileMapListToggle value={mobileView} onChange={setMobileView} /></div>
        <button type="button" onClick={() => setFullscreen(true)} className="inline-flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2.5 text-sm font-bold text-primary" aria-label="Open fullscreen property map"><span className="material-symbols-outlined text-lg">fullscreen</span><span className="hidden sm:inline">Fullscreen map</span></button>
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(360px,1fr)_minmax(0,1.15fr)] lg:gap-6 lg:items-start">
        <div className={`${mobileView === 'map' ? 'block' : 'hidden'} lg:block lg:sticky lg:top-4`}><PropertyMap properties={properties} detailsPath={detailsPath} actions={actions} className={`lg:h-[calc(100vh-8rem)] ${mapClassName}`} /></div>
        <div className={`${mobileView === 'list' ? 'block' : 'hidden'} min-w-0 lg:block`}>{children}</div>
      </div>

      {fullscreen ? (
        <div className="fixed inset-0 z-[2000] bg-surface" role="dialog" aria-modal="true" aria-label="Fullscreen property map">
          <div className="absolute inset-0 lg:right-[360px]"><PropertyMap properties={fullscreenProperties} detailsPath={detailsPath} actions={actions} className="h-full min-h-0 rounded-none" /></div>
          <button type="button" onClick={() => setFullscreen(false)} className="absolute right-3 top-3 z-[2100] flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-primary shadow-lg lg:right-[372px]" aria-label="Exit fullscreen map"><span className="material-symbols-outlined">close_fullscreen</span><span className="hidden sm:inline">Exit</span></button>
          <aside className="absolute bottom-0 right-0 top-0 hidden w-[360px] flex-col border-l border-outline-variant/20 bg-surface-container-low lg:flex">
            <div className="border-b border-outline-variant/20 bg-white p-4"><h2 className="font-bold text-on-surface">Properties ({fullscreenProperties.length})</h2><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search properties..." className="mt-3 w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" autoFocus />{fullscreenFilters}</div>
            <div className="min-h-0 flex-1 overflow-y-auto">{resultCards}</div>
          </aside>
          <div className={`absolute inset-x-0 bottom-0 z-[2050] flex max-h-[70vh] flex-col rounded-t-2xl bg-surface shadow-2xl transition-transform lg:hidden ${sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-64px)]'}`}>
            <button type="button" onClick={() => setSheetOpen((value) => !value)} className="flex min-h-16 items-center justify-between px-5" aria-expanded={sheetOpen}><span className="font-bold">{fullscreenProperties.length} properties</span><span className="material-symbols-outlined">{sheetOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}</span></button>
            <div className="border-t border-outline-variant/20 px-3 pb-2"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search properties..." className="mt-3 w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />{fullscreenFilters}</div>
            <div className="min-h-0 flex-1 overflow-y-auto">{resultCards}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MapListLayout;
