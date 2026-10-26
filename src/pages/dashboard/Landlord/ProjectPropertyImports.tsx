import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../../lib/axios';
import { projectService } from '../../../services/projectService';
import type { ImportRowStatus, ProjectDetail, ProjectImportListItem, ProjectImportRow, ProjectImportSchema, ProjectImportSession } from '../../../types';
import { downloadBlob, rowDataDisplayValue, rowDataValue, sanitizeImportRowPayload, validateProjectImportFile } from '../../../utils/projectImport';
import { formatDate, labelize } from '../../../utils/projectFormatters';
import { buildProjectImportMapping, IGNORE_IMPORT_COLUMN, parseCsvHeader, type ImportColumnMappingDraft } from '../../../utils/projectImportMapping';

const numericFields = new Set(['price', 'bedrooms', 'bathrooms', 'squareFeet', 'constructionProgress', 'reservationAmount', 'minimumInitialDeposit', 'installmentDurationMonths']);
const statusOptions: Array<ImportRowStatus | 'all'> = ['all', 'valid', 'invalid', 'removed', 'imported', 'failed'];
const rowStatusClasses: Record<ImportRowStatus, string> = {
  valid: 'bg-emerald-50 text-emerald-700',
  invalid: 'bg-red-50 text-red-700',
  removed: 'bg-slate-100 text-slate-700',
  imported: 'bg-primary/10 text-primary',
  failed: 'bg-amber-50 text-amber-800',
};
const IMPORT_ROW_PAGE_SIZE = 100;
const IMPORT_HISTORY_PAGE_SIZE = 20;
const activeImportStates = new Set(['queued', 'processing', 'importing']);
const ambiguousRequest = (raw: unknown) => raw instanceof ApiRequestError && (raw.status === undefined || raw.status >= 500);

const sessionId = (session: ProjectImportSession | ProjectImportListItem) => 'importSessionId' in session ? session.importSessionId : session._id;

