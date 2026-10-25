import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ApiRequestError } from '../../lib/axios';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { projectService, type UnitTypeDto } from '../../services/projectService';
import type { ProjectDetail } from '../../types';
import { reconcileCanonicalFieldRegistry, serializeCanonicalMutationDrafts, type CanonicalMutationDraft } from '../../utils/canonicalFieldRegistry';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import CanonicalFieldMutationsEditor from '../canonical/CanonicalFieldMutationsEditor';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';

interface UnitTypeManagementProps {
  project: ProjectDetail;
  onChanged: () => Promise<unknown> | void;
}

const UnitTypeManagement = ({ project, onChanged }: UnitTypeManagementProps) => {
  const [types, setTypes] = useState<UnitTypeDto[]>([]);
  const [projectVersion, setProjectVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createDrafts, setCreateDrafts] = useState<CanonicalMutationDraft[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CanonicalMutationDraft[]>>({});
  const [impactById, setImpactById] = useState<Record<string, { affectedUnits: number; fields: Record<string, { inheritingUnits: number; overriddenUnits: number }> }>>({});
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);
  const [protectedAction, setProtectedAction] = useState<'create' | 'update' | 'delete' | null>(null);
  const stepUp = useBoundStepUp<unknown>();
  const { dictionary } = useCanonicalFieldDictionary();
  const registry = useMemo(() => dictionary ? reconcileCanonicalFieldRegistry(dictionary) : [], [dictionary]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await projectService.listUnitTypes(project._id);
      setTypes(result.unitTypes ?? []);
      setProjectVersion(result.projectVersion);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load project unit types.'); }
    finally { setLoading(false); }
  }, [project._id]);

  useEffect(() => { void load(); }, [load]);

  const freshVersions = async (unitTypeId?: string) => {
    const list = await projectService.listUnitTypes(project._id);
    if (!Number.isInteger(list.projectVersion)) throw new Error('The current project version is unavailable. Refresh before changing unit types.');
    const currentType = unitTypeId ? list.unitTypes.find((item) => item.id === unitTypeId) : undefined;
    if (unitTypeId && !currentType) throw new Error('This unit type no longer exists. Refresh the project.');
    if (currentType && currentType.projectVersion !== list.projectVersion) throw new Error('The unit-type list contains stale project versions. Refresh before changing unit types.');
    setProjectVersion(list.projectVersion);
    return { projectVersion: list.projectVersion, unitType: currentType };
  };

  const performCreate = async (body: { expectedVersion: number; canonicalFields: Record<string, unknown> }, challengeId?: string) =>
    projectService.createUnitType(project._id, body, challengeId);

  const create = async () => {
    if (!name.trim() || !category.trim() || !propertyType.trim() || !quantity.trim()) {
      setCreateError('Enter the documented unit type name, category, property type and quantity.'); return;
    }
    const unitCount = Number(quantity);
    if (!Number.isInteger(unitCount) || unitCount < 1) { setCreateError('Unit type quantity must be a positive whole number.'); return; }
    setCreateError(null); setLoading(true);
    try {
      const versions = await freshVersions();
      let additionalFields: Record<string, unknown> = {};
      if (createDrafts.length) {
        if (!dictionary) throw new Error('Canonical field policy is unavailable. Refresh before creating this unit type.');
        const serialized = serializeCanonicalMutationDrafts(createDrafts, registry, 'unit_type');
        if (Object.keys(serialized.errors).length) throw new Error(Object.values(serialized.errors).join(' '));
        if (serialized.mutations.some((mutation) => mutation.operation !== 'set')) throw new Error('New unit types can only set explicit values.');
        additionalFields = Object.fromEntries(serialized.mutations.map((mutation) => [mutation.field, mutation.value]));
      }
      const body = { expectedVersion: versions.projectVersion, canonicalFields: { ...additionalFields, unitTypeName: name.trim(), category: category.trim(), propertyType: propertyType.trim(), unitTypeQuantity: unitCount } };
      try { await performCreate(body); }
      catch (raw) {
        if (!(raw instanceof ApiRequestError && raw.code === 'AUTH_STEP_UP_REQUIRED')) throw raw;
        setProtectedAction('create');
        const started = await stepUp.begin({ method: 'POST', path: `/api/projects/${encodeURIComponent(project._id)}/unit-types`, body, label: 'Create this project unit type', execute: (challengeId, exactBody) => performCreate(exactBody, challengeId) });
        if (started) return;
        setProtectedAction(null);
        throw new Error(stepUp.error ?? 'The secure unit-type request could not start.');
      }
      setName(''); setCategory(''); setPropertyType(''); setQuantity(''); setCreateDrafts([]);
      toast.success('Unit type created.');
      await load(); await onChanged();
    } catch (raw) { setCreateError(raw instanceof Error ? raw.message : 'Unable to create unit type.'); }
    finally { setLoading(false); }
  };

  const saveType = async (unitType: UnitTypeDto) => {
    const selectedDrafts = drafts[unitType.id] ?? [];
    if (!dictionary || !selectedDrafts.length) { setError('Add at least one field and load the canonical field policy before saving.'); return; }
    const serialized = serializeCanonicalMutationDrafts(selectedDrafts, registry, 'unit_type');
    if (Object.keys(serialized.errors).length) { setError(Object.values(serialized.errors).join(' ')); return; }
    setSavingTypeId(unitType.id); setError(null);
    try {
      const versions = await freshVersions(unitType.id);
      const body = { expectedVersion: versions.projectVersion, expectedTypeVersion: versions.unitType!.version, canonicalFieldMutations: serialized.mutations };
      const path = `/api/projects/${encodeURIComponent(project._id)}/unit-types/${encodeURIComponent(unitType.id)}`;
      try {
        const result = await projectService.updateUnitType(project._id, unitType.id, body);
        setImpactById((current) => ({ ...current, [unitType.id]: result.impact as { affectedUnits: number; fields: Record<string, { inheritingUnits: number; overriddenUnits: number }> } }));
      }
      catch (raw) {
        if (!(raw instanceof ApiRequestError && raw.code === 'AUTH_STEP_UP_REQUIRED')) throw raw;
        setProtectedAction('update');
        const started = await stepUp.begin({ method: 'PATCH', path, body, label: 'Update this project unit type', execute: (challengeId, exactBody) => projectService.updateUnitType(project._id, unitType.id, exactBody, challengeId) });
        if (started) return;
        setProtectedAction(null);
        throw new Error(stepUp.error ?? 'The secure unit-type request could not start.');
      }
      setDrafts((current) => ({ ...current, [unitType.id]: [] }));
      toast.success('Unit type updated; inherited values and affected units were recalculated.');
      await load(); await onChanged();
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to update unit type.'); }
    finally { setSavingTypeId(null); }
  };

  const removeType = async (unitType: UnitTypeDto) => {
    if (!window.confirm('Remove this unit type? Removal is allowed only when no current or historical unit references it.')) return;
    try {
      const versions = await freshVersions(unitType.id);
      const body = { expectedVersion: versions.projectVersion, expectedTypeVersion: versions.unitType!.version };
      const path = `/api/projects/${encodeURIComponent(project._id)}/unit-types/${encodeURIComponent(unitType.id)}`;
      setProtectedAction('delete');
      const started = await stepUp.begin({ method: 'DELETE', path, body, label: 'Remove this unused project unit type', execute: (challengeId, exactBody) => projectService.deleteUnitType(project._id, unitType.id, exactBody, challengeId) });
      if (!started) { setProtectedAction(null); setError(stepUp.error ?? 'Unable to start the secure removal.'); }
    } catch (raw) { setProtectedAction(null); setError(raw instanceof Error ? raw.message : 'Unable to remove unit type.'); }
  };

  const finishStepUp = async (code: string): Promise<boolean> => {
    const result = await stepUp.complete(code);
    if (!result.ok) return false;
    if (result.value && typeof result.value === 'object' && 'unitType' in result.value && 'impact' in result.value) {
      const value = result.value as { unitType: UnitTypeDto; impact: { affectedUnits: number; fields: Record<string, { inheritingUnits: number; overriddenUnits: number }> } };
      setImpactById((current) => ({ ...current, [value.unitType.id]: value.impact }));
    }
    if (protectedAction === 'create') {
      setName(''); setCategory(''); setPropertyType(''); setQuantity(''); setCreateDrafts([]);
    } else if (protectedAction === 'update' && result.value && typeof result.value === 'object' && 'unitType' in result.value) {
      setDrafts((current) => ({ ...current, [(result.value as { unitType: UnitTypeDto }).unitType.id]: [] }));
    }
    setProtectedAction(null);
    toast.success(protectedAction === 'delete' ? 'The unused project unit type was removed.' : 'The protected unit-type action completed.');
    await load(); await onChanged();
    return true;
  };

  return <section className="space-y-4 rounded-xl border border-outline-variant/10 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Project unit types</h2><p className="mt-1 text-sm text-secondary">Type defaults flow into units unless a unit has an explicit override. Effective values and source state come from the project API.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>Refresh</Button></div>
    {projectVersion !== null ? <p className="text-xs text-secondary">Current unit-type list project version {projectVersion}</p> : null}
    {loading ? <p className="text-sm text-secondary">Loading unit types…</p> : null}
    {error ? <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p> : null}
    {stepUp.error ? <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{stepUp.error}</p> : null}
    {types.map((unitType) => <details key={unitType.id} className="rounded-lg border border-outline-variant/20 p-4">
      <summary className="cursor-pointer font-bold">{String(unitType.canonicalFields.unitTypeName ?? unitType.id)} · {unitType.id} · version {unitType.version}</summary>
      <details className="mt-2 rounded bg-surface-container-low p-3 text-xs"><summary className="cursor-pointer font-bold">Stored type values, effective values and source</summary><p className="mt-2 font-semibold">Raw type values</p><dl className="mt-1 grid gap-1 sm:grid-cols-2">{Object.entries(unitType.canonicalFields).map(([key, value]) => <div key={`raw:${key}`}><dt className="inline font-semibold">{key}: </dt><dd className="inline">{JSON.stringify(value)}</dd></div>)}</dl><p className="mt-3 font-semibold">Effective values</p><dl className="mt-1 grid gap-1 sm:grid-cols-2">{Object.entries(unitType.effectiveFields).map(([key, value]) => <div key={`effective:${key}`}><dt className="inline font-semibold">{key}: </dt><dd className="inline">{JSON.stringify(value)} · {unitType.fieldSources[key]?.sourceLevel ?? 'source unavailable'} ({unitType.fieldSources[key]?.state ?? 'state unavailable'})</dd></div>)}</dl>{impactById[unitType.id] ? <p className="mt-3 font-semibold">Update impact: {impactById[unitType.id].affectedUnits} affected unit(s) · {Object.entries(impactById[unitType.id].fields).map(([field, impact]) => `${field}: ${impact.inheritingUnits} inherit, ${impact.overriddenUnits} override`).join(' · ')}</p> : null}</details>
      <CanonicalFieldMutationsEditor target="unit_type" title="Edit type defaults" value={drafts[unitType.id] ?? []} onChange={(value) => setDrafts((current) => ({ ...current, [unitType.id]: value }))} canonicalFields={unitType.canonicalFields} effectiveFields={unitType.effectiveFields} fieldSources={unitType.fieldSources} />
      <div className="mt-3 flex flex-wrap gap-2"><Button type="button" disabled={savingTypeId === unitType.id || !(drafts[unitType.id]?.length)} onClick={() => void saveType(unitType)}>{savingTypeId === unitType.id ? 'Saving…' : 'Save type fields'}</Button><Button type="button" variant="secondary" disabled={Boolean(stepUp.challenge) || stepUp.busy} onClick={() => void removeType(unitType)}>Remove unused type</Button></div>
    </details>)}
    {!loading && !types.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No unit types are configured for this project yet.</p> : null}
    <div className="grid gap-3 rounded-lg bg-surface-container-low p-4 md:grid-cols-4">
      <label className="text-xs font-bold">Unit type name<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="text-xs font-bold">Category<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={category} onChange={(event) => setCategory(event.target.value)} /></label>
      <label className="text-xs font-bold">Property type<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={propertyType} onChange={(event) => setPropertyType(event.target.value)} /></label>
      <label className="text-xs font-bold">Unit type quantity<input type="number" min={1} step={1} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <div className="md:col-span-4"><CanonicalFieldMutationsEditor target="unit_type" title="Optional unit-type defaults" value={createDrafts} onChange={setCreateDrafts} createMode exclude={['unitTypeName', 'category', 'propertyType', 'unitTypeQuantity']} /></div>
      <div className="md:col-span-4"><Button type="button" disabled={loading || stepUp.busy || Boolean(stepUp.challenge) || projectVersion === null} onClick={() => void create()}>Create unit type</Button>{createError ? <p role="alert" className="mt-2 text-sm text-error">{createError}</p> : null}</div>
    </div>
    <p className="text-xs text-secondary">Price and media defaults require the corresponding profile permissions and, when requested by the backend, a bound security challenge. Unit types cannot be archived; removal is available only with the documented versioned, step-up-protected DELETE route.</p>
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={() => { setProtectedAction(null); stepUp.cancel(); }} onSubmit={finishStepUp} />
  </section>;
};

export default UnitTypeManagement;
