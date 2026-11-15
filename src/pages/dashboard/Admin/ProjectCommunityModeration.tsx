import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { group07Service, type Group07ProjectReview, type Group07Question } from '../../../services/group07Service';

type Queue = 'questions' | 'reviews';
export default function ProjectCommunityModeration() {
  const stepUp = useBoundStepUp<unknown>();
  const [queue, setQueue] = useState<Queue>('questions');
  const [questions, setQuestions] = useState<Group07Question[]>([]);
  const [reviews, setReviews] = useState<Group07ProjectReview[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (after?: string | null, append = false) => {
    setLoading(true); setError('');
    try {
      if (queue === 'questions') {
        const page = await group07Service.adminProjectQuestions(after);
        setQuestions((old) => append ? [...old, ...page.questions] : page.questions);
        setCursor(page.nextCursor);
      } else {
        const page = await group07Service.adminProjectReviews(after);
        setReviews((old) => append ? [...old, ...page.reviews] : page.reviews);
        setCursor(page.nextCursor);
      }
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'The project community review queue is unavailable.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setQuestions([]); setReviews([]); setCursor(null); setNotice(''); void load(); }, [queue]);

  const begin = async (kind: Queue, id: string, target: 'question' | 'answer' | 'review' | 'reply', decision: 'approve' | 'reject', version: number) => {
    const reason = reasons[`${id}:${target}`]?.trim() ?? '';
    if (!reason) { setNotice('Enter a private moderation reason.'); return; }
    const body = { target, decision, expectedVersion: version, reason };
    const path = kind === 'questions' ? `/api/admin/project-questions/${encodeURIComponent(id)}/moderation` : `/api/admin/project-reviews/${encodeURIComponent(id)}/moderation`;
    const execute = (challenge: string, exactBody: typeof body) => kind === 'questions'
      ? group07Service.moderateProjectQuestion(id, exactBody as typeof body & { target: 'question' | 'answer' }, challenge)
      : group07Service.moderateProjectReview(id, exactBody as typeof body & { target: 'review' | 'reply' }, challenge);
    setNotice('');
    const started = await stepUp.begin({ method: 'PATCH', path, body, label: `Moderate a project ${target}`, execute });
    if (!started) setNotice(stepUp.getError() ?? 'The protected moderation action could not start. Refresh the current item before retrying.');
  };
  const complete = async (code: string) => {
    setBusy(true);
    try { const result = await stepUp.complete(code); if (!result.ok) { setNotice(result.error ?? 'The moderation decision was not confirmed.'); return false; } setNotice('The server recorded the decision. The queue has been refreshed.'); await load(); return true; }
    finally { setBusy(false); }
  };

  return <AdminLayout><main className="space-y-6 p-4 sm:p-8"><header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Trust & Safety</p><h1 className="mt-2 text-3xl font-black">Project questions and reviews</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Review pending public questions, answers, project reviews and developer replies. Public visibility follows the server’s approved state.</p></header>
    <nav aria-label="Project community queues" className="flex flex-wrap gap-2">{(['questions', 'reviews'] as const).map((item) => <button key={item} type="button" onClick={() => setQueue(item)} aria-current={queue === item ? 'page' : undefined} className={`rounded-lg px-4 py-2 font-bold capitalize ${queue === item ? 'bg-primary text-on-primary' : 'border bg-white'}`}>{item === 'questions' ? 'Questions and answers' : 'Project reviews and replies'}</button>)}</nav>
    <button type="button" disabled={loading} onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 font-bold">Refresh queue</button>
    {loading ? <p role="status">Loading pending {queue}…</p> : null}{error ? <p role="alert" className="rounded-lg bg-red-50 p-3">{error} <button type="button" onClick={() => void load()} className="font-bold underline">Retry</button></p> : null}{notice ? <p role="status" className="rounded-lg bg-surface-container-low p-3">{notice}</p> : null}
    {queue === 'questions' ? <section className="space-y-3">{questions.map((question) => <article key={question.id} className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Project question</h2><Link to={`/projects/${encodeURIComponent(question.projectId)}`} className="font-bold text-primary underline">View project page</Link></div><p className="whitespace-pre-wrap">{question.question}</p><p className="text-xs text-secondary">Question state: {question.state ?? 'not returned'} · answer state: {question.answerState ?? 'none'} · version {question.version}</p>{question.answer?.text ? <div className="rounded-lg bg-surface-container-low p-3"><p className="text-xs font-bold uppercase">Developer answer</p><p className="mt-1 whitespace-pre-wrap">{question.answer.text}</p></div> : question.pendingAnswer ? <div className="rounded-lg bg-surface-container-low p-3"><p className="text-xs font-bold uppercase">Pending developer answer</p><p className="mt-1 whitespace-pre-wrap">{question.pendingAnswer}</p></div> : null}{([...(question.state === 'pending' ? ['question' as const] : []), ...(question.answerState === 'pending' ? ['answer' as const] : [])]).map((target) => <ModerationControls key={`${question.id}:${target}`} id={question.id} target={target} version={question.version} reason={reasons[`${question.id}:${target}`] ?? ''} onReason={(value) => setReasons((old) => ({ ...old, [`${question.id}:${target}`]: value }))} disabled={busy || stepUp.busy || Boolean(stepUp.challenge)} onDecision={(decision) => void begin('questions', question.id, target, decision, question.version)} />)}</article>)}{!loading && !questions.length ? <EmptyQueue label="No project questions or answers are awaiting moderation." /> : null}</section> : <section className="space-y-3">{reviews.map((review) => <article key={review.id} className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Project review {review.badge ? `· ${review.badge === 'verified_buyer' ? 'Verified buyer' : 'Verified enquirer'}` : ''}</h2>{review.projectId ? <Link to={`/projects/${encodeURIComponent(review.projectId)}`} className="font-bold text-primary underline">View project page</Link> : null}</div><p className="text-sm text-secondary">{Object.entries(review.ratings).map(([key, value]) => `${key.replaceAll('_', ' ')} ${value}/5`).join(' · ')}</p><p className="whitespace-pre-wrap">{review.comment}</p>{review.reply?.text ? <div className="rounded-lg bg-surface-container-low p-3"><p className="text-xs font-bold uppercase">Developer reply</p><p className="mt-1 whitespace-pre-wrap">{review.reply.text}</p></div> : null}<p className="text-xs text-secondary">Review state: {review.state ?? 'not returned'} · reply state: {review.replyState ?? 'none'} · version {review.version}</p>{review.state === 'pending' ? <ModerationControls id={review.id} target="review" version={review.version} reason={reasons[`${review.id}:review`] ?? ''} onReason={(value) => setReasons((old) => ({ ...old, [`${review.id}:review`]: value }))} disabled={busy || stepUp.busy || Boolean(stepUp.challenge)} onDecision={(decision) => void begin('reviews', review.id, 'review', decision, review.version)} /> : null}{review.replyState === 'pending' ? <ModerationControls id={review.id} target="reply" version={review.version} reason={reasons[`${review.id}:reply`] ?? ''} onReason={(value) => setReasons((old) => ({ ...old, [`${review.id}:reply`]: value }))} disabled={busy || stepUp.busy || Boolean(stepUp.challenge)} onDecision={(decision) => void begin('reviews', review.id, 'reply', decision, review.version)} /> : null}</article>)}{!loading && !reviews.length ? <EmptyQueue label="No project reviews or replies are awaiting moderation." /> : null}</section>}
    {cursor ? <button type="button" disabled={loading} onClick={() => void load(cursor, true)} className="rounded-lg border bg-white px-4 py-2 font-bold">Load more</button> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </main></AdminLayout>;
}
function ModerationControls({ id, target, version, reason, onReason, onDecision, disabled }: { id: string; target: string; version: number; reason: string; onReason: (value: string) => void; onDecision: (decision: 'approve' | 'reject') => void; disabled: boolean }) {
  return <div className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_auto_auto]"><label className="text-sm font-bold">Private {target} moderation reason<textarea required maxLength={1000} value={reason} onChange={(event) => onReason(event.target.value)} className="mt-1 block w-full rounded border p-2 font-normal" /></label><button type="button" disabled={disabled || !reason.trim()} onClick={() => onDecision('approve')} className="self-end rounded bg-primary px-3 py-2 font-bold text-on-primary disabled:opacity-50">Approve {target}</button><button type="button" disabled={disabled || !reason.trim()} onClick={() => onDecision('reject')} className="self-end rounded border px-3 py-2 font-bold disabled:opacity-50">Reject {target}</button><span className="sr-only">{id} version {version}</span></div>;
}
function EmptyQueue({ label }: { label: string }) { return <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">{label}</p>; }
