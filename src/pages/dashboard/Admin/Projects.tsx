import { Link } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
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
  const [pendingAction, setPendingAction] = useState('');
  const { data, loading, error, execute } = useAsync(() => projectService.adminListProjects({ page: 1, limit: 50, status }), true);
  const projects = data?.projects ?? [];

  const updateStatus = async (id: string, nextStatus: ProjectStatus, isPublished?: boolean, action = 'status') => {
    const actionKey = `${action}:${id}`;
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      await projectService.adminUpdateProjectStatus(id, { status: nextStatus, isPublished });
      toast.success('Project status updated.');
      await execute();
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to update project.');
    } finally {
      setPendingAction('');
    }
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    const actionKey = `featured:${id}`;
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      await projectService.adminSetProjectFeatured(id, { featured });
      toast.success(featured ? 'Project featured.' : 'Project unfeatured.');
      await execute();
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to update featured state.');
    } finally {
      setPendingAction('');
    }
  };

  return (
    <AdminLayout>
      <main className="p-8 lg:p-12">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Projects</h1>
            <p className="mt-2 text-sm text-secondary">Moderate project publication, status, and featured placement.</p>
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
            <option value="">Any status</option>
            {statuses.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
          </select>
        </header>
        {loading ? <LoadingState label="Loading projects..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
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
                          disabled={Boolean(pendingAction)}
                          onChange={(event) => void updateStatus(project._id, event.target.value as ProjectStatus, project.isPublished)}
                          className="rounded-lg bg-surface-container-low px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {statuses.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                        </select>
                        <button
                          type="button"
                          disabled={Boolean(pendingAction)}
                          aria-busy={pendingAction === `publish:${project._id}` || undefined}
                          onClick={() => void updateStatus(project._id, project.status, !project.isPublished, 'publish')}
                          className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingAction === `publish:${project._id}` ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">progress_activity</span>
                              Updating...
                            </>
                          ) : project.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(pendingAction)}
                          aria-busy={pendingAction === `featured:${project._id}` || undefined}
                          onClick={() => void toggleFeatured(project._id, !project.isFeatured)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingAction === `featured:${project._id}` ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">progress_activity</span>
                              Updating...
                            </>
                          ) : project.isFeatured ? 'Unfeature' : 'Feature'}
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
      </main>
    </AdminLayout>
  );
};

export default AdminProjects;
