import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { useRealtime } from '../../../contexts/RealtimeContext';
import { messageService } from '../../../services/messageService';
import type { ConversationReport, ModerationAction, ReportReason } from '../../../types';
const actions: ModerationAction[] = ['dismiss','warn','hide_message','restore_message','block_conversation','close_conversation','reopen_conversation'];
export default function MessageModeration() {
  const [reports, setReports] = useState<ConversationReport[]>([]); const [status, setStatus] = useState('open'); const [reason, setReason] = useState(''); const [error, setError] = useState(''); const realtime = useRealtime();
  const load = useCallback(async () => { try { setReports((await messageService.moderationQueue({ page: 1, limit: 50, status, reason: reason || undefined })).reports); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load reports.'); } }, [status, reason]);
  // Realtime readiness/moderation signals cause an authoritative queue refresh.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load, realtime.connectionState]);
  const act = (report: ConversationReport, action: ModerationAction) => { const explanation = window.prompt(`Reason for ${action.replaceAll('_', ' ')}`); if (!explanation?.trim()) return; if (!window.confirm('Apply this moderation action?')) return; void messageService.moderate(report._id, action, explanation.trim()).then(load, (e: Error) => setError(e.message)); };
  return <AdminLayout><main className='p-4 md:p-8'><h1 className='text-3xl font-extrabold mb-2'>Message moderation</h1><p className='text-slate-500 mb-6'>Private participant reports. Review reasons are never shown in marketplace threads.</p>
    <div className='flex gap-3 mb-5'><label>Status<select className='block border p-2 rounded' value={status} onChange={(e) => setStatus(e.target.value)}>{['open','dismissed','actioned'].map((x) => <option key={x}>{x}</option>)}</select></label><label>Reason<select className='block border p-2 rounded' value={reason} onChange={(e) => setReason(e.target.value)}><option value=''>All</option>{(['spam','harassment','fraud','inappropriate_content','other'] as ReportReason[]).map((x) => <option key={x}>{x}</option>)}</select></label></div>
    {error && <p role='alert' className='bg-red-50 text-red-800 p-3 rounded mb-4'>{error}</p>}
    <div className='space-y-4'>{reports.length === 0 ? <p>No matching reports.</p> : reports.map((report) => <article key={report._id} className='bg-white border rounded-xl p-5'><div className='flex flex-wrap justify-between gap-3'><div><h2 className='font-bold capitalize'>{report.reason.replaceAll('_', ' ')}</h2><p className='text-sm'>{report.details || 'No additional details.'}</p><time className='text-xs text-slate-500'>{new Date(report.createdAt).toLocaleString()}</time></div><span>{report.status}</span></div>{report.status === 'open' && <div className='flex flex-wrap gap-2 mt-4'>{actions.filter((action) => (!['hide_message','restore_message'].includes(action) || report.message)).map((action) => <button key={action} className='border rounded px-3 py-1' onClick={() => act(report, action)}>{action.replaceAll('_', ' ')}</button>)}</div>}</article>)}</div>
  </main></AdminLayout>;
}
