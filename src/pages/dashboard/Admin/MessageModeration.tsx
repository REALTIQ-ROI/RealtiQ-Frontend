import { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { messageService } from '../../../services/messageService';
import type { ConversationReport, ModerationAction, Pagination, ReportReason } from '../../../types';
const actions: ModerationAction[] = ['dismiss','warn','hide_message','restore_message','block_conversation','close_conversation','reopen_conversation'];
function MessageModerationContent() {
  const [reports, setReports] = useState<ConversationReport[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingReport, setPendingReport] = useState<string | null>(null);
  const requestRef = useRef(0);
  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await messageService.moderationQueue({ page, limit: 50, status, reason: reason || undefined });
      if (requestId !== requestRef.current) return;
      setReports(result.reports);
      setPagination(result.pagination);
    } catch (raw) {
      if (requestId === requestRef.current) setError(raw instanceof Error ? raw.message : 'Unable to load reports.');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [page, status, reason]);
  useEffect(() => { void load(); }, [load]);
  const act = async (report: ConversationReport, action: ModerationAction) => {
    if (pendingReport) return;
    const explanation = window.prompt(`Reason for ${action.replaceAll('_', ' ')}`);
    if (!explanation?.trim()) return;
    if (!window.confirm('Apply this moderation action?')) return;
    setPendingReport(report._id);
    setError('');
    try {
      await messageService.moderate(report._id, action, explanation.trim());
      await load();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to apply moderation action. Refresh the report before retrying.');
    } finally {
      setPendingReport(null);
    }
  };
  return <AdminLayout><main className='p-4 md:p-8'><h1 className='text-3xl font-extrabold mb-2'>Message moderation</h1><p className='text-slate-500 mb-6'>Private participant reports. Review reasons are never shown in marketplace threads.</p>
    <div className='mb-5 flex flex-wrap items-end gap-3'><label className='text-sm font-semibold'>Status<select className='mt-1 block rounded border p-2' value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>{['open','dismissed','actioned'].map((x) => <option key={x}>{x}</option>)}</select></label><label className='text-sm font-semibold'>Reason<select className='mt-1 block rounded border p-2' value={reason} onChange={(e) => { setPage(1); setReason(e.target.value); }}><option value=''>All</option>{(['spam','harassment','fraud','inappropriate_content','other'] as ReportReason[]).map((x) => <option key={x}>{x}</option>)}</select></label><button type='button' className='rounded border px-3 py-2 text-sm font-bold disabled:opacity-50' disabled={loading} onClick={() => void load()}>{loading ? 'Refreshing…' : 'Refresh queue'}</button></div>
    {error && <p role='alert' className='bg-red-50 text-red-800 p-3 rounded mb-4'>{error}</p>}
    {loading && reports.length === 0 ? <p role='status' className='mb-4 text-sm text-slate-500'>Loading reports…</p> : null}
    <div className='space-y-4'>{!loading && reports.length === 0 && !error ? <p className='rounded-lg border border-dashed p-5 text-sm text-slate-500'>No matching reports.</p> : reports.map((report) => <article key={report._id} className='bg-white border rounded-xl p-5'><div className='flex flex-wrap justify-between gap-3'><div><h2 className='font-bold capitalize'>{report.reason.replaceAll('_', ' ')}</h2><p className='text-sm'>{report.details || 'No additional details.'}</p><time className='text-xs text-slate-500'>{new Date(report.createdAt).toLocaleString()}</time></div><span>{report.status}</span></div>{report.status === 'open' && <div className='flex flex-wrap gap-2 mt-4'>{actions.filter((action) => (!['hide_message','restore_message'].includes(action) || report.message)).map((action) => <button type='button' key={action} disabled={pendingReport !== null} className='border rounded px-3 py-1 disabled:opacity-50' onClick={() => void act(report, action)}>{pendingReport === report._id ? 'Saving…' : action.replaceAll('_', ' ')}</button>)}</div>}</article>)}</div>
    {pagination && pagination.pages > 1 ? <nav aria-label='Moderation report pages' className='mt-5 flex items-center justify-between gap-3'><button type='button' className='rounded border px-3 py-2 text-sm font-bold disabled:opacity-50' disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span className='text-sm text-slate-600'>Page {pagination.page} of {pagination.pages} · {pagination.total} reports</span><button type='button' className='rounded border px-3 py-2 text-sm font-bold disabled:opacity-50' disabled={loading || page >= pagination.pages} onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}>Next</button></nav> : null}
  </main></AdminLayout>;
}

export default function MessageModeration() {
  const { activeProfile } = useAuth();
  return <MessageModerationContent key={activeProfile?.id ?? 'none'} />;
}
