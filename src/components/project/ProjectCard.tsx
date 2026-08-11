import { Link } from 'react-router-dom';
import type { ProjectCard as ProjectCardType } from '../../types';
import { formatPriceRange, labelize, projectStatusClasses } from '../../utils/projectFormatters';
import { isProjectExplicitlyUnpublished, isProjectPublished } from '../../utils/projectPublication';

interface ProjectCardProps {
  project: ProjectCardType;
  requirePublishedToView?: boolean;
}

const ProjectCard = ({ project, requirePublishedToView = false }: ProjectCardProps) => {
  const location = [project.location?.area, project.location?.city, project.location?.state].filter(Boolean).join(', ');
  const cover = project.coverImage?.url;
  const path = `/projects/${project.slug || project._id}`;
  const canViewProject = requirePublishedToView
    ? isProjectPublished(project)
    : !isProjectExplicitlyUnpublished(project);
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
          {labelize(project.projectType)}
        </span>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${projectStatusClasses[project.status] ?? 'bg-slate-100 text-slate-700'}`}>
          {labelize(project.status)}
        </span>
        {!canViewProject ? (
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
            Unpublished
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <article className="overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest transition-shadow hover:shadow-lg">
      {canViewProject ? <Link to={path} className="block">{media}</Link> : media}
      <div className="space-y-4 p-5">
        <div>
          {canViewProject ? (
            <Link to={path} className="text-lg font-black tracking-tight text-on-surface hover:underline">
              {project.name}
            </Link>
          ) : (
            <h3 className="text-lg font-black tracking-tight text-on-surface">{project.name}</h3>
          )}
          {location ? <p className="mt-1 text-sm text-secondary">{location}</p> : null}
          {project.shortDescription ? <p className="mt-3 line-clamp-2 text-sm text-on-surface-variant">{project.shortDescription}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low p-4 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Price Range</p>
            <p className="mt-1 font-black">{formatPriceRange(project.minimumPrice, project.maximumPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Available Units</p>
            <p className="mt-1 font-black">{project.availableUnits} / {project.totalUnits}</p>
          </div>
        </div>

        {project.offPlanSummary ? (
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm">
            <p className="font-bold text-primary">Off-plan inventory</p>
            <p className="mt-1 text-secondary">
              {project.offPlanSummary.availableOffPlanUnits} of {project.offPlanSummary.totalOffPlanUnits} off-plan units available.
            </p>
            <p className="mt-1 font-semibold">{formatPriceRange(project.offPlanSummary.minimumOffPlanPrice, project.offPlanSummary.maximumOffPlanPrice)}</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-outline-variant/10 pt-4">
          <p className="text-xs text-secondary">{project.developer?.name || 'Verified developer'}</p>
          {canViewProject ? (
            <Link to={path} className="text-sm font-bold text-primary hover:underline">View project</Link>
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
