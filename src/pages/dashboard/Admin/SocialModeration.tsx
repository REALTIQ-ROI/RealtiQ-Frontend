import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { group07Service } from '../../../services/group07Service';

type QueueKind = 'posts' | 'comments' | 'reports';
type QueueItem = Record<string, unknown> & { id?: string; version?: number; state?: string; text?: string; caption?: string; reason?: string; details?: string; subjectKind?: string; mediaIds?: string[] };
const itemsFrom = (value: Record<string, unknown>, kind: QueueKind): QueueItem[] => Array.isArray(value[kind]) ? value[kind] as QueueItem[] : [];
export default function SocialModeration() {
  const stepUp = useBoundStepUp<unknown>();
  const [kind, setKind] = useState<QueueKind>('posts');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{ id: string; url: string; mimeType: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (after?: string | null, append = false) => {
    setLoading(true); setError('');
    try {
      const page = await group07Service.socialModerationQueue(kind, after);
      const nextItems = itemsFrom(page, kind);
      setItems((current) => append ? [...current, ...nextItems] : nextItems);
      setCursor(typeof page.nextCursor === 'string' ? page.nextCursor : null);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'The Trust & Safety queue is unavailable.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setItems([]); setCursor(null); setPreview((current) => { if (current) URL.revokeObjectURL(current.url); return null; }); void load(); }, [kind]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const openPreview = async (item: QueueItem) => {
    if (typeof item.id !== 'string' || !Array.isArray(item.mediaIds) || typeof item.mediaIds[0] !== 'string') return;
    setNotice('');
    try {
      const blob = await group07Service.adminSocialPostMedia(item.id, item.mediaIds[0]);
      setPreview((current) => { if (current) URL.revokeObjectURL(current.url); return { id: item.id!, url: URL.createObjectURL(blob), mimeType: blob.type }; });
    } catch (raw) { setNotice(raw instanceof Error ? raw.message : 'Private post preview is unavailable to this staff profile.'); }
  };
  const submitDecision = async (item: QueueItem) => {
    if (typeof item.id !== 'string' || typeof item.version !== 'number') return;
    const reason = reasons[item.id]?.trim() ?? '';
    const decision = decisions[item.id] ?? (kind === 'reports' ? 'no_action' : kind === 'posts' ? 'approve' : 'approve');
    if (!reason) { setNotice('Enter a reason for the staff decision.'); return; }
    const body = { decision, expectedVersion: item.version, reason };
    setNotice('');
    const started = await stepUp.begin({ method: 'POST', path: `/api/admin/social/${kind}/${encodeURIComponent(item.id)}/decision`, body, label: 'Record an independent Trust & Safety social decision', execute: (challenge, exactBody) => group07Service.decideSocialItem(kind, item.id!, exactBody, challenge) });
    if (!started) setNotice(stepUp.getError() ?? 'The protected decision could not start. Refresh the case before retrying.');
  };
  const complete = async (code: string) => {
    setBusy(true);
    try { const result = await stepUp.complete(code); if (!result.ok) { setNotice(result.error ?? 'The decision was not confirmed. Refresh the current queue.'); await load(); return false; } setNotice('The server recorded the decision. Current public content and queue state have been refreshed.'); await load(); return true; }
    finally { setBusy(false); }
  };
  const decisionOptions = kind === 'posts' ? ['approve', 'reject', 'remove'] : kind === 'comments' ? ['approve', 'reject', 'remove'] : ['no_action', 'warning', 'content_removed'];

  return <AdminLayout><main className="space-y-6 p-4 sm:p-8"><header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Trust & Safety</p><h1 className="mt-2 text-3xl font-black">Social content review</h1><p className="mt-2 text-sm text-secondary">Pending content stays private until reviewed. Report outcomes do not bypass listing, project, staff or Executive workflows.</p></header>
    <nav aria-label="Social moderation queues" className="flex flex-wrap gap-2">{(['posts', 'comments', 'reports'] as const).map((option) => <button key={option} onClick={() => setKind(option)} aria-current={kind === option ? 'page' : undefined} className={`rounded-lg px-4 py-2 font-bold capitalize ${kind === option ? 'bg-primary text-on-primary' : 'border bg-white'}`}>{option}</button>)}</nav><button type="button" disabled={loading} onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 font-bold">Refresh queue</button>
    {loading ? <p role="status">Loading {kind} review queue…</p> : null}{error ? <p role="alert" className="rounded bg-red-50 p-3">{error}</p> : null}{notice ? <p role="status" className="rounded bg-surface-container-low p-3">{notice}</p> : null}
    <section className="space-y-3">{items.map((item, index) => { const id = typeof item.id === 'string' ? item.id : String(index); const text = kind === 'posts' ? item.caption : item.text; return <article key={id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">{kind === 'reports' ? `${String(item.subjectKind ?? 'Content')} report · ${String(item.reason ?? 'Reason not returned').replaceAll('_', ' ')}` : `${kind === 'posts' ? 'Post' : 'Comment'} review`}</h2><span className="rounded-full bg-surface-container-low px-3 py-1 text-sm capitalize">{String(item.state ?? 'pending').replaceAll('_', ' ')}</span></div>{typeof text === 'string' ? <p className="mt-3 whitespace-pre-wrap text-sm">{text}</p> : null}{kind === 'reports' && typeof item.details === 'string' ? <p className="mt-2 rounded bg-surface-container-low p-3 text-sm">{item.details}</p> : null}{kind === 'posts' && Array.isArray(item.mediaIds) && item.mediaIds.length ? <button type="button" onClick={() => void openPreview(item)} className="mt-3 rounded border px-3 py-2 text-sm font-bold">Open private preview</button> : null}
      <label className="mt-3 block text-sm font-bold">Decision<select value={decisions[id] ?? decisionOptions[0]} onChange={(event) => setDecisions((current) => ({ ...current, [id]: event.target.value }))} className="mt-1 block w-full rounded border p-2">{decisionOptions.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label><label className="mt-3 block text-sm font-bold">Private decision reason<textarea value={reasons[id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [id]: event.target.value }))} className="mt-1 block w-full rounded border p-2" /></label>{kind === 'reports' ? <p className="mt-2 text-xs text-secondary">Removing reported content requires the corresponding listing, project, review or content action to be completed first. Suspension and blacklisting remain Executive account actions.</p> : null}<button type="button" disabled={busy || !id || !reasons[id]?.trim() || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void submitDecision(item)} className="mt-3 rounded bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Continue with authenticator</button></article>; })}{!loading && !items.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No items are awaiting review in this queue.</p> : null}</section>
    {cursor ? <button disabled={loading} onClick={() => void load(cursor, true)} className="rounded border bg-white px-4 py-2 font-bold">Load more</button> : null}
    {preview ? <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/80 p-4" role="presentation" onClick={() => setPreview((current) => { if (current) URL.revokeObjectURL(current.url); return null; })}><section role="dialog" aria-modal="true" aria-label="Private post preview" className="max-h-[90vh] max-w-4xl rounded-xl bg-white p-4" onClick={(event) => event.stopPropagation()}>{preview.mimeType.startsWith('image/') ? <img src={preview.url} alt="Private content under review" className="max-h-[75vh] max-w-full object-contain" /> : <video controls src={preview.url} className="max-h-[75vh] max-w-full" />}<button type="button" className="mt-3 rounded border px-3 py-2 font-bold" onClick={() => setPreview((current) => { if (current) URL.revokeObjectURL(current.url); return null; })}>Close private preview</button></section></div> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </main></AdminLayout>;
}
