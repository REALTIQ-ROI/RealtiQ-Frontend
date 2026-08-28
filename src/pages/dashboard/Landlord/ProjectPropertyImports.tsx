import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { ApiRequestError } from '../../../lib/axios';
import { projectService } from '../../../services/projectService';
import type { ImportRowStatus, ProjectDetail, ProjectImportListItem, ProjectImportRow, ProjectImportSchema, ProjectImportSession } from '../../../types';
import { buildLocalProjectImportCsv, downloadBlob, importTemplateColumns, rowDataValue, sanitizeImportRowPayload } from '../../../utils/projectImport';
import { formatDate, labelize } from '../../../utils/projectFormatters';

const numericFields = new Set(['price', 'bedrooms', 'bathrooms', 'squareFeet', 'constructionProgress', 'reservationAmount', 'minimumInitialDeposit', 'installmentDurationMonths']);
const editableFields = importTemplateColumns;
const statusOptions: Array<ImportRowStatus | 'all'> = ['all', 'valid', 'invalid', 'removed', 'imported', 'failed'];
const rowStatusClasses: Record<ImportRowStatus, string> = {
  valid: 'bg-emerald-50 text-emerald-700',
  invalid: 'bg-red-50 text-red-700',
  removed: 'bg-slate-100 text-slate-700',
  imported: 'bg-primary/10 text-primary',
  failed: 'bg-amber-50 text-amber-800',
};

const sessionId = (session: ProjectImportSession | ProjectImportListItem) => 'importSessionId' in session ? session.importSessionId : session._id;

const validateRowEdit = (values: Record<string, string>) => {
  const errors: string[] = [];
  if (!values.title?.trim()) errors.push('Title is required.');
  if (!values.price?.trim()) errors.push('Price is required.');
  if (!values.propertyType?.trim()) errors.push('Property type is required.');
  if (values.propertyType?.trim().toLowerCase() === 'land') errors.push('Land listings are not supported.');
  if (values.listingType === 'off_plan') {
    if (!values.developmentStatus?.trim()) errors.push('Development status is required for off-plan rows.');
    if (!values.expectedCompletionDate?.trim()) errors.push('Expected completion date is required for off-plan rows.');
    if (!values.riskDisclosure?.trim()) errors.push('Risk disclosure is required for off-plan rows.');
    const progress = Number(values.constructionProgress || 0);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) errors.push('Construction progress must be between 0 and 100.');
    const price = Number((values.price || '').replace(/[₦,\s]/g, ''));
    const deposit = Number((values.minimumInitialDeposit || '0').replace(/[₦,\s]/g, ''));
    const reservation = Number((values.reservationAmount || '0').replace(/[₦,\s]/g, ''));
    if (deposit < 0 || reservation < 0) errors.push('Deposit amounts cannot be negative.');
    if (Number.isFinite(price) && deposit > price) errors.push('Minimum initial deposit cannot exceed price.');
  }
  return errors;
};

