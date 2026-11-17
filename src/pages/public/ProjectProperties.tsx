import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyCard from '../../components/property/PropertyCard';
import ActiveCatalogueFilters from '../../components/property/ActiveCatalogueFilters';
import PropertyFiltersPanel from '../../components/property/PropertyFiltersPanel';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import Button from '../../components/ui/Button';
import ModalPortal from '../../components/ui/ModalPortal';
import InquiryForm from '../../components/forms/InquiryForm';
import CatalogueResultInsights from '../../components/property/CatalogueResultInsights';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { projectService, type ProjectPropertiesResponse } from '../../services/projectService';
import { isProjectPublished } from '../../utils/projectPublication';
import { adoptCanonicalQuery, catalogueFilterFormKey, readCatalogueQuery, sameCanonicalCriteria, writeCatalogueQuery } from '../../utils/catalogueQuery';
import { removeCatalogueFilterChip } from '../../utils/catalogueFilterChips';
import { inquiryService } from '../../services/inquiryService';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProfile, isAuthenticated } = useAuth();
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<Record<string, import('../../types').Property>>({});
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const searchParamsRef = useRef(searchParams);
  useEffect(() => { searchParamsRef.current = searchParams; }, [searchParams]);
  const projectNavigationState = location.state as { from?: string; discoveryFrom?: string } | null;
  const queryKey = searchParams.toString();
  const page = pageFromQuery(searchParams);
  const [data, setData] = useState<ProjectPropertiesResponse | null>(null);
  const [dataProfileId, setDataProfileId] = useState<string | null>(activeProfile?.id ?? null);
  const [requestState, setRequestState] = useState<{ key: string; error: string | null } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestKey = JSON.stringify([slug, queryKey, page, refreshVersion, activeProfile?.id ?? null]);
  const loading = requestState?.key !== requestKey;
  const error = requestState?.key === requestKey ? requestState.error ?? '' : '';

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    const query = new URLSearchParams(queryKey);
    query.set('page', String(page));
    query.set('limit', String(PAGE_SIZE));
    query.set('queryVersion', 'canonical-v1');
    void projectService.getProjectProperties(slug, query, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setData(response);
          setDataProfileId(activeProfile?.id ?? null);
          setRequestState({ key: requestKey, error: null });
          if (response.normalization?.query !== undefined) {
            const current = searchParamsRef.current;
            if (sameCanonicalCriteria(current, query)) {
              const normalized = adoptCanonicalQuery(current, response.normalization.query);
              if (normalized.toString() !== current.toString()) {
                searchParamsRef.current = normalized;
                setSearchParams(normalized, { replace: true });
              }
            }
          }
        }
      })
      .catch((raw: unknown) => {
        if (!controller.signal.aborted) {
          const message = apiErrorMessage(raw, 'Unable to load project units.');
          setRequestState({ key: requestKey, error: message });
        }
      });
    return () => controller.abort();
  }, [slug, queryKey, page, refreshVersion, requestKey, activeProfile?.id, setSearchParams]);

  const currentData = dataProfileId === (activeProfile?.id ?? null) ? data : null;
  const project = currentData?.project;
  const projectIsPublic = project ? isProjectPublished(project) : true;
  const properties = projectIsPublic ? currentData?.properties ?? [] : [];
  const total = currentData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const applyFilters = (changes: Parameters<typeof writeCatalogueQuery>[0], clearAll = false) => setSearchParams(writeCatalogueQuery(changes, { base: searchParams, resetPage: true, clearAll }));
  const clearFilterChip = (key: string, index: number) => setSearchParams(removeCatalogueFilterChip(searchParams, { key, index }));
  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => { setSelectedUnitIds([]); setSelectedUnits({}); }, [slug, activeProfile?.id]);
  const toggleUnitSelection = (property: import('../../types').Property) => {
    setSelectedUnitIds((current) => current.includes(property._id)
      ? current.filter((id) => id !== property._id)
      : current.length < 100 ? [...current, property._id] : current);
    setSelectedUnits((current) => {
      if (property._id in current) { const next = { ...current }; delete next[property._id]; return next; }
      return Object.keys(current).length < 100 ? { ...current, [property._id]: property } : current;
    });
  };
  const startNegotiation = () => {
    if (!selectedUnitIds.length) return;
    const target = `/dashboard/buyer/sale-negotiations/new?${selectedUnitIds.map((id) => `propertyId=${encodeURIComponent(id)}`).join('&')}`;
    if (activeProfile?.kind === 'buyer') navigate(target);
    else if (!isAuthenticated) navigate('/login-to-purchase', { state: { redirectTo: target } });
    else toast.error('Select an eligible Buyer profile to start a purchase negotiation.');
  };

  return <PublicLayout>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <Link to={project ? `/projects/${project.slug || project._id}` : '/projects'} state={projectNavigationState} className="text-sm font-bold text-primary hover:underline">Back to project</Link>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{project ? `${project.name} Units` : 'Project Units'}</h1>
        <p className="mt-2 text-sm text-secondary">Filter project child listings and open a unit for its public detail flow.</p>
      </header>
      <div className="-mx-4 mb-5 sm:-mx-8"><PropertyFiltersPanel key={catalogueFilterFormKey(searchParams)} initialFilters={readCatalogueQuery(searchParams)} initialQuery={searchParams} activeProfile={activeProfile} onApply={applyFilters} /></div>
      <div className="-mx-4 sm:-mx-8"><ActiveCatalogueFilters params={searchParams} onClear={clearFilterChip} /></div>
      <CatalogueResultInsights facets={currentData?.facets} diagnostics={currentData?.diagnostics} onApplySuggestion={(patch) => applyFilters(patch)} />
      <div className="my-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-secondary">{total.toLocaleString()} units</p><div className="flex items-center gap-3"><button type="button" onClick={() => setRefreshVersion((version) => version + 1)} className="text-sm font-bold text-primary">Refresh</button>{selectedUnitIds.length ? <><Button type="button" disabled={selectedUnitIds.length > 100} onClick={startNegotiation}>Start negotiation · {selectedUnitIds.length} selected</Button>{selectedUnitIds.length >= 2 ? <Button type="button" variant="secondary" onClick={() => setInquiryOpen(true)}>Enquire about selected units</Button> : null}</> : null}</div></div>
      {currentData?.normalization?.notices?.length ? <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{currentData.normalization.notices.map((notice, index) => <p key={`unit-search-notice-${index}`}>{noticeText(notice) || 'The server normalized this search.'}</p>)}</div> : null}
      {loading && !properties.length ? <LoadingState label="Loading project units..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => setRefreshVersion((version) => version + 1)} /> : null}
      {!loading && !error && !projectIsPublic ? <div className="rounded-xl border border-dashed border-outline-variant/20 p-10 text-center text-secondary">This project is not published yet.</div> : null}
      {!loading && !error && projectIsPublic && properties.length ? <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>{properties.map((property) => <article key={property._id} className="min-w-0"><PropertyCard property={property} showCompareAction />{['available', 'under_offer'].includes(property.status) ? <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={selectedUnitIds.includes(property._id)} disabled={!selectedUnitIds.includes(property._id) && selectedUnitIds.length >= 100} onChange={() => toggleUnitSelection(property)} /><span>Select this unit for an enquiry or negotiation</span></label> : null}</article>)}</div> : null}
      {!loading && !error && projectIsPublic && !properties.length ? <div className="rounded-xl border border-dashed border-outline-variant/20 p-10 text-center text-secondary">No project units match this search.</div> : null}
      {total > PAGE_SIZE ? <nav className="mt-8 flex items-center justify-between" aria-label="Project unit result pages"><button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1 || loading} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button><span className="text-sm font-semibold text-secondary">Page {page} of {totalPages}</span><button type="button" onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loading} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-40">Next</button></nav> : null}
    </section>
    {inquiryOpen ? <ModalPortal><div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/65 p-4" role="presentation" onClick={() => setInquiryOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="project-units-inquiry-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="project-units-inquiry-title" className="text-xl font-black">Enquire about selected units</h2><p className="text-sm text-secondary">One inquiry will be sent for these {selectedUnitIds.length} units. The seller receives one lead with the current selected-unit summaries.</p></div><button type="button" aria-label="Close enquiry form" onClick={() => setInquiryOpen(false)} className="rounded-full border px-3 py-1">×</button></div><ul className="mb-4 max-h-32 space-y-1 overflow-y-auto rounded-lg bg-surface-container-low p-3 text-sm">{selectedUnitIds.map((id) => <li key={id}>{selectedUnits[id]?.title || 'Selected unit'}</li>)}</ul><InquiryForm propertyIds={selectedUnitIds} allowLeadUpdatesOptIn={activeProfile?.kind === 'buyer'} onSubmitInquiry={async (payload) => { await inquiryService.createInquiry(payload); toast.success('Your grouped unit enquiry has been sent.'); setInquiryOpen(false); setSelectedUnitIds([]); setSelectedUnits({}); }} /></section></div></ModalPortal> : null}
  </PublicLayout>;
};

export default ProjectProperties;
