import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { group07Service, type Group07ProjectReview, type Group07Question } from '../../services/group07Service';
import { escrowService } from '../../services/escrowService';
import { tourService } from '../../services/tourService';
import { projectService } from '../../services/projectService';
import { paymentService } from '../../services/paymentService';
import { documentManagerService } from '../../services/documentManagerService';

type ReviewSource = { key: string; sourceKind: 'purchase' | 'viewing' | 'checkout'; sourceId: string; propertyId: string; label: string };
const linkedId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const item = value as { _id?: unknown; id?: unknown };
  return typeof item._id === 'string' ? item._id : typeof item.id === 'string' ? item.id : '';
};

export default function ProjectCommunity({ projectIdOrSlug, projectId }: { projectIdOrSlug: string; projectId: string }) {
  const { isAuthenticated, activeProfile } = useAuth();
  const [questions, setQuestions] = useState<Group07Question[]>([]);
  const [reviews, setReviews] = useState<Array<Group07ProjectReview & { badge: 'verified_buyer' | 'verified_enquirer' }>>([]);
  const [mine, setMine] = useState<Group07ProjectReview | null>(null);
  const [summary, setSummary] = useState<{ qualifyingReviewCount: number; categoryAverages: Record<string, number | null>; postHandoverReviewCount?: number; postHandoverCategoryAverages?: Record<string, number | null> | null } | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [reviewSources, setReviewSources] = useState<ReviewSource[]>([]);
  const [reviewSourcesLoading, setReviewSourcesLoading] = useState(false);
  const [reviewSourceKey, setReviewSourceKey] = useState('');
  const [reviewRatings, setReviewRatings] = useState({ communication: '', documentation: '', paymentHandling: '' });
  const [reviewComment, setReviewComment] = useState('');
  const [handoverPropertyIds, setHandoverPropertyIds] = useState<string[]>([]);
  const [handoverRatings, setHandoverRatings] = useState({ buildQuality: '', finishing: '', promiseMatch: '' });
  const [reviewCursor, setReviewCursor] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [canManageQuestions, setCanManageQuestions] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [questionPage, reviewPage] = await Promise.all([
        group07Service.questions(projectIdOrSlug),
        group07Service.projectReviews(projectIdOrSlug),
      ]);
      let visibleQuestions = questionPage.questions;
      setCanManageQuestions(false);
      if (activeProfile?.kind === 'developer') {
        try {
          const managed = await group07Service.manageQuestions(projectIdOrSlug);
          visibleQuestions = managed.questions;
          setCanManageQuestions(true);
        } catch {
          // Public questions remain visible if this profile cannot read the developer queue.
        }
      }
      setQuestions(visibleQuestions); setReviews(reviewPage.reviews); setReviewCursor(reviewPage.nextCursor); setSummary(reviewPage.summary);
      if (isAuthenticated) {
        try { setMine(await group07Service.myProjectReview(projectIdOrSlug)); }
        catch { setMine(null); }
      } else setMine(null);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load project questions and reviews.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setQuestions([]); setReviews([]); setMine(null); setFollowing(null); void load(); }, [projectIdOrSlug, projectId, activeProfile?.id, isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated || !activeProfile || activeProfile.kind === 'admin' || !projectId) return;
    let current = true;
    const find = async () => {
      let cursor: string | null = null;
      do {
        const page = await group07Service.followingProjects(cursor, 100);
        if (page.projects.some((entry) => entry.project.id === projectId)) return true;
        cursor = page.nextCursor;
      } while (cursor);
      return false;
    };
    void find().then((value) => { if (current) setFollowing(value); }).catch(() => { if (current) setFollowing(null); });
    return () => { current = false; };
  }, [isAuthenticated, activeProfile?.id, activeProfile?.kind, projectId]);

  useEffect(() => {
    if (!isAuthenticated || activeProfile?.kind !== 'buyer' || !projectId) { setReviewSources([]); setHandoverPropertyIds([]); return; }
    let current = true;
    setReviewSourcesLoading(true); setReviewSources([]); setReviewSourceKey('');
    const loadSources = async () => {
      const units: Array<{ id: string; title: string }> = [];
      let page = 1;
      let pageCount = 1;
      do {
        const result = await projectService.getProjectProperties(projectId, { page, limit: 100 });
        units.push(...result.properties.map((property) => ({ id: property._id, title: property.title })));
        pageCount = result.total > result.limit ? Math.ceil(result.total / result.limit) : 1;
        page += 1;
      } while (page <= pageCount);
      const unitMap = new Map(units.map((unit) => [unit.id, unit.title]));
      const [escrows, firstTours, firstPayments, handoverDocs] = await Promise.all([
        escrowService.list(),
        tourService.getTours({ status: 'completed', page: 1, limit: 100 }),
        paymentService.getPaymentsPage(1, 100),
        documentManagerService.listDocuments({ limit: 100 }).catch(() => ({ items: [], nextCursor: null })),
      ]);
      const paymentPages = [firstPayments];
      const paymentPageCount = firstPayments.total === null ? 1 : Math.ceil(firstPayments.total / firstPayments.limit);
      for (let page = 2; page <= paymentPageCount; page += 1) paymentPages.push(await paymentService.getPaymentsPage(page, 100));
      const sources: ReviewSource[] = [];
      for (const escrow of escrows) {
        if (escrow.status !== 'released' || escrow.refundStatus === 'completed' || escrow.refundedAt) continue;
        const propertyId = linkedId(escrow.propertyId ?? escrow.property);
        const title = unitMap.get(propertyId);
        const id = escrow._id || escrow.id;
        if (id && title) sources.push({ key: `purchase:${id}`, sourceKind: 'purchase', sourceId: id, propertyId, label: `Completed purchase · ${title}` });
      }
      const tourPages = [firstTours];
      for (let page = 2; page <= Math.max(1, firstTours.pageCount); page += 1) {
        tourPages.push(await tourService.getTours({ status: 'completed', page, limit: 100 }));
      }
      for (const tour of tourPages.flatMap((result) => result.tours)) {
        const visitKind = (tour as unknown as { visitKind?: string }).visitKind;
        const propertyId = linkedId(tour.property);
        const title = unitMap.get(propertyId);
        if (visitKind === 'partner_job' || tour.status !== 'completed' || !title) continue;
        sources.push({ key: `viewing:${tour.id}`, sourceKind: 'viewing', sourceId: tour.id, propertyId, label: `Completed viewing · ${title} · ${new Date(tour.scheduledAt).toLocaleDateString('en-GB')}` });
      }
      for (const payment of paymentPages.flatMap((result) => result.payments)) {
        if (!['pending', 'paid'].includes(payment.status)) continue;
        const propertyId = linkedId(payment.property);
        const title = unitMap.get(propertyId);
        if (title) sources.push({ key: `checkout:${payment._id}`, sourceKind: 'checkout', sourceId: payment._id, propertyId, label: `Initialized property checkout · ${title}` });
      }
      const signedHandoverIds = handoverDocs.items
        .filter((document) => document.documentType === 'unit_handover_record' && document.state === 'signed' && document.subjectPropertyId && document.recipientProfileIds.includes(activeProfile?.id ?? ''))
        .map((document) => document.subjectPropertyId as string)
        .filter((propertyId) => unitMap.has(propertyId));
      if (current) setHandoverPropertyIds(signedHandoverIds);
      return sources;
    };
    void loadSources().then((sources) => { if (current) setReviewSources(sources); }).catch(() => { if (current) setReviewSources([]); }).finally(() => { if (current) setReviewSourcesLoading(false); });
    return () => { current = false; };
  }, [isAuthenticated, activeProfile?.id, activeProfile?.kind, projectId]);

  const toggleProjectFollow = async () => {
    if (!isAuthenticated || !activeProfile || activeProfile.kind === 'admin') { toast.error('Sign in with a registered profile to follow projects.'); return; }
    if (followBusy || !projectId) return;
    setFollowBusy(true);
    try {
      if (following) { await group07Service.unfollowProject(projectId); setFollowing(false); toast.success('Project unfollowed.'); }
      else { await group07Service.followProject(projectId); setFollowing(true); toast.success('Project followed.'); }
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to update this project follow.'); }
    finally { setFollowBusy(false); }
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (activeProfile?.kind !== 'buyer' || mine || saving) return;
    const source = reviewSources.find((entry) => entry.key === reviewSourceKey);
    if (!source || !reviewComment.trim() || Object.values(reviewRatings).some((value) => !value)) { toast.error('Choose a completed source and rate all three categories.'); return; }
    setSaving(true);
    try {
      const sourceHasHandover = handoverPropertyIds.includes(source.propertyId);
      const handover = Object.fromEntries(Object.entries(handoverRatings).map(([key, value]) => [key, Number(value)])) as { buildQuality: number; finishing: number; promiseMatch: number };
      if (sourceHasHandover && Object.values(handoverRatings).some((value) => !value)) { toast.error('Rate all three post-handover categories for this signed handover.'); return; }
      const review = await group07Service.createProjectReview(projectIdOrSlug, {
        propertyId: source.propertyId,
        sourceKind: source.sourceKind,
        sourceId: source.sourceId,
        ratings: { communication: Number(reviewRatings.communication), documentation: Number(reviewRatings.documentation), paymentHandling: Number(reviewRatings.paymentHandling) },
        comment: reviewComment.trim(),
        ...(sourceHasHandover ? { postHandoverRatings: handover } : {}),
      });
      setMine(review); setReviewComment(''); setHandoverRatings({ buildQuality: '', finishing: '', promiseMatch: '' }); toast.success('Review submitted for independent moderation.');
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The server could not accept this source-backed review. Refresh the project and review state.'); }
    finally { setSaving(false); }
  };

  const addPostHandoverReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!mine || mine.state !== 'approved' || mine.postHandoverRatings || saving) return;
    if (Object.values(handoverRatings).some((value) => !value)) { toast.error('Rate all three post-handover categories.'); return; }
    setSaving(true);
    try {
      const review = await group07Service.addPostHandoverProjectReview(projectIdOrSlug, mine.id, { expectedVersion: mine.version, postHandoverRatings: { buildQuality: Number(handoverRatings.buildQuality), finishing: Number(handoverRatings.finishing), promiseMatch: Number(handoverRatings.promiseMatch) } });
      setMine(review); setHandoverRatings({ buildQuality: '', finishing: '', promiseMatch: '' }); toast.success('Post-handover review submitted for independent moderation.');
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The signed handover review could not be submitted. Refresh and review the current case state.'); }
    finally { setSaving(false); }
  };

  const replyToReview = async (review: Group07ProjectReview) => {
    const text = replyDrafts[review.id]?.trim();
    if (!text || saving) return;
    setSaving(true);
    try { await group07Service.replyProjectReview(projectIdOrSlug, review.id, { text, expectedVersion: review.version }); setReplyDrafts((current) => ({ ...current, [review.id]: '' })); toast.success('Your response was submitted for moderation.'); await load(); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'The reply could not be submitted. Refresh the review before retrying.'); }
    finally { setSaving(false); }
  };

  const loadMoreReviews = async () => {
    if (!reviewCursor || loading) return;
    setLoading(true);
    try {
      const page = await group07Service.projectReviews(projectIdOrSlug, reviewCursor);
      setReviews((current) => [...current, ...page.reviews.filter((review) => !current.some((existing) => existing.id === review.id))]);
      setReviewCursor(page.nextCursor); setSummary(page.summary);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to load more project reviews.'); }
    finally { setLoading(false); }
  };

  const ask = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    setSaving(true);
    try {
      const created = await group07Service.askQuestion(projectIdOrSlug, questionText.trim());
      setQuestionText('');
      toast.success('Question submitted. It will appear publicly only after moderation.');
      if (activeProfile?.kind === 'developer') setQuestions((current) => [created, ...current]);
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to submit the question.'); }
    finally { setSaving(false); }
  };

  const answer = async (question: Group07Question) => {
    const text = answerDrafts[question.id]?.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await group07Service.answerQuestion(projectIdOrSlug, question.id, { answer: text, expectedVersion: question.version });
      toast.success('Your answer was sent for review.');
      setAnswerDrafts((current) => ({ ...current, [question.id]: '' }));
      await load();
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to submit the answer.'); }
    finally { setSaving(false); }
  };

  return <section className="space-y-8 rounded-2xl border bg-white p-5 sm:p-7">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Community</p><h2 className="mt-1 text-2xl font-black">Questions and reviews</h2><p className="mt-1 text-sm text-secondary">Questions, answers and reviews are checked before they appear publicly.</p></div>{isAuthenticated && activeProfile && activeProfile.kind !== 'admin' ? <button type="button" disabled={followBusy} onClick={() => void toggleProjectFollow()} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-50">{followBusy ? 'Updating…' : following ? 'Following · Unfollow' : 'Follow project'}</button> : null}</header>
    {error ? <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}<button onClick={() => void load()} className="ml-3 font-bold underline">Retry</button></div> : null}
    {loading ? <p role="status">Loading project community…</p> : null}
    {!loading ? <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4"><div><h3 className="text-xl font-black">Questions and answers</h3><p className="text-sm text-secondary">Your question stays private until it passes moderation.</p></div>
        {isAuthenticated && activeProfile && activeProfile.kind !== 'admin' ? <form onSubmit={(event) => void ask(event)} className="space-y-2"><label htmlFor="project-question" className="text-sm font-bold">Ask a question</label><textarea id="project-question" required maxLength={2000} rows={3} value={questionText} onChange={(event) => setQuestionText(event.target.value)} className="w-full rounded-lg border p-3" placeholder="Ask about this project"/><button disabled={saving || !questionText.trim()} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Submit question</button></form> : !isAuthenticated ? <p className="rounded-lg bg-surface-container-low p-3 text-sm">Sign in to ask a question.</p> : null}
        <div className="space-y-3">{questions.map((question) => <article key={question.id} className="rounded-xl bg-surface-container-low p-4"><p className="font-semibold">{question.question}</p>{question.answer ? <div className="mt-3 border-l-2 border-primary pl-3"><p className="text-xs font-bold uppercase">Developer answer</p><p className="mt-1">{question.answer.text}</p></div> : <p className="mt-2 text-xs text-secondary">No public answer yet.</p>}{canManageQuestions && question.answerState === 'pending' ? <p className="mt-2 rounded bg-amber-50 p-2 text-xs">Your proposed answer is awaiting Trust & Safety review.</p> : null}{canManageQuestions && question.pendingAnswer ? <div className="mt-2 rounded bg-amber-50 p-3"><p className="text-xs font-bold uppercase">Pending answer</p><p className="mt-1">{question.pendingAnswer}</p></div> : null}{canManageQuestions ? <div className="mt-3"><label htmlFor={`answer-${question.id}`} className="text-sm font-bold">Propose an answer</label><textarea id={`answer-${question.id}`} maxLength={2000} value={answerDrafts[question.id] ?? ''} onChange={(event) => setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-1 w-full rounded-lg border p-2"/><button disabled={saving || !(answerDrafts[question.id] ?? '').trim()} className="mt-2 rounded border px-3 py-2 text-sm font-bold" onClick={() => void answer(question)}>Send for moderation</button></div> : null}</article>)}{!questions.length ? <p className="rounded-lg border border-dashed p-5 text-sm text-secondary">No approved questions yet.</p> : null}</div>
      </div>
      <div className="space-y-4"><div><h3 className="text-xl font-black">Buyer reviews</h3><p className="text-sm text-secondary">Category ratings are shown separately; they are not combined into an overall project score.</p></div>
        {summary ? <><p className="text-sm">{summary.qualifyingReviewCount} qualifying reviews</p><dl className="grid grid-cols-3 gap-2">{Object.entries(summary.categoryAverages).map(([key, value]) => value === null ? null : <div key={key} className="rounded-lg bg-surface-container-low p-3"><dt className="text-xs capitalize text-secondary">{key.replaceAll(/([A-Z])/g, ' $1')}</dt><dd className="mt-1 font-bold">{value.toFixed(1)} / 5</dd></div>)}</dl><h4 className="mt-4 font-bold">After signed handover</h4><p className="text-xs text-secondary">{summary.postHandoverReviewCount ?? 0} qualifying signed-handover reviews. Projected dates do not count as a handover.</p>{summary.postHandoverCategoryAverages ? <dl className="mt-2 grid grid-cols-3 gap-2">{Object.entries(summary.postHandoverCategoryAverages).map(([key, value]) => value === null ? null : <div key={key} className="rounded-lg bg-surface-container-low p-3"><dt className="text-xs capitalize text-secondary">{key.replaceAll(/([A-Z])/g, ' $1')}</dt><dd className="mt-1 font-bold">{value.toFixed(1)} / 5</dd></div>)}</dl> : null}</> : null}
        {mine ? <p className="rounded-lg bg-blue-50 p-3 text-sm">Your review is {mine.state}. You can’t submit another while this review is current.</p> : null}
        {mine?.state === 'approved' && !mine.postHandoverRatings && handoverPropertyIds.length ? <form onSubmit={(event) => void addPostHandoverReview(event)} className="space-y-3 rounded-lg border p-4"><h4 className="font-bold">Review after handover</h4><p className="text-xs text-secondary">A signed handover record for a unit in this project is available to this profile. The server checks the exact unit and signature.</p><div className="grid gap-2 sm:grid-cols-3">{(['buildQuality', 'finishing', 'promiseMatch'] as const).map((category) => <label key={category} className="text-sm font-semibold">{category.replaceAll(/([A-Z])/g, ' $1')}<select required value={handoverRatings[category]} onChange={(event) => setHandoverRatings((current) => ({ ...current, [category]: event.target.value }))} className="mt-1 w-full rounded border p-2"><option value="">Choose 1–5</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select></label>)}</div><button disabled={saving} className="rounded bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Submit post-handover review</button></form> : null}
        {!mine && activeProfile?.kind === 'buyer' ? <form onSubmit={(event) => void submitReview(event)} className="space-y-3 rounded-lg border p-4"><h4 className="font-bold">Write a project review</h4><p className="text-xs text-secondary">Choose a completed purchase, attended viewing or initialized checkout for this project. The server confirms the selected source is eligible.</p>{reviewSourcesLoading ? <p role="status" className="text-sm">Checking your project activity…</p> : reviewSources.length ? <><label className="block text-sm font-semibold">Completed source<select required value={reviewSourceKey} onChange={(event) => setReviewSourceKey(event.target.value)} className="mt-1 w-full rounded border p-2"><option value="">Choose a source</option>{reviewSources.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}</select></label><div className="grid gap-2 sm:grid-cols-3">{(['communication', 'documentation', 'paymentHandling'] as const).map((category) => <label key={category} className="text-sm font-semibold capitalize">{category.replaceAll(/([A-Z])/g, ' $1')}<select required value={reviewRatings[category]} onChange={(event) => setReviewRatings((current) => ({ ...current, [category]: event.target.value }))} className="mt-1 w-full rounded border p-2"><option value="">Choose 1–5</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select></label>)}</div><label className="block text-sm font-semibold">Review<textarea required rows={3} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} className="mt-1 w-full rounded border p-2" /></label><button disabled={saving || !reviewSourceKey} className="rounded bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Submit review for moderation</button></> : <p role="status" className="rounded-lg bg-surface-container-low p-3 text-sm">No eligible completed purchase, viewing or initialized checkout was returned for the selected buyer profile. An eligible source is required before a review can be submitted.</p>}</form> : null}
        <div className="space-y-3">{reviews.map((review) => <article key={review.id} className="rounded-xl bg-surface-container-low p-4"><div className="flex items-center justify-between"><strong>{review.badge === 'verified_buyer' ? 'Verified buyer' : 'Verified enquirer'}</strong><time className="text-xs text-secondary">{new Date(review.createdAt).toLocaleDateString('en-GB')}</time></div><dl className="mt-2 grid grid-cols-3 gap-2">{Object.entries(review.ratings).map(([key, value]) => <div key={key}><dt className="text-xs capitalize text-secondary">{key.replaceAll(/([A-Z])/g, ' $1')}</dt><dd className="font-bold">{value}/5</dd></div>)}</dl>{review.postHandoverRatings ? <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">{Object.entries(review.postHandoverRatings).map(([key, value]) => <div key={key}><dt className="text-xs capitalize text-secondary">{key.replaceAll(/([A-Z])/g, ' $1')}</dt><dd className="font-bold">{value}/5</dd></div>)}</dl> : null}{review.comment ? <p className="mt-3 whitespace-pre-wrap">{review.comment}</p> : null}{review.reply ? <div className="mt-3 border-l-2 border-primary pl-3"><p className="text-xs font-bold uppercase">Developer response</p><p>{review.reply.text}</p></div> : null}{activeProfile?.kind === 'developer' && !review.reply ? <div className="mt-3"><label className="text-sm font-bold" htmlFor={`review-reply-${review.id}`}>Developer response<textarea id={`review-reply-${review.id}`} maxLength={2000} value={replyDrafts[review.id] ?? ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [review.id]: event.target.value }))} className="mt-1 w-full rounded border p-2"/></label><button disabled={saving || !(replyDrafts[review.id] ?? '').trim()} onClick={() => void replyToReview(review)} className="mt-2 rounded border px-3 py-2 text-sm font-bold">Submit response for moderation</button></div> : null}</article>)}{!reviews.length ? <p className="rounded-lg border border-dashed p-5 text-sm text-secondary">No public reviews yet.</p> : null}{reviewCursor ? <button type="button" disabled={loading} onClick={() => void loadMoreReviews()} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-50">Load more reviews</button> : null}</div>
      </div>
    </div> : null}
  </section>;
}
