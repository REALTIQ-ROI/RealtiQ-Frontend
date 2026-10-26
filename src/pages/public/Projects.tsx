import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ProjectCard from '../../components/project/ProjectCard';
import PropertyFiltersPanel from '../../components/property/PropertyFiltersPanel';
import ActiveCatalogueFilters from '../../components/property/ActiveCatalogueFilters';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/axios';
import { projectService, type ProjectListResponse } from '../../services/projectService';
import { readCatalogueQuery, writeCatalogueQuery } from '../../utils/catalogueQuery';
import { removeCatalogueFilterChip } from '../../utils/catalogueFilterChips';
import { summarizeCatalogueFacets } from '../../utils/catalogueFacets';

const PAGE_SIZE = 20;
const validPage = (params: URLSearchParams) => {
  const value = Number(params.get('page') ?? 1);
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
};
const searchNotice = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const notice = value as Record<string, unknown>;
  return [notice.message, notice.code].filter((item): item is string => typeof item === 'string').join(' · ');
};

const Projects = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProfile } = useAuth();
  const [data, setData] = useState<ProjectListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const queryKey = searchParams.toString();
  const page = validPage(searchParams);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams(queryKey);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    params.set('queryVersion', 'canonical-v1');
    void projectService.listProjects(params, controller.signal)
      .then((response) => { if (!controller.signal.aborted) setData(response); })
      .catch((raw: unknown) => { if (!controller.signal.aborted) setError(raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})` : raw instanceof Error ? raw.message : 'Unable to load projects.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [queryKey, page, refreshVersion]);

  const projects = data?.projects ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resultLabel = useMemo(() => total === 1 ? '1 project' : `${total.toLocaleString()} projects`, [total]);
  const facets = summarizeCatalogueFacets(data?.facets);

  const applyFilters = (changes: Parameters<typeof writeCatalogueQuery>[0], clearAll = false) => {
    const next = writeCatalogueQuery(changes, { base: searchParams, resetPage: true, clearAll });
    setSearchParams(next);
  };
  const clearFilterChip = (key: string, index: number) => setSearchParams(removeCatalogueFilterChip(searchParams, { key, index }));

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const refresh = () => setRefreshVersion((version) => version + 1);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Developments</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-on-surface sm:text-5xl">Property Projects</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
              Browse estates, apartment developments, housing projects, and off-plan communities. Purchase actions stay on individual property units.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={{ pathname: '/properties', search: location.search }} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-bold text-primary">Browse properties</Link>
            <Link to={{ pathname: '/projects/map', search: location.search }} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">Map view</Link>
          </div>
        </header>

        <div className="-mx-4 mb-6 sm:-mx-8">
          <PropertyFiltersPanel
            key={queryKey}
            initialFilters={readCatalogueQuery(searchParams)}
            initialQuery={searchParams}
            activeProfile={activeProfile}
            entityLabel="projects"
            onApply={applyFilters}
          />
        </div>
        <div className="-mx-4 sm:-mx-8"><ActiveCatalogueFilters params={searchParams} onClear={clearFilterChip} /></div>

        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-sm font-semibold text-secondary">{resultLabel}</p>{facets ? <p className="mt-1 text-xs text-secondary">Available facets: {facets}</p> : null}</div>
          <button type="button" onClick={refresh} className="text-sm font-bold text-primary hover:underline">Refresh</button>
        </div>

        {data?.normalization?.notices?.length ? <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{data.normalization.notices.map((notice, index) => <p key={`project-notice-${index}`}>{searchNotice(notice) || 'The server normalized this search.'}</p>)}</div> : null}

        {loading && !projects.length ? <LoadingState label="Loading projects..." /> : null}
        {error ? <ErrorState message={error} onRetry={refresh} /> : null}
        {!loading && !error && !projects.length ? (
          <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-12 text-center text-secondary">No projects match your search. Try removing one filter at a time.</div>
        ) : null}
        {projects.length ? (
          <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            {projects.map((project) => <ProjectCard key={project._id} project={project} />)}
          </div>
        ) : null}
        {total > PAGE_SIZE ? <nav className="mt-8 flex items-center justify-between" aria-label="Project result pages">
          <button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1 || loading} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button>
          <span className="text-sm font-semibold text-secondary">Page {page} of {totalPages}</span>
          <button type="button" onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loading} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-40">Next</button>
        </nav> : null}
      </section>
    </PublicLayout>
  );
};

export default Projects;
