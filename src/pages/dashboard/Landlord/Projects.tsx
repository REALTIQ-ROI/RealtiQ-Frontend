import { Link } from 'react-router-dom';
import { useState } from 'react';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import ProjectCard from '../../../components/project/ProjectCard';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { projectService } from '../../../services/projectService';

const LandlordProjects = () => {
  const [extraProjects, setExtraProjects] = useState<Awaited<ReturnType<typeof projectService.listMyProjects>>['projects']>([]);
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pagesExhausted, setPagesExhausted] = useState(false);
  const { data, loading, error, execute } = useAsync(() => projectService.listMyProjects({ page: 1, limit: 50 }), true);
  const projects = [...(data?.projects ?? []), ...extraProjects];
  const hasMore = !pagesExhausted && projects.length < (data?.total ?? 0);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPageError(null);
    try {
      const page = await projectService.listMyProjects({ page: nextPage, limit: 50 });
      const knownIds = new Set(projects.map((project) => project._id));
      setExtraProjects((current) => [...current, ...page.projects.filter((project) => !knownIds.has(project._id))]);
      setNextPage((current) => current + 1);
      if (!page.projects.length) setPagesExhausted(true);
    } catch (raw) {
      setPageError(raw instanceof Error ? raw.message : 'Unable to load more projects.');
    } finally {
      setLoadingMore(false);
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
                    <Link to={`/dashboard/landlord/projects/${project._id}#project-publication`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">
                      Publication controls
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {pageError ? <p role="alert" className="mt-4 text-sm text-red-700">{pageError}</p> : null}
        {!loading && !error && hasMore ? (
          <div className="mt-6 flex items-center gap-3">
            <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="rounded-lg bg-surface-container-low px-4 py-2 text-sm font-bold text-primary disabled:opacity-60">
              {loadingMore ? 'Loading…' : 'Load more projects'}
            </button>
            <span className="text-sm text-secondary">Showing {projects.length} of {data?.total ?? 0}</span>
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
