import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PublicLayout from "../../components/layout/PublicLayout";
import PropertyCard from "../../components/property/PropertyCard";
import ActiveCatalogueFilters from "../../components/property/ActiveCatalogueFilters";
import PropertyFiltersPanel from "../../components/property/PropertyFiltersPanel";
import PropertyMap from "../../components/property/map/PropertyMap";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import { useAuth } from "../../contexts/AuthContext";
import { useProperties as usePropertyCatalog } from "../../hooks/useProperties";
import { personalisationService } from "../../services/personalisationService";
import { propertyService } from "../../services/propertyService";
import type { CanonicalMapMarker } from '../../types/canonicalMap';
import { canonicalMapMarkers } from '../../utils/canonicalMapMarkers';
import { cataloguePageFromQuery, readCatalogueQuery, writeCatalogueQuery } from "../../utils/catalogueQuery";
import { removeCatalogueFilterChip } from '../../utils/catalogueFilterChips';
import { summarizeCatalogueFacets } from '../../utils/catalogueFacets';
import { savedSearchFiltersFromUrl } from '../../utils/savedSearchQuery';
import type { SavedSearch } from '../../types';
import { ApiRequestError } from '../../lib/axios';
import { writeCatalogueMapViewport } from '../../utils/catalogueMapViewport';
import {
  propertyPublicReference,
  propertyRouteReference,
  type Property,
} from "../../types";

const LIMIT = 10;
const formatRange = (page: number, total: number) =>
  total === 0
    ? "0 properties"
    : `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}`;
const mapNoticeText = (notice: unknown): string => {
  if (typeof notice === 'string') return notice;
  if (!notice || typeof notice !== 'object') return '';
  const item = notice as Record<string, unknown>;
  return [item.message, item.code].filter((value): value is string => typeof value === 'string').join(' · ');
};

