import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
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
import { adoptCanonicalQuery, catalogueFilterFormKey, hasFeaturedFilterIgnoredNotice, readCatalogueQuery, sameCanonicalCriteria, visibleCatalogueNotices, writeCatalogueQuery, withoutUnsupportedCatalogueFilters } from '../../utils/catalogueQuery';
import { removeCatalogueFilterChip } from '../../utils/catalogueFilterChips';
import { inquiryService } from '../../services/inquiryService';
import CompareToggle from '../../components/compare/CompareToggle';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { effectiveCanonicalValue, fieldVocabularyLabel } from '../../utils/propertyVocabulary';
import { propertyRouteReference } from '../../types';
import { groupProjectUnits, readProjectUnitDisplayMode, type ProjectUnitView } from '../../utils/projectUnitDisplay';
import { useBuyerCatalogueSearchParams } from '../../hooks/useBuyerCatalogueSearchParams';

const PAGE_SIZE = 20;
const EMPTY_PROPERTIES: import('../../types').Property[] = [];
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
  const [searchParams, setSearchParams] = useBuyerCatalogueSearchParams();
  const { activeProfile, isAuthenticated } = useAuth();
  const { dictionary } = useCanonicalFieldDictionary();
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<Record<string, import('../../types').Property>>({});
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [unitView, setUnitView] = useState<ProjectUnitView>('cards');
  const [projectDetailState, setProjectDetailState] = useState<{ slug: string; project: import('../../types').ProjectDetail | null; error: boolean } | null>(null);
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
          if (response.normalization?.query !== undefined || hasFeaturedFilterIgnoredNotice(response.normalization?.notices)) {
            const current = searchParamsRef.current;
            if (sameCanonicalCriteria(current, query)) {
              const normalized = adoptCanonicalQuery(current, response.normalization?.query ?? withoutUnsupportedCatalogueFilters(query));
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

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    void projectService.getProject(slug, controller.signal)
      .then(({ project }) => { if (!controller.signal.aborted) setProjectDetailState({ slug, project, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setProjectDetailState({ slug, project: null, error: true }); });
    return () => controller.abort();
  }, [slug]);

  const currentData = dataProfileId === (activeProfile?.id ?? null) ? data : null;
  const project = currentData?.project;
  const projectDetails = projectDetailState?.slug === slug ? projectDetailState.project : null;
  const projectUnitDisplayMode = readProjectUnitDisplayMode(projectDetails);
  const projectIsPublic = project ? isProjectPublished(project) : true;
  const properties = projectIsPublic ? currentData?.properties ?? EMPTY_PROPERTIES : EMPTY_PROPERTIES;
  const total = currentData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const unitGroups = useMemo(() => groupProjectUnits(properties, projectUnitDisplayMode), [properties, projectUnitDisplayMode]);
  const applyFilters = (changes: Parameters<typeof writeCatalogueQuery>[0], clearAll = false) => setSearchParams(writeCatalogueQuery(changes, { base: searchParams, resetPage: true, clearAll }));
  const clearFilterChip = (key: string, index: number) => setSearchParams(removeCatalogueFilterChip(searchParams, { key, index }));
  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Clear selections when the project or selected profile changes so units cannot carry between contexts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const formatUnitPrice = (property: import('../../types').Property) => {
    if (effectiveCanonicalValue(property, 'priceOnApplication') === true) return 'Price on application';
    if (typeof property.price !== 'number' || !Number.isFinite(property.price) || typeof property.currency !== 'string') return 'Price unavailable';
    try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: property.currency, maximumFractionDigits: 0 }).format(property.price); }
    catch { return 'Price unavailable'; }
  };
  const formatAvailability = (status: string) => ({ available: 'Available', under_offer: 'Under Offer', sold: 'Sold' } as Record<string, string>)[status] ?? 'Availability unavailable';
  const renderUnitRows = (group: typeof unitGroups[number]) => group.properties.map((property) => (
    <article key={property._id} className="min-w-0"><PropertyCard property={property} showCompareAction />{['available', 'under_offer'].includes(property.status) ? <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={selectedUnitIds.includes(property._id)} disabled={!selectedUnitIds.includes(property._id) && selectedUnitIds.length >= 100} onChange={() => toggleUnitSelection(property)} /><span>Select this unit for an enquiry or negotiation</span></label> : null}</article>
  ));

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
      <div className="my-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-secondary">{total.toLocaleString()} units</p><p className="mt-1 text-xs text-secondary">Developer’s unit display preference: {projectUnitDisplayMode === 'grouped_by_unit_type' ? 'Grouped by unit type' : projectUnitDisplayMode === 'individual_units' ? 'Individual units' : 'Unavailable'}</p>{projectUnitDisplayMode === 'grouped_by_unit_type' ? <p className="mt-1 text-xs text-secondary">Units are grouped by returned type name on this page; each unit still opens its own listing.</p> : null}</div><div className="flex flex-wrap items-center gap-3"><fieldset className="flex items-center gap-1 rounded-lg border p-1" aria-label="Unit presentation"><legend className="sr-only">Unit presentation</legend>{(['cards', 'list', 'table'] as const).map((view) => <button key={view} type="button" aria-pressed={unitView === view} onClick={() => setUnitView(view)} className={`rounded-md px-3 py-2 text-sm font-semibold ${unitView === view ? 'bg-primary text-on-primary' : 'text-secondary'}`}>{view === 'cards' ? 'Cards' : view === 'list' ? 'List' : 'Table'}</button>)}</fieldset><button type="button" onClick={() => setRefreshVersion((version) => version + 1)} className="text-sm font-bold text-primary">Refresh</button>{selectedUnitIds.length ? <><Button type="button" disabled={selectedUnitIds.length > 100} onClick={startNegotiation}>Start negotiation · {selectedUnitIds.length} selected</Button>{selectedUnitIds.length >= 2 ? <Button type="button" variant="secondary" onClick={() => setInquiryOpen(true)}>Enquire about selected units</Button> : null}</> : null}</div></div>
      {projectDetailState?.slug === slug && (projectDetailState.error || (projectDetailState.project && !projectUnitDisplayMode)) ? <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">The developer-selected unit layout was not returned. Units are shown individually for this view.</p> : null}
      {visibleCatalogueNotices(currentData?.normalization?.notices).length ? <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{visibleCatalogueNotices(currentData?.normalization?.notices).map((notice, index) => <p key={`unit-search-notice-${index}`}>{noticeText(notice) || 'The server normalized this search.'}</p>)}</div> : null}
      {loading && !properties.length ? <LoadingState label="Loading project units..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => setRefreshVersion((version) => version + 1)} /> : null}
      {!loading && !error && !projectIsPublic ? <div className="rounded-xl border border-dashed border-outline-variant/20 p-10 text-center text-secondary">This project is not published yet.</div> : null}
      {!loading && !error && projectIsPublic && properties.length && unitView !== 'table' ? <div className={unitView === 'cards' ? `grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}` : `grid gap-4 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>{unitGroups.map((group) => <section key={group.key} className={unitView === 'cards' ? 'contents' : 'space-y-4'}>{projectUnitDisplayMode === 'grouped_by_unit_type' ? <h2 className="col-span-full text-lg font-bold">{group.label}</h2> : null}{renderUnitRows(group)}</section>)}</div> : null}
      {!loading && !error && projectIsPublic && properties.length && unitView === 'table' ? <div className="overflow-x-auto rounded-xl border border-outline-variant/20 bg-white"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><caption className="sr-only">Project units with public status, price and comparison controls</caption><thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary"><tr><th scope="col" className="px-4 py-3">Unit</th><th scope="col" className="px-4 py-3">Type</th><th scope="col" className="px-4 py-3">Availability</th><th scope="col" className="px-4 py-3">Price</th><th scope="col" className="px-4 py-3">Actions</th></tr></thead><tbody>{unitGroups.flatMap((group) => [
        ...(projectUnitDisplayMode === 'grouped_by_unit_type' ? [<tr key={`${group.key}-heading`} className="border-t bg-surface-container-low"><th scope="rowgroup" colSpan={5} className="px-4 py-3 text-base font-bold">{group.label}</th></tr>] : []),
        ...group.properties.map((property) => <tr key={property._id} className="border-t border-outline-variant/10"><td className="px-4 py-3"><Link className="font-bold text-primary hover:underline" to={`/properties/${propertyRouteReference(property)}`}>{property.title}</Link>{property.publicReference ? <p className="mt-1 text-xs text-secondary">{property.publicReference}</p> : null}</td><td className="px-4 py-3">{fieldVocabularyLabel(dictionary, 'propertyType', property.propertyType) ?? property.propertyType}</td><td className="px-4 py-3">{formatAvailability(property.status)}</td><td className="px-4 py-3 font-semibold">{formatUnitPrice(property)}</td><td className="px-4 py-3"><div className="flex items-center gap-3"><CompareToggle property={property} /><Link className="font-bold text-primary hover:underline" to={`/properties/${propertyRouteReference(property)}`}>View</Link></div></td></tr>),
      ])}</tbody></table></div> : null}
      {!loading && !error && projectIsPublic && !properties.length ? <div className="rounded-xl border border-dashed border-outline-variant/20 p-10 text-center text-secondary">No project units match this search.</div> : null}
      {total > PAGE_SIZE ? <nav className="mt-8 flex items-center justify-between" aria-label="Project unit result pages"><button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1 || loading} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button><span className="text-sm font-semibold text-secondary">Page {page} of {totalPages}</span><button type="button" onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loading} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold disabled:opacity-40">Next</button></nav> : null}
    </section>
    {inquiryOpen ? <ModalPortal><div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/65 p-4" role="presentation" onClick={() => setInquiryOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="project-units-inquiry-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="project-units-inquiry-title" className="text-xl font-black">Enquire about selected units</h2><p className="text-sm text-secondary">One inquiry will be sent for these {selectedUnitIds.length} units. The seller receives one lead with the current selected-unit summaries.</p></div><button type="button" aria-label="Close enquiry form" onClick={() => setInquiryOpen(false)} className="rounded-full border px-3 py-1">×</button></div><ul className="mb-4 max-h-32 space-y-1 overflow-y-auto rounded-lg bg-surface-container-low p-3 text-sm">{selectedUnitIds.map((id) => <li key={id}>{selectedUnits[id]?.title || 'Selected unit'}</li>)}</ul><InquiryForm propertyIds={selectedUnitIds} allowLeadUpdatesOptIn={activeProfile?.kind === 'buyer'} onSubmitInquiry={async (payload) => { await inquiryService.createInquiry(payload); toast.success('Your grouped unit enquiry has been sent.'); setInquiryOpen(false); setSelectedUnitIds([]); setSelectedUnits({}); }} /></section></div></ModalPortal> : null}
  </PublicLayout>;
};

export default ProjectProperties;
