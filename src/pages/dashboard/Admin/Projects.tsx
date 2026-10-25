import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { projectService } from '../../../services/projectService';
import type { ProjectStatus } from '../../../types';
import { formatPriceRange, labelize } from '../../../utils/projectFormatters';

const statuses: ProjectStatus[] = ['draft', 'upcoming', 'ongoing', 'completed', 'sold_out', 'suspended'];

const AdminProjects = () => {
  const [status, setStatus] = useState('');
  const currentStatus = useRef(status);
  currentStatus.current = status;
  const [extraProjects, setExtraProjects] = useState<Awaited<ReturnType<typeof projectService.adminListProjects>>['projects']>([]);
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pagesExhausted, setPagesExhausted] = useState(false);
  const { data, loading, error, execute } = useAsync(() => projectService.adminListProjects({ page: 1, limit: 50, status }), true, status);
  const projects = [...(data?.projects ?? []), ...extraProjects];
  const hasMore = !pagesExhausted && projects.length < (data?.total ?? 0);

  useEffect(() => {
    setExtraProjects([]);
    setNextPage(2);
    setLoadingMore(false);
    setPageError(null);
    setPagesExhausted(false);
  }, [status]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPageError(null);
    try {
      const page = await projectService.adminListProjects({ page: nextPage, limit: 50, status });
      if (currentStatus.current !== status) return;
      const knownIds = new Set(projects.map((project) => project._id));
      setExtraProjects((current) => [...current, ...page.projects.filter((project) => !knownIds.has(project._id))]);
      setNextPage((current) => current + 1);
      if (!page.projects.length) setPagesExhausted(true);
    } catch (raw) {
      if (currentStatus.current === status) setPageError(raw instanceof Error ? raw.message : 'Unable to load more projects.');
    } finally {
      if (currentStatus.current === status) setLoadingMore(false);
    }
  };

  return (
    <AdminLayout>
      <main className="p-8 lg:p-12">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Projects</h1>
            <p className="mt-2 text-sm text-secondary">Review project publication, status, and featured placement.</p>
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
            <option value="">Any status</option>
            {statuses.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
          </select>
        </header>
        {loading ? <LoadingState label="Loading projects..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        <p className="mb-4 text-sm text-secondary">Staff project status and Featured changes require a one-use security challenge. Publication also awaits the exact transition contract.</p>
        {!loading && !error ? (
          <div className="overflow-x-auto rounded-xl bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-xs uppercase tracking-widest text-secondary">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Units</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Off-plan</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {projects.map((project) => (
                  <tr key={project._id}>
                    <td className="p-4">
                      <p className="font-black">{project.name}</p>
                      <p className="text-xs text-secondary">{project.developer?.name || 'Developer unavailable'} - {project.isPublished ? 'Published' : 'Unpublished'}</p>
                    </td>
                    <td className="p-4">{labelize(project.status)}</td>
                    <td className="p-4">{project.availableUnits} / {project.totalUnits}</td>
                    <td className="p-4">{formatPriceRange(project.minimumPrice, project.maximumPrice)}</td>
                    <td className="p-4">{project.offPlanSummary ? `${project.offPlanSummary.availableOffPlanUnits} / ${project.offPlanSummary.totalOffPlanUnits}` : 'None'}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link to={`/dashboard/admin/projects/${project._id}`} className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-primary">
                          View
                        </Link>
                        <select
                          value={project.status}
                          disabled
                          title="Project status changes require the one-use security challenge."
                          className="rounded-lg bg-surface-container-low px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {statuses.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                        </select>
                        <button
                          type="button"
                          disabled
                          title="Project publication transition contract is unavailable."
                          className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {project.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Project Featured changes require the one-use security challenge."
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {project.isFeatured ? 'Unfeature' : 'Feature'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!projects.length ? <tr><td colSpan={6} className="p-10 text-center text-secondary">No projects found.</td></tr> : null}
              </tbody>
            </table>
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
      </main>
    </AdminLayout>
  );
};

export default AdminProjects;