const ProjectPropertyImports = () => {
  const { id = '', importId = '' } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [schema, setSchema] = useState<ProjectImportSchema | null>(null);
  const [imports, setImports] = useState<ProjectImportListItem[]>([]);
  const [session, setSession] = useState<ProjectImportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<ImportRowStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingRow, setEditingRow] = useState<ProjectImportRow | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [manage, schemaResponse, history] = await Promise.all([
        projectService.getProjectManage(id),
        projectService.getProjectPropertyImportSchema(id).catch(() => null),
        projectService.listProjectPropertyImports(id, { page: 1, limit: 20 }),
      ]);
      setProject(manage.project);
      setSchema(schemaResponse);
      setImports(history.imports ?? []);
      if (importId) setSession(await projectService.getProjectPropertyImport(id, importId, { page: 1, limit: 100 }));
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

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (session?.rows ?? []).filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const haystack = ['title', 'unitNumber', 'block', 'phase'].map((field) => rowDataValue(row, field)).join(' ').toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [search, session?.rows, statusFilter]);

  const canConfirm = session?.status === 'ready' && (session.summary.invalidRows ?? 0) === 0 && (session.summary.validRows ?? 0) > 0;
  const canRetry = session?.status === 'partially_completed' || session?.status === 'failed';
  const canCancel = session ? !['completed', 'partially_completed', 'failed', 'cancelled', 'expired'].includes(session.status) : false;

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      toast.error('Only CSV and XLSX files are supported.');
      return;
    }
    setUploading(true);
    try {
      const next = await projectService.uploadProjectPropertyImport(id, file);
      setSession(next);
      toast.success('Import preview is ready. No properties have been created yet.');
      await projectService.listProjectPropertyImports(id, { page: 1, limit: 20 }).then((history) => setImports(history.imports ?? []));
      navigate(`/dashboard/landlord/projects/${id}/imports/${next.importSessionId}`, { replace: true });
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to upload spreadsheet.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const blob = await projectService.downloadProjectPropertyImportTemplate(id);
      downloadBlob(blob, 'project-property-import-template.csv');
    } catch {
      downloadBlob(new Blob([buildLocalProjectImportCsv()], { type: 'text/csv;charset=utf-8' }), 'project-property-import-template.csv');
      toast.warning('The standard template was unavailable, so a compatible CSV template was generated.');
    } finally {
      setTemplateLoading(false);
    }
  };

  const replaceSession = (next: ProjectImportSession) => {
    setSession(next);
  };

  const beginEdit = (row: ProjectImportRow) => {
    const nextValues: Record<string, string> = {};
    for (const field of editableFields) nextValues[field] = rowDataValue(row, field);
    nextValues.status = 'available';
    setEditValues(nextValues);
    setEditingRow(row);
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingRow || pendingAction) return;
    const validation = validateRowEdit(editValues);
    if (validation.length) {
      toast.error(validation.join(' '));
      return;
    }
    setPendingAction(`edit:${editingRow.rowNumber}`);
    try {
      replaceSession(await projectService.editProjectPropertyImportRow(id, sessionId(session!), editingRow.rowNumber, sanitizeImportRowPayload(editValues)));
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

  const confirm = async () => {
    if (!session || !canConfirm) return;
    const confirmed = await Swal.fire({
      title: 'Import properties?',
      text: 'Valid active rows will create pending-review Properties under this Project. Media and title documents must be added after import.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Import Properties',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#000000',
    });
    if (!confirmed.isConfirmed) return;
    setPendingAction('confirm');
    try {
      replaceSession(await projectService.confirmProjectPropertyImport(id, sessionId(session)));
      toast.success('Import completed.');
      await load();
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 422) {
        setStatusFilter('invalid');
        toast.error(raw.message || 'Some property rows contain validation errors.');
      } else {
        toast.error(raw instanceof Error ? raw.message : 'Unable to confirm import.');
      }
    } finally {
      setPendingAction('');
    }
  };

  const retryFailed = async () => {
    if (!session || pendingAction) return;
    setPendingAction('retry');
    try {
      replaceSession(await projectService.retryFailedProjectPropertyImportRows(id, sessionId(session)));
      toast.success('Failed rows retried.');
    } catch (raw) {
      toast.error(raw instanceof Error ? raw.message : 'Unable to retry failed rows.');
    } finally {
      setPendingAction('');
    }
  };

  const cancel = async () => {
    if (!session || pendingAction) return;
    setPendingAction('cancel');
    try {
      replaceSession(await projectService.cancelProjectPropertyImport(id, sessionId(session)));
      toast.success('Import cancelled. No created properties were deleted.');
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
                <Button type="button" loading={templateLoading} loadingLabel="Downloading..." onClick={() => void downloadTemplate()}>Download CSV Template</Button>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:opacity-90">
                  {uploading ? 'Uploading...' : 'Upload CSV/XLSX'}
                  <input type="file" accept=".csv,.xlsx" className="sr-only" disabled={uploading} onChange={(event) => void upload(event)} />
                </label>
              </div>
            </header>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.55fr]">
              <div className="rounded-xl bg-white p-6">
                <h2 className="text-xl font-black">Template requirements</h2>
                <p className="mt-2 text-sm text-secondary">Required fields: {(schema?.requiredFields ?? ['title', 'price', 'propertyType']).join(', ')}. Amenities and features use the pipe delimiter.</p>
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
                    <tbody>{(schema?.fields ?? importTemplateColumns.map((name) => ({ name, required: ['title', 'price', 'propertyType'].includes(name), allowedValues: undefined }))).map((field) => (
                      <tr key={field.name} className="border-b border-outline-variant/10"><td className="py-2 font-bold">{field.name}{field.required ? ' *' : ''}</td><td className="py-2 text-secondary">{field.allowedValues?.filter((value) => field.name !== 'propertyType' || value.toLowerCase() !== 'land').join(', ') || 'Text/value'}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
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
              </aside>
            </section>

            {session ? (
              <section className="rounded-xl bg-white p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary">{session.originalFileName} - {labelize(session.status)}</p>
                    <h2 className="mt-2 text-2xl font-black">Preview rows</h2>
                    <p className="mt-2 text-sm text-amber-800">Imported Properties start as pending review and will not include media or title documents.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" loading={pendingAction === 'confirm'} loadingLabel="Importing..." disabled={!canConfirm} onClick={() => void confirm()}>Import Properties</Button>
                    {canRetry ? <Button type="button" variant="secondary" loading={pendingAction === 'retry'} loadingLabel="Retrying..." onClick={() => void retryFailed()}>Retry failed rows</Button> : null}
                    {canCancel ? <Button type="button" variant="ghost" loading={pendingAction === 'cancel'} loadingLabel="Cancelling..." onClick={() => void cancel()}>Cancel import</Button> : null}
                  </div>
                </div>

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
                          <td className="p-3">{rowDataValue(row, 'price') || 'N/A'}</td>
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
              </section>
            ) : null}
          </>
        ) : null}

        {editingRow ? (
          <div className="fixed inset-0 z-[2000] overflow-y-auto bg-black/50 p-4">
            <form onSubmit={(event) => void submitEdit(event)} className="mx-auto my-8 max-w-5xl rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-2xl font-black">Edit row {editingRow.rowNumber}</h2><p className="text-sm text-secondary">Only supported import fields are submitted. Status is locked to available.</p></div>
                <button type="button" className="rounded-full p-2 hover:bg-surface-container-low" onClick={() => setEditingRow(null)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {editableFields.map((field) => (
                  <label key={field} className={field === 'description' || field === 'paymentPlanDescription' || field === 'riskDisclosure' ? 'md:col-span-3 text-xs font-bold uppercase tracking-widest text-secondary' : 'text-xs font-bold uppercase tracking-widest text-secondary'}>
                    {field}
                    {field === 'description' || field === 'paymentPlanDescription' || field === 'riskDisclosure' ? (
                      <textarea value={editValues[field] ?? ''} rows={3} onChange={(event) => setEditValues((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm normal-case outline-none disabled:opacity-60" />
                    ) : (
                      <input type={numericFields.has(field) ? 'text' : field.includes('Date') ? 'date' : 'text'} value={editValues[field] ?? ''} disabled={field === 'status'} onChange={(event) => setEditValues((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm normal-case outline-none disabled:opacity-60" />
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
      </main>
    </LandlordPortalLayout>
  );
};

export default ProjectPropertyImports;
