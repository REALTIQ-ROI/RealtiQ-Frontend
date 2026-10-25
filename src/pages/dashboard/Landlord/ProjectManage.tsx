import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import PropertyCard from '../../../components/property/PropertyCard';
import Button from '../../../components/ui/Button';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { projectService, type ProjectPublicationRequest, type UnitGridJob } from '../../../services/projectService';
import { virtualTourService } from '../../../services/virtualTourService';
import { ApiRequestError } from '../../../lib/axios';
import { projectPublicationReadinessView } from '../../../utils/projectPublicationReadiness';
import type { ProjectDetail, Property, VirtualTourProvider } from '../../../types';
import { formatPriceRange, labelize } from '../../../utils/projectFormatters';
import { downloadBlob } from '../../../utils/projectImport';
import UnitGridPanel from '../../../components/project/UnitGridPanel';
import UnitTypeManagement from '../../../components/project/UnitTypeManagement';
import { useAuth } from '../../../contexts/AuthContext';

interface LandlordProjectManageData {
  project: ProjectDetail;
  units: Property[];
  totalUnits: number;
}

const loadLandlordProjectManage = async (id: string): Promise<LandlordProjectManageData> => {
  const { project } = await projectService.getProjectManage(id);
  const inventory = await projectService.getProjectProperties(project._id, { page: 1, limit: 100, includeUnpublished: true });
  return { project, units: inventory.properties ?? [], totalUnits: inventory.total ?? inventory.properties?.length ?? 0 };
};

