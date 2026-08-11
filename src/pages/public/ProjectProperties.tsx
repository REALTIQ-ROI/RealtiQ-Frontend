import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyCard from '../../components/property/PropertyCard';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAsync } from '../../hooks/useAsync';
import { projectService, type ProjectPropertyQuery } from '../../services/projectService';
import type { ListingType, OffPlanDevelopmentStatus } from '../../types';
import { isProjectPublished } from '../../utils/projectPublication';

const ProjectProperties = () => {
  const { slug = '' } = useParams();
  const [query, setQuery] = useState<ProjectPropertyQuery>({ page: 1, limit: 20, availableOnly: true });
  const { data, loading, error, execute } = useAsync(() => projectService.getProjectProperties(slug, query), Boolean(slug));

  const setFilter = (key: keyof ProjectPropertyQuery, value: string | boolean) => {
    setQuery((current) => ({ ...current, page: 1, [key]: value === '' ? undefined : value }));
  };

  const project = data?.project;
  const projectIsPublic = project ? isProjectPublished(project) : true;
  const properties = projectIsPublic ? data?.properties ?? [] : [];

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <header className="mb-8">
          <Link to={project ? `/projects/${project.slug || project._id}` : '/projects'} className="text-sm font-bold text-primary hover:underline">
            Back to project
          </Link>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{project ? `${project.name} Units` : 'Project Units'}</h1>
          <p className="mt-2 text-sm text-secondary">Filter project child properties and open a unit for the normal property detail flow.</p>
        </header>

        <div className="mb-8 rounded-xl border border-outline-variant/10 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <input value={query.propertyType ?? ''} onChange={(event) => setFilter('propertyType', event.target.value)} placeholder="Property type" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <input type="number" value={query.bedrooms ?? ''} onChange={(event) => setFilter('bedrooms', event.target.value)} placeholder="Bedrooms" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <input type="number" value={query.minPrice ?? ''} onChange={(event) => setFilter('minPrice', event.target.value)} placeholder="Min price" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <input type="number" value={query.maxPrice ?? ''} onChange={(event) => setFilter('maxPrice', event.target.value)} placeholder="Max price" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <input value={query.phase ?? ''} onChange={(event) => setFilter('phase', event.target.value)} placeholder="Phase" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <input value={query.block ?? ''} onChange={(event) => setFilter('block', event.target.value)} placeholder="Block" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <input value={query.floor ?? ''} onChange={(event) => setFilter('floor', event.target.value)} placeholder="Floor" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none" />
            <select value={query.status ?? ''} onChange={(event) => setFilter('status', event.target.value)} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="">Any sale status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
            <select value={query.listingType ?? ''} onChange={(event) => setFilter('listingType', event.target.value as ListingType | '')} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="">Any listing type</option>
              <option value="ready">Ready</option>
              <option value="off_plan">Off-plan</option>
            </select>
            <select value={query.developmentStatus ?? ''} onChange={(event) => setFilter('developmentStatus', event.target.value as OffPlanDevelopmentStatus | '')} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="">Any construction stage</option>
              <option value="planned">Planned</option>
              <option value="pre_construction">Pre-construction</option>
              <option value="foundation">Foundation</option>
              <option value="structural">Structural</option>
              <option value="roofing">Roofing</option>
              <option value="finishing">Finishing</option>
              <option value="completed">Completed</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold">
              <input type="checkbox" checked={Boolean(query.installmentAvailable)} onChange={(event) => setFilter('installmentAvailable', event.target.checked)} />
              Payment plan
            </label>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-secondary">{data?.total ?? 0} units</p>
          <button type="button" onClick={() => void execute()} className="text-sm font-bold text-primary hover:underline">Refresh</button>
        </div>

        {loading ? <LoadingState label="Loading units..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && !projectIsPublic ? (
          <div className="rounded-xl border border-dashed border-outline-variant/20 p-10 text-center text-secondary">This project is not published yet.</div>
        ) : null}
        {!loading && !error && properties.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => <PropertyCard key={property._id} property={property} />)}
          </div>
        ) : null}
        {!loading && !error && !properties.length ? (
          <div className="rounded-xl border border-dashed border-outline-variant/20 p-10 text-center text-secondary">No project units match these filters.</div>
        ) : null}
      </section>
    </PublicLayout>
  );
};

export default ProjectProperties;