const ProjectPropertyImports = () => {
  const { id = '', importId = '' } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [schema, setSchema] = useState<ProjectImportSchema | null>(null);
  const [imports, setImports] = useState<ProjectImportListItem[]>([]);
  const [importsPage, setImportsPage] = useState(1);
  const [importsTotal, setImportsTotal] = useState(0);
  const [session, setSession] = useState<ProjectImportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [mappingDrafts, setMappingDrafts] = useState<ImportColumnMappingDraft[]>([{ columnNumber: '1', field: '' }]);
  const [mappingError, setMappingError] = useState('');
  const [uploadOutcomeUnknown, setUploadOutcomeUnknown] = useState(false);
  const [uploadHistoryChecked, setUploadHistoryChecked] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateFormat, setTemplateFormat] = useState<'csv' | 'xlsx'>('csv');
  const [pendingAction, setPendingAction] = useState('');
  const [cancelReviewOpen, setCancelReviewOpen] = useState(false);
  const [protectedImportAction, setProtectedImportAction] = useState<'confirm' | 'retry' | null>(null);
  const [protectedOutcomeUnknown, setProtectedOutcomeUnknown] = useState<'confirm' | 'retry' | null>(null);
  const protectedOutcomeUnknownRef = useRef<'confirm' | 'retry' | null>(null);
  const [protectedOutcomeChecked, setProtectedOutcomeChecked] = useState(false);
  const [rowPage, setRowPage] = useState(1);
  const [pollReset, setPollReset] = useState(0);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [error, setError] = useState('');
  const [progressError, setProgressError] = useState('');
  const [statusFilter, setStatusFilter] = useState<ImportRowStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingRow, setEditingRow] = useState<ProjectImportRow | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const importStepUp = useBoundStepUp<ProjectImportSession>();
  const editableFields = useMemo(() => schema?.fields.map((field) => field.name) ?? [], [schema]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    setProgressError('');
    try {
      const [manage, schemaResponse, history] = await Promise.all([
        projectService.getProjectManage(id),
        projectService.getProjectPropertyImportSchema(id),
        projectService.listProjectPropertyImports(id, { page: 1, limit: IMPORT_HISTORY_PAGE_SIZE }),
      ]);
      setProject(manage.project);
      setSchema(schemaResponse);
      setImports(history.imports ?? []);
      setImportsPage(history.page);
      setImportsTotal(history.total);
      if (importId) setSession(await projectService.getProjectPropertyImport(id, importId, { page: 1, limit: IMPORT_ROW_PAGE_SIZE }));
      setRowPage(1);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load project imports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, importId]);

  const loadImportHistory = async (page: number) => {
    const history = await projectService.listProjectPropertyImports(id, { page, limit: IMPORT_HISTORY_PAGE_SIZE });
    setImports(history.imports ?? []);
    setImportsPage(history.page);
    setImportsTotal(history.total);
  };

  useEffect(() => {
    if (!id || !importId || !activeImportStates.has(session?.status ?? '')) return;
    let active = true;
    let timer = 0;
    let attempts = 0;
    setPollingPaused(false);
    const poll = async () => {
      if (!active) return;
      if (attempts >= 60) { setPollingPaused(true); return; }
      attempts += 1;
      try {
        const latest = await projectService.getProjectPropertyImport(id, importId, { page: rowPage, limit: IMPORT_ROW_PAGE_SIZE });
        if (!active) return;
        setSession(latest);
        setProgressError('');
        if (!activeImportStates.has(latest.status)) return;
      } catch (raw) {
        if (active) setProgressError(raw instanceof Error ? raw.message : 'Unable to refresh import progress.');
      }
      if (active) timer = window.setTimeout(() => void poll(), 5000);
    };
    timer = window.setTimeout(() => void poll(), 5000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [id, importId, pollReset, rowPage, session?.status]);

  useEffect(() => {
    if (importStepUp.challenge || importStepUp.busy || !protectedImportAction) return;
    setProtectedImportAction(null);
    setPendingAction((current) => current === protectedImportAction ? '' : current);
  }, [importStepUp.busy, importStepUp.challenge, protectedImportAction]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (session?.rows ?? []).filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const haystack = ['title', 'unitNumber', 'block', 'phase'].map((field) => rowDataValue(row, field)).join(' ').toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [search, session?.rows, statusFilter]);

  const canConfirm = session?.status === 'ready' && (session.summary.invalidRows ?? 0) === 0 && (session.summary.validRows ?? 0) > 0;
  const canRetry = session?.status === 'partially_completed' || session?.status === 'partial' || session?.status === 'failed';
  const canCancel = session ? !['completed', 'partially_completed', 'partial', 'failed', 'cancelled', 'expired'].includes(session.status) : false;

  const upload = async (file: File) => {
    if (uploading) return;
    setSelectedFile(file);
    const fileError = validateProjectImportFile(file, schema?.limits.maxFileMB);
    if (fileError) { toast.error(fileError); return; }
    setUploading(true);
    let parsedColumns: string[] = [];
    if (file.name.toLowerCase().endsWith('.csv')) {
      try { parsedColumns = parseCsvHeader(await file.text()); } catch { /* Server validation remains authoritative if browser text access is unavailable. */ }
    }
    setUploadOutcomeUnknown(false);
    setUploadHistoryChecked(false);
    try {
      const next = await projectService.uploadProjectPropertyImport(id, file);
      setSession(next);
      setRowPage(1);
      setSourceColumns(parsedColumns);
      setMappingDrafts([{ columnNumber: '1', field: '' }]);
      setMappingError('');
      setUploadOutcomeUnknown(false);
      setUploadHistoryChecked(false);
      toast.success('Import file staged. Review the returned preview before submitting.');
      await loadImportHistory(1);
      navigate(`/dashboard/landlord/projects/${id}/imports/${next.importSessionId}`, { replace: true });
    } catch (raw) {
      if (ambiguousRequest(raw)) {
        setUploadOutcomeUnknown(true);
        setUploadHistoryChecked(false);
        toast.error('The server response did not confirm whether this file was staged. Check import history before deciding whether to upload again.');
      } else {
        toast.error(raw instanceof Error ? raw.message : 'Unable to upload spreadsheet.');
      }
    } finally {
      setUploading(false);
    }
  };

  const mapColumns = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || pendingAction) return;
    setMappingError('');
    let body: ReturnType<typeof buildProjectImportMapping>;
    try { body = buildProjectImportMapping(mappingDrafts, (schema?.fields ?? []).map((field) => field.name)); }
    catch (raw) { setMappingError(raw instanceof Error ? raw.message : 'Check each source-column mapping.'); return; }
    setPendingAction('mapping');
    try {
      const updated = await projectService.mapProjectPropertyImportColumns(id, sessionId(session), body);
      replaceSession(updated);
      toast.success('Column mapping saved and rows revalidated by the server.');
    } catch (raw) {
      const message = raw instanceof Error ? raw.message : 'Unable to save import mapping.';
      setMappingError(message);
    } finally { setPendingAction(''); }
  };

  const checkImportHistoryAfterUpload = async () => {
    try {
      await loadImportHistory(1);
      setUploadHistoryChecked(true);
      toast.success('Import history refreshed. Inspect it before deciding whether to stage this file again.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to check import history.');
    }
  };

  const downloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const blob = await projectService.downloadProjectPropertyImportTemplate(id, templateFormat);
      downloadBlob(blob, `project-property-import-template.${templateFormat}`);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to download the current project template.');
    } finally {
      setTemplateLoading(false);
    }
  };

  const replaceSession = (next: ProjectImportSession) => {
    setSession(next);
  };

  const refreshSession = async (page = rowPage): Promise<boolean> => {
    if (!importId) return false;
    try {
      setSession(await projectService.getProjectPropertyImport(id, importId, { page, limit: IMPORT_ROW_PAGE_SIZE }));
      setRowPage(page);
      setProgressError('');
      setPollingPaused(false);
      setPollReset((value) => value + 1);
      return true;
    } catch (raw) {
      setProgressError(raw instanceof Error ? raw.message : 'Unable to refresh import progress.');
      return false;
    }
  };

  const beginProtectedImportAction = async (action: 'confirm' | 'retry') => {
    if (!session || pendingAction) return;
    const currentImportId = sessionId(session);
    const body: Record<string, never> = {};
    const suffix = action === 'confirm' ? 'confirm' : 'retry-failed';
    const label = action === 'confirm' ? 'Submit this validated project import' : 'Retry eligible failed rows in this project import';
    setProtectedImportAction(action);
    setPendingAction(action);
    const started = await importStepUp.begin({
      method: 'POST',
      path: `/api/projects/${encodeURIComponent(id)}/property-imports/${encodeURIComponent(currentImportId)}/${suffix}`,
      body,
      label,
      execute: async (challengeId, exactBody) => {
        try {
          return action === 'confirm'
            ? await projectService.confirmProjectPropertyImport(id, currentImportId, exactBody, challengeId)
            : await projectService.retryFailedProjectPropertyImportRows(id, currentImportId, exactBody, challengeId);
        } catch (raw) {
          if (ambiguousRequest(raw)) {
            protectedOutcomeUnknownRef.current = action;
            setProtectedOutcomeUnknown(action);
          }
          throw raw;
        }
      },
    });
    if (!started) {
      setProtectedImportAction(null);
      setPendingAction('');
      toast.error(importStepUp.error ?? 'Unable to start the secure import action.');
    }
  };

  const completeProtectedImportAction = async (code: string): Promise<boolean> => {
    const action = protectedImportAction;
    if (!action || pendingAction !== action) return false;
    const result = await importStepUp.complete(code);
    if (!result.ok) {
      if (protectedOutcomeUnknownRef.current === action) {
        setProtectedOutcomeChecked(false);
        await refreshSession(rowPage);
      }
      return false;
    }
    setProtectedImportAction(null);
    setPendingAction('');
    setSession(result.value);
    protectedOutcomeUnknownRef.current = null;
    setProtectedOutcomeUnknown(null);
    setProtectedOutcomeChecked(false);
    toast.success(`The import request was accepted. Current state: ${labelize(result.value.status)}; review row outcomes before treating it as complete.`);
    void loadImportHistory(1).catch(() => undefined);
    return true;
  };

  const cancelProtectedImportAction = () => {
    importStepUp.cancel();
    setProtectedImportAction(null);
    setPendingAction('');
  };

  const reviewAndRestartProtectedAction = async () => {
    if (!protectedOutcomeUnknown || !protectedOutcomeChecked) return;
    const action = protectedOutcomeUnknown;
    protectedOutcomeUnknownRef.current = null;
    setProtectedOutcomeUnknown(null);
    setProtectedOutcomeChecked(false);
    await beginProtectedImportAction(action);
  };

  const beginEdit = (row: ProjectImportRow) => {
    const nextValues: Record<string, string> = {};
    for (const field of editableFields) nextValues[field] = rowDataValue(row, field);
    setEditValues(nextValues);
    setEditingRow(row);
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingRow || pendingAction) return;
    setPendingAction(`edit:${editingRow.rowNumber}`);
    try {
      replaceSession(await projectService.editProjectPropertyImportRow(id, sessionId(session!), editingRow.rowNumber, sanitizeImportRowPayload(editValues, editableFields)));
      setEditingRow(null);
      toast.success(`Row ${editingRow.rowNumber} updated and revalidated.`);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to edit row.');
    } finally {
      setPendingAction('');
    }
  };

  const mutateRow = async (row: ProjectImportRow, action: 'remove' | 'restore') => {
    if (!session || pendingAction) return;
    setPendingAction(`${action}:${row.rowNumber}`);
    try {
      replaceSession(action === 'remove'
        ? await projectService.removeProjectPropertyImportRow(id, sessionId(session), row.rowNumber)
        : await projectService.restoreProjectPropertyImportRow(id, sessionId(session), row.rowNumber));
      toast.success(action === 'remove' ? `Row ${row.rowNumber} removed from import.` : `Row ${row.rowNumber} restored and revalidated.`);
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : `Unable to ${action} row.`);
    } finally {
      setPendingAction('');
    }
  };

  const cancel = async () => {
    if (!session || pendingAction) return;
    setPendingAction('cancel');
    try {
      replaceSession(await projectService.cancelProjectPropertyImport(id, sessionId(session)));
      setCancelReviewOpen(false);
      toast.success('Cancellation requested. Any rows already committed remain in the project.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to cancel import.');
    } finally {
      setPendingAction('');
    }
  };

  return (
    <LandlordPortalLayout active="projects" title="Bulk Upload Properties">
      <main className="space-y-8 p-8 lg:p-12">
        <Link to={`/dashboard/landlord/projects/${id}`} className="text-sm font-bold text-primary hover:underline">Back to project</Link>
        {loading ? <LoadingState label="Loading import workspace..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error ? (
          <>
            <header className="rounded-xl bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">{project?.name ?? 'Project'}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">Bulk upload properties</h1>
              <p className="mt-3 max-w-3xl text-sm text-secondary">Upload CSV/XLSX text data for this project only. No Properties are created until you confirm a valid preview.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold">Template format
                  <select aria-label="Template format" value={templateFormat} onChange={(event) => setTemplateFormat(event.target.value as 'csv' | 'xlsx')} className="rounded-lg bg-surface-container-low px-3 py-2">
                    <option value="csv">CSV</option><option value="xlsx">Excel (.xlsx)</option>
                  </select>
                </label>
                <Button type="button" loading={templateLoading} loadingLabel="Downloading..." onClick={() => void downloadTemplate()}>Download {templateFormat.toUpperCase()} Template</Button>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:opacity-90">
                  {uploading ? 'Uploading...' : 'Select CSV/XLSX'}
                  <input type="file" accept=".csv,.xlsx" className="sr-only" disabled={uploading || uploadOutcomeUnknown} onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void upload(file);
                  }} />
                </label>
              </div>
              {selectedFile ? <p className="mt-3 text-xs text-secondary">Selected file: {selectedFile.name}{schema ? ` · Limit ${schema.limits.maxFileMB} MB` : ''}</p> : null}
              {uploadOutcomeUnknown ? <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">
                <p>Do not upload it again until you inspect the refreshed import history.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => void checkImportHistoryAfterUpload()}>Check import history</Button>
                  {uploadHistoryChecked && selectedFile ? <Button type="button" disabled={uploading} loading={uploading} loadingLabel="Staging..." onClick={() => void upload(selectedFile)}>I reviewed history — stage this file again</Button> : null}
                </div>
              </div> : null}
            </header>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.55fr]">
              <div className="rounded-xl bg-white p-6">
                <h2 className="text-xl font-black">Template requirements</h2>
                <p className="mt-2 text-sm text-secondary">Required fields for this project: {schema?.requiredFields.join(', ') || 'See the current server template and schema'}. {schema ? `Multi-value delimiter: ${schema.delimiter}.` : ''}</p>
                {schema ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-secondary">Max rows</p><p className="font-black">{schema.limits.maxRows}</p></div>
                    <div className="rounded-lg bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-secondary">Max file</p><p className="font-black">{schema.limits.maxFileMB} MB</p></div>
                    <div className="rounded-lg bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-secondary">Expires</p><p className="font-black">{schema.limits.expiryHours} hrs</p></div>
                  </div>
                ) : null}
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="border-b"><th className="py-2">Column</th><th className="py-2">Allowed values</th></tr></thead>
                    <tbody>{(schema?.fields ?? []).map((field) => (
                      <tr key={field.name} className="border-b border-outline-variant/10"><td className="py-2 font-bold">{field.name}{field.required ? ' *' : ''}</td><td className="py-2 text-secondary">{field.allowedValues?.join(', ') || 'Text/value'}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                {schema?.unsupportedFields.length ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">These source fields are not eligible for this project import and are not mapped: {schema.unsupportedFields.join(', ')}.</p> : null}
                <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs text-secondary">The backend validates every source-column mapping against the current project schema. Imported rows remain unpublished until a separate publication action.</p>
              </div>
              <aside className="rounded-xl bg-white p-6">
                <h2 className="text-xl font-black">Import history</h2>
                <div className="mt-4 space-y-3">
                  {imports.length ? imports.map((item) => (
                    <Link key={item._id} to={`/dashboard/landlord/projects/${id}/imports/${item._id}`} className="block rounded-lg bg-surface-container-low p-4 hover:bg-surface-container-high">
                      <p className="font-bold">{item.originalFileName || item._id}</p>
                      <p className="mt-1 text-xs text-secondary">{labelize(item.status)} - {item.importedRows}/{item.totalRows} imported - {formatDate(item.uploadedAt)}</p>
                    </Link>
                  )) : <p className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">No import sessions yet.</p>}
                </div>
                {importsTotal > IMPORT_HISTORY_PAGE_SIZE ? <nav aria-label="Import history pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <Button type="button" variant="secondary" disabled={importsPage <= 1} onClick={() => void loadImportHistory(importsPage - 1)}>Previous history</Button>
                  <span>Page {importsPage} of {Math.max(1, Math.ceil(importsTotal / IMPORT_HISTORY_PAGE_SIZE))} · {importsTotal} imports</span>
                  <Button type="button" variant="secondary" disabled={importsPage >= Math.ceil(importsTotal / IMPORT_HISTORY_PAGE_SIZE)} onClick={() => void loadImportHistory(importsPage + 1)}>Next history</Button>
                </nav> : null}
              </aside>
            </section>

            {session ? (
              <section className="rounded-xl bg-white p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary">{session.originalFileName} - {labelize(session.status)}</p>
                    <h2 className="mt-2 text-2xl font-black">Preview rows</h2>
                    <p className="mt-2 text-sm text-amber-800">Imported Properties start as pending review and will not include media or title documents.</p>
                    {session.uploadedAt || session.completedAt ? <p className="mt-2 text-xs text-secondary">{session.uploadedAt ? `Uploaded ${formatDate(session.uploadedAt)}` : ''}{session.completedAt ? ` · Completed ${formatDate(session.completedAt)}` : ''}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={!importId || pendingAction !== ''} onClick={() => void refreshSession()}>Refresh status</Button>
                    {canConfirm ? <Button type="button" loading={pendingAction === 'confirm' || (protectedImportAction === 'confirm' && importStepUp.busy)} loadingLabel="Confirming..." disabled={Boolean(pendingAction || protectedOutcomeUnknown)} onClick={() => void beginProtectedImportAction('confirm')}>Import Properties</Button> : null}
                    {canRetry ? <Button type="button" variant="secondary" loading={pendingAction === 'retry' || (protectedImportAction === 'retry' && importStepUp.busy)} loadingLabel="Retrying..." disabled={Boolean(pendingAction || protectedOutcomeUnknown)} onClick={() => void beginProtectedImportAction('retry')}>Retry eligible failed rows</Button> : null}
                    {canCancel ? <Button type="button" variant="ghost" disabled={Boolean(pendingAction)} onClick={() => setCancelReviewOpen(true)}>Cancel import</Button> : null}
                  </div>
                </div>
                {activeImportStates.has(session.status) ? <p role="status" className="mt-3 text-sm text-secondary">This import is {labelize(session.status)}. Progress refreshes automatically; committed rows remain even if cancellation is requested.</p> : null}
                <section className="mt-5 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4" aria-label="Column mapping">
                  <h3 className="font-bold">Map source columns</h3>
                  <p className="mt-1 text-xs text-secondary">Column numbers start at 1. The server accepts only eligible canonical fields, prevents duplicate source/target mappings and revalidates the staged rows. For CSV, headers are shown from the selected file; for XLSX or a reopened session, use the column order in your source sheet.</p>
                  {sourceColumns.length ? <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">{sourceColumns.map((header, index) => <li key={`${index}:${header}`}>{index + 1}: {header || '(blank header)'}</li>)}</ol> : null}
                  <form onSubmit={(event) => void mapColumns(event)} className="mt-3 space-y-2">
                    {mappingDrafts.map((draft, index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(90px,0.3fr)_1fr_auto]">
                      <label className="text-xs font-semibold">Column number<input type="number" min="1" step="1" value={draft.columnNumber} onChange={(event) => setMappingDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, columnNumber: event.target.value } : item))} className="mt-1 w-full rounded border bg-white px-3 py-2" /></label>
                      <label className="text-xs font-semibold">Canonical target<select value={draft.field} onChange={(event) => setMappingDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, field: event.target.value } : item))} className="mt-1 w-full rounded border bg-white px-3 py-2"><option value="">Choose a field</option>{(schema?.fields ?? []).map((field) => <option key={field.name} value={field.name}>{field.name}{field.required ? ' *' : ''}</option>)}<option value={IGNORE_IMPORT_COLUMN}>Ignore this source column</option></select></label>
                      <Button type="button" variant="ghost" disabled={mappingDrafts.length < 2 || Boolean(pendingAction)} onClick={() => setMappingDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
                    </div>)}
                    <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={Boolean(pendingAction)} onClick={() => setMappingDrafts((current) => [...current, { columnNumber: '', field: '' }])}>Add mapping</Button><Button type="submit" loading={pendingAction === 'mapping'} loadingLabel="Validating mapping…" disabled={Boolean(pendingAction) || !schema?.fields.length}>Save mapping</Button></div>
                    {mappingError ? <p role="alert" className="text-sm text-error">{mappingError}</p> : null}
                  </form>
                </section>
                {session.status === 'partial' || session.status === 'partially_completed' ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Some rows were imported and others need review. Check each row result before retrying.</p> : null}
                {progressError ? <p role="alert" className="mt-3 text-sm text-red-700">Progress refresh failed: {progressError}</p> : null}
                {pollingPaused && activeImportStates.has(session.status) ? <p role="status" className="mt-3 text-sm text-amber-800">Automatic refresh paused after five minutes. Use Refresh status to continue checking this durable import.</p> : null}
                {importStepUp.error && !importStepUp.challenge ? <p role="alert" className="mt-3 text-sm text-error">{importStepUp.error}</p> : null}
                {protectedOutcomeUnknown ? <div role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                  <p>The {protectedOutcomeUnknown === 'confirm' ? 'import submission' : 'failed-row retry'} response was ambiguous. No automatic retry was sent. Refresh the import state before deciding what to do next.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void refreshSession().then((ok) => setProtectedOutcomeChecked(ok))}>Check current import state</Button>
                    {protectedOutcomeChecked && (protectedOutcomeUnknown === 'confirm' ? canConfirm : canRetry) ? <Button type="button" onClick={() => void reviewAndRestartProtectedAction()}>I reviewed the state — start a new secure attempt</Button> : null}
                  </div>
                </div> : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(session.summary).map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-surface-container-low p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{labelize(key)}</p><p className="mt-1 text-2xl font-black">{value}</p></div>
                  ))}
                </div>

                {session.summary.invalidRows > 0 ? <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-800">Fix or remove invalid active rows before confirming import.</p> : null}
                {session.status === 'completed' ? <p className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Post-import checklist: add media, upload title documents, review imported listings, then submit them for approval.</p> : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, unit, block, phase" className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none sm:min-w-80" />
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ImportRowStatus | 'all')} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm outline-none">
                    {statusOptions.map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : labelize(status)}</option>)}
                  </select>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low text-xs uppercase tracking-widest text-secondary">
                      <tr><th className="p-3">Row</th><th className="p-3">Status</th><th className="p-3">Title</th><th className="p-3">Unit</th><th className="p-3">Price</th><th className="p-3">Messages</th><th className="p-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {filteredRows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="p-3 font-bold">{row.rowNumber}</td>
                          <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${rowStatusClasses[row.status]}`}>{labelize(row.status)}</span></td>
                          <td className="p-3">{rowDataValue(row, 'title') || 'Untitled'}</td>
                          <td className="p-3 text-secondary">{[rowDataValue(row, 'unitNumber'), rowDataValue(row, 'block'), rowDataValue(row, 'phase')].filter(Boolean).join(' - ') || 'N/A'}</td>
                          <td className="p-3">{rowDataDisplayValue(row, 'price')}</td>
                          <td className="p-3"><button type="button" className="font-bold text-primary hover:underline" onClick={() => setExpandedRows((current) => {
                            const next = new Set(current);
                            if (next.has(row.rowNumber)) next.delete(row.rowNumber); else next.add(row.rowNumber);
                            return next;
                          })}>{row.errors.length} errors / {row.warnings.length} warnings</button></td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              {row.status !== 'imported' && row.status !== 'removed' ? <button type="button" className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-primary" onClick={() => beginEdit(row)}>Edit</button> : null}
                              {row.status === 'removed' ? <button type="button" disabled={Boolean(pendingAction)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-60" onClick={() => void mutateRow(row, 'restore')}>{pendingAction === `restore:${row.rowNumber}` ? 'Restoring...' : 'Restore'}</button> : null}
                              {row.status !== 'removed' && row.status !== 'imported' ? <button type="button" disabled={Boolean(pendingAction)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-60" onClick={() => void mutateRow(row, 'remove')}>{pendingAction === `remove:${row.rowNumber}` ? 'Removing...' : 'Remove'}</button> : null}
                              {row.property ? <Link to={`/dashboard/landlord/property-details/${row.property}`} className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-primary">Property</Link> : null}
                            </div>
                          </td>
                          {expandedRows.has(row.rowNumber) ? (
                            <td colSpan={7} className="bg-surface-container-lowest p-4">
                              {[...row.errors, ...row.warnings].length ? [...row.errors, ...row.warnings].map((message, index) => (
                                <p key={`${message.field}-${message.code}-${index}`} className={row.errors.includes(message) ? 'text-sm text-red-800' : 'text-sm text-amber-800'}>
                                  Row {row.rowNumber}{message.field ? ` - ${message.field}` : ''}{message.code ? ` (${message.code})` : ''}: {message.message}
                                </p>
                              )) : <p className="text-sm text-secondary">No row messages.</p>}
                              {row.failureReason ? <p className="mt-2 text-sm text-red-800">Failure: {row.failureReason}</p> : null}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                      {!filteredRows.length ? <tr><td colSpan={7} className="p-8 text-center text-secondary">No rows match the current filters.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
                {session.summary.totalRows > IMPORT_ROW_PAGE_SIZE ? <nav aria-label="Import rows pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <Button type="button" variant="secondary" disabled={rowPage <= 1} onClick={() => void refreshSession(rowPage - 1)}>Previous rows</Button>
                  <span>Rows page {rowPage} of {Math.max(1, Math.ceil(session.summary.totalRows / IMPORT_ROW_PAGE_SIZE))} · {session.summary.totalRows} total</span>
                  <Button type="button" variant="secondary" disabled={rowPage >= Math.ceil(session.summary.totalRows / IMPORT_ROW_PAGE_SIZE)} onClick={() => void refreshSession(rowPage + 1)}>Next rows</Button>
                </nav> : null}
              </section>
            ) : null}
          </>
        ) : null}

        {editingRow ? (
          <div className="fixed inset-0 z-[2000] overflow-y-auto bg-black/50 p-4">
            <form onSubmit={(event) => void submitEdit(event)} className="mx-auto my-8 max-w-5xl rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-2xl font-black">Edit row {editingRow.rowNumber}</h2><p className="text-sm text-secondary">Fields come from this project's server schema. Save revalidates the row.</p></div>
                <button type="button" className="rounded-full p-2 hover:bg-surface-container-low" onClick={() => setEditingRow(null)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {editableFields.map((field) => (
                  <label key={field} className={field === 'description' || field === 'paymentPlanDescription' || field === 'riskDisclosure' ? 'md:col-span-3 text-xs font-bold uppercase tracking-widest text-secondary' : 'text-xs font-bold uppercase tracking-widest text-secondary'}>
                    {field}
                    {schema?.fields.find((item) => item.name === field)?.allowedValues?.length ? (
                      <select required={Boolean(schema?.fields.find((item) => item.name === field)?.required)} value={editValues[field] ?? ''} onChange={(event) => setEditValues((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm normal-case outline-none">
                        <option value="">Choose a server-allowed value</option>{schema?.fields.find((item) => item.name === field)?.allowedValues?.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    ) : field === 'description' || field === 'paymentPlanDescription' || field === 'riskDisclosure' ? (
                      <textarea value={editValues[field] ?? ''} rows={3} onChange={(event) => setEditValues((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm normal-case outline-none disabled:opacity-60" />
                    ) : (
                      <input required={Boolean(schema?.fields.find((item) => item.name === field)?.required)} type={numericFields.has(field) ? 'text' : field.includes('Date') ? 'date' : 'text'} value={editValues[field] ?? ''} onChange={(event) => setEditValues((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm normal-case outline-none disabled:opacity-60" />
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setEditingRow(null)}>Cancel</Button>
                <Button type="submit" loading={pendingAction === `edit:${editingRow.rowNumber}`} loadingLabel="Saving...">Save row</Button>
              </div>
            </form>
          </div>
        ) : null}
        {cancelReviewOpen && session ? <div className="fixed inset-0 z-[1900] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="import-cancel-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="import-cancel-title" className="text-xl font-black">Request import cancellation?</h2><p className="mt-3 text-sm text-secondary">Cancellation is cooperative. Rows already committed will remain in the project and will be reported in the import results.</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={Boolean(pendingAction)} onClick={() => setCancelReviewOpen(false)}>Keep importing</Button><Button type="button" variant="ghost" loading={pendingAction === 'cancel'} loadingLabel="Cancelling..." disabled={Boolean(pendingAction)} onClick={() => void cancel()}>Request cancellation</Button></div></section></div> : null}
      </main>
      <StepUpDialog challenge={importStepUp.challenge} busy={importStepUp.busy} error={importStepUp.error} onCancel={cancelProtectedImportAction} onSubmit={completeProtectedImportAction} />
    </LandlordPortalLayout>
  );
};

export default ProjectPropertyImports;
