import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PublicLayout from "../../components/layout/PublicLayout";
import PropertyCard from "../../components/property/PropertyCard";
import PropertyFiltersPanel from "../../components/property/PropertyFiltersPanel";
import PropertyMap from "../../components/property/map/PropertyMap";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import { useAuth } from "../../contexts/AuthContext";
import { useProperties as usePropertyCatalog } from "../../hooks/useProperties";
import { personalisationService } from "../../services/personalisationService";
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

const Listings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    properties,
    loading,
    error,
    total,
    page,
    filters,
    fetchProperties,
    applyFilters,
    goToPage,
  } = usePropertyCatalog({ autoFetch: true, limit: LIMIT });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  const [localSearch, setLocalSearch] = useState("");
  const [viewport, setViewport] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const viewportKey = useRef("");
  const normalizedSearch = localSearch.trim().toLowerCase();
  const visibleProperties = normalizedSearch
    ? properties.filter((property) =>
        `${property.title} ${property.location} ${property.propertyType} ${property.project?.name ?? ""}`
          .toLowerCase()
          .includes(normalizedSearch),
      )
    : properties;

  const handleApplyFilters = useCallback(
    (nextFilters: typeof filters) => {
      applyFilters(viewport ? { ...nextFilters, ...viewport } : nextFilters);
    },
    [applyFilters, viewport],
  );

  const handleViewportChange = useCallback(
    (nextViewport: typeof viewport & object) => {
      const key = Object.values(nextViewport)
        .map((value) => Math.round(value * 100) / 100)
        .join(":");
      if (key === viewportKey.current) return;
      viewportKey.current = key;
      setViewport(nextViewport);
      if (!viewport) return;
      applyFilters({ ...filters, ...nextViewport });
    },
    [applyFilters, filters, viewport],
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
    goToPage(nextPage);
    resultsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PublicLayout fullHeight>
      <section className="flex h-full min-h-0 flex-col lg:h-full">
        <PropertyFiltersPanel
          initialFilters={filters}
          onApply={handleApplyFilters}
          onSearchChange={setLocalSearch}
        />
        <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(380px,1fr)]">
          <section
            className="relative h-[52vh] min-h-[420px] overflow-hidden bg-surface-container-low lg:h-full lg:min-h-0"
            aria-label="Property map panel"
          >
            <PropertyMap
              properties={properties}
              detailsPath={(property) => {
                const reference = propertyPublicReference(property);
                return reference ? `/properties/${reference}` : "";
              }}
              className="h-full min-h-0 rounded-none"
              onViewportChange={handleViewportChange}
              onSelectProperty={selectProperty}
            />
            {loading ? (
              <div className="absolute left-4 top-4 z-[1000] rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-secondary shadow">
                Updating this area…
              </div>
            ) : null}
          </section>
          <section
            className="flex min-h-[480px] min-w-0 flex-col border-l border-outline-variant/20 bg-surface lg:min-h-0"
            aria-label="Property results"
          >
            <header className="shrink-0 border-b border-outline-variant/20 bg-surface px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="font-headline text-xl font-extrabold tracking-tight text-on-surface">
                    {normalizedSearch
                      ? "Matching loaded properties"
                      : "Properties"}
                  </h1>
                  <p className="mt-1 text-xs font-semibold text-secondary">
                    {normalizedSearch
                      ? `${visibleProperties.length} loaded ${visibleProperties.length === 1 ? "property" : "properties"} match`
                      : formatRange(page, total)}
                  </p>
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
              {!loading && !error && visibleProperties.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-8 text-center">
                  <span className="material-symbols-outlined mb-3 block text-4xl text-secondary/40">
                    search_off
                  </span>
                  <h2 className="font-bold text-on-surface">
                    {normalizedSearch
                      ? "No loaded properties match your search."
                      : "No properties found in this area."}
                  </h2>
                  <p className="mt-2 text-sm text-secondary">
                    {normalizedSearch
                      ? "Try a different search."
                      : "Try zooming out or adjusting your filters."}
                  </p>
                </div>
              ) : null}
              {visibleProperties.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {visibleProperties.map((property) => (
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
