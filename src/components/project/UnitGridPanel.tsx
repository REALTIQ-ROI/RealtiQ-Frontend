import { useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../../lib/axios';
import { useAsync } from '../../hooks/useAsync';
import { projectService, type UnitGridJob, type UnitGridJobRequest, type UnitGridMutation, type UnitGridOperation, type UnitGridQuery, type UnitGridRow } from '../../services/projectService';
import { stepUpService } from '../../services/stepUpService';
import Button from '../ui/Button';

const fields = [
  { key: 'bedrooms', label: 'Bedrooms', kind: 'integer' },
  { key: 'fullBathrooms', label: 'Full bathrooms', kind: 'integer' },
  { key: 'parkingSpaces', label: 'Parking spaces', kind: 'integer' },
  { key: 'internalFloorArea', label: 'Internal floor area (m²)', kind: 'number' },
  { key: 'negotiable', label: 'Price negotiable', kind: 'boolean' },
  { key: 'furnishing', label: 'Furnishing', kind: 'furnishing' },
] as const;

type EditableField = (typeof fields)[number]['key'];
type JobAction = UnitGridJobRequest['action'];
const terminalJobStates = new Set(['completed', 'partially_completed', 'failed', 'cancelled']);
const sourceValue = (fieldsValue: Record<string, unknown>, key: string): string => {
  if (!Object.prototype.hasOwnProperty.call(fieldsValue, key)) return 'Missing';
  const value = fieldsValue[key];
  if (value === null) return 'Null';
  if (value === false) return 'No (explicit)';
  if (value === true) return 'Yes (explicit)';
  if (value === 0) return '0 (explicit)';
  if (value === '') return 'Empty (explicit)';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
};

const errorText = (raw: unknown): string => raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})` : raw instanceof Error ? raw.message : 'Request failed.';

const UnitGridPanel = ({ projectId }: { projectId: string }) => {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<UnitGridQuery['sort']>('newest');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [availabilityFilter, setAvailabilityFilter] = useState<UnitGridQuery['availability']>();
  const [publicationFilter, setPublicationFilter] = useState<UnitGridQuery['publicationState']>();
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [unitTypeFilter, setUnitTypeFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [minimumPriceInput, setMinimumPriceInput] = useState('');
  const [maximumPriceInput, setMaximumPriceInput] = useState('');
  const [priceBounds, setPriceBounds] = useState<{ minPrice?: number; maxPrice?: number }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const gridQuery: UnitGridQuery = {
    page, limit: 25, sort, search: search || undefined,
    availability: availabilityFilter, publicationState: publicationFilter, problemsOnly: problemsOnly || undefined,
    unitTypeId: unitTypeFilter.trim() || undefined, propertyType: propertyTypeFilter.trim() || undefined,
    ...priceBounds,
    currency: sort?.startsWith('price_') || priceBounds.minPrice !== undefined || priceBounds.maxPrice !== undefined ? currency : undefined,
  };
  const { data: grid, loading, error, execute } = useAsync(() => projectService.getUnitGrid(projectId, gridQuery), true, `${projectId}:${JSON.stringify(gridQuery)}:${refreshKey}`);
  const [selected, setSelected] = useState<string[]>([]);
  const [field, setField] = useState<EditableField>('bedrooms');
  const [operation, setOperation] = useState<'set' | 'reset_to_inherited'>('set');
  const [fieldValue, setFieldValue] = useState('');
  const [targetUnitTypeId, setTargetUnitTypeId] = useState('');
  const [jobAction, setJobAction] = useState<JobAction>('availability');
  const [availability, setAvailability] = useState<'Available' | 'Under Offer' | 'Not released'>('Available');
  const [adjustmentMode, setAdjustmentMode] = useState<'amount' | 'percentage'>('amount');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'increase' | 'decrease'>('increase');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [lastOperation, setLastOperation] = useState<UnitGridOperation | null>(null);
  const [job, setJob] = useState<UnitGridJob | null>(null);
  const [pendingUndo, setPendingUndo] = useState<{ operationId: string; challengeId: string; expiresAt: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [existingOperationId, setExistingOperationId] = useState('');
  const operationKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const jobKeyRef = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!job || terminalJobStates.has(job.state)) return;
    const timer = window.setInterval(() => {
      void projectService.getUnitGridJob(projectId, job.id).then(setJob).catch((raw: unknown) => setActionError(errorText(raw)));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [projectId, job]);

  const rows = (grid?.items ?? []).filter((row) => selected.includes(row._id));
  const applyPriceBounds = () => {
    const min = minimumPriceInput.trim() === '' ? undefined : Number(minimumPriceInput);
    const max = maximumPriceInput.trim() === '' ? undefined : Number(maximumPriceInput);
    if ((min !== undefined && (!Number.isFinite(min) || min < 0)) || (max !== undefined && (!Number.isFinite(max) || max < 0)) || (min !== undefined && max !== undefined && min > max)) {
      setActionError('Enter valid non-negative price bounds with minimum no higher than maximum.');
      return;
    }
    setActionError(null);
    setPriceBounds({ minPrice: min, maxPrice: max });
    setPage(1);
    setSelected([]);
  };
  const keyFor = (ref: typeof operationKeyRef, signature: string) => {
    if (ref.current?.signature === signature) return ref.current.key;
    const key = `grid_${crypto.randomUUID()}`;
    ref.current = { signature, key };
    return key;
  };

  const currentMutation = (): UnitGridMutation | null => {
    if (operation === 'reset_to_inherited') return { field, operation };
    const config = fields.find((item) => item.key === field)!;
    if (!fieldValue.trim()) { setActionError('Enter a value. Zero and false must be entered explicitly.'); return null; }
    if (config.kind === 'boolean') {
      if (fieldValue !== 'true' && fieldValue !== 'false') { setActionError('Choose Yes or No.'); return null; }
      return { field, operation: 'set', value: fieldValue === 'true' };
    }
    if (config.kind === 'furnishing') {
      if (!['Furnished', 'Semi-Furnished', 'Unfurnished'].includes(fieldValue)) { setActionError('Choose a supported furnishing value.'); return null; }
      return { field, operation: 'set', value: fieldValue };
    }
    const value = Number(fieldValue);
    if (!Number.isFinite(value) || value < 0 || (config.kind === 'integer' && !Number.isInteger(value))) { setActionError('Enter a non-negative' + (config.kind === 'integer' ? ' whole number.' : ' number.')); return null; }
    return { field, operation: 'set', value };
  };

  const selectedRows = (): UnitGridRow[] | null => {
    if (!grid || !rows.length || rows.length !== selected.length) { setActionError('Select units on this grid page before submitting.'); return null; }
    if (rows.some((row) => !Number.isInteger(row.version))) { setActionError('A selected row has no current version. Refresh the grid.'); return null; }
    return rows;
  };

  const handleFailure = (raw: unknown) => {
    setActionError(errorText(raw));
    if (raw instanceof ApiRequestError && raw.status === 409) setConflict(true);
  };

  const submitDirectEdit = async () => {
    if (conflict || working || !grid) return;
    setActionError(null);
    const targets = selectedRows();
    const mutation = currentMutation();
    if (!targets || !mutation) return;
    const unsigned = { expectedProjectVersion: grid.projectVersion, rows: targets.map((row) => ({ unitId: row._id, expectedVersion: row.version, canonicalFieldMutations: [mutation] })) };
    const signature = JSON.stringify(unsigned);
    setWorking(true);
    try {
      const result = await projectService.editUnitGrid(projectId, { ...unsigned, operationKey: keyFor(operationKeyRef, signature) });
      setLastOperation(result.operation);
      setSelected([]);
      operationKeyRef.current = null;
      setRefreshKey((value) => value + 1);
    } catch (raw) { handleFailure(raw); }
    finally { setWorking(false); }
  };

  const submitTypeMove = async () => {
    if (conflict || working || !grid) return;
    setActionError(null);
    const targets = selectedRows();
    if (!targets) return;
    if (!/^[a-f\d]{24}$/i.test(targetUnitTypeId.trim())) { setActionError('Enter a valid same-project unit type ID.'); return; }
    const unsigned = { expectedProjectVersion: grid.projectVersion, rows: targets.map((row) => ({ unitId: row._id, expectedVersion: row.version, unitTypeId: targetUnitTypeId.trim() })) };
    const signature = JSON.stringify(unsigned);
    setWorking(true);
    try {
      const result = await projectService.editUnitGrid(projectId, { ...unsigned, operationKey: keyFor(operationKeyRef, signature) });
      setLastOperation(result.operation);
      setSelected([]);
      operationKeyRef.current = null;
      setRefreshKey((value) => value + 1);
    } catch (raw) { handleFailure(raw); }
    finally { setWorking(false); }
  };

  const submitJob = async () => {
    if (conflict || working || !grid) return;
    setActionError(null);
    const targets = selectedRows();
    if (!targets) return;
    let mutation: UnitGridMutation | null = null;
    if (jobAction === 'field_edit') {
      mutation = currentMutation();
      if (!mutation) return;
    }
    const adjustment = Number(adjustmentValue);
    if (jobAction === 'price_adjustment' && (!Number.isFinite(adjustment) || adjustment <= 0 || (adjustmentMode === 'amount' && !Number.isInteger(adjustment)))) {
      setActionError('Enter a positive price adjustment. Amount changes must be whole numbers.');
      return;
    }
    const unsigned: Omit<UnitGridJobRequest, 'operationKey'> = {
      expectedProjectVersion: grid.projectVersion,
      action: jobAction,
      ...(jobAction === 'availability' ? { actionOptions: { targetAvailability: availability } } : {}),
      ...(jobAction === 'price_adjustment' ? { actionOptions: { mode: adjustmentMode, direction: adjustmentDirection, value: adjustment } } : {}),
      rows: targets.map((row) => ({ unitId: row._id, expectedVersion: row.version, ...(mutation ? { canonicalFieldMutations: [mutation] } : {}) })),
    };
    const signature = JSON.stringify(unsigned);
    setWorking(true);
    try {
      setJob(await projectService.createUnitGridJob(projectId, { ...unsigned, operationKey: keyFor(jobKeyRef, signature) }));
      setSelected([]);
      jobKeyRef.current = null;
      setRefreshKey((value) => value + 1);
    } catch (raw) { handleFailure(raw); }
    finally { setWorking(false); }
  };

  const beginUndo = async (operationId: string) => {
    setActionError(null);
    setWorking(true);
    try {
      const path = `/api/projects/${encodeURIComponent(projectId)}/unit-grid/operations/${encodeURIComponent(operationId)}/undo`;
      const challenge = await stepUpService.start('POST', path, {});
      setPendingUndo({ operationId, challengeId: challenge.challengeId, expiresAt: challenge.expiresAt });
      setTotpCode('');
    } catch (raw) { handleFailure(raw); }
    finally { setWorking(false); }
  };

  const completeUndo = async () => {
    if (!pendingUndo || working) return;
    if (!/^\d{6}$/.test(totpCode)) { setActionError('Enter the six-digit authenticator code.'); return; }
    setActionError(null);
    setWorking(true);
    try {
      await stepUpService.verify(pendingUndo.challengeId, totpCode);
      await stepUpService.undoUnitGridOperation(projectId, pendingUndo.operationId, pendingUndo.challengeId);
      setPendingUndo(null);
      setLastOperation(null);
      setRefreshKey((value) => value + 1);
      if (job) setJob(await projectService.getUnitGridJob(projectId, job.id));
    } catch (raw) { handleFailure(raw); }
    finally { setWorking(false); }
  };

  return <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
    <h2 className="text-xl font-black">Canonical unit grid</h2>
    <p className="mt-1 text-sm text-secondary">Effective values and their project, type or unit source come from the private grid response. Each edit carries current project and row versions.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <input aria-label="Search grid units" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="min-w-[180px] flex-1 rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Search units" />
      <Button type="button" variant="secondary" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>Search</Button>
      <select aria-label="Sort grid" value={sort} onChange={(event) => { setSort(event.target.value as UnitGridQuery['sort']); setPage(1); setSelected([]); }} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm">{[['newest', 'Newest'], ['price_asc', 'Price low to high'], ['price_desc', 'Price high to low'], ['availability', 'Availability'], ['publication', 'Publication'], ['unit_type', 'Unit type']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <Button type="button" variant="secondary" disabled={loading} onClick={() => void execute()}>Refresh grid</Button>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <select aria-label="Grid currency" value={currency} onChange={(event) => { setCurrency(event.target.value as 'NGN' | 'USD'); setPage(1); setSelected([]); }} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="NGN">NGN for price sort and bounds</option><option value="USD">USD for price sort and bounds</option></select>
      <select aria-label="Grid availability filter" value={availabilityFilter ?? ''} onChange={(event) => { setAvailabilityFilter((event.target.value || undefined) as UnitGridQuery['availability']); setPage(1); setSelected([]); }} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="">All availability</option>{[['available', 'Available'], ['under_offer', 'Under Offer'], ['sold', 'Sold'], ['not_released', 'Not released']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Grid publication filter" value={publicationFilter ?? ''} onChange={(event) => { setPublicationFilter((event.target.value || undefined) as UnitGridQuery['publicationState']); setPage(1); setSelected([]); }} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="">All publication states</option>{['published', 'unpublished', 'blocked', 'needs_review', 'archived'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={problemsOnly} onChange={(event) => { setProblemsOnly(event.target.checked); setPage(1); setSelected([]); }} />Problems only</label>
      <input aria-label="Grid unit type ID filter" value={unitTypeFilter} onChange={(event) => setUnitTypeFilter(event.target.value)} onBlur={() => { setPage(1); setSelected([]); }} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Unit type ID filter" />
      <input aria-label="Grid property type filter" value={propertyTypeFilter} onChange={(event) => setPropertyTypeFilter(event.target.value)} onBlur={() => { setPage(1); setSelected([]); }} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Property type filter" />
      <input aria-label="Grid minimum price" type="number" min={0} value={minimumPriceInput} onChange={(event) => setMinimumPriceInput(event.target.value)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Minimum price" />
      <input aria-label="Grid maximum price" type="number" min={0} value={maximumPriceInput} onChange={(event) => setMaximumPriceInput(event.target.value)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Maximum price" />
      <Button type="button" variant="secondary" onClick={applyPriceBounds}>Apply price bounds</Button>
    </div>
    {loading ? <p className="mt-3 text-sm text-secondary">Loading grid…</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-error">{error}</p> : null}
    {grid ? <>
      <p className="mt-3 text-xs font-semibold text-secondary">{grid.pagination.total} units · Page {grid.pagination.page} of {grid.pagination.pages} · Project version {grid.projectVersion}</p>
      <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-secondary"><label className="flex items-center gap-2"><input type="checkbox" checked={grid.items.length > 0 && grid.items.every((row) => selected.includes(row._id))} onChange={(event) => setSelected(event.target.checked ? grid.items.map((row) => row._id) : [])} />Select this page</label><span>{selected.length} selected</span></div>
      <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto">
        {grid.items.map((row) => <div key={row._id} className="rounded-lg border border-outline-variant/20 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={selected.includes(row._id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, row._id] : current.filter((id) => id !== row._id))} />{row.publicReference || row._id}</label><span className="text-xs text-secondary">Version {row.version} · {row.readiness.publicationState}</span></div>
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">{['propertyType', 'bedrooms', 'fullBathrooms', 'parkingSpaces', 'internalFloorArea', 'furnishing', 'askingPrice', 'currency', 'availability'].map((key) => <div key={key}><span className="font-bold text-secondary">{key.replace(/([a-z])([A-Z])/g, '$1 $2')}: </span>{sourceValue(row.effectiveFields, key)}<span className="ml-1 text-secondary">{row.fieldSources[key] ? `(${row.fieldSources[key].sourceLevel}, ${row.fieldSources[key].state})` : '(source not returned)'}</span>{Object.prototype.hasOwnProperty.call(row.rawOverrides, key) ? <span className="ml-1 text-primary">Override: {sourceValue(row.rawOverrides, key)}</span> : null}</div>)}</div>
          {row.readiness.blockers?.length ? <p className="mt-2 text-xs text-amber-800">Readiness: {row.readiness.blockers.map((item) => `${item.field ?? 'workflow'} ${item.code ?? 'blocked'}`).join(' · ')}</p> : null}
          {row.readiness.problems ? <p className="mt-1 text-xs font-semibold text-amber-800">This unit has readiness problems.</p> : null}
        </div>)}
        {!grid.items.length ? <p className="rounded-lg border border-dashed border-outline-variant/20 p-5 text-sm text-secondary">No grid units match these filters.</p> : null}
      </div>
      <div className="mt-3 flex items-center gap-2"><Button type="button" variant="secondary" disabled={page <= 1 || loading} onClick={() => { setPage((value) => value - 1); setSelected([]); }}>Previous</Button><Button type="button" variant="secondary" disabled={page >= grid.pagination.pages || loading} onClick={() => { setPage((value) => value + 1); setSelected([]); }}>Next</Button></div>
    </> : null}
    <div className="mt-6 grid gap-4 border-t border-outline-variant/20 pt-5 lg:grid-cols-2">
      <div className="space-y-3"><h3 className="font-black">Canonical field edit</h3><div className="grid gap-2 sm:grid-cols-2"><select aria-label="Grid field" value={field} onChange={(event) => setField(event.target.value as EditableField)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm">{fields.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><select aria-label="Grid mutation" value={operation} onChange={(event) => setOperation(event.target.value as 'set' | 'reset_to_inherited')} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="set">Set explicit override</option><option value="reset_to_inherited">Reset to inherited</option></select></div>
        {operation === 'set' ? fields.find((item) => item.key === field)?.kind === 'boolean' ? <select aria-label="Grid field value" value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="">Choose Yes or No</option><option value="true">Yes</option><option value="false">No</option></select> : fields.find((item) => item.key === field)?.kind === 'furnishing' ? <select aria-label="Grid field value" value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="">Choose furnishing</option>{['Furnished', 'Semi-Furnished', 'Unfurnished'].map((item) => <option key={item} value={item}>{item}</option>)}</select> : <input aria-label="Grid field value" type="number" min={0} step={fields.find((item) => item.key === field)?.kind === 'integer' ? 1 : 'any'} value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Enter value, including 0" /> : <p className="text-xs text-secondary">The selected field will inherit from its unit type or project where supported.</p>}
        <Button type="button" disabled={!rows.length || working || conflict} onClick={() => void submitDirectEdit()}>Apply to selected units</Button>
        <div className="border-t border-outline-variant/20 pt-3"><label className="text-xs font-bold text-secondary" htmlFor="unit-grid-target-type">Move to same-project unit type ID</label><input id="unit-grid-target-type" value={targetUnitTypeId} onChange={(event) => setTargetUnitTypeId(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="24-character unit type ID" /><Button type="button" variant="secondary" disabled={!rows.length || working || conflict} onClick={() => void submitTypeMove()}>Move selected units</Button></div>
      </div>
      <div className="space-y-3"><h3 className="font-black">Durable bulk job</h3><select aria-label="Grid job action" value={jobAction} onChange={(event) => setJobAction(event.target.value as JobAction)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm">{[['availability', 'Set availability'], ['field_edit', 'Edit selected field'], ['price_adjustment', 'Adjust asking price'], ['publish', 'Publish ready units'], ['unpublish', 'Unpublish'], ['archive', 'Archive'], ['confirm', 'Confirm freshness']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {jobAction === 'availability' ? <select aria-label="Target availability" value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="Available">Available</option><option value="Under Offer">Under Offer</option><option value="Not released">Not released</option></select> : null}
        {jobAction === 'price_adjustment' ? <div className="flex flex-wrap gap-2"><select aria-label="Price adjustment mode" value={adjustmentMode} onChange={(event) => setAdjustmentMode(event.target.value as typeof adjustmentMode)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="amount">Amount</option><option value="percentage">Percentage</option></select><select aria-label="Price adjustment direction" value={adjustmentDirection} onChange={(event) => setAdjustmentDirection(event.target.value as typeof adjustmentDirection)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="increase">Increase</option><option value="decrease">Decrease</option></select><input aria-label="Price adjustment value" type="number" min={0} value={adjustmentValue} onChange={(event) => setAdjustmentValue(event.target.value)} className="min-w-[100px] flex-1 rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" /></div> : null}
        {jobAction === 'archive' ? <p className="text-xs font-semibold text-amber-800">Archive retains history and may be rejected for sold or transaction-linked units.</p> : null}
        <Button type="button" disabled={!rows.length || working || conflict} onClick={() => void submitJob()}>Queue selected job</Button>
      </div>
    </div>
    {actionError ? <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{actionError}</p> : null}
    {conflict ? <div role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">A project or unit version changed. Your selection and inputs remain. <button type="button" className="font-bold underline" onClick={async () => { const latest = await execute(); if (latest) setConflict(false); }}>Refresh versions and review before retrying</button></div> : null}
    {lastOperation ? <div className="mt-5 rounded-lg bg-surface-container-low p-4 text-sm"><h3 className="font-bold">Direct edit {lastOperation.state}</h3><p>{lastOperation.rowCount} rows · Operation {lastOperation.id}</p>{lastOperation.undoAvailable ? <Button type="button" variant="secondary" disabled={working} onClick={() => void beginUndo(lastOperation.id)}>Undo with authenticator</Button> : null}</div> : null}
    {job ? <div className="mt-5 rounded-lg bg-surface-container-low p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Job {job.state}</h3><div className="flex gap-2"><Button type="button" variant="secondary" disabled={working} onClick={() => void projectService.getUnitGridJob(projectId, job.id).then(setJob).catch((raw: unknown) => setActionError(errorText(raw)))}>Refresh job</Button>{!terminalJobStates.has(job.state) ? <Button type="button" variant="secondary" disabled={working} onClick={() => void projectService.cancelUnitGridJob(projectId, job.id).then(setJob).catch((raw: unknown) => setActionError(errorText(raw)))}>Cancel remaining</Button> : null}</div></div><p className="mt-2 text-xs text-secondary">{job.progress.completed} completed · {job.progress.failed} failed · {job.progress.cancelled} cancelled · {job.progress.remaining} remaining</p>{job.state === 'partially_completed' ? <p className="mt-2 text-xs font-semibold text-amber-800">Some rows committed and others did not. Review every row before retrying.</p> : null}<div className="mt-3 space-y-2">{job.rows.map((row) => <div key={`${row.index}:${row.unitId}`} className="rounded bg-white p-2 text-xs"><span className="font-bold">{row.unitId} · {row.state}</span>{row.error ? <span className="ml-2 text-error">{row.error.code}: {row.error.message}</span> : null}{row.operationId && row.undoAvailable ? <button type="button" disabled={working} className="ml-2 font-bold text-primary underline" onClick={() => void beginUndo(row.operationId!)}>Undo with authenticator</button> : null}</div>)}</div></div> : null}
    <div className="mt-5 flex flex-wrap gap-2 border-t border-outline-variant/20 pt-4"><input aria-label="Existing grid operation ID" value={existingOperationId} onChange={(event) => setExistingOperationId(event.target.value)} className="min-w-[220px] flex-1 rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Existing operation ID for undo" /><Button type="button" variant="secondary" disabled={!existingOperationId.trim() || working} onClick={() => void beginUndo(existingOperationId.trim())}>Request undo challenge</Button></div>
    {pendingUndo ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><h3 className="font-bold">Confirm undo with your authenticator</h3><p className="mt-1 text-xs">Challenge expires {new Date(pendingUndo.expiresAt).toLocaleString('en-NG')}. The same profile and session must complete it.</p><div className="mt-3 flex flex-wrap gap-2"><input aria-label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="rounded-lg border border-amber-300 px-3 py-2" placeholder="6-digit code" /><Button type="button" disabled={working || totpCode.length !== 6} onClick={() => void completeUndo()}>Verify and undo</Button><Button type="button" variant="secondary" onClick={() => setPendingUndo(null)}>Dismiss</Button></div></div> : null}
  </section>;
};

export default UnitGridPanel;
