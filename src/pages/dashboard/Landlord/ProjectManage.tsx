import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import PropertyCard from '../../../components/property/PropertyCard';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { projectService } from '../../../services/projectService';
import type { ProjectDetail, Property } from '../../../types';
import { formatPriceRange, labelize } from '../../../utils/projectFormatters';

interface LandlordProjectManageData {
  project: ProjectDetail;
  units: Property[];
}

const loadLandlordProjectManage = async (id: string): Promise<LandlordProjectManageData> => {
  const { project } = await projectService.getProjectManage(id);
  const inventory = await projectService.getProjectProperties(project._id, { page: 1, limit: 100, includeUnpublished: true });
  return { project, units: inventory.properties ?? [] };
};

const ProjectManage = () => {
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { id = '' } = useParams();
  const { data, loading, error, execute } = useAsync(() => loadLandlordProjectManage(id), Boolean(id));
  const project = data?.project;
  const units = data?.units ?? [];

  const publish = async () => {
    if (!project || publishing) return;
    setPublishing(true);
    try {
      await projectService.updateProject(project._id, { publish: true });
      toast.success('Project publication requested.');
      await execute();
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to publish project.');
    } finally {
      setPublishing(false);
    }
  };

  const remove = async () => {
    if (!project || deleting) return;
    if ((project.propertyCount ?? project.totalUnits ?? 0) > 0) {
      toast.error('This project contains property listings and cannot be deleted until those properties are removed or reassigned.');
      return;
    }
    setDeleting(true);
    try {
      await projectService.deleteProject(project._id);
      toast.success('Project deleted.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to delete project.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <LandlordPortalLayout active="projects" title="Manage Project">
      <main className="p-8 lg:p-12">
        {loading ? <LoadingState label="Loading project..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && project ? (
          <div className="space-y-8">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">{labelize(project.projectType)} - {labelize(project.status)}</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight">{project.name}</h1>
                <p className="mt-2 text-sm text-secondary">{project.isPublished ? 'Published' : 'Unpublished'} - {formatPriceRange(project.minimumPrice, project.maximumPrice, project.currency)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/dashboard/landlord/projects/${project._id}/edit`} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-bold text-primary">Edit</Link>
                {!project.isPublished ? <Button type="button" loading={publishing} loadingLabel="Publishing..." onClick={() => void publish()}>Publish</Button> : null}
                <Button type="button" variant="secondary" loading={deleting} loadingLabel="Deleting..." onClick={() => void remove()}>Delete</Button>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                ['Total units', project.totalUnits ?? project.propertyCount ?? 0],
                ['Available', project.availableUnits ?? project.availablePropertyCount ?? 0],
                ['Sold', project.soldUnits ?? 0],
                ['Verified', project.verifiedPropertyCount ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">{label}</p>
                  <p className="mt-2 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>

            <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">Child property units</h2>
                  <p className="text-sm text-secondary">Create or edit a property and choose this project to attach it as a unit.</p>
                </div>
                <Link to={`/dashboard/landlord/add-property?projectId=${project._id}`} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">
                  Add unit
                </Link>
              </div>
              {units.length ? (
                <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {units.map((property) => <PropertyCard key={property._id} property={property} />)}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-outline-variant/20 p-8 text-center text-secondary">
                  No child units yet.
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </LandlordPortalLayout>
  );
};

export default ProjectManage;
