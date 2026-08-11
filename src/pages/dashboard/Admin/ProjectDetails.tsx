import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ProjectMediaGallery from '../../../components/project/ProjectMediaGallery';
import PropertyCard from '../../../components/property/PropertyCard';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { projectService } from '../../../services/projectService';
import type { ProjectDetail, Property } from '../../../types';
import { formatDate, formatPriceRange, labelize } from '../../../utils/projectFormatters';

interface AdminProjectDetailsData {
  project: ProjectDetail;
  properties: Property[];
}

const loadAdminProjectDetails = async (id: string): Promise<AdminProjectDetailsData> => {
  const { project } = await projectService.adminGetProject(id);
  const inventory = await projectService.getProjectProperties(project._id, { page: 1, limit: 100, sort: 'recent' });
  return { project, properties: inventory.properties ?? [] };
};

const AdminProjectDetails = () => {
  const { id = '' } = useParams();
  const { data, loading, error, execute } = useAsync(() => loadAdminProjectDetails(id), Boolean(id));
  const project = data?.project;
  const properties = data?.properties ?? [];

  return (
    <AdminLayout>
      <main className="mx-auto max-w-7xl space-y-8 p-6 lg:p-10">
        <Link to="/dashboard/admin/projects" className="text-sm font-bold text-primary hover:underline">Back to projects</Link>
        {loading ? <LoadingState label="Loading project details..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && project ? (
          <>
            <header className="grid gap-6 rounded-xl bg-white p-6 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-widest text-on-primary">{labelize(project.projectType)}</span>
                  <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-black uppercase tracking-widest">{labelize(project.status)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${project.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                    {project.isPublished ? 'Published' : 'Unpublished'}
                  </span>
                  {project.isFeatured ? <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-indigo-700">Featured</span> : null}
                </div>
                <h1 className="text-4xl font-black tracking-tight">{project.name}</h1>
                <p className="mt-2 text-sm text-secondary">{[project.area, project.city, project.state].filter(Boolean).join(', ') || project.address || 'Location unavailable'}</p>
                {project.shortDescription ? <p className="mt-4 max-w-3xl text-on-surface-variant">{project.shortDescription}</p> : null}
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-80">
                <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-secondary">Price range</p><p className="mt-1 font-black">{formatPriceRange(project.minimumPrice, project.maximumPrice, project.currency)}</p></div>
                <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-secondary">Units</p><p className="mt-1 font-black">{project.availableUnits ?? project.availablePropertyCount ?? 0} / {project.totalUnits ?? project.propertyCount ?? 0}</p></div>
                <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-secondary">Launch</p><p className="mt-1 font-black">{formatDate(project.launchDate)}</p></div>
                <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-secondary">Completion</p><p className="mt-1 font-black">{formatDate(project.completionDate)}</p></div>
              </div>
            </header>

            <ProjectMediaGallery media={project.media} title={project.name} />

            <section className="grid gap-6 lg:grid-cols-[1fr_0.45fr]">
              <div className="rounded-xl bg-white p-6">
                <h2 className="text-xl font-black">Project description</h2>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-on-surface-variant">{project.description || 'No project description provided.'}</p>
              </div>
              <aside className="rounded-xl bg-white p-6">
                <h2 className="text-xl font-black">Ownership</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div><dt className="font-bold text-secondary">Developer</dt><dd>{project.developer?.name || 'Developer unavailable'}</dd></div>
                  <div><dt className="font-bold text-secondary">Owner</dt><dd>{project.owner?.name || 'Owner unavailable'}</dd></div>
                  <div><dt className="font-bold text-secondary">Verified units</dt><dd>{project.verifiedPropertyCount ?? 0} / {project.propertyCount ?? project.totalUnits ?? 0}</dd></div>
                  <div><dt className="font-bold text-secondary">Published at</dt><dd>{formatDate(project.publishedAt)}</dd></div>
                </dl>
              </aside>
            </section>

            {(project.amenities?.length || project.features?.length || project.nearbyLandmarks?.length) ? (
              <section className="grid gap-5 lg:grid-cols-3">
                <div className="rounded-xl bg-white p-5">
                  <h3 className="font-black">Amenities</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{(project.amenities ?? []).map((item) => <span key={item} className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold">{item}</span>)}</div>
                </div>
                <div className="rounded-xl bg-white p-5">
                  <h3 className="font-black">Features</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{(project.features ?? []).map((item) => <span key={item} className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold">{item}</span>)}</div>
                </div>
                <div className="rounded-xl bg-white p-5">
                  <h3 className="font-black">Nearby</h3>
                  <div className="mt-3 space-y-2">{(project.nearbyLandmarks ?? []).map((item) => <p key={`${item.name}-${item.distance}`} className="text-sm"><strong>{item.name}</strong>{item.distance ? ` - ${item.distance}` : ''}</p>)}</div>
                </div>
              </section>
            ) : null}

            <section className="rounded-xl bg-white p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Properties under this project</h2>
                  <p className="text-sm text-secondary">Showing {properties.length} child properties.</p>
                </div>
              </div>
              {properties.length ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {properties.map((property) => <PropertyCard key={property._id || property.publicReference} property={property} />)}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-outline-variant/20 p-8 text-center text-secondary">No child properties found for this project.</div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </AdminLayout>
  );
};

export default AdminProjectDetails;
