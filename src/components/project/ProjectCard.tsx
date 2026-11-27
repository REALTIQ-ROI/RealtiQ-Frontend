import { Link, useLocation } from 'react-router-dom';
import type { ProjectCard as ProjectCardType } from '../../types';
import { formatCurrencyRangesForDisplay, labelize, projectStatusClasses } from '../../utils/projectFormatters';
import { isProjectExplicitlyUnpublished, isProjectPublished } from '../../utils/projectPublication';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { fieldVocabularyLabel } from '../../utils/propertyVocabulary';
import { useFxDisplay } from '../../contexts/FxDisplayContext';

interface ProjectCardProps {
  project: ProjectCardType;
  requirePublishedToView?: boolean;
}

const internalProjectStates = new Set(['draft', 'suspended', 'unpublished']);

const ProjectCard = ({ project, requirePublishedToView = false }: ProjectCardProps) => {
  const location = useLocation();
  const { dictionary } = useCanonicalFieldDictionary();
  const { displayCurrency, officialRate } = useFxDisplay();
  const projectTypeLabel = fieldVocabularyLabel(dictionary, 'projectType', project.projectType) ?? project.projectType;
  const projectLocation = [project.location?.area, project.location?.city, project.location?.state].filter(Boolean).join(', ');
  const cover = project.coverImage?.url;
  const path = `/projects/${project.slug || project._id}`;
  const navigationState = { from: `${location.pathname}${location.search}`, discoveryFrom: (location.state as { discoveryFrom?: string } | null)?.discoveryFrom ?? `${location.pathname}${location.search}` };
  const canViewProject = requirePublishedToView
    ? isProjectPublished(project)
    : !isProjectExplicitlyUnpublished(project);
  const showProjectStatus = requirePublishedToView;
  // Public discovery must never expose internal project lifecycle/publication
  // states. The seller workspace may show those states on its private cards.
  if (!requirePublishedToView && (!canViewProject || internalProjectStates.has(project.status))) return null;
  const priceRange = formatCurrencyRangesForDisplay(project.priceRangesByCurrency, {
    minimum: project.minimumPrice,
    maximum: project.maximumPrice,
    currency: 'NGN',
  }, project.priceAggregateState, displayCurrency, officialRate);
  const offPlanPriceRange = project.offPlanSummary
    ? formatCurrencyRangesForDisplay(project.offPlanSummary.priceRangesByCurrency, {
      minimum: project.offPlanSummary.minimumOffPlanPrice,
      maximum: project.offPlanSummary.maximumOffPlanPrice,
    }, undefined, displayCurrency, officialRate)
    : null;
  const media = (
    <div className="relative aspect-[16/10] bg-surface-container-low">
      {cover ? (
        <img src={cover} alt={project.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">domain</span>
        </div>
      )}
      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-wide text-on-primary">
          {projectTypeLabel}
        </span>
        {project.isFeatured ? <span className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-950">Featured</span> : null}
        {showProjectStatus ? <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${projectStatusClasses[project.status] ?? 'bg-slate-100 text-slate-700'}`}>
          {labelize(project.status)}
        </span> : null}
        {requirePublishedToView && !canViewProject ? (
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
            Unpublished
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <article className="overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest transition-shadow hover:shadow-lg">
      {canViewProject ? <Link to={path} state={navigationState} className="block">{media}</Link> : media}
      <div className="space-y-4 p-5">
        <div>
          {canViewProject ? (
            <Link to={path} state={navigationState} className="text-lg font-black tracking-tight text-on-surface hover:underline">
              {project.name}
            </Link>
          ) : (
            <h3 className="text-lg font-black tracking-tight text-on-surface">{project.name}</h3>
          )}
          {projectLocation ? <p className="mt-1 text-sm text-secondary">{projectLocation}</p> : null}
          {project.shortDescription ? <p className="mt-3 line-clamp-2 text-sm text-on-surface-variant">{project.shortDescription}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low p-4 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Price Range</p>
            <p className="mt-1 font-black">{priceRange}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Available Units</p>
            <p className="mt-1 font-black">{project.availableUnits} / {project.totalUnits}</p>
            {typeof project.matchingUnitCount === 'number' ? <p className="mt-1 text-xs text-secondary">{project.matchingUnitCount} matching {project.matchingUnitCount === 1 ? 'unit' : 'units'}</p> : null}
          </div>
        </div>

        {project.offPlanSummary ? (
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm">
            <p className="font-bold text-primary">Off-plan inventory</p>
            <p className="mt-1 text-secondary">
              {project.offPlanSummary.availableOffPlanUnits} of {project.offPlanSummary.totalOffPlanUnits} off-plan units available.
            </p>
            {offPlanPriceRange ? <p className="mt-1 font-semibold">{offPlanPriceRange}</p> : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-outline-variant/10 pt-4">
          {project.developer?.name ? <div className="min-w-0 text-xs text-secondary"><p className="font-bold">Developer project</p><p className="mt-1 truncate">{project.developer.name}</p></div> : <span />}
          {canViewProject ? (
            <Link to={path} state={navigationState} className="text-sm font-bold text-primary hover:underline">View project</Link>
          ) : (
            <span className="cursor-not-allowed text-sm font-bold text-secondary opacity-60" aria-disabled="true">
              View project
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
