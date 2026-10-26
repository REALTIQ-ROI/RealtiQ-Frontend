import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyCard from '../../components/property/PropertyCard';
import ActiveCatalogueFilters from '../../components/property/ActiveCatalogueFilters';
import PropertyFiltersPanel from '../../components/property/PropertyFiltersPanel';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import { projectService, type ProjectPropertiesResponse } from '../../services/projectService';
import { isProjectPublished } from '../../utils/projectPublication';
import { readCatalogueQuery, writeCatalogueQuery } from '../../utils/catalogueQuery';
import { removeCatalogueFilterChip } from '../../utils/catalogueFilterChips';
import { summarizeCatalogueFacets } from '../../utils/catalogueFacets';

const PAGE_SIZE = 20;
const pageFromQuery = (params: URLSearchParams) => {
  const page = Number(params.get('page') ?? 1);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
};
const noticeText = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const notice = value as Record<string, unknown>;
  return [notice.message, notice.code].filter((item): item is string => typeof item === 'string').join(' · ');
};

const ProjectProperties = () => {
  const { slug = '' } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProfile } = useAuth();
  const projectNavigationState = location.state as { from?: string; discoveryFrom?: string } | null;
  const queryKey = searchParams.toString();
  const page = pageFromQuery(searchParams);
  const [data, setData] = useState<ProjectPropertiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    const query = new URLSearchParams(queryKey);
    query.set('page', String(page));
    query.set('limit', String(PAGE_SIZE));
    query.set('queryVersion', 'canonical-v1');
    setLoading(true);
    setError('');
    void projectService.getProjectProperties(slug, query, controller.signal)
      .then((response) => { if (!controller.signal.aborted) setData(response); })
      .catch((raw: unknown) => { if (!controller.signal.aborted) setError(raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})` : raw instanceof Error ? raw.message : 'Unable to load project units.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, queryKey, page, refreshVersion]);

  const project = data?.project;
  const projectIsPublic = project ? isProjectPublished(project) : true;
  const properties = projectIsPublic ? data?.properties ?? [] : [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const facets = summarizeCatalogueFacets(data?.facets);
  const applyFilters = (changes: Parameters<typeof writeCatalogueQuery>[0], clearAll = false) => setSearchParams(writeCatalogueQuery(changes, { base: searchParams, resetPage: true, clearAll }));
  const clearFilterChip = (key: string, index: number) => setSearchParams(removeCatalogueFilterChip(searchParams, { key, index }));
  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <PublicLayout>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <Link to={project ? `/projects/${project.slug || project._id}` : '/projects'} state={projectNavigationState} className="text-sm font-bold text-primary hover:underline">Back to project</Link>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{project ? `${project.name} Units` : 'Project Units'}</h1>
        <p className="mt-2 text-sm text-secondary">Filter project child listings and open a unit for its public detail flow.</p>
      </header>
      <div className="-mx-4 mb-5 sm:-mx-8"><PropertyFiltersPanel key={queryKey} initialFilters={readCatalogueQuery(searchParams)} initialQuery={searchParams} activeProfile={activeProfile} onApply={applyFilters} /></div>
      <div className="-mx-4 sm:-mx-8"><ActiveCatalogueFilters params={searchParams} onClear={clearFilterChip} /></div>
      <div className="my-5 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-secondary">{total.toLocaleString()} units</p>{facets ? <p className="mt-1 text-xs text-secondary">Available facets: {facets}</p> : null}</div><button type="button" onClick={() => setRefreshVersion((version) => version + 1)} className="text-sm font-bold text-primary">Refresh</button></div>
      {data?.normalization?.notices?.length ? <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{data.normalization.notices.map((notice, index) => <p key={`unit-search-notice-${index}`}>{noticeText(notice) || 'The server normalized this search.'}</p>)}</div> : null}
      {loading && !properties.length ? <LoadingState label="Loading project units..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => setRefreshVersion((version) => version + 1)} /> : null}
      {!loading && !error && !projectIsPublic ? <div className="rounded-xl border border-dashed border-outline-variant/20 p-10 text-center text-secondary">This project is not published yet.</div> : null}
      {!loading && !error && projectIsPublic && properties.length ? <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>{properties.map((property) => <PropertyCard key={property._id} property={property} />)}</div> : null}
      {!loading && !error && projectIsPublic && !properties.length ? <div className="rounded-xl border border-dashed border-outline-variant/20 p-10 text-center text-secondary">No project units match this search.</div> : null}
      {total > PAGE_SIZE ? <nav className="mt-8 flex items-center justify-between" aria-label="Project unit result pages"><button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1 || loading} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button><span className="text-sm font-semibold text-secondary">Page {page} of {totalPages}</span><button type="button" onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loading} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-40">Next</button></nav> : null}
    </section>
  </PublicLayout>;
};

export default ProjectProperties;
