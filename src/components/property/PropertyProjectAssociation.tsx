import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StepUpDialog from '../auth/StepUpDialog';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { projectService } from '../../services/projectService';
import { propertyService } from '../../services/propertyService';
import type { ProjectCard, ProjectUnit, Property } from '../../types';
import { propertyRouteReference } from '../../types';

type AssociationResult = Awaited<ReturnType<typeof propertyService.attachPropertyToProject>>;
type UnitField = keyof ProjectUnit;

const unitFields: Array<{ key: UnitField; label: string }> = [
  { key: 'unitName', label: 'Unit name' },
  { key: 'unitNumber', label: 'Unit number' },
  { key: 'block', label: 'Block' },
  { key: 'phase', label: 'Phase' },
  { key: 'floor', label: 'Floor' },
  { key: 'plotNumber', label: 'Plot number' },
];

interface PropertyProjectAssociationProps {
  property: Property;
  onChanged: () => Promise<unknown>;
}

const PropertyProjectAssociation = ({ property, onChanged }: PropertyProjectAssociationProps) => {
  const propertyId = propertyRouteReference(property);
  const currentProjectId = property.project?._id ?? '';
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [projectPage, setProjectPage] = useState(0);
  const [projectLoading, setProjectLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId);
  const [unit, setUnit] = useState<ProjectUnit>(property.projectUnit ?? {});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const stepUp = useBoundStepUp<AssociationResult>();
  const requestIdRef = useRef(0);

  const unitPayload = useMemo(() => Object.fromEntries(
    unitFields.flatMap(({ key }) => {
      const value = unit[key]?.trim();
      return value ? [[key, value]] : [];
    }),
  ) as ProjectUnit, [unit]);

  const loadProjects = useCallback(async (page: number, append: boolean) => {
    const requestId = ++requestIdRef.current;
    setProjectLoading(true);
    setError('');
    try {
      const result = await projectService.listMyProjects({ page, limit: 50 });
      if (requestId !== requestIdRef.current) return;
      setProjects((current) => append
        ? [...current, ...result.projects.filter((item) => !current.some((existing) => existing._id === item._id))]
        : result.projects);
      setProjectTotal(result.total);
      setProjectPage(result.page);
    } catch (raw) {
      if (requestId === requestIdRef.current) setError(raw instanceof Error ? raw.message : 'Unable to load projects for this active owner profile.');
    } finally {
      if (requestId === requestIdRef.current) setProjectLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects(1, false);
    return () => { requestIdRef.current += 1; };
  }, [loadProjects]);

  const projectLabel = (project: ProjectCard) => `${project.name} · ${project.status.replaceAll('_', ' ')}`;
  const isAssociationChanged = selectedProjectId !== currentProjectId
    || (selectedProjectId === currentProjectId && unitFields.some(({ key }) => {
      const next = unitPayload[key];
      const current = property.projectUnit?.[key];
      return next !== undefined && next !== current;
    }));

  const beginAttach = async () => {
    if (!propertyId || !selectedProjectId || !isAssociationChanged || working || stepUp.busy || stepUp.challenge) return;
    if (property.status === 'sold') {
      setError('Sold or history-protected properties cannot be reassigned.');
      return;
    }
    if (selectedProjectId !== currentProjectId && !window.confirm('Changing this project association will unpublish the listing, clear its project-scoped unit type, and require publication readiness review again. Continue?')) return;

    const body = {
      projectId: selectedProjectId,
      ...(Object.keys(unitPayload).length ? { projectUnit: unitPayload } : {}),
      ...(typeof property.version === 'number' ? { expectedVersion: property.version } : {}),
    };
    setError('');
    setNotice('');
    setWorking(true);
    const started = await stepUp.begin({
      method: 'PATCH',
      path: `/api/properties/${encodeURIComponent(propertyId)}/project`,
      body,
      label: 'Change this property’s project association',
      execute: (challengeId, exactBody) => propertyService.attachPropertyToProject(propertyId, exactBody, challengeId),
    });
    setWorking(false);
    if (!started && stepUp.error) setError(stepUp.error);
  };

  const beginDetach = async () => {
    if (!propertyId || !currentProjectId || working || stepUp.busy || stepUp.challenge) return;
    if (property.status === 'sold') {
      setError('Sold or history-protected properties cannot be detached.');
      return;
    }
    if (!window.confirm('Detach this property from its project? The server will clear project-scoped unit type data and unpublish the listing if required.')) return;
    const body = typeof property.version === 'number' ? { expectedVersion: property.version } : {};
    setError('');
    setNotice('');
    setWorking(true);
    const started = await stepUp.begin({
      method: 'DELETE',
      path: `/api/properties/${encodeURIComponent(propertyId)}/project`,
      body,
      label: 'Detach this property from its project',
      execute: (challengeId, exactBody) => propertyService.detachPropertyFromProject(propertyId, exactBody, challengeId),
    });
    setWorking(false);
    if (!started && stepUp.error) setError(stepUp.error);
  };

  const completeMutation = async (code: string): Promise<boolean> => {
    setWorking(true);
    setError('');
    try {
      const result = await stepUp.complete(code);
      if (!result.ok) {
        setError(result.error ?? 'The project association was not changed. Reload current server values before trying again.');
        return false;
      }
      setNotice('The server updated the project association. Refreshing this property…');
      try {
        await onChanged();
        setNotice('The property details have been refreshed from the server.');
      } catch {
        setError('The association was accepted, but current property details could not be refreshed. Reload before making another change.');
      }
      setSelectedProjectId(result.value.property.project?._id ?? '');
      setUnit(result.value.property.projectUnit ?? {});
      return true;
    } finally {
      setWorking(false);
    }
  };

  const refreshAfterConflict = async () => {
    setError('');
    try { await onChanged(); }
    catch { setError('Current property details could not be reloaded. Try again before resubmitting.'); }
  };

  return <>
    <section className="mt-8 rounded-xl border border-outline-variant/15 bg-white p-5" aria-labelledby="property-project-association-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="property-project-association-title" className="text-lg font-bold">Project association</h2>
          <p className="mt-1 text-sm text-secondary">Manage this property’s project link through the owner-authorized, version-checked association route.</p>
          <p className="mt-1 text-xs text-secondary">Current project: {property.project?.name ?? 'Standalone property'}{property.projectUnit?.unitNumber ? ` · Unit ${property.projectUnit.unitNumber}` : ''}</p>
        </div>
        <button type="button" className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50" disabled={projectLoading} onClick={() => void loadProjects(1, false)}>{projectLoading ? 'Loading projects…' : 'Refresh projects'}</button>
      </div>

      {error ? <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{error}{/conflict|version|changed/i.test(error) ? <button type="button" className="ml-2 font-bold underline" onClick={() => void refreshAfterConflict()}>Reload current property</button> : null}</div> : null}
      {notice ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}

      {property.status === 'sold' ? <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-secondary">This sold/history-protected property cannot be reassigned or detached.</p> : <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="property-project-select" className="block text-sm font-semibold">Project</label>
          <select id="property-project-select" value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setUnit(event.target.value === currentProjectId ? property.projectUnit ?? {} : {}); }} className="mt-1 w-full rounded-lg border border-outline-variant/25 px-3 py-2 text-sm">
            <option value="">Choose an owner project</option>
            {currentProjectId && !projects.some((item) => item._id === currentProjectId) ? <option value={currentProjectId}>{property.project?.name ?? 'Current project'} · current association</option> : null}
            {projects.map((project) => <option key={project._id} value={project._id}>{projectLabel(project)}</option>)}
          </select>
          {projects.length < projectTotal ? <button type="button" className="mt-2 text-xs font-bold text-primary underline" disabled={projectLoading} onClick={() => void loadProjects(projectPage + 1, true)}>Load more projects ({projects.length} of {projectTotal})</button> : null}
          <p className="mt-2 text-xs text-secondary">Changing the associated project can unpublish the property and clear its project-scoped unit type. The server rechecks owner/signatory authority, project access and current versions.</p>
        </div>
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="col-span-2 text-sm font-semibold">Project unit identifiers (optional)</legend>
          {unitFields.map(({ key, label }) => <label key={key} className="text-xs font-medium text-secondary">{label}<input value={unit[key] ?? ''} onChange={(event) => setUnit((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-outline-variant/25 px-3 py-2 text-sm text-primary" /></label>)}
          <p className="col-span-2 text-xs text-secondary">Blank fields are omitted from the request. Use the project unit grid to review the resulting association and readiness.</p>
        </fieldset>
      </div>}

      {property.status !== 'sold' ? <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={!selectedProjectId || !isAssociationChanged || working || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginAttach()}>{working || stepUp.busy ? 'Preparing secure change…' : currentProjectId && currentProjectId !== selectedProjectId ? 'Move to selected project' : 'Save project association'}</button>
        {currentProjectId ? <button type="button" className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50" disabled={working || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginDetach()}>Detach project</button> : null}
      </div> : null}
    </section>
    <StepUpDialog challenge={stepUp.challenge} busy={working || stepUp.busy} error={stepUp.error ?? error} onCancel={() => { stepUp.cancel(); setWorking(false); }} onSubmit={completeMutation} />
  </>;
};

export default PropertyProjectAssociation;
