import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ProjectCard from '../../components/project/ProjectCard';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAsync } from '../../hooks/useAsync';
import { projectService, type ProjectSearchQuery } from '../../services/projectService';
import type { ListingType, OffPlanDevelopmentStatus, ProjectType } from '../../types';

const projectTypes: Array<{ value: ProjectType | ''; label: string }> = [
  { value: '', label: 'All project types' },
  { value: 'estate', label: 'Estate' },
  { value: 'apartment_development', label: 'Apartment Development' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'housing_project', label: 'Housing Project' },
];

const developmentStatuses: Array<{ value: OffPlanDevelopmentStatus | ''; label: string }> = [
  { value: '', label: 'Any construction stage' },
  { value: 'planned', label: 'Planned' },
  { value: 'pre_construction', label: 'Pre-construction' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'structural', label: 'Structural' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'completed', label: 'Completed' },
];

const Projects = () => {
  const [query, setQuery] = useState<ProjectSearchQuery>({ page: 1, limit: 20, availableOnly: true });
  const { data, loading, error, execute } = useAsync(() => projectService.listProjects(query), true);
  const projects = data?.projects ?? [];
  // console.log('Public Projects data:', projects);
  const total = data?.total ?? 0;

  const setFilter = (key: keyof ProjectSearchQuery, value: string | boolean) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      [key]: value === '' ? undefined : value,
    }));
  };

  const resultLabel = useMemo(() => `${total} ${total === 1 ? 'project' : 'projects'}`, [total]);

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
          <Link to="/properties" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-bold text-primary">
            Browse properties
          </Link>
          <Link to="/projects/map" className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">
            Map view
          </Link>
        </header>

        <div className="mb-8 rounded-xl border border-outline-variant/10 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <input
              type="search"
              value={query.search ?? ''}
              onChange={(event) => setFilter('search', event.target.value)}
              placeholder="Search projects"
              className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none"
            />
            <select value={query.projectType ?? ''} onChange={(event) => setFilter('projectType', event.target.value)} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
              {projectTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input value={query.city ?? ''} onChange={(event) => setFilter('city', event.target.value)} placeholder="City" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <input value={query.area ?? ''} onChange={(event) => setFilter('area', event.target.value)} placeholder="Area" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <select value={query.listingType ?? ''} onChange={(event) => setFilter('listingType', event.target.value as ListingType | '')} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="">Any listing type</option>
              <option value="ready">Ready units</option>
              <option value="off_plan">Off-plan units</option>
            </select>
            <select value={query.developmentStatus ?? ''} onChange={(event) => setFilter('developmentStatus', event.target.value)} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
              {developmentStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input type="number" min={0} value={query.bedrooms ?? ''} onChange={(event) => setFilter('bedrooms', event.target.value)} placeholder="Bedrooms" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <input value={query.propertyType ?? ''} onChange={(event) => setFilter('propertyType', event.target.value)} placeholder="Child property type" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-semibold text-secondary">{resultLabel}</p>
          <button type="button" onClick={() => void execute()} className="text-sm font-bold text-primary hover:underline">Refresh</button>
        </div>

        {loading ? <LoadingState label="Loading projects..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && !projects.length ? (
          <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-lowest p-12 text-center text-secondary">
            No projects match your filters.
          </div>
        ) : null}
        {!loading && !error && projects.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => <ProjectCard key={project._id} project={project} />)}
          </div>
        ) : null}
      </section>
    </PublicLayout>
  );
};

export default Projects;
