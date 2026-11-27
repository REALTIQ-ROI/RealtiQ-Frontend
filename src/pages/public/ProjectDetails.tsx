import { Link, useLocation, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ProjectMediaGallery from '../../components/project/ProjectMediaGallery';
import ProtectedMediaSection from '../../components/media/ProtectedMediaSection';
import ProjectRegisteredSurvey from '../../components/title/ProjectRegisteredSurvey';
import ProjectCommunity from '../../components/project/ProjectCommunity';
import PropertyCard from '../../components/property/PropertyCard';
import FxDisplayControl from '../../components/property/FxDisplayControl';
import LocationMap from '../../components/property/map/LocationMap';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAsync } from '../../hooks/useAsync';
import { projectService } from '../../services/projectService';
import { formatCurrencyRangesForDisplay, formatDate } from '../../utils/projectFormatters';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { fieldVocabularyLabel, vocabularyLabel } from '../../utils/propertyVocabulary';
import { useAuth } from '../../contexts/AuthContext';
import { useFxDisplay } from '../../contexts/FxDisplayContext';

const ProjectDetails = () => {
  const { slug = '' } = useParams();
  const location = useLocation();
  const { activeProfile } = useAuth();
  const { displayCurrency, officialRate } = useFxDisplay();
  const { dictionary } = useCanonicalFieldDictionary();
  const projectNavigationState = location.state as { from?: string; discoveryFrom?: string } | null;
  const searchReturn = typeof projectNavigationState?.discoveryFrom === 'string' && projectNavigationState.discoveryFrom.startsWith('/projects')
    ? projectNavigationState.discoveryFrom
    : typeof projectNavigationState?.from === 'string' && projectNavigationState.from.startsWith('/projects')
      ? projectNavigationState.from
      : '/projects';
  const { data, loading, error, execute } = useAsync(() => projectService.getProject(slug), Boolean(slug));
  const project = data?.project;
  const preview = project?.propertyPreview ?? [];
  const unitSummary = project?.unitSummary;
  const totalUnits = unitSummary?.totalUnitCount ?? project?.propertyCount ?? 0;
  const availableUnits = unitSummary?.availableUnitCount ?? project?.availablePropertyCount ?? 0;
  const underOfferUnits = unitSummary?.underOfferUnitCount ?? 0;
  const verifiedUnits = unitSummary?.verifiedListingCount ?? project?.verifiedPropertyCount ?? 0;
  const priceRanges = formatCurrencyRangesForDisplay(unitSummary?.priceRangesByCurrency, undefined, project?.priceAggregateState, displayCurrency, officialRate);
  const stageCounts = Object.entries(unitSummary?.buildStages ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0);
  const formatHandoverMonth = (month: string) => {
    const parsed = /^([0-9]{4})-([0-9]{2})$/.exec(month);
    return parsed ? `${new Date(Number(parsed[1]), Number(parsed[2]) - 1, 1).toLocaleDateString('en-GB', { month: 'short' })}-${parsed[1]}` : month;
  };
  const projectTypeLabel = project ? fieldVocabularyLabel(dictionary, 'projectType', project.projectType) ?? project.projectType : '';
  const facilities = Array.isArray(project?.canonicalFields?.estateFacilities)
    ? (project.canonicalFields.estateFacilities as unknown[]).flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const facility = item as { key?: unknown; state?: unknown };
      if (typeof facility.key !== 'string' || (facility.state !== 'Delivered' && facility.state !== 'Planned')) return [];
      return [{ key: facility.key, state: facility.state, label: vocabularyLabel(dictionary, 'amenities', facility.key) ?? facility.key }];
    })
    : [];

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {loading ? <LoadingState label="Loading project..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && project ? (
          <div className="space-y-10">
            <header className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
              <div>
                <Link to={searchReturn} className="mb-4 inline-flex text-sm font-bold text-primary hover:underline">← Back to project results</Link>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-widest text-on-primary">{projectTypeLabel}</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-on-surface sm:text-5xl">{project.name}</h1>
                <p className="mt-3 text-lg text-secondary">{[project.area, project.city, project.state].filter(Boolean).join(', ') || project.address}</p>
                {project.shortDescription ? <p className="mt-5 max-w-3xl text-base leading-7 text-on-surface-variant">{project.shortDescription}</p> : null}
              </div>
            </header>

            {availableUnits > 0 ? <Link to={`/projects/${project.slug || project._id}/properties`} state={projectNavigationState} className="inline-flex rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">Choose from {availableUnits} available {availableUnits === 1 ? 'unit' : 'units'}</Link> : null}

            <ProjectMediaGallery media={project.media} title={project.name} />
            <ProtectedMediaSection resourceKind="project" resourceId={project._id} title={project.name} />
            <ProjectRegisteredSurvey projectId={project._id} />
            <FxDisplayControl />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Price range', priceRanges],
                ['Available units', `${availableUnits} of ${totalUnits}`],
                ['Under offer', String(underOfferUnits)],
                ['Verified listings', String(verifiedUnits)],
                ...(typeof unitSummary?.unpricedAvailableCount === 'number' && unitSummary.unpricedAvailableCount > 0
                  ? [['Available without a listed price', String(unitSummary.unpricedAvailableCount)]]
                  : []),
                ...(project.completionDate ? [['Completion', formatDate(project.completionDate)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-outline-variant/10 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">{label}</p>
                  <p className="mt-2 text-xl font-black">{value}</p>
                </div>
              ))}
            </div>

            {project.offPlanSummary ? (
              <section className="rounded-xl border border-primary/10 bg-primary/5 p-6">
                <h2 className="text-xl font-black text-primary">Off-plan summary</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <p><span className="block text-xs font-bold uppercase tracking-widest text-secondary">Off-plan units</span>{project.offPlanSummary.availableOffPlanUnits} / {project.offPlanSummary.totalOffPlanUnits}</p>
                  <p><span className="block text-xs font-bold uppercase tracking-widest text-secondary">Off-plan price</span>{formatCurrencyRangesForDisplay(project.offPlanSummary.priceRangesByCurrency, { minimum: project.offPlanSummary.minimumOffPlanPrice, maximum: project.offPlanSummary.maximumOffPlanPrice, currency: project.currency }, undefined, displayCurrency, officialRate)}</p>
                </div>
              </section>
            ) : null}

            {stageCounts.length || (unitSummary?.handoverMonths?.length ?? 0) > 0 ? (
              <section className="rounded-xl border border-outline-variant/10 bg-white p-6">
                <h2 className="text-xl font-black">Build stages and handover</h2>
                {stageCounts.length ? <div className="mt-4"><p className="text-sm font-bold text-secondary">Units by build stage</p><div className="mt-2 flex flex-wrap gap-2">{stageCounts.map(([stage, count]) => <span key={stage} className="rounded-full bg-surface-container-low px-3 py-1 text-sm">{fieldVocabularyLabel(dictionary, 'buildStage', stage) ?? stage} · {count}</span>)}</div></div> : null}
                {(unitSummary?.handoverMonths?.length ?? 0) > 0 ? <div className="mt-4"><p className="text-sm font-bold text-secondary">Handover months listed for units</p><p className="mt-1">{unitSummary!.handoverMonths!.map(formatHandoverMonth).join(' · ')}</p></div> : null}
                {unitSummary?.earliestHandoverMonth ? <p className="mt-3 text-sm text-secondary">Earliest unit handover: {formatHandoverMonth(unitSummary.earliestHandoverMonth)}. Dates can differ by unit.</p> : null}
              </section>
            ) : null}

            <div className="grid gap-8 lg:grid-cols-[1fr_0.6fr]">
              <section>
                <h2 className="text-2xl font-black">About this project</h2>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-on-surface-variant">{project.description || 'No project description available.'}</p>
              </section>
              <aside className="space-y-5 rounded-xl border border-outline-variant/10 bg-white p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">Developer</p>
                  <p className="mt-1 font-black">{project.developer?.name || project.owner?.name || 'Not provided'}</p>
                </div>
                {project.launchDate ? <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">Launch</p>
                  <p className="mt-1 font-semibold">{formatDate(project.launchDate)}</p>
                </div> : null}
                <Link to={`/projects/${project.slug || project._id}/properties`} state={projectNavigationState} className="block rounded-lg bg-primary px-5 py-3 text-center text-sm font-bold text-on-primary">
                  View all units
                </Link>
              </aside>
            </div>

            {project.faqs?.length ? <section className="space-y-4">
              <h2 className="text-2xl font-black">Frequently asked questions</h2>
              <div className="space-y-3">{project.faqs.map((faq, index) => <details key={`${faq.question}-${index}`} className="rounded-xl border border-outline-variant/10 bg-white p-5"><summary className="cursor-pointer font-bold">{faq.question}</summary><p className="mt-3 whitespace-pre-wrap leading-7 text-on-surface-variant">{faq.answer}</p></details>)}</div>
            </section> : null}

            {(facilities.length || project.nearbyLandmarks?.length) ? (
              <section className="grid gap-6 lg:grid-cols-2">
                {facilities.length ? <div className="rounded-xl bg-surface-container-lowest p-5">
                  <h3 className="font-black">Estate facilities</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{facilities.map((item) => <span key={item.key} className="rounded-full bg-white px-3 py-1 text-xs font-bold">{item.label} · {item.state}</span>)}</div>
                </div> : null}
                {project.nearbyLandmarks?.length ? <div className="rounded-xl bg-surface-container-lowest p-5">
                  <h3 className="font-black">Nearby</h3>
                  <div className="mt-3 space-y-2">{(project.nearbyLandmarks ?? []).map((item) => <p key={`${item.name}-${item.distance}`} className="text-sm"><strong>{item.name}</strong>{item.distance ? ` - ${item.distance}` : ''}</p>)}</div>
                </div> : null}
              </section>
            ) : null}

            {project.coordinates ? (
              <section className="overflow-hidden rounded-xl border border-outline-variant/10">
                <div className="bg-white p-5">
                  <h2 className="text-xl font-black">Location</h2>
                  <p className="text-sm text-secondary">{project.address || [project.area, project.city, project.state].filter(Boolean).join(', ')}</p>
                </div>
                <div className="h-96 w-full"><LocationMap title={project.name} coordinates={project.coordinates} /></div>
              </section>
            ) : null}

            <section>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Unit preview</h2>
                  <p className="text-sm text-secondary">Open a unit to use its purchase, title, escrow, tour and instalment options.</p>
                </div>
                <Link to={`/projects/${project.slug || project._id}/properties`} state={projectNavigationState} className="text-sm font-bold text-primary hover:underline">View all</Link>
              </div>
              {preview.length ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {preview.map((property) => (
                    <PropertyCard key={property._id} property={property} showCompareAction />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-outline-variant/20 p-8 text-center text-secondary">No unit previews are available. View all units for the current listing.</div>
              )}
            </section>
            <ProjectCommunity key={`${project._id}:${activeProfile?.id ?? 'guest'}`} projectIdOrSlug={project.slug || project._id} projectId={project._id} />
          </div>
        ) : null}
      </section>
    </PublicLayout>
  );
};

export default ProjectDetails;
