import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ProjectMediaGallery from '../../components/project/ProjectMediaGallery';
import PropertyCard from '../../components/property/PropertyCard';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAsync } from '../../hooks/useAsync';
import { projectService } from '../../services/projectService';
import { formatDate, formatPriceRange, labelize } from '../../utils/projectFormatters';

const ProjectDetails = () => {
  const { slug = '' } = useParams();
  const { data, loading, error, execute } = useAsync(() => projectService.getProject(slug), Boolean(slug));
  const project = data?.project;
  const preview = project?.propertyPreview ?? [];

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {loading ? <LoadingState label="Loading project..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && project ? (
          <div className="space-y-10">
            <header className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-widest text-on-primary">{labelize(project.projectType)}</span>
                  <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-black uppercase tracking-widest">{labelize(project.status)}</span>
                  {project.isPublished ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-700">Published</span> : null}
                </div>
                <h1 className="text-4xl font-black tracking-tight text-on-surface sm:text-5xl">{project.name}</h1>
                <p className="mt-3 text-lg text-secondary">{[project.area, project.city, project.state].filter(Boolean).join(', ') || project.address}</p>
                {project.shortDescription ? <p className="mt-5 max-w-3xl text-base leading-7 text-on-surface-variant">{project.shortDescription}</p> : null}
              </div>
            </header>

            <ProjectMediaGallery media={project.media} title={project.name} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Price range', formatPriceRange(project.minimumPrice, project.maximumPrice, project.currency)],
                ['Available units', `${project.availableUnits ?? project.availablePropertyCount ?? 0} / ${project.totalUnits ?? project.propertyCount ?? 0}`],
                ['Verified units', `${project.verifiedPropertyCount ?? 0} / ${project.propertyCount ?? project.totalUnits ?? 0}`],
                ['Completion', formatDate(project.completionDate)],
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
                  <p><span className="block text-xs font-bold uppercase tracking-widest text-secondary">Off-plan price</span>{formatPriceRange(project.offPlanSummary.minimumOffPlanPrice, project.offPlanSummary.maximumOffPlanPrice, project.currency)}</p>
                </div>
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
                  <p className="mt-1 font-black">{project.developer?.name || project.owner?.name || 'Verified developer'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">Launch</p>
                  <p className="mt-1 font-semibold">{formatDate(project.launchDate)}</p>
                </div>
                <Link to={`/projects/${project.slug || project._id}/properties`} className="block rounded-lg bg-primary px-5 py-3 text-center text-sm font-bold text-on-primary">
                  View all units
                </Link>
              </aside>
            </div>

            {(project.amenities?.length || project.features?.length || project.nearbyLandmarks?.length) ? (
              <section className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl bg-surface-container-lowest p-5">
                  <h3 className="font-black">Amenities</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{(project.amenities ?? []).map((item) => <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold">{item}</span>)}</div>
                </div>
                <div className="rounded-xl bg-surface-container-lowest p-5">
                  <h3 className="font-black">Features</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{(project.features ?? []).map((item) => <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold">{item}</span>)}</div>
                </div>
                <div className="rounded-xl bg-surface-container-lowest p-5">
                  <h3 className="font-black">Nearby</h3>
                  <div className="mt-3 space-y-2">{(project.nearbyLandmarks ?? []).map((item) => <p key={`${item.name}-${item.distance}`} className="text-sm"><strong>{item.name}</strong>{item.distance ? ` - ${item.distance}` : ''}</p>)}</div>
                </div>
              </section>
            ) : null}

            {project.coordinates ? (
              <section className="overflow-hidden rounded-xl border border-outline-variant/10">
                <div className="bg-white p-5">
                  <h2 className="text-xl font-black">Location</h2>
                  <p className="text-sm text-secondary">{project.address || [project.area, project.city, project.state].filter(Boolean).join(', ')}</p>
                </div>
                <iframe title={`${project.name} map`} src={`https://www.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}&z=14&output=embed`} className="h-96 w-full border-0" loading="lazy" />
              </section>
            ) : null}

            <section>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Available unit preview</h2>
                  <p className="text-sm text-secondary">Open a unit to use normal Property purchase, title, escrow, tour, installment, and cart flows.</p>
                </div>
                <Link to={`/projects/${project.slug || project._id}/properties`} className="text-sm font-bold text-primary hover:underline">View all</Link>
              </div>
              {preview.length ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {preview.map((property) => (
                    <PropertyCard key={property._id} property={property} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-outline-variant/20 p-8 text-center text-secondary">No units are available yet.</div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </PublicLayout>
  );
};

export default ProjectDetails;
