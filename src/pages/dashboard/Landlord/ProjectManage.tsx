import { Link, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import PropertyCard from '../../../components/property/PropertyCard';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { projectService } from '../../../services/projectService';
import { virtualTourService } from '../../../services/virtualTourService';
import { ApiRequestError } from '../../../lib/axios';
import type { ProjectDetail, Property, VirtualTourProvider } from '../../../types';
import { formatPriceRange, labelize } from '../../../utils/projectFormatters';
import { downloadBlob } from '../../../utils/projectImport';

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
  const [savingTourPreference, setSavingTourPreference] = useState(false);
  const [exportingGrid, setExportingGrid] = useState(false);
  const [extraUnits, setExtraUnits] = useState<Property[]>([]);
  const [nextUnitPage, setNextUnitPage] = useState(2);
  const [loadingMoreUnits, setLoadingMoreUnits] = useState(false);
  const [unitPageError, setUnitPageError] = useState<string | null>(null);
  const [unitPagesExhausted, setUnitPagesExhausted] = useState(false);
  const { id = '' } = useParams();
  const currentProjectId = useRef(id);
  currentProjectId.current = id;
  const { data, loading, error, execute } = useAsync(() => loadLandlordProjectManage(id), Boolean(id));
  const project = data?.project;
  const units = [...(data?.units ?? []), ...extraUnits];
  const hasMoreUnits = !unitPagesExhausted && units.length < (data?.totalUnits ?? 0);
  const [tourPreference, setTourPreference] = useState<VirtualTourProvider | ''>('');
  useEffect(() => setTourPreference(project?.virtualTourProviderOverride ?? ''), [project?.virtualTourProviderOverride]);
  useEffect(() => {
    setExtraUnits([]);
    setNextUnitPage(2);
    setLoadingMoreUnits(false);
    setUnitPageError(null);
    setUnitPagesExhausted(false);
  }, [id]);

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
                <Link to={`/dashboard/landlord/projects/${project._id}/imports`} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">Bulk Upload Properties</Link>
                <Button type="button" variant="secondary" loading={exportingGrid} onClick={() => void exportGrid()}>Export unit grid</Button>
                {!project.isPublished ? <Button type="button" disabled title="Publication request contract and step-up exchange are unavailable">Publish</Button> : null}
                <Button type="button" variant="secondary" disabled title="Project archive requires the step-up exchange">Archive</Button>
              </div>
            </header>
            <p className="text-sm text-secondary">Project editing and archiving require a one-use security challenge. Publication also awaits the exact backend transition request contract.</p>

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
          </div>
        ) : null}
      </main>
    </LandlordPortalLayout>
  );
};

export default ProjectManage;