const ProjectManage = () => {
  const navigate = useNavigate();
  const { activeProfile } = useAuth();
  const [savingTourPreference, setSavingTourPreference] = useState(false);
  const [exportingGrid, setExportingGrid] = useState(false);
  const [jobIdInput, setJobIdInput] = useState('');
  const [monitoredJobId, setMonitoredJobId] = useState('');
  const [gridJob, setGridJob] = useState<UnitGridJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [autoRefreshJob, setAutoRefreshJob] = useState(false);
  const [publicationOpen, setPublicationOpen] = useState(false);
  const [publicationMode, setPublicationMode] = useState<'publish_all_ready' | 'publish_selected' | 'save_draft'>('publish_all_ready');
  const [publicationUnitIds, setPublicationUnitIds] = useState<string[]>([]);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationResult, setPublicationResult] = useState<ProjectDetail['publication'] | null>(null);
  const [publicationReadiness, setPublicationReadiness] = useState<ApiRequestError['publicationReadiness']>(undefined);
  const [publishing, setPublishing] = useState(false);
  const publicationStepUp = useBoundStepUp<{ project: ProjectDetail }>();
  const deleteProjectStepUp = useBoundStepUp<{ message: string }>();
  const cancelPublicationStepUp = publicationStepUp.cancel;
  const [extraUnits, setExtraUnits] = useState<Property[]>([]);
  const [nextUnitPage, setNextUnitPage] = useState(2);
  const [loadingMoreUnits, setLoadingMoreUnits] = useState(false);
  const [unitPageError, setUnitPageError] = useState<string | null>(null);
  const [unitPagesExhausted, setUnitPagesExhausted] = useState(false);
  const { id = '' } = useParams();
  const location = useLocation();
  const currentProjectId = useRef(id);
  currentProjectId.current = id;
  const { data, loading, error, execute } = useAsync(() => loadLandlordProjectManage(id), Boolean(id));
  const project = data?.project;
  const units = [...(data?.units ?? []), ...extraUnits];
  const hasMoreUnits = !unitPagesExhausted && units.length < (data?.totalUnits ?? 0);
  const [tourPreference, setTourPreference] = useState<VirtualTourProvider | ''>('');
  useEffect(() => setTourPreference(project?.virtualTourProviderOverride ?? ''), [project?.virtualTourProviderOverride]);
  useEffect(() => {
    if (location.hash === '#project-publication') setPublicationOpen(true);
  }, [location.hash]);
  useEffect(() => {
    setExtraUnits([]);
    setNextUnitPage(2);
    setLoadingMoreUnits(false);
    setUnitPageError(null);
    setUnitPagesExhausted(false);
    setJobIdInput('');
    setMonitoredJobId('');
    setGridJob(null);
    setJobError(null);
    setAutoRefreshJob(false);
    setPublicationUnitIds([]);
    cancelPublicationStepUp();
    setPublicationError(null);
    setPublicationResult(null);
    setPublicationReadiness(undefined);
  }, [id, cancelPublicationStepUp]);

  const startPublication = async () => {
    if (!project || publishing) return;
    if (publicationMode === 'publish_selected' && !publicationUnitIds.length) { setPublicationError('Select at least one loaded unit.'); return; }
    setPublishing(true);
    setPublicationError(null);
    setPublicationResult(null);
    setPublicationReadiness(undefined);
    try {
      const { project: currentProject } = await projectService.getProjectManage(project._id);
      if (typeof currentProject.version !== 'number') {
        setPublicationError('The current project version is unavailable. Refresh before publishing.');
        return;
      }
      if (currentProject.version !== project.version) {
        await refreshProject();
        setPublicationError('The project changed since this page loaded. Review the current units and readiness before starting a challenge.');
        return;
      }
      const body: ProjectPublicationRequest = publicationMode === 'publish_selected'
        ? { expectedVersion: currentProject.version, publicationAction: 'publish_selected', selectedUnitIds: [...publicationUnitIds] }
        : { expectedVersion: currentProject.version, publicationAction: publicationMode };
      await publicationStepUp.begin({
        method: 'PATCH', path: `/api/projects/${encodeURIComponent(project._id)}`, body,
        label: body.publicationAction === 'save_draft' ? 'Save this project as a draft and unpublish its units' : `Publish project units: ${body.publicationAction.replaceAll('_', ' ')}`,
        execute: async (challengeId, exactBody) => {
          try { return await projectService.publishProject(project._id, exactBody, challengeId); }
          catch (raw) {
            if (raw instanceof ApiRequestError) setPublicationReadiness(raw.publicationReadiness);
            await refreshProject(); throw raw;
          }
        },
      });
    } catch (raw) { setPublicationError(raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})` : raw instanceof Error ? raw.message : 'Unable to start publication challenge.'); }
    finally { setPublishing(false); }
  };

  const finishPublication = async (code: string): Promise<boolean> => {
    setPublicationError(null);
    const result = await publicationStepUp.complete(code);
    if (!result.ok) return false;
    setPublicationResult(result.value.project.publication ?? null);
    setPublicationReadiness(undefined);
    setPublicationUnitIds([]);
    await refreshProject();
    toast.success('Project publication state was updated. Review the current readiness and publication counts.');
    return true;
  };

  const deleteEmptyProject = async () => {
    if (!project || typeof project.version !== 'number' || (data?.totalUnits ?? project.totalUnits ?? project.propertyCount ?? 0) !== 0) return;
    if (!window.confirm('Delete this empty project? Projects with current or historical units cannot be deleted.')) return;
    const body = { expectedVersion: project.version };
    const started = await deleteProjectStepUp.begin({
      method: 'DELETE', path: `/api/projects/${encodeURIComponent(project._id)}`, body,
      label: 'Delete this empty project',
      execute: (challengeId, exactBody) => projectService.deleteProject(project._id, exactBody, challengeId),
    });
    if (!started) setPublicationError(deleteProjectStepUp.error ?? 'The secure deletion could not start.');
  };

  const finishProjectDelete = async (code: string): Promise<boolean> => {
    const result = await deleteProjectStepUp.complete(code);
    if (!result.ok) return false;
    toast.success('Empty project deleted.');
    navigate('/dashboard/landlord/projects');
    return true;
  };

  useEffect(() => {
    if (!autoRefreshJob || !monitoredJobId || !project?._id) return;
    const projectId = project._id;
    const timer = window.setInterval(() => {
      void projectService.getUnitGridJob(projectId, monitoredJobId)
        .then((job) => { if (currentProjectId.current === id) { setGridJob(job); setJobError(null); } })
        .catch((raw: unknown) => { if (currentProjectId.current === id) setJobError(raw instanceof Error ? raw.message : 'Unable to refresh grid job.'); });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [autoRefreshJob, monitoredJobId, project?._id, id]);

  const loadGridJob = async (jobId: string) => {
    if (!project || !jobId.trim()) return;
    const requestedProjectId = project._id;
    setJobLoading(true);
    setJobError(null);
    try {
      const job = await projectService.getUnitGridJob(requestedProjectId, jobId.trim());
      if (currentProjectId.current !== id) return;
      setMonitoredJobId(jobId.trim());
      setGridJob(job);
    } catch (raw) {
      if (currentProjectId.current === id) setJobError(raw instanceof Error ? raw.message : 'Unable to load the grid job.');
    } finally {
      if (currentProjectId.current === id) setJobLoading(false);
    }
  };

  const cancelGridJob = async () => {
    if (!project || !monitoredJobId) return;
    setJobLoading(true);
    setJobError(null);
    try {
      setGridJob(await projectService.cancelUnitGridJob(project._id, monitoredJobId));
      toast.info('Cancellation requested. Already committed rows remain; refresh for final outcomes.');
    } catch (raw) {
      setJobError(raw instanceof Error ? raw.message : 'Unable to cancel the grid job.');
    } finally { setJobLoading(false); }
  };

  const refreshProject = async () => {
    setExtraUnits([]);
    setNextUnitPage(2);
    setUnitPagesExhausted(false);
    setUnitPageError(null);
    await execute();
  };

  const loadMoreUnits = async () => {
    if (!project || loadingMoreUnits || !hasMoreUnits) return;
    setLoadingMoreUnits(true);
    setUnitPageError(null);
    try {
      const page = await projectService.getProjectProperties(project._id, {
        page: nextUnitPage,
        limit: 100,
        includeUnpublished: true,
      });
      if (currentProjectId.current !== id) return;
      const newUnits = page.properties ?? [];
      const knownIds = new Set(units.map((unit) => unit._id));
      setExtraUnits((current) => [...current, ...newUnits.filter((unit) => !knownIds.has(unit._id))]);
      setNextUnitPage((current) => current + 1);
      if (!newUnits.length) setUnitPagesExhausted(true);
    } catch (raw) {
      if (currentProjectId.current === id) setUnitPageError(raw instanceof Error ? raw.message : 'Unable to load more units.');
    } finally {
      if (currentProjectId.current === id) setLoadingMoreUnits(false);
    }
  };

  const saveTourPreference = async () => {
    if (!project) return;
    setSavingTourPreference(true);
    try {
      await virtualTourService.setProjectVirtualTourProvider(project._id, {
        provider: tourPreference || null,
        ...(typeof project.version === 'number' ? { expectedVersion: project.version } : {}),
      });
      toast.success(tourPreference ? 'Project virtual-tour preference saved.' : 'Project now inherits the global default.');
      await refreshProject();
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) {
        await refreshProject();
        toast.error('This project changed. Latest values were reloaded; review them before saving again.');
      } else {
        toast.error(raw instanceof Error ? raw.message : 'Unable to update the Project preference.');
      }
    } finally { setSavingTourPreference(false); }
  };

  const exportGrid = async () => {
    if (!project) return;
    setExportingGrid(true);
    try {
      downloadBlob(await projectService.downloadUnitGridCsv(project._id), 'project-unit-grid.csv');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to download the unit grid.');
    } finally {
      setExportingGrid(false);
    }
  };

  const readinessView = publicationReadiness ? projectPublicationReadinessView(publicationReadiness) : null;

  return (
    <>
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
                <Link to={`/dashboard/landlord/projects/${project._id}/imports`} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">Bulk Upload Properties</Link>
                <Button type="button" variant="secondary" loading={exportingGrid} onClick={() => void exportGrid()}>Export unit grid</Button>
                <Button type="button" onClick={() => setPublicationOpen((value) => !value)}>Publication</Button>
                <Button type="button" variant="secondary" disabled={deleteProjectStepUp.busy || Boolean(deleteProjectStepUp.challenge) || typeof project.version !== 'number' || (data?.totalUnits ?? project.totalUnits ?? project.propertyCount ?? 0) !== 0} onClick={() => void deleteEmptyProject()}>Delete empty project</Button>
              </div>
            </header>
            {deleteProjectStepUp.error ? <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{deleteProjectStepUp.error}</p> : null}
            {publicationError && !publicationOpen ? <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{publicationError}</p> : null}
            <p className="text-sm text-secondary">Project edits use changed-only fields and the current version. Publication actions use the version-bound one-use security challenge. The documented DELETE route removes only empty projects; no archive operation is available.</p>

            {publicationOpen ? <section className="rounded-xl border border-outline-variant/10 bg-white p-5" id="project-publication">
              <h2 className="text-xl font-black">Project publication</h2>
              <p className="mt-1 text-sm text-secondary">The server checks each selected unit's current readiness. Publish all ready leaves blocked units unpublished; selected publication checks every chosen unit.</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm"><label className="flex items-center gap-2"><input type="radio" name="publication-mode" disabled={Boolean(publicationStepUp.challenge)} checked={publicationMode === 'publish_all_ready'} onChange={() => setPublicationMode('publish_all_ready')} />Publish all ready units</label><label className="flex items-center gap-2"><input type="radio" name="publication-mode" disabled={Boolean(publicationStepUp.challenge)} checked={publicationMode === 'publish_selected'} onChange={() => setPublicationMode('publish_selected')} />Publish selected units</label><label className="flex items-center gap-2"><input type="radio" name="publication-mode" disabled={Boolean(publicationStepUp.challenge)} checked={publicationMode === 'save_draft'} onChange={() => setPublicationMode('save_draft')} />Save as draft / unpublish</label></div>
              {publicationMode === 'publish_selected' ? <div className="mt-3 max-h-44 space-y-1 overflow-y-auto rounded-lg bg-surface-container-low p-3 text-xs">{units.map((unit) => <label key={unit._id} className="flex items-center gap-2"><input type="checkbox" disabled={Boolean(publicationStepUp.challenge)} checked={publicationUnitIds.includes(unit._id)} onChange={(event) => setPublicationUnitIds((current) => event.target.checked ? [...current, unit._id] : current.filter((id) => id !== unit._id))} />{unit.publicReference || unit._id} · {unit.title}</label>)}{!units.length ? <p>No loaded units available to select.</p> : null}</div> : null}
              <Button type="button" className="mt-4" disabled={publishing || publicationStepUp.busy || Boolean(publicationStepUp.challenge) || typeof project.version !== 'number'} onClick={() => void startPublication()}>{publicationMode === 'save_draft' ? 'Start unpublish challenge' : 'Start publication challenge'}</Button>
              {publicationError || (!publicationStepUp.challenge && publicationStepUp.error) ? <p role="alert" className="mt-3 text-sm text-error">{publicationError ?? publicationStepUp.error}</p> : null}
              {readinessView ? <div role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><h3 className="font-bold">Publication readiness returned by the backend</h3>{readinessView.projectBlockers.length ? <div className="mt-2"><p className="font-semibold">Project blockers</p><ul className="list-disc pl-5">{readinessView.projectBlockers.map((item, index) => <li key={`${item.field}:${item.code}:${index}`}>{item.field}: {item.code}</li>)}</ul></div> : null}{readinessView.units.length ? <div className="mt-2"><p className="font-semibold">Unit blockers</p><ul className="list-disc pl-5">{readinessView.units.map((unit) => <li key={unit.unitId}>{unit.unitId}: {unit.blockers.map((item) => `${item.field}: ${item.code}`).join(' · ')}</li>)}</ul></div> : null}<div className="mt-3 flex flex-wrap gap-3"><Link className="font-bold underline" to={`/dashboard/landlord/projects/${project._id}/edit`}>Edit project details</Link><a className="font-bold underline" href="#unit-grid">Review unit grid</a></div></div> : null}
              {(publicationResult ?? project.publication) ? <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm"><p className="font-bold">Publication result</p><p>{(publicationResult ?? project.publication)?.publishedUnitCount ?? 0} published · {(publicationResult ?? project.publication)?.blockedUnitCount ?? 0} blocked</p>{(publicationResult ?? project.publication)?.blockedUnits?.map((unit) => <p key={unit.unitId} className="mt-1 text-xs text-amber-800">{unit.unitId}: {unit.blockers.map((item) => `${item.field} ${item.code}`).join(' · ')}</p>)}</div> : null}
            </section> : null}

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
              <h2 className="text-xl font-black">Virtual-tour provider preference</h2>
              <p className="mt-1 text-sm text-secondary">A preference for child Properties only. It does not configure a tour or rewrite child records.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <select aria-label="Project virtual tour provider preference" className="rounded-lg border border-outline-variant/20 px-3 py-2" value={tourPreference} onChange={(event) => setTourPreference(event.target.value as VirtualTourProvider | '')}>
                  <option value="">Inherit global default</option><option value="realsee">Realsee</option><option value="matterport">Matterport</option>
                </select>
                <Button type="button" loading={savingTourPreference} onClick={() => void saveTourPreference()}>Save preference</Button>
              </div>
            </section>

            <div id="unit-grid"><UnitGridPanel key={`${project._id}:${activeProfile?.id ?? 'none'}`} projectId={project._id} /></div>

            <UnitTypeManagement project={project} onChanged={async () => { await refreshProject(); }} />

            <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">Child property units</h2>
                  <p className="text-sm text-secondary">Create or edit a property and choose this project to attach it as a unit. Use the canonical grid above for effective values, provenance and bulk actions.</p>
                </div>
                <Link to={`/dashboard/landlord/add-property?projectId=${project._id}`} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">
                  Add unit
                </Link>
              </div>
              <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs text-secondary">Select a project unit type when creating each unit. Project unit identity is stored as a unit number and must match the canonical unit identifier.</p>
              {units.length ? (
                <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {units.map((property) => <div key={property._id} className="space-y-2"><div className="flex justify-end"><Link className="text-xs font-bold text-primary underline" to={`/dashboard/landlord/edit-property/${property._id}`}>Edit unit</Link></div><PropertyCard property={property} /></div>)}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-outline-variant/20 p-8 text-center text-secondary">
                  No child units yet.
                </div>
              )}
              {unitPageError ? <p role="alert" className="mt-3 text-sm text-red-700">{unitPageError}</p> : null}
              {hasMoreUnits ? (
                <div className="mt-5 flex items-center gap-3">
                  <Button type="button" variant="secondary" disabled={loadingMoreUnits} onClick={() => void loadMoreUnits()}>
                    {loadingMoreUnits ? 'Loading…' : 'Load more units'}
                  </Button>
                  <span className="text-sm text-secondary">Showing {units.length} of {data?.totalUnits ?? 0}</span>
                </div>
              ) : null}
            </section>
            <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
              <h2 className="text-xl font-black">Unit-grid job progress</h2>
              <p className="mt-1 text-sm text-secondary">Look up a previous grid job by its server ID. Each row outcome, including partial success and conflicts, remains visible. Cancellation stops remaining work cooperatively.</p>
              <div className="mt-4 flex flex-wrap gap-2"><input aria-label="Unit-grid job ID" value={jobIdInput} onChange={(event) => setJobIdInput(event.target.value)} className="min-w-[220px] flex-1 rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Grid job ID" /><Button type="button" variant="secondary" disabled={!jobIdInput.trim() || jobLoading} onClick={() => void loadGridJob(jobIdInput)}>Load job</Button>{monitoredJobId ? <Button type="button" variant="secondary" disabled={jobLoading} onClick={() => void loadGridJob(monitoredJobId)}>Refresh</Button> : null}</div>
              {jobError ? <p role="alert" className="mt-3 text-sm text-red-700">{jobError}</p> : null}
              {jobLoading ? <p className="mt-3 text-sm text-secondary">Loading job progress…</p> : null}
              {gridJob ? <div className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm"><p className="font-bold capitalize">{gridJob.action.replaceAll('_', ' ')} · {gridJob.state.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-secondary">{gridJob.progress.completed} completed · {gridJob.progress.failed} failed · {gridJob.progress.cancelled} cancelled · {gridJob.progress.remaining} remaining</p>{gridJob.state === 'partially_completed' ? <p className="mt-2 text-xs font-semibold text-amber-800">Some rows committed and others did not.</p> : null}<div className="mt-3 space-y-2">{gridJob.rows.map((row) => <div key={`${row.index}:${row.unitId}`} className="rounded bg-white p-2 text-xs"><span className="font-bold">{row.unitId} · {row.state}</span>{row.error ? <span className="ml-2 text-error">{row.error.code}: {row.error.message}</span> : null}{row.operationId ? <span className="ml-2 text-secondary">Operation {row.operationId}</span> : null}</div>)}</div></div> : null}
              {monitoredJobId ? <div className="mt-3 flex flex-wrap items-center gap-3">{gridJob && !['completed', 'partially_completed', 'failed', 'cancelled'].includes(gridJob.state) ? <Button type="button" variant="secondary" disabled={jobLoading} onClick={() => void cancelGridJob()}>Cancel remaining work</Button> : null}<label className="flex items-center gap-2 text-xs text-secondary"><input type="checkbox" checked={autoRefreshJob} onChange={(event) => setAutoRefreshJob(event.target.checked)} />Refresh every 10 seconds</label></div> : null}
              <p className="mt-3 text-xs text-secondary">Use the canonical grid above to start a new job and request version-safe undo with an authenticator challenge.</p>
            </section>
          </div>
        ) : null}
      </main>
    </LandlordPortalLayout>
    <StepUpDialog challenge={publicationStepUp.challenge} busy={publicationStepUp.busy} error={publicationStepUp.error} onCancel={publicationStepUp.cancel} onSubmit={async (code) => finishPublication(code)} />
    <StepUpDialog challenge={deleteProjectStepUp.challenge} busy={deleteProjectStepUp.busy} error={deleteProjectStepUp.error} onCancel={deleteProjectStepUp.cancel} onSubmit={finishProjectDelete} />
    </>
  );
};

export default ProjectManage;
