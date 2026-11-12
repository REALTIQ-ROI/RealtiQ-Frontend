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
import ActionConfirmModal from '../proxyNetwork/ActionConfirmModal';
import Button from '../ui/Button';
import { dictionaryVocabularyOptions, fieldVocabularyLabel, propertyTypesForCategory } from '../../utils/propertyVocabulary';

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
  const [typePendingRemoval, setTypePendingRemoval] = useState<UnitTypeDto | null>(null);
  const [impactConfirmation, setImpactConfirmation] = useState<{
    unitType: UnitTypeDto;
    body: { expectedVersion: number; expectedTypeVersion: number; canonicalFieldMutations: Array<{ field: string; operation: string; value?: unknown }> };
    impact: { affectedUnits: number; fields: Record<string, { inheritingUnits: number; overriddenUnits: number }> };
  } | null>(null);
  const stepUp = useBoundStepUp<unknown>();
  const { dictionary } = useCanonicalFieldDictionary();
  const registry = useMemo(() => dictionary ? reconcileCanonicalFieldRegistry(dictionary) : [], [dictionary]);
  const categoryOptions = useMemo(() => dictionaryVocabularyOptions(dictionary, 'categories', dictionary?.fields.find((field) => field.key === 'category')), [dictionary]);
  const allPropertyTypeOptions = useMemo(() => dictionaryVocabularyOptions(dictionary, 'propertyTypes', dictionary?.fields.find((field) => field.key === 'propertyType')), [dictionary]);
  const selectedCategoryKey = categoryOptions.find((option) => option.value === category)?.key ?? category;
  const propertyTypeOptions = useMemo(() => propertyTypesForCategory(allPropertyTypeOptions, selectedCategoryKey), [allPropertyTypeOptions, selectedCategoryKey]);

  const fieldLabel = (key: string) => {
    const field = dictionary?.fields.find((item) => item.key === key);
    return typeof field?.label === 'string' ? field.label : key.replace(/([a-z])([A-Z])/g, '$1 $2');
  };
  const formatValue = (key: string, value: unknown): string => {
    if (value === null) return 'Null (explicit)';
    if (value === false) return 'No';
    if (value === true) return 'Yes';
    if (typeof value === 'number') {
      const unit = dictionary?.fields.find((item) => item.key === key)?.unit;
      return `${value.toLocaleString()}${typeof unit === 'string' && unit ? ` ${unit}` : ''}`;
    }
    if (typeof value === 'string') return fieldVocabularyLabel(dictionary, key, value) ?? value;
    if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? fieldVocabularyLabel(dictionary, key, item) ?? item : formatValue(key, item)).join(', ');
    if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => `${fieldLabel(childKey)}: ${formatValue(childKey, childValue)}`).join(' · ');
    return 'Not set';
  };
  const displayTypeName = (unitType: UnitTypeDto, index: number): string => {
    const name = unitType.canonicalFields.unitTypeName;
    if (typeof name === 'string' && name.trim()) return name.trim();
    return fieldVocabularyLabel(dictionary, 'propertyType', unitType.canonicalFields.propertyType) ?? `Unit type ${index + 1}`;
  };

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
    if (!name.trim() || !categoryOptions.some((option) => option.value === category) || !propertyTypeOptions.some((option) => option.value === propertyType) || !quantity.trim()) {
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
      const currentImpact = await projectService.unitTypeImpact(project._id, unitType.id);
      if (currentImpact.unitType.version !== versions.unitType!.version) throw new Error('This unit type changed while impact was loading. Refresh the list and review the values again.');
      setImpactById((current) => ({ ...current, [unitType.id]: currentImpact.impact }));
      setImpactConfirmation({ unitType: versions.unitType!, body, impact: currentImpact.impact });
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) {
        await load(); await onChanged();
        setError('The project or unit type changed. Latest values and impact are reloaded; review the saved draft before submitting again.');
      } else setError(raw instanceof Error ? raw.message : 'Unable to update unit type.');
    }
    finally { setSavingTypeId(null); }
  };

  const applyTypeChanges = async (unitType: UnitTypeDto, body: { expectedVersion: number; expectedTypeVersion: number; canonicalFieldMutations: Array<{ field: string; operation: string; value?: unknown }> }) => {
    setSavingTypeId(unitType.id); setError(null);
    const path = `/api/projects/${encodeURIComponent(project._id)}/unit-types/${encodeURIComponent(unitType.id)}`;
    try {
      try {
        const result = await projectService.updateUnitType(project._id, unitType.id, body);
        setImpactById((current) => ({ ...current, [unitType.id]: result.impact as { affectedUnits: number; fields: Record<string, { inheritingUnits: number; overriddenUnits: number }> } }));
      } catch (raw) {
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
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) {
        await load(); await onChanged();
        setError('The project or unit type changed. Latest values are reloaded; review your draft before submitting again.');
      } else setError(raw instanceof Error ? raw.message : 'Unable to update unit type.');
    }
    finally { setSavingTypeId(null); }
  };

  const removeType = async (unitType: UnitTypeDto) => {
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
    {types.map((unitType, index) => <details key={unitType.id} className="rounded-lg border border-outline-variant/20 p-4">
      <summary className="cursor-pointer font-bold">{displayTypeName(unitType, index)} · version {unitType.version}</summary>
      <details className="mt-2 rounded bg-surface-container-low p-3 text-xs"><summary className="cursor-pointer font-bold">Saved values and values inherited by units</summary><p className="mt-2 text-secondary">Saved values are explicit on this type. Effective values include inherited values returned by the server.</p><dl className="mt-2 grid gap-2 sm:grid-cols-2">{[...new Set([...Object.keys(unitType.canonicalFields), ...Object.keys(unitType.effectiveFields)])].map((key) => <div key={key} className="rounded bg-white p-2"><dt className="font-semibold">{fieldLabel(key)}</dt><dd className="mt-1">Saved value: {Object.prototype.hasOwnProperty.call(unitType.canonicalFields, key) ? formatValue(key, unitType.canonicalFields[key]) : 'No explicit value saved'}</dd><dd>Effective value: {Object.prototype.hasOwnProperty.call(unitType.effectiveFields, key) ? formatValue(key, unitType.effectiveFields[key]) : 'Not returned'}</dd><dd className="text-secondary">Source: {unitType.fieldSources[key]?.sourceLevel ?? 'Not returned'} · {unitType.fieldSources[key]?.state ?? 'state not returned'}</dd></div>)}</dl>{impactById[unitType.id] ? <p className="mt-3 font-semibold">Update impact: {impactById[unitType.id].affectedUnits} affected unit(s) · {Object.entries(impactById[unitType.id].fields).map(([field, impact]) => `${fieldLabel(field)}: ${impact.inheritingUnits} inherit, ${impact.overriddenUnits} override`).join(' · ')}</p> : null}</details>
      <CanonicalFieldMutationsEditor target="unit_type" title="Edit type defaults" value={drafts[unitType.id] ?? []} onChange={(value) => setDrafts((current) => ({ ...current, [unitType.id]: value }))} canonicalFields={unitType.canonicalFields} effectiveFields={unitType.effectiveFields} fieldSources={unitType.fieldSources} />
      <div className="mt-3 flex flex-wrap gap-2"><Button type="button" disabled={savingTypeId === unitType.id || !(drafts[unitType.id]?.length)} onClick={() => void saveType(unitType)}>{savingTypeId === unitType.id ? 'Saving…' : 'Save type fields'}</Button></div>
      <details className="mt-3 border-t border-outline-variant/20 pt-3"><summary className="cursor-pointer text-xs font-bold text-secondary">Advanced type actions</summary><p className="mt-2 text-xs text-secondary">Removal is available only when the server confirms there are no current or historical units linked to this type.</p><Button type="button" variant="secondary" className="mt-2" disabled={Boolean(stepUp.challenge) || stepUp.busy} onClick={() => setTypePendingRemoval(unitType)}>Remove unused type</Button></details>
    </details>)}
    {!loading && !types.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No unit types are configured for this project yet.</p> : null}
    <div className="grid gap-3 rounded-lg bg-surface-container-low p-4 md:grid-cols-4">
      <label className="text-xs font-bold">Unit type name<input className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="text-xs font-bold">Category<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={category} onChange={(event) => { setCategory(event.target.value); setPropertyType(''); }} disabled={!dictionary}><option value="">Choose a category</option>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="text-xs font-bold">Property type<select className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={propertyType} onChange={(event) => setPropertyType(event.target.value)} disabled={!category || !propertyTypeOptions.length}><option value="">Choose a property type</option>{propertyTypeOptions.map((option) => <option key={option.value} value={option.value} title={option.definition}>{option.label}</option>)}</select></label>
      <label className="text-xs font-bold">Unit type quantity<input type="number" min={1} step={1} className="mt-1 w-full rounded-lg border border-outline-variant/20 p-2 text-sm font-normal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <div className="md:col-span-4"><CanonicalFieldMutationsEditor target="unit_type" title="Optional unit-type defaults" value={createDrafts} onChange={setCreateDrafts} createMode exclude={['unitTypeName', 'category', 'propertyType', 'unitTypeQuantity']} /></div>
      <div className="md:col-span-4"><Button type="button" disabled={loading || stepUp.busy || Boolean(stepUp.challenge) || projectVersion === null} onClick={() => void create()}>Create unit type</Button>{createError ? <p role="alert" className="mt-2 text-sm text-error">{createError}</p> : null}</div>
    </div>
    <p className="text-xs text-secondary">Price and media defaults require the corresponding profile permissions and, when requested by the backend, a bound security challenge. Unit types cannot be archived; removal is available only with the documented versioned, step-up-protected DELETE route.</p>
    {impactConfirmation ? <ActionConfirmModal title="Review the effect on project units" description={`${impactConfirmation.impact.affectedUnits} unit(s) use this type. ${Object.entries(impactConfirmation.impact.fields).map(([field, impact]) => `${fieldLabel(field)}: ${impact.inheritingUnits} inherit this value and ${impact.overriddenUnits} have their own value.`).join(' ') || 'The server returned no field-level impact.'} The server recalculates effective values and readiness after the update.`} confirmLabel="Continue with update" onClose={() => setImpactConfirmation(null)} onConfirm={() => { const pending = impactConfirmation; setImpactConfirmation(null); void applyTypeChanges(pending.unitType, pending.body); }} /> : null}
    {typePendingRemoval ? <ActionConfirmModal title="Remove this unused unit type?" description="Removal is allowed only when no current or historical unit refers to this type. The server checks the latest versions before it removes the type." confirmLabel="Continue to authenticator" tone="danger" onClose={() => setTypePendingRemoval(null)} onConfirm={() => { const selectedType = typePendingRemoval; setTypePendingRemoval(null); void removeType(selectedType); }} /> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={() => { setProtectedAction(null); stepUp.cancel(); }} onSubmit={finishStepUp} />
  </section>;
};

export default UnitTypeManagement;
