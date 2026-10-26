import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../../lib/axios';
import { useAsync } from '../../hooks/useAsync';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { projectService, type UnitGridEditRequest, type UnitGridExportQuery, type UnitGridJob, type UnitGridJobRequest, type UnitGridMutation, type UnitGridOperation, type UnitGridQuery, type UnitGridRow } from '../../services/projectService';
import { stepUpService } from '../../services/stepUpService';
import { getCanonicalFields, parseCanonicalInput, reconcileCanonicalFieldRegistry, serializeCanonicalMutationDrafts, type CanonicalMutationDraft } from '../../utils/canonicalFieldRegistry';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import CanonicalFieldMutationsEditor from '../canonical/CanonicalFieldMutationsEditor';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';
import { downloadBlob } from '../../utils/download';

const fields = getCanonicalFields('unit');

type EditableField = (typeof fields)[number]['key'];
type JobAction = UnitGridJobRequest['action'];
type ReviewedTarget = { id: string; label: string; version: number };
type GridReview =
  | { kind: 'edit'; request: UnitGridEditRequest; summary: string; rowCount: number; targets: ReviewedTarget[] }
  | { kind: 'job'; request: UnitGridJobRequest; summary: string; rowCount: number; targets: ReviewedTarget[] };
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
  const { dictionary } = useCanonicalFieldDictionary();
  const [selected, setSelected] = useState<string[]>([]);
  const [field, setField] = useState<EditableField>('bedrooms');
  const selectedField = fields.find((item) => item.key === field)!;
  const fieldOptions: readonly string[] = selectedField.options ?? [];
  const [operation, setOperation] = useState<'set' | 'reset_to_inherited'>('set');
  const [fieldValue, setFieldValue] = useState('');
  const [runtimeDrafts, setRuntimeDrafts] = useState<CanonicalMutationDraft[]>([]);
  const [targetUnitTypeId, setTargetUnitTypeId] = useState('');
  const [jobAction, setJobAction] = useState<JobAction>('availability');
  const [availability, setAvailability] = useState<'Available' | 'Under Offer' | 'Not released'>('Available');
  const [adjustmentMode, setAdjustmentMode] = useState<'amount' | 'percentage'>('amount');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'increase' | 'decrease'>('increase');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [working, setWorking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [lastOperation, setLastOperation] = useState<UnitGridOperation | null>(null);
  const [job, setJob] = useState<UnitGridJob | null>(null);
  const [jobPollingPaused, setJobPollingPaused] = useState(false);
  const [review, setReview] = useState<GridReview | null>(null);
  const [cancelJobReview, setCancelJobReview] = useState(false);
  const [undoClock, setUndoClock] = useState(Date.now());
  const undoStepUp = useBoundStepUp<unknown>();
  const operationKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const jobKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const jobStatusRequestRef = useRef<{ key: string; promise: Promise<UnitGridJob> } | null>(null);
  const jobStorageKey = `realtiq:unit-grid-job:${projectId}`;

  const readJobStatus = useCallback((jobId: string): Promise<UnitGridJob> => {
    const key = `${projectId}:${jobId}`;
    if (jobStatusRequestRef.current?.key === key) return jobStatusRequestRef.current.promise;
    const request = projectService.getUnitGridJob(projectId, jobId);
    jobStatusRequestRef.current = { key, promise: request };
    void request.then(
      () => { if (jobStatusRequestRef.current?.promise === request) jobStatusRequestRef.current = null; },
      () => { if (jobStatusRequestRef.current?.promise === request) jobStatusRequestRef.current = null; },
    );
    return request;
  }, [projectId]);

  const refreshJob = async () => {
    if (!job || working) return;
    setActionError(null);
    try {
      setJob(await readJobStatus(job.id));
      setJobPollingPaused(false);
    } catch (raw) { setActionError(errorText(raw)); }
  };

  useEffect(() => {
    setJob(null);
    let savedJobId: string | null = null;
    try { savedJobId = window.sessionStorage.getItem(jobStorageKey); } catch { return; }
    if (!savedJobId) return;
    let active = true;
    void projectService.getUnitGridJob(projectId, savedJobId).then((saved) => {
      if (active) { setJob(saved); setJobPollingPaused(false); }
    }).catch((raw: unknown) => {
      if (active) setActionError(`Could not reopen the saved durable job: ${errorText(raw)}`);
    });
    return () => { active = false; };
  }, [jobStorageKey, projectId]);

  const currentJobId = job?.id;
  const currentJobState = job?.state;
  useEffect(() => {
    if (!currentJobId || terminalJobStates.has(currentJobState ?? '') || jobPollingPaused) return;
    let active = true;
    let timer = 0;
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 60) { setJobPollingPaused(true); return; }
      attempts += 1;
      try {
        const latest = await readJobStatus(currentJobId);
        if (!active) return;
        setJob(latest);
        if (terminalJobStates.has(latest.state)) return;
      } catch (raw) {
        if (active) setActionError(errorText(raw));
      }
      if (active) timer = window.setTimeout(() => void poll(), 5000);
    };
    timer = window.setTimeout(() => void poll(), 5000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [currentJobId, currentJobState, jobPollingPaused, readJobStatus]);

  useEffect(() => {
    if (!lastOperation?.undoExpiresAt) return;
    const timer = window.setInterval(() => setUndoClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lastOperation?.undoExpiresAt]);

  const rows = (grid?.items ?? []).filter((row) => selected.includes(row._id));
  const hasActiveJob = Boolean(job && !terminalJobStates.has(job.state));
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

  const exportGrid = async () => {
    if (exporting) return;
    const query: UnitGridExportQuery = {
      sort,
      search: search || undefined,
      availability: availabilityFilter,
      publicationState: publicationFilter,
      problemsOnly: problemsOnly || undefined,
      unitTypeId: unitTypeFilter.trim() || undefined,
      propertyType: propertyTypeFilter.trim() || undefined,
      ...priceBounds,
      currency: sort?.startsWith('price_') || priceBounds.minPrice !== undefined || priceBounds.maxPrice !== undefined ? currency : undefined,
    };
    setExporting(true);
    setExportStatus('');
    try {
      const blob = await projectService.downloadUnitGridCsv(projectId, query);
      downloadBlob(blob, 'project-unit-grid-filtered.csv');
      setExportStatus('Downloaded the server export for all project units matching the active grid filters.');
    } catch (raw) { setActionError(errorText(raw)); }
    finally { setExporting(false); }
  };
  const keyFor = (ref: typeof operationKeyRef, signature: string) => {
    if (ref.current?.signature === signature) return ref.current.key;
    const key = `grid_${crypto.randomUUID()}`;
    ref.current = { signature, key };
    return key;
  };

  const currentMutation = (): UnitGridMutation | null => {
    const config = fields.find((item) => item.key === field)!;
    if (operation === 'reset_to_inherited') {
      if (!config.inherits) { setActionError('The selected canonical field does not inherit from its project or unit type.'); return null; }
      return { field, operation };
    }
    const parsed = parseCanonicalInput(config, fieldValue);
    if (!parsed.ok) { setActionError(parsed.error); return null; }
    if (config.condition === 'Terraced House or Townhouse' && rows.some((row) => !['terraced house', 'townhouse'].includes(String(row.effectiveFields.propertyType ?? '').toLowerCase()))) {
      setActionError('Terrace floors apply only to Terraced House or Townhouse units. Filter or select only applicable units.');
      return null;
    }
    if (config.key === 'loadingVehicleAccessType' && rows.some((row) => row.effectiveFields.loadingVehicleAccess !== true)) {
      setActionError('Loading access type can be changed only when every selected unit has loading vehicle access enabled.');
      return null;
    }
    return { field, operation: 'set', value: parsed.value };
  };

  const currentMutations = (): UnitGridMutation[] | null => {
    let mutations: Array<{ field: string; operation: string; value?: unknown }> = [];
    if (runtimeDrafts.length) {
      if (!dictionary) { setActionError('Canonical field policy is unavailable. Refresh before editing additional fields.'); return null; }
      const serialized = serializeCanonicalMutationDrafts(runtimeDrafts, reconcileCanonicalFieldRegistry(dictionary), 'project_unit');
      if (Object.keys(serialized.errors).length) { setActionError(Object.values(serialized.errors).join(' ')); return null; }
      if (serialized.mutations.some((mutation) => mutation.operation === 'set_null')) {
        setActionError('The unit-grid contract does not expose set-null mutations. Choose set, unset or reset-to-inherited as allowed by the field dictionary.');
        return null;
      }
      mutations = serialized.mutations;
    }
    if (operation === 'reset_to_inherited' || fieldValue.trim() !== '') {
      const mutation = currentMutation();
      if (!mutation) return null;
      mutations = [...mutations, mutation];
    }
    if (!mutations.length) { setActionError('Enter a value or choose an allowed inheritance operation.'); return null; }
    if (new Set(mutations.map((mutation) => mutation.field)).size !== mutations.length) { setActionError('The same canonical field cannot be edited twice in one grid operation.'); return null; }
    return mutations.map((mutation) => {
      const operation: UnitGridMutation['operation'] = mutation.operation === 'reset_to_inherit' ? 'reset_to_inherited' : mutation.operation as UnitGridMutation['operation'];
      return { field: mutation.field, operation, ...(Object.prototype.hasOwnProperty.call(mutation, 'value') ? { value: mutation.value } : {}) };
    });
  };

  const selectedRows = (): UnitGridRow[] | null => {
    if (!grid || !rows.length || rows.length !== selected.length) { setActionError('Select units on this grid page before submitting.'); return null; }
    if (rows.some((row) => !Number.isInteger(row.version))) { setActionError('A selected row has no current version. Refresh the grid.'); return null; }
    return rows;
  };

  const handleFailure = (raw: unknown) => {
    setActionError(errorText(raw));
    if (raw instanceof ApiRequestError && raw.status === 409) {
      setConflict(true);
      operationKeyRef.current = null;
      jobKeyRef.current = null;
    }
  };

  const submitDirectEdit = async () => {
    if (conflict || working || !grid) return;
    setActionError(null);
    const targets = selectedRows();
    const mutations = currentMutations();
    if (!targets || !mutations?.length) return;
    const unsigned = { expectedProjectVersion: grid.projectVersion, rows: targets.map((row) => ({ unitId: row._id, expectedVersion: row.version, canonicalFieldMutations: mutations })) };
    const signature = JSON.stringify(unsigned);
    setReview({
      kind: 'edit',
      request: { ...unsigned, operationKey: keyFor(operationKeyRef, signature) },
      rowCount: targets.length,
      targets: targets.map((row) => ({ id: row._id, label: row.publicReference || row._id, version: row.version })),
      summary: mutations.map((mutation) => `${mutation.field} ${mutation.operation}${Object.prototype.hasOwnProperty.call(mutation, 'value') ? `: ${JSON.stringify(mutation.value)}` : ''}`).join(' · '),
    });
  };

  const submitTypeMove = async () => {
    if (conflict || working || !grid) return;
    setActionError(null);
    const targets = selectedRows();
    if (!targets) return;
    if (!/^[a-f\d]{24}$/i.test(targetUnitTypeId.trim())) { setActionError('Enter a valid same-project unit type ID.'); return; }
    const unsigned = { expectedProjectVersion: grid.projectVersion, rows: targets.map((row) => ({ unitId: row._id, expectedVersion: row.version, unitTypeId: targetUnitTypeId.trim() })) };
    const signature = JSON.stringify(unsigned);
    setReview({ kind: 'edit', request: { ...unsigned, operationKey: keyFor(operationKeyRef, signature) }, rowCount: targets.length, targets: targets.map((row) => ({ id: row._id, label: row.publicReference || row._id, version: row.version })), summary: `Move selected units to type ${targetUnitTypeId.trim()}` });
  };

  const submitJob = async () => {
    if (conflict || working || !grid) return;
    if (hasActiveJob) {
      setActionError('Track the current durable job to a terminal state before queuing another job from this project grid.');
      return;
    }
    if (jobAction === 'confirm') {
      setActionError('Freshness confirmation is unavailable until the backend freshness policy is approved and active.');
      return;
    }
    setActionError(null);
    const targets = selectedRows();
    if (!targets) return;
    let mutations: UnitGridMutation[] | null = null;
    if (jobAction === 'field_edit') {
      mutations = currentMutations();
      if (!mutations?.length) return;
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
      rows: targets.map((row) => ({ unitId: row._id, expectedVersion: row.version, ...(mutations ? { canonicalFieldMutations: mutations } : {}) })),
    };
    const signature = JSON.stringify(unsigned);
    const options = unsigned.actionOptions ? ` · ${JSON.stringify(unsigned.actionOptions)}` : '';
    setReview({
      kind: 'job',
      request: { ...unsigned, operationKey: keyFor(jobKeyRef, signature) },
      rowCount: targets.length,
      targets: targets.map((row) => ({ id: row._id, label: row.publicReference || row._id, version: row.version })),
      summary: `${jobAction.replaceAll('_', ' ')}${options}${mutations ? ` · ${mutations.length} canonical field mutation(s)` : ''}`,
    });
  };

  const confirmReview = async () => {
    if (!review || working || conflict) return;
    const current = review;
    if (current.kind === 'job' && hasActiveJob) {
      setReview(null);
      setActionError('The current durable job is still active. Refresh and track it before starting another job.');
      return;
    }
    setWorking(true);
    setActionError(null);
    try {
      if (current.kind === 'edit') {
        const result = await projectService.editUnitGrid(projectId, current.request);
        setLastOperation(result.operation);
        setSelected([]);
        setRuntimeDrafts([]);
        operationKeyRef.current = null;
      } else {
        const created = await projectService.createUnitGridJob(projectId, current.request);
        setJob(created);
        setJobPollingPaused(false);
        try { window.sessionStorage.setItem(jobStorageKey, created.id); } catch { /* Recovery remains available through the current job panel. */ }
        setSelected([]);
        if (current.request.action === 'field_edit') setRuntimeDrafts([]);
        jobKeyRef.current = null;
      }
      setReview(null);
      setRefreshKey((value) => value + 1);
    } catch (raw) {
      setReview(null);
      handleFailure(raw);
    } finally { setWorking(false); }
  };

  const dismissJob = () => {
    try { window.sessionStorage.removeItem(jobStorageKey); } catch { /* The current panel can still be closed. */ }
    setJob(null);
  };

  const cancelJob = async () => {
    if (!job || working || terminalJobStates.has(job.state)) return;
    setWorking(true);
    setActionError(null);
    try {
      setJob(await projectService.cancelUnitGridJob(projectId, job.id));
      setCancelJobReview(false);
    } catch (raw) {
      handleFailure(raw);
    }
    finally { setWorking(false); }
  };

  const beginUndo = async (operationId: string, undoExpiresAt?: string | null) => {
    const expiry = undoExpiresAt ? Date.parse(undoExpiresAt) : null;
    if (undoExpiresAt && (!Number.isFinite(expiry) || expiry === null)) {
      setActionError('.Refresh its status before trying again.');
      return;
    }
    if (expiry !== null && expiry <= undoClock) {
      setActionError('The documented undo window has expired. Refresh the grid before checking the operation again.');
      if (lastOperation?.id === operationId) setLastOperation({ ...lastOperation, undoAvailable: false });
      return;
    }
    setActionError(null);
    const path = `/api/projects/${encodeURIComponent(projectId)}/unit-grid/operations/${encodeURIComponent(operationId)}/undo`;
    await undoStepUp.begin({ method: 'POST', path, body: {}, label: `Undo unit-grid operation ${operationId}`,
      execute: (challengeId, exactBody) => stepUpService.undoUnitGridOperation(projectId, operationId, challengeId, exactBody) });
  };

  const checkJobRowUndo = async (operationId: string, unitId: string) => {
    if (!job || working) return;
    setActionError(null);
    try {
      const latest = await readJobStatus(job.id);
      setJob(latest);
      const row = latest.rows.find((candidate) => candidate.unitId === unitId && candidate.operationId === operationId);
      if (!row?.undoAvailable) {
        setActionError('The refreshed job no longer reports this row as undoable.');
        return;
      }
      await beginUndo(operationId, row.undoExpiresAt);
    } catch (raw) { handleFailure(raw); }
  };

  const completeUndo = async (code: string): Promise<boolean> => {
    if (working) return false;
    setActionError(null);
    setWorking(true);
    try {
      const result = await undoStepUp.complete(code);
      if (!result.ok) {
        const message = result.error ?? undoStepUp.error ?? '';
        if (message.includes('CONFLICT_GRID_UNDO_EXPIRED') && lastOperation) setLastOperation({ ...lastOperation, undoAvailable: false });
        if (message.includes('CONFLICT_')) {
          setActionError(message);
          setRefreshKey((value) => value + 1);
          if (job) {
            try { setJob(await readJobStatus(job.id)); } catch { /* Keep the undo conflict visible if status refresh is unavailable. */ }
          }
        }
        return false;
      }
      setLastOperation(null);
      setRefreshKey((value) => value + 1);
      if (job) setJob(await readJobStatus(job.id));
      return true;
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) {
        if (raw.code === 'CONFLICT_GRID_UNDO_EXPIRED' && lastOperation) setLastOperation({ ...lastOperation, undoAvailable: false });
        setActionError(errorText(raw));
        setRefreshKey((value) => value + 1);
        if (job) {
          try { setJob(await readJobStatus(job.id)); } catch { /* Keep the undo conflict visible if status refresh is unavailable. */ }
        }
      } else handleFailure(raw);
    }
    finally { setWorking(false); }
    return false;
  };

  const selectVisibleFailedJobRows = () => {
    const failedIds = new Set((job?.rows ?? []).filter((row) => row.state === 'failed').map((row) => row.unitId));
    const visibleRows = (grid?.items ?? []).filter((row) => failedIds.has(row._id));
    if (!visibleRows.length) {
      setActionError('No failed rows from this job are on the current grid page. Refresh the grid and page through the affected units before starting a reviewed retry.');
      return;
    }
    setSelected(visibleRows.map((row) => row._id));
    setActionError('Failed rows on this page are selected. Review their current versions, choose the intended action and options, then queue a new job.');
  };

  return <section className="rounded-xl border border-outline-variant/10 bg-white p-5">
    <h2 className="text-xl font-black">Canonical unit grid</h2>
    <p className="mt-1 text-sm text-secondary">Effective values and their project, type or unit source come from the private grid response. Each edit carries current project and row versions.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <input aria-label="Search grid units" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="min-w-[180px] flex-1 rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="Search units" />
      <Button type="button" variant="secondary" onClick={() => { setPage(1); setSelected([]); setSearch(searchInput.trim()); }}>Search</Button>
      <Button type="button" variant="secondary" loading={exporting} loadingLabel="Exporting..." title="Exports all project units matching the active server filters, not only the current page or selected rows." onClick={() => void exportGrid()}>Export filtered units (CSV)</Button>
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
    {exportStatus ? <p role="status" className="mt-3 text-sm text-secondary">{exportStatus}</p> : null}
    {grid ? <>
      <p className="mt-3 text-xs font-semibold text-secondary">{grid.pagination.total} units · Page {grid.pagination.page} of {grid.pagination.pages} · Project version {grid.projectVersion}</p>
      <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-secondary"><label className="flex items-center gap-2"><input type="checkbox" checked={grid.items.length > 0 && grid.items.every((row) => selected.includes(row._id))} onChange={(event) => setSelected(event.target.checked ? grid.items.map((row) => row._id) : [])} />Select this page</label><span>{selected.length} selected</span></div>
      <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto">
        {grid.items.map((row) => <div key={row._id} className="rounded-lg border border-outline-variant/20 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={selected.includes(row._id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, row._id] : current.filter((id) => id !== row._id))} />{row.publicReference || row._id}</label><span className="text-xs text-secondary">Version {row.version} · {row.readiness.publicationState}</span></div>
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">{['unitIdentifier', 'propertyType', 'bedrooms', 'fullBathrooms', 'powderRooms', 'allBedroomsEnSuite', 'parkingSpaces', 'negotiable', 'internalFloorArea', 'unitFootprint', 'wholeBuildingFootprint', 'plotSize', 'terraceFloors', 'furnishing', 'occupancy', 'buildStage', 'completedBeforeHandover', 'projectedHandoverMonth', 'askingPrice', 'currency', 'availability'].map((key) => <div key={key}><span className="font-bold text-secondary">{key.replace(/([a-z])([A-Z])/g, '$1 $2')}: </span>{sourceValue(row.effectiveFields, key)}<span className="ml-1 text-secondary">{row.fieldSources[key] ? `(${row.fieldSources[key].sourceLevel}, ${row.fieldSources[key].state})` : '(source not returned)'}</span>{Object.prototype.hasOwnProperty.call(row.rawOverrides, key) ? <span className="ml-1 text-primary">Override: {sourceValue(row.rawOverrides, key)}</span> : null}</div>)}</div>
          {row.readiness.blockers?.length ? <p className="mt-2 text-xs text-amber-800">Readiness: {row.readiness.blockers.map((item) => `${item.field ?? 'workflow'} ${item.code ?? 'blocked'}`).join(' · ')}</p> : null}
          {row.readiness.problems ? <p className="mt-1 text-xs font-semibold text-amber-800">This unit has readiness problems.</p> : null}
        </div>)}
        {!grid.items.length ? <p className="rounded-lg border border-dashed border-outline-variant/20 p-5 text-sm text-secondary">No grid units match these filters.</p> : null}
      </div>
      <div className="mt-3 flex items-center gap-2"><Button type="button" variant="secondary" disabled={page <= 1 || loading} onClick={() => { setPage((value) => value - 1); setSelected([]); }}>Previous</Button><Button type="button" variant="secondary" disabled={page >= grid.pagination.pages || loading} onClick={() => { setPage((value) => value + 1); setSelected([]); }}>Next</Button></div>
    </> : null}
    <div className="mt-6 grid gap-4 border-t border-outline-variant/20 pt-5 lg:grid-cols-2">
      <div className="space-y-3"><h3 className="font-black">Canonical field edit</h3><div className="grid gap-2 sm:grid-cols-2"><select aria-label="Grid field" value={field} onChange={(event) => { const nextField = event.target.value as EditableField; setField(nextField); setFieldValue(''); if (!fields.find((item) => item.key === nextField)?.inherits) setOperation('set'); }} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm">{fields.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><select aria-label="Grid mutation" value={operation} onChange={(event) => setOperation(event.target.value as 'set' | 'reset_to_inherited')} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="set">Set explicit override</option><option value="reset_to_inherited" disabled={!fields.find((item) => item.key === field)?.inherits}>Reset to inherited</option></select></div>
        {operation === 'set' ? selectedField.kind === 'boolean' ? <select aria-label="Grid field value" value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="">Choose Yes or No</option><option value="true">Yes</option><option value="false">No</option></select> : selectedField.kind === 'enum' ? <select aria-label="Grid field value" value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="">Choose a value</option>{fieldOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select> : <input aria-label="Grid field value" type={selectedField.kind === 'text' ? 'text' : selectedField.kind === 'month' ? 'month' : 'number'} min={selectedField.min} max={selectedField.max} step={selectedField.kind === 'integer' ? 1 : 'any'} value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder={selectedField.kind === 'text' ? 'Enter a value' : 'Enter a value, including 0'} /> : <p className="text-xs text-secondary">The selected field will inherit from its unit type or project where the canonical dictionary allows inheritance.</p>}
        <Button type="button" disabled={!rows.length || working || conflict} onClick={() => void submitDirectEdit()}>Apply to selected units</Button>
        <CanonicalFieldMutationsEditor target="project_unit" title="Runtime canonical fields" value={runtimeDrafts} onChange={setRuntimeDrafts} canonicalFields={rows.length === 1 ? rows[0].rawOverrides : undefined} effectiveFields={rows.length === 1 ? rows[0].effectiveFields : undefined} fieldSources={rows.length === 1 ? rows[0].fieldSources : undefined} allowedOperations={['set', 'unset', 'reset_to_inherit']} />
        <div className="border-t border-outline-variant/20 pt-3"><label className="text-xs font-bold text-secondary" htmlFor="unit-grid-target-type">Move to same-project unit type ID</label><input id="unit-grid-target-type" value={targetUnitTypeId} onChange={(event) => setTargetUnitTypeId(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" placeholder="24-character unit type ID" /><Button type="button" variant="secondary" disabled={!rows.length || working || conflict} onClick={() => void submitTypeMove()}>Move selected units</Button></div>
      </div>
      <div className="space-y-3"><h3 className="font-black">Durable bulk job</h3><select aria-label="Grid job action" value={jobAction} onChange={(event) => setJobAction(event.target.value as JobAction)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm">{[['availability', 'Set availability'], ['field_edit', 'Edit selected field'], ['price_adjustment', 'Adjust asking price'], ['publish', 'Publish ready units'], ['unpublish', 'Unpublish'], ['archive', 'Archive']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><p className="text-xs text-secondary">Freshness confirmation is unavailable until the backend freshness policy is approved and active.</p>
        {jobAction === 'availability' ? <select aria-label="Target availability" value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="Available">Available</option><option value="Under Offer">Under Offer</option><option value="Not released">Not released</option></select> : null}
        {jobAction === 'price_adjustment' ? <div className="flex flex-wrap gap-2"><select aria-label="Price adjustment mode" value={adjustmentMode} onChange={(event) => setAdjustmentMode(event.target.value as typeof adjustmentMode)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="amount">Amount</option><option value="percentage">Percentage</option></select><select aria-label="Price adjustment direction" value={adjustmentDirection} onChange={(event) => setAdjustmentDirection(event.target.value as typeof adjustmentDirection)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm"><option value="increase">Increase</option><option value="decrease">Decrease</option></select><input aria-label="Price adjustment value" type="number" min={0} value={adjustmentValue} onChange={(event) => setAdjustmentValue(event.target.value)} className="min-w-[100px] flex-1 rounded-lg border border-outline-variant/20 px-3 py-2 text-sm" /></div> : null}
        {jobAction === 'archive' ? <p className="text-xs font-semibold text-amber-800">Archive retains history and may be rejected for sold or transaction-linked units.</p> : null}
        {hasActiveJob ? <p role="status" className="text-xs text-secondary">The active job is retained for refresh recovery. Wait for it to finish before queueing another job from this grid.</p> : null}
        <Button type="button" disabled={!rows.length || working || conflict || hasActiveJob} onClick={() => void submitJob()}>Queue selected job</Button>
      </div>
    </div>
    {actionError || (!undoStepUp.challenge && undoStepUp.error) ? <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{actionError ?? undoStepUp.error}</p> : null}
    {conflict ? <div role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">A project or unit version changed. Your selection and inputs remain. <button type="button" className="font-bold underline" onClick={async () => { const latest = await execute(); if (latest) setConflict(false); }}>Refresh versions and review before retrying</button></div> : null}
    {lastOperation ? <div className="mt-5 rounded-lg bg-surface-container-low p-4 text-sm"><h3 className="font-bold">Direct edit {lastOperation.state}</h3><p>{lastOperation.rowCount} rows · Operation {lastOperation.id}</p>{lastOperation.undoExpiresAt ? <p className="mt-1 text-xs text-secondary">Undo window ends {new Date(lastOperation.undoExpiresAt).toLocaleString()}.</p> : null}{lastOperation.undoAvailable ? <Button type="button" variant="secondary" disabled={working || (Boolean(lastOperation.undoExpiresAt) && (!Number.isFinite(Date.parse(lastOperation.undoExpiresAt!)) || Date.parse(lastOperation.undoExpiresAt!) <= undoClock))} onClick={() => void beginUndo(lastOperation.id, lastOperation.undoExpiresAt)}>{lastOperation.undoExpiresAt && Number.isFinite(Date.parse(lastOperation.undoExpiresAt)) && Date.parse(lastOperation.undoExpiresAt) <= undoClock ? 'Undo window expired' : 'Undo with authenticator'}</Button> : null}{lastOperation.undoAvailable && !lastOperation.undoExpiresAt ? <p className="mt-1 text-xs text-secondary">The server reports undo is available and has not returned a time cutoff; eligibility is rechecked when you submit.</p> : null}</div> : null}
    {job ? <div className="mt-5 rounded-lg bg-surface-container-low p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Job {job.state}</h3><div className="flex gap-2"><Button type="button" variant="secondary" disabled={working} onClick={() => void refreshJob()}>Refresh job</Button><Button type="button" variant="ghost" disabled={working} onClick={dismissJob}>Close job details</Button>{!terminalJobStates.has(job.state) ? <Button type="button" variant="secondary" disabled={working} onClick={() => setCancelJobReview(true)}>Cancel remaining</Button> : null}</div></div><p className="mt-2 text-xs text-secondary">{job.progress.completed} completed · {job.progress.failed} failed · {job.progress.cancelled} cancelled · {job.progress.remaining} remaining</p><p className="mt-1 text-[11px] text-secondary">Created {new Date(job.createdAt).toLocaleString()}{job.startedAt ? ` · Started ${new Date(job.startedAt).toLocaleString()}` : ''}{job.completedAt ? ` · Finished ${new Date(job.completedAt).toLocaleString()}` : ''}</p>{job.state === 'queued' ? <p role="status" className="mt-2 text-xs text-secondary">Queued — the operation is not complete yet.</p> : null}{jobPollingPaused && !terminalJobStates.has(job.state) ? <p role="status" className="mt-2 text-xs text-amber-800">Automatic refresh paused after five minutes. Refresh the job to continue checking this durable job.</p> : null}{job.state === 'partially_completed' ? <p className="mt-2 text-xs font-semibold text-amber-800">Some rows committed and others did not. Review every row before retrying.</p> : null}<div className="mt-3 space-y-2">{job.rows.map((row) => <div key={`${row.index}:${row.unitId}`} className="rounded bg-white p-2 text-xs"><span className="font-bold">{row.unitId} · {row.state}</span><span className="ml-2 text-secondary">Attempt {row.attempts}{row.beforeVersion !== undefined ? ` · v${row.beforeVersion}${row.afterVersion !== undefined ? ` → v${row.afterVersion}` : ''}` : ''}</span>{row.error ? <span className="ml-2 text-error">{row.error.code}: {row.error.message}</span> : null}{row.operationId && row.undoAvailable ? <><span className="ml-2 text-secondary">{row.undoExpiresAt ? `Undo until ${new Date(row.undoExpiresAt).toLocaleString()}` : 'Undo available; no time cutoff returned'}</span><button type="button" disabled={working || undoStepUp.busy || (Boolean(row.undoExpiresAt) && Date.parse(row.undoExpiresAt!) <= undoClock)} className="ml-2 font-bold text-primary underline" onClick={() => void checkJobRowUndo(row.operationId!, row.unitId)}>Review and undo</button></> : null}</div>)}</div>{job.rows.some((row) => row.state === 'failed') ? <Button type="button" variant="secondary" className="mt-3" disabled={working || conflict} onClick={selectVisibleFailedJobRows}>Select failed rows on this page for reviewed retry</Button> : null}</div> : null}
    {cancelJobReview && job ? <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="grid-cancel-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h3 id="grid-cancel-title" className="text-xl font-black">Request job cancellation?</h3><p className="mt-3 text-sm text-secondary">Cancellation is cooperative. {job.progress.completed} row(s) are already complete and will not be reversed.</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={working} onClick={() => setCancelJobReview(false)}>Keep job running</Button><Button type="button" loading={working} loadingLabel="Requesting..." disabled={working} onClick={() => void cancelJob()}>Request cancellation</Button></div></section></div> : null}
    {review ? <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="grid-review-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-widest text-secondary">Review before submit</p><h3 id="grid-review-title" className="mt-2 text-xl font-black">{review.kind === 'job' ? 'Queue durable bulk job?' : 'Apply unit-grid edit?'}</h3><p className="mt-3 text-sm text-secondary">{review.rowCount} selected unit(s) · Project version {review.request.expectedProjectVersion}</p><ul aria-label="Selected units and versions" className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-surface-container-low p-3 text-xs">{review.targets.map((target) => <li key={target.id}>{target.label} · unit version {target.version}</li>)}</ul><p className="mt-2 break-words rounded-lg bg-surface-container-low p-3 text-sm">{review.summary}</p><p className="mt-3 text-xs text-secondary">Each selected row is bound to the version currently displayed. If a version conflict is returned, refresh and review the changes again before submitting.</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={working} onClick={() => setReview(null)}>Keep editing</Button><Button type="button" loading={working} loadingLabel="Submitting..." disabled={working || conflict} onClick={() => void confirmReview()}>{review.kind === 'job' ? 'Queue job' : 'Apply changes'}</Button></div></section></div> : null}
    <StepUpDialog challenge={undoStepUp.challenge} busy={working || undoStepUp.busy} error={undoStepUp.error} onCancel={undoStepUp.cancel} onSubmit={completeUndo} />
  </section>;
};

export default UnitGridPanel;
