import { Link } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import ProjectCard from '../../../components/project/ProjectCard';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { projectService } from '../../../services/projectService';

const LandlordProjects = () => {
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const { data, loading, error, execute } = useAsync(() => projectService.listMyProjects({ page: 1, limit: 50 }), true);
  const projects = data?.projects ?? [];

  const publishProject = async (id: string) => {
    if (publishingId) return;
    setPublishingId(id);
    try {
      await projectService.updateProject(id, { publish: true });
      toast.success('Project submitted for publication.');
      await execute();
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to publish project.');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <LandlordPortalLayout active="projects" title="Projects">
      <main className="p-8 lg:p-12">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Property Projects</h1>
            <p className="mt-2 text-sm text-secondary">Create developments and manage their child property units.</p>
          </div>
          <Link to="/dashboard/landlord/projects/new" className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">
            Create Project
          </Link>
        </header>

        {loading ? <LoadingState label="Loading projects..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && projects.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div key={project._id} className="space-y-3">
                <ProjectCard project={project} requirePublishedToView />
                <div className="flex flex-wrap gap-2">
                  <Link to={`/dashboard/landlord/projects/${project._id}`} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold text-primary">Manage</Link>
                  {!project.isPublished ? (
                    <button
                      type="button"
                      disabled={Boolean(publishingId)}
                      aria-busy={publishingId === project._id || undefined}
                      onClick={() => void publishProject(project._id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {publishingId === project._id ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">progress_activity</span>
                          Publishing...
                        </>
                      ) : 'Publish'}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && !error && !projects.length ? (
          <div className="rounded-xl border border-dashed border-outline-variant/20 p-12 text-center text-secondary">
            No projects yet. Create a project before attaching child property listings.
          </div>
        ) : null}
      </main>
    </LandlordPortalLayout>
  );
};

export default LandlordProjects;