const Listings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSavedSearchEdit = (location.state as { savedSearchEdit?: { id?: string; name?: string; revision?: number } } | null)?.savedSearchEdit;
  const [savedSearchEdit, setSavedSearchEdit] = useState(initialSavedSearchEdit?.id && Number.isInteger(initialSavedSearchEdit.revision)
    ? { id: initialSavedSearchEdit.id, name: initialSavedSearchEdit.name ?? '', revision: initialSavedSearchEdit.revision as number }
    : null);
  const [savedSearchConflict, setSavedSearchConflict] = useState<SavedSearch | null>(null);
  const [reviewedLatestSavedSearch, setReviewedLatestSavedSearch] = useState(false);
  const [savedSearchError, setSavedSearchError] = useState('');
  const [initialFilters] = useState(() => new URLSearchParams(searchParams));
  const [initialPage] = useState(() => cataloguePageFromQuery(searchParams));
  const appliedQueryKey = useRef(searchParams.toString());
  const { user, activeProfile } = useAuth();
  const {
    properties,
    loading,
    error,
    notices,
    diagnostics,
    facets,
    total,
    page,
    filters,
    fetchProperties,
    applyFilters,
    goToPage,
  } = usePropertyCatalog({ autoFetch: true, limit: LIMIT, initialFilters, initialPage });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  const [viewport, setViewport] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  } | null>(null);
  const [mapState, setMapState] = useState<{ queryKey: string; count: number | null; error: string | null; markers: CanonicalMapMarker[]; skipped: number; mode: 'properties' | 'clusters' | null; truncated: boolean; facets: Record<string, unknown>; priceAggregateState: string | null; normalizationNotices: unknown[] }>({ queryKey: '', count: null, error: null, markers: [], skipped: 0, mode: null, truncated: false, facets: {}, priceAggregateState: null, normalizationNotices: [] });
  const mapQuery = new URLSearchParams(searchParams);
  mapQuery.delete('page');
  mapQuery.delete('limit');
  const mapQueryKey = mapQuery.toString();
  const mapActive = searchParams.get('mapActive') === 'true';
  const requestedViewport = useMemo(() => {
    const keys = ['north', 'south', 'east', 'west', 'mapZoom'] as const;
    const values = keys.map((key) => Number(searchParams.get(key)));
    if (!keys.every((key) => searchParams.has(key)) || values.some((value) => !Number.isFinite(value))) return null;
    const [north, south, east, west, zoom] = values;
    if (north! <= south! || east! <= west! || zoom! < 0) return null;
    return { north: north!, south: south!, east: east!, west: west!, zoom: zoom! };
  }, [searchParams]);
  const mapLoading = mapActive && mapState.queryKey !== mapQueryKey;
  const mapResultCount = mapState.queryKey === mapQueryKey ? mapState.count : null;
  const mapError = mapState.queryKey === mapQueryKey ? mapState.error : null;
  const activeMapMarkers = mapActive && mapState.queryKey === mapQueryKey ? mapState.markers : [];
  const catalogueFacets = summarizeCatalogueFacets(facets);
  const mapFacets = summarizeCatalogueFacets(mapState.facets);
  const resultsRef = useRef<HTMLDivElement>(null);
  const viewportKey = useRef("");
  const viewportInteracted = useRef(false);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState(initialSavedSearchEdit?.name ?? '');
  const [savingSearch, setSavingSearch] = useState(false);
  useEffect(() => {
    const key = searchParams.toString();
    if (key === appliedQueryKey.current) return;
    appliedQueryKey.current = key;
    viewportKey.current = '';
    viewportInteracted.current = false;
    applyFilters(new URLSearchParams(searchParams), cataloguePageFromQuery(searchParams));
  }, [searchParams, applyFilters]);

  useEffect(() => {
    const query = new URLSearchParams(mapQueryKey);
    if (query.get('mapActive') !== 'true') return;
    const controller = new AbortController();
    void propertyService.getCanonicalMap(query, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const parsed = canonicalMapMarkers(result);
        setMapState({ queryKey: mapQueryKey, count: Number.isFinite(result.total) ? result.total : null, error: null,
          markers: parsed.markers, skipped: parsed.skipped, mode: result.mode,
          truncated: result.mode === 'properties' && result.truncated,
          facets: result.facets ?? {}, priceAggregateState: result.mode === 'clusters' ? result.priceAggregateState ?? null : null,
          normalizationNotices: result.normalization?.notices ?? [] });
      })
      .catch((raw: unknown) => {
        if (!controller.signal.aborted) setMapState({ queryKey: mapQueryKey, count: null, error: raw instanceof Error ? raw.message : 'Map results are unavailable.', markers: [], skipped: 0, mode: null, truncated: false, facets: {}, priceAggregateState: null, normalizationNotices: [] });
      });
    return () => controller.abort();
  }, [mapQueryKey]);

  const handleApplyFilters = useCallback(
    (changes: Parameters<typeof writeCatalogueQuery>[0], clearAll = false) => {
      const patch = viewport && viewportInteracted.current && !clearAll
        ? { ...changes, north: viewport.north, south: viewport.south, east: viewport.east, west: viewport.west, mapActive: true, mapZoom: viewport.zoom }
        : changes;
      const nextParams = writeCatalogueQuery(patch, { base: searchParams, resetPage: true, clearAll });
      if (clearAll) {
        setViewport(null);
        viewportKey.current = '';
        viewportInteracted.current = false;
      }
      appliedQueryKey.current = nextParams.toString();
      setSearchParams(nextParams);
      applyFilters(nextParams);
    },
    [applyFilters, searchParams, viewport, setSearchParams],
  );

  const handleViewportChange = useCallback(
    (nextViewport: typeof viewport & object, userInitiated = false) => {
      const key = Object.values(nextViewport)
        .map((value) => Math.round(value * 100_000) / 100_000)
        .join(":");
      const previous = viewportKey.current;
      if (key === previous) return;
      viewportKey.current = key;
      setViewport(nextViewport);
      if (userInitiated) viewportInteracted.current = true;
      const nextParams = writeCatalogueMapViewport(searchParams, nextViewport, userInitiated);
      appliedQueryKey.current = nextParams.toString();
      setSearchParams(nextParams);
      applyFilters(nextParams, userInitiated ? 1 : cataloguePageFromQuery(nextParams));
    },
    [applyFilters, searchParams, setSearchParams],
  );

  const selectProperty = useCallback((property: Property) => {
    setSelectedPropertyId(propertyRouteReference(property));
    window.requestAnimationFrame(() =>
      document
        .getElementById(`property-card-${propertyRouteReference(property)}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  }, []);

  const handleSave = async (property: Property) => {
    if (!user) {
      navigate("/login-required");
      return;
    }
    try {
      const reference = propertyPublicReference(property);
      if (!reference) {
        toast.error("This listing is missing its public reference.");
        return;
      }
      await personalisationService.setFavourite(reference, true);
      toast.success("Property saved to your profile.");
      void fetchProperties(filters, page);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to save property.",
      );
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const changePage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage <= 1) nextParams.delete('page');
    else nextParams.set('page', String(nextPage));
    appliedQueryKey.current = nextParams.toString();
    setSearchParams(nextParams);
    goToPage(nextPage);
    resultsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const clearFilterChip = (key: string, index: number) => {
    const next = removeCatalogueFilterChip(searchParams, { key, index });
    appliedQueryKey.current = next.toString();
    setSearchParams(next);
    applyFilters(next);
  };

  const saveCurrentSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !activeProfile) { navigate('/login-required'); return; }
    const name = savedSearchName.trim();
    if (!name || savingSearch) return;
    setSavingSearch(true);
    setSavedSearchError('');
    try {
      const filters = savedSearchFiltersFromUrl(new URLSearchParams(searchParams));
      if (savedSearchEdit) {
        const expectedConfigurationRevision = savedSearchConflict
          ? reviewedLatestSavedSearch ? savedSearchConflict.configurationRevision : savedSearchEdit.revision
          : savedSearchEdit.revision;
        const updated = await personalisationService.updateSearch(savedSearchEdit.id, { name, filters, expectedConfigurationRevision });
        toast.success(`Saved search updated to revision ${updated.configurationRevision}.`);
      } else {
        await personalisationService.createSearch({ name, filters });
        toast.success('Search saved to this profile.');
      }
      setSavedSearchName('');
      setSaveSearchOpen(false);
      setSavedSearchEdit(null);
      setSavedSearchConflict(null);
      setReviewedLatestSavedSearch(false);
    } catch (raw) {
      if (savedSearchEdit && raw instanceof ApiRequestError && raw.code === 'CONFLICT_SAVED_SEARCH_VERSION') {
        try {
          const latest = await personalisationService.getSearch(savedSearchEdit.id);
          setSavedSearchConflict(latest);
          setReviewedLatestSavedSearch(false);
          setSavedSearchError(`Saved search changed on the server. Latest revision ${latest.configurationRevision} is shown below. Your current filters and name are preserved for review.`);
        } catch (refreshError) { setSavedSearchError(refreshError instanceof Error ? refreshError.message : 'The latest saved-search revision could not be loaded.'); }
      } else {
        const message = raw instanceof Error ? raw.message : 'Unable to save this search.';
        setSavedSearchError(message);
        toast.error(message);
      }
    } finally { setSavingSearch(false); }
  };

  return (
    <PublicLayout fullHeight>
      <section className="flex h-full min-h-0 flex-col lg:h-full">
        <div className="flex flex-wrap items-center justify-end gap-3 px-4 pt-3">
          {user ? <>
            {!saveSearchOpen ? <button type="button" className="rounded-lg border border-outline-variant/30 bg-white px-4 py-2 text-sm font-bold text-primary" onClick={() => setSaveSearchOpen(true)}>{savedSearchEdit ? 'Update saved search' : 'Save this search'}</button> : null}
            {saveSearchOpen ? <form onSubmit={(event) => void saveCurrentSearch(event)} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2">
              <label className="sr-only" htmlFor="saved-search-name">Saved search name</label>
              <input id="saved-search-name" value={savedSearchName} onChange={(event) => setSavedSearchName(event.target.value)} maxLength={120} required placeholder="Name this search" className="rounded-md border border-outline-variant/30 px-3 py-2 text-sm" />
              <button type="submit" disabled={savingSearch || !savedSearchName.trim() || Boolean(savedSearchConflict && !reviewedLatestSavedSearch)} className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{savingSearch ? 'Saving…' : savedSearchEdit ? 'Update search' : 'Save search'}</button>
              <button type="button" disabled={savingSearch} onClick={() => setSaveSearchOpen(false)} className="px-3 py-2 text-sm font-semibold text-secondary">Cancel</button>
              {savedSearchEdit ? <p className="w-full text-xs text-secondary">Updating saved search revision {savedSearchConflict?.configurationRevision ?? savedSearchEdit.revision}. Pagination is excluded; current canonical criteria are retained.</p> : null}
              {savedSearchError ? <div role="alert" className="w-full rounded bg-amber-50 p-3 text-xs text-amber-950">{savedSearchError}{savedSearchConflict ? <><pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap">Latest server criteria: {JSON.stringify(savedSearchConflict.filters)}</pre><label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={reviewedLatestSavedSearch} onChange={(event) => setReviewedLatestSavedSearch(event.target.checked)} />I reviewed the latest revision and want to apply my current search criteria.</label></> : null}</div> : null}
            </form> : null}
          </> : null}
        </div>
        <PropertyFiltersPanel
          key={searchParams.toString()}
          initialFilters={readCatalogueQuery(searchParams)}
          initialQuery={searchParams}
          activeProfile={activeProfile}
          onApply={handleApplyFilters}
        />
        <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(380px,1fr)]">
          <section
            className="relative h-[52vh] min-h-[420px] overflow-hidden bg-surface-container-low lg:h-full lg:min-h-0"
            aria-label="Property map panel"
          >
            <PropertyMap
              properties={properties}
              canonicalMarkers={activeMapMarkers}
              onSelectCanonicalMarker={async (marker) => {
                const loaded = properties.find((item) => propertyPublicReference(item) === marker.reference);
                if (loaded) { selectProperty(loaded); return loaded; }
                try {
                  const property = await propertyService.getPublicProperty(marker.reference);
                  selectProperty(property);
                  return property;
                } catch (raw) {
                  toast.error(raw instanceof Error ? raw.message : 'Unable to load this property preview.');
                  return undefined;
                }
              }}
              detailsPath={(property) => {
                const reference = propertyPublicReference(property);
                return reference ? `/properties/${reference}` : "";
              }}
              className="h-full min-h-0 rounded-none"
              onViewportChange={handleViewportChange}
              requestedViewport={requestedViewport}
              onSelectProperty={selectProperty}
            />
            {loading ? (
              <div className="absolute left-4 top-4 z-[1000] rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-secondary shadow">
                Updating this area…
              </div>
            ) : null}
            {searchParams.get('mapActive') === 'true' ? <div className="absolute bottom-4 left-4 z-[1000] max-w-[min(90%,340px)] rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-secondary shadow" role="status">
              {mapLoading ? 'Checking map results…' : mapError ? `Map results unavailable: ${mapError}` : mapResultCount === null ? 'Map result count unavailable.' : `${mapResultCount} properties match this map area.`}
              {!mapLoading && !mapError && mapState.queryKey === mapQueryKey ? <span className="mt-1 block font-normal">{mapState.mode === 'clusters' ? `${mapState.markers.length} server clusters shown.` : `${mapState.markers.length} server property markers shown${mapState.truncated ? ' (page limit reached)' : ''}.`}{mapState.skipped ? ` ${mapState.skipped} returned items lacked safe marker coordinates or references.` : ''}</span> : null}
              {!mapLoading && !mapError && mapState.queryKey === mapQueryKey && mapFacets ? <span className="mt-1 block font-normal">Facets: {mapFacets}</span> : null}
              {!mapLoading && !mapError && mapState.queryKey === mapQueryKey && mapState.priceAggregateState === 'fx_unconfigured' ? <span className="mt-1 block font-semibold text-amber-800">Price aggregates are unavailable because currency conversion is not configured.</span> : null}
              {!mapLoading && !mapError && mapState.queryKey === mapQueryKey ? mapState.normalizationNotices.map((notice, index) => mapNoticeText(notice) ? <span key={`map-notice-${index}`} className="mt-1 block font-normal">Search notice: {mapNoticeText(notice)}</span> : null) : null}
            </div> : null}
          </section>
          <section
            className="flex min-h-[480px] min-w-0 flex-col border-l border-outline-variant/20 bg-surface lg:min-h-0"
            aria-label="Property results"
          >
            <header className="shrink-0 border-b border-outline-variant/20 bg-surface px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="font-headline text-xl font-extrabold tracking-tight text-on-surface">
                    Properties
                  </h1>
                  <p className="mt-1 text-xs font-semibold text-secondary">
                    {formatRange(page, total)}
                  </p>
                  {catalogueFacets ? <p className="mt-1 text-[11px] text-secondary">Available facets: {catalogueFacets}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void fetchProperties(filters, page)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                  aria-label="Refresh properties"
                >
                  <span className="material-symbols-outlined text-base">
                    refresh
                  </span>
                  Refresh
                </button>
              </div>
            </header>
            {notices.length > 0 ? <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900" role="status">
              {notices.map((notice, index) => <p key={index}>{typeof notice === 'string' ? notice : notice && typeof notice === 'object' && 'code' in notice ? String(notice.code) : 'Search results were adjusted by the server.'}</p>)}
            </div> : null}
            <ActiveCatalogueFilters params={searchParams} onClear={clearFilterChip} />
            <div
              ref={resultsRef}
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"
            >
              {error ? (
                <ErrorState
                  message={error}
                  onRetry={() => void fetchProperties(filters, page)}
                />
              ) : null}
              {loading && properties.length === 0 ? (
                <LoadingState label="Loading properties..." />
              ) : null}
              {!loading && !error && properties.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-8 text-center">
                  <span className="material-symbols-outlined mb-3 block text-4xl text-secondary/40">
                    search_off
                  </span>
                  <h2 className="font-bold text-on-surface">
                    No properties match this search.
                  </h2>
                  <p className="mt-2 text-sm text-secondary">
                    Try adjusting your filters or map area.
                  </p>
                  {diagnostics ? <p className="mt-2 text-xs text-secondary">The server has search diagnostics for this result. Try removing one filter at a time; your current search was not changed.</p> : null}
                </div>
              ) : null}
              {properties.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {properties.map((property) => (
                    <div
                      id={`property-card-${propertyRouteReference(property)}`}
                      key={propertyRouteReference(property)}
                      className={
                        selectedPropertyId === propertyRouteReference(property)
                          ? "rounded-xl ring-2 ring-primary/40"
                          : ""
                      }
                      onMouseEnter={() =>
                        setSelectedPropertyId(propertyRouteReference(property))
                      }
                    >
                      <PropertyCard
                        property={property}
                        showSaveAction
                        onSave={handleSave}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {loading && properties.length > 0 ? (
                <div className="absolute inset-0 flex items-start justify-center bg-surface/55 pt-4">
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-secondary shadow">
                    Loading results…
                  </span>
                </div>
              ) : null}
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-outline-variant/20 bg-surface px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold disabled:opacity-40"
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-secondary">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => changePage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold disabled:opacity-40"
                aria-label="Next page"
              >
                Next
              </button>
            </footer>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Listings;
