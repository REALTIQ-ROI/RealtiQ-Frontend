import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { documentManagerService, type ManagedDocumentDto } from '../../services/documentManagerService';
import { group07Service, type Group07PrivatePost, type Group07PublicPost } from '../../services/group07Service';

type Tab = 'feed' | 'explore' | 'following' | 'my-posts';
type Engagement = { liked: boolean; saved: boolean; shared: boolean };
const authorKinds = new Set(['owner', 'agency', 'developer', 'legal_partner', 'engineering_survey_partner', 'inspection_partner', 'valuation_partner', 'buyers_agent', 'sellers_agent']);
const operationKey = () => `social_${crypto.randomUUID().replaceAll('-', '')}`;
const safeCommunityMessage = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const message = (value as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message;
    const code = (value as Record<string, unknown>).code;
    if (code === 'FEATURE_SOCIAL_EXPLORE_POLICY_UNCONFIGURED') return 'Explore ranking is unavailable, so posts are shown newest first.';
  }
  return fallback;
};

export default function Community() {
  const { isAuthenticated, activeProfile, token } = useAuth();
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<Group07PublicPost[]>([]);
  const [myPosts, setMyPosts] = useState<Group07PrivatePost[]>([]);
  const [feedItems, setFeedItems] = useState<Array<Record<string, unknown>>>([]);
  const [sponsored, setSponsored] = useState<Group07PublicPost[]>([]);
  const [feedState, setFeedState] = useState('ready');
  const [cursor, setCursor] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<Record<string, Engagement>>({});
  const [comments, setComments] = useState<Record<string, Array<{ id: string; text: string; createdAt: string }>>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [caption, setCaption] = useState('');
  const [contentKind, setContentKind] = useState<'general' | 'client_story'>('general');
  const [hashtags, setHashtags] = useState('');
  const [consentDocumentId, setConsentDocumentId] = useState('');
  const [selectedServiceKey, setSelectedServiceKey] = useState('');
  const [serviceKeys, setServiceKeys] = useState<Array<{ serviceKey: string; label: string }>>([]);
  const [consents, setConsents] = useState<ManagedDocumentDto[]>([]);
  const [mediaAsset, setMediaAsset] = useState<{ id: string; state: string; kind: string } | null>(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [reportDraft, setReportDraft] = useState<Record<string, { reason: string; details: string }>>({});
  const profileRef = useRef(activeProfile?.id ?? ''); profileRef.current = activeProfile?.id ?? '';
  const canAuthor = Boolean(isAuthenticated && activeProfile && authorKinds.has(activeProfile.kind));

  const load = async (reset = true) => {
    setLoading(true); setError('');
    try {
      if (tab === 'feed') {
        const page = await group07Service.postFeed(reset ? null : cursor);
        if (!Array.isArray(page.posts)) throw new Error('Community posts are unavailable in the current response.');
        setPosts((old) => reset ? page.posts : [...old, ...page.posts]); setCursor(page.nextCursor);
      } else if (tab === 'explore') {
        const [pageResult, paidResult] = await Promise.allSettled([group07Service.explorePosts(reset ? null : cursor), group07Service.sponsoredPosts('explore')]);
        if (pageResult.status === 'rejected') throw pageResult.reason;
        const page = pageResult.value;
        if (!Array.isArray(page.posts)) throw new Error('Community posts are unavailable in the current response.');
        setPosts((old) => reset ? page.posts : [...old, ...page.posts]); setCursor(page.nextCursor); setFeedState(page.state);
        setSponsored(paidResult.status === 'fulfilled' && Array.isArray(paidResult.value.posts) ? paidResult.value.posts : []);
        if (page.notice) setError(safeCommunityMessage(page.notice, page.state === 'newest_fallback' ? 'Explore ranking is unavailable, so posts are shown newest first.' : 'Some community content is temporarily unavailable.'));
        else if (paidResult.status === 'rejected') setError('Sponsored posts are temporarily unavailable. Explore posts are still shown.');
      } else if (tab === 'following') {
        const page = await group07Service.followingFeed(reset ? null : cursor);
        if (!Array.isArray(page.items)) throw new Error('Followed updates are unavailable in the current response.');
        setFeedItems((old) => reset ? page.items : [...old, ...page.items]); setCursor(page.nextCursor);
      } else if (tab === 'my-posts') {
        const page = await group07Service.myPosts(reset ? null : cursor);
        setMyPosts((old) => reset ? page.posts : [...old, ...page.posts]); setCursor(page.nextCursor);
      }
    } catch (raw) { setError(safeCommunityMessage(raw, 'Community content is unavailable.')); }
    finally { setLoading(false); }
  };
  useEffect(() => { setPosts([]); setMyPosts([]); setFeedItems([]); setCursor(null); setEngagement({}); setSponsored([]); void load(); }, [tab, activeProfile?.id, token]);
  useEffect(() => { if (isAuthenticated && canAuthor && tab === 'my-posts') { void group07Service.myPosts().then((page) => setMyPosts(page.posts)).catch(() => undefined); } }, [isAuthenticated, canAuthor, tab, activeProfile?.id]);
  useEffect(() => () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); }, [mediaPreview]);

  useEffect(() => {
    if (!isAuthenticated || !canAuthor || tab !== 'my-posts') return;
    let current = true;
    void Promise.all([
      documentManagerService.listDocuments({ limit: 100 }).catch(() => ({ items: [], nextCursor: null })),
      activeProfile?.kind.endsWith('_partner') || activeProfile?.kind.endsWith('_agent') ? group07Service.partnerCurrent().catch(() => null) : Promise.resolve(null),
    ]).then(([docPage, partnerWorkspace]) => {
      if (!current) return;
      const clientStoryDocs = docPage.items.filter((document) => document.documentType === 'client_story_consent' && document.state === 'signed' && document.contentHash && document.recipientProfileIds.some((recipient) => recipient !== activeProfile?.id));
      setConsents(clientStoryDocs);
      setServiceKeys(partnerWorkspace?.catalogue.map((item) => ({ serviceKey: item.serviceKey, label: item.label })) ?? []);
    });
    return () => { current = false; };
  }, [isAuthenticated, canAuthor, tab, activeProfile?.id, activeProfile?.kind]);

  useEffect(() => {
    if (!isAuthenticated || tab === 'my-posts') return;
    const missing = posts.filter((post) => !engagement[post.id]);
    let current = true;
    void Promise.all(missing.map(async (post) => [post.id, await group07Service.engagement(post.id).catch(() => null)] as const)).then((items) => {
      if (!current) return;
      setEngagement((old) => { const next = { ...old }; for (const [id, value] of items) if (value) next[id] = { liked: value.liked, saved: value.saved, shared: value.shared }; return next; });
    });
    return () => { current = false; };
  }, [isAuthenticated, posts, tab, activeProfile?.id]);

  const reloadComments = async (postId: string) => {
    try { const page = await group07Service.postComments(postId); setComments((old) => ({ ...old, [postId]: page.comments })); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Comments are unavailable.'); }
  };
  const changeEngagement = async (post: Group07PublicPost, kind: 'like' | 'save' | 'share') => {
    if (!isAuthenticated || busyId) return;
    const current = engagement[post.id] ?? { liked: false, saved: false, shared: false };
    const next = !current[`${kind}d` as 'liked' | 'saved' | 'shared'];
    setBusyId(post.id);
    try { const response = await group07Service.setEngagement(post.id, kind, next); setEngagement((old) => ({ ...old, [post.id]: { ...(old[post.id] ?? { liked: false, saved: false, shared: false }), [`${kind}d`]: response.active } })); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to update this post.'); }
    finally { setBusyId(''); }
  };
  const submitComment = async (postId: string) => {
    const text = commentDraft[postId]?.trim(); if (!text || busyId) return;
    setBusyId(postId);
    try { await group07Service.createComment(postId, text); setCommentDraft((old) => ({ ...old, [postId]: '' })); toast.success('Comment submitted for moderation.'); await reloadComments(postId); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to submit comment.'); }
    finally { setBusyId(''); }
  };
  const reportPost = async (post: Group07PublicPost) => {
    const draft = reportDraft[post.id] ?? { reason: 'spam', details: '' };
    if (busyId) return;
    setBusyId(post.id);
    try { await group07Service.createContentReport({ subjectKind: 'post', subjectId: post.id, reason: draft.reason, ...(draft.reason === 'other' ? { details: draft.details.trim() } : {}), operationKey: operationKey() }); toast.success('Report sent to the Trust & Safety review queue.'); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to submit report.'); }
    finally { setBusyId(''); }
  };
  const uploadPhoto = async (file: File) => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(''); setMediaAsset(null); setBusyId('media');
    try {
      const form = new FormData(); form.append('file', file); form.append('kind', 'photo');
      const asset = await group07Service.uploadPostMedia(form);
      setMediaAsset({ id: asset.id, state: asset.state, kind: asset.kind });
      if (asset.state === 'ready') setMediaPreview(URL.createObjectURL(await group07Service.postMediaContent(asset.id)));
      toast.success(asset.state === 'ready' ? 'Photo content is ready.' : 'Photo uploaded and is being prepared.');
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to upload this photo.'); }
    finally { setBusyId(''); }
  };
  const refreshMedia = async () => {
    if (!mediaAsset) return;
    try {
      const asset = await group07Service.postMedia(mediaAsset.id);
      setMediaAsset({ id: asset.id, kind: asset.kind, state: asset.state });
      if (asset.state === 'ready') { if (mediaPreview) URL.revokeObjectURL(mediaPreview); setMediaPreview(URL.createObjectURL(await group07Service.postMediaContent(asset.id))); }
      if (asset.state === 'rejected') toast.error('The uploaded content did not pass the supported format checks.');
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to refresh photo status.'); }
  };
  const createDraft = async (event: FormEvent) => {
    event.preventDefault(); if (!caption.trim() || !mediaAsset || mediaAsset.state !== 'ready' || busyId) return;
    const words = hashtags.split(',').map((word) => word.trim().replace(/^#/, '')).filter(Boolean);
    if (contentKind === 'client_story' && !consentDocumentId) { toast.error('Choose a signed client-story consent document.'); return; }
    if (activeProfile?.kind.endsWith('_partner') || activeProfile?.kind.endsWith('_agent')) if (!selectedServiceKey) { toast.error('Choose the approved service this post relates to.'); return; }
    setBusyId('post');
    try {
      const draft = await group07Service.createPost({ caption: caption.trim(), contentKind, ...(contentKind === 'client_story' ? { clientStoryConsentDocumentId: consentDocumentId } : {}), hashtags: words, mediaIds: [mediaAsset.id], commentsEnabled: true, ...(selectedServiceKey ? { serviceKey: selectedServiceKey } : {}) });
      setMyPosts((current) => [draft, ...current]); setCaption(''); setHashtags(''); setContentKind('general'); setConsentDocumentId(''); setMediaAsset(null); setMediaPreview(''); toast.success('Post draft saved.');
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to save the post draft.'); }
    finally { setBusyId(''); }
  };
  const submitDraft = async (post: Group07PrivatePost) => {
    if (busyId) return; setBusyId(post.id);
    try { const updated = await group07Service.submitPost(post.id, post.version); setMyPosts((old) => old.map((item) => item.id === post.id ? updated : item)); toast.success('Post submitted for independent review.'); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to submit this post. Refresh its current state before retrying.'); }
    finally { setBusyId(''); }
  };
  const tabOptions: Tab[] = useMemo(() => isAuthenticated ? ['feed', 'explore', 'following', ...(canAuthor ? ['my-posts' as const] : [])] : ['feed', 'explore'], [isAuthenticated, canAuthor]);

  return <PublicLayout><main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">REALTIQ Community</p><h1 className="mt-2 text-3xl font-black">Property stories and updates</h1><p className="mt-1 text-secondary">Posts stay on REALTIQ, are moderated before publication and show paid placements separately.</p></div>{canAuthor ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setTab('my-posts')} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary">Create a post</button><Link to="/dashboard/community-tools" className="rounded-lg border bg-white px-4 py-2 font-bold">Sharing & Growth</Link></div> : null}</header>
    <nav aria-label="Community sections" className="flex flex-wrap gap-2">{tabOptions.map((option) => <button key={option} onClick={() => setTab(option)} aria-current={tab === option ? 'page' : undefined} className={`rounded-full px-4 py-2 font-bold capitalize ${tab === option ? 'bg-primary text-on-primary' : 'border bg-white'}`}>{option === 'my-posts' ? 'My posts' : option === 'feed' ? 'Latest posts' : option === 'explore' ? 'Explore' : 'Following updates'}</button>)}</nav>
    {error ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-950">{safeCommunityMessage(error, 'Community content is unavailable.')}</p> : null}
    {loading ? <p role="status">Loading posts…</p> : null}
    {!loading && tab === 'my-posts' ? <section className="space-y-6">
      <form onSubmit={(event) => void createDraft(event)} className="space-y-4 rounded-2xl border bg-white p-5"><div><h2 className="text-xl font-black">Create a post draft</h2><p className="text-sm text-secondary">Upload a photo into private custody, preview it, then send the draft for independent moderation.</p></div><label className="block text-sm font-bold">Photo<input className="mt-1 block w-full rounded-lg border p-3 font-normal" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void uploadPhoto(file); event.currentTarget.value = ''; }} /></label>{mediaAsset ? <div className="rounded-lg bg-surface-container-low p-3"><p className="text-sm">Photo status: <strong className="capitalize">{mediaAsset.state.replaceAll('_', ' ')}</strong></p>{mediaPreview ? <img src={mediaPreview} alt="Private photo preview" className="mt-3 max-h-72 rounded-lg object-contain"/> : null}{mediaAsset.state !== 'ready' ? <button type="button" onClick={() => void refreshMedia()} className="mt-2 font-bold underline">Refresh content status</button> : null}</div> : null}
        <label className="block text-sm font-bold">Caption<textarea required rows={4} value={caption} onChange={(event) => setCaption(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" placeholder="Write an on-platform caption"/></label>
        <label className="block text-sm font-bold">Hashtags, separated by commas<input value={hashtags} onChange={(event) => setHashtags(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" placeholder="Property, architecture"/></label>
        <label className="block text-sm font-bold">Post type<select value={contentKind} onChange={(event) => setContentKind(event.target.value as 'general' | 'client_story')} className="mt-1 block rounded-lg border p-3 font-normal"><option value="general">General post</option><option value="client_story">Client story</option></select></label>
        {contentKind === 'client_story' ? <label className="block text-sm font-bold">Signed client consent<select required value={consentDocumentId} onChange={(event) => setConsentDocumentId(event.target.value)} className="mt-1 block w-full rounded-lg border p-3 font-normal"><option value="">Choose a current signed consent document</option>{consents.map((document) => <option key={document.id} value={document.id}>{safeCommunityMessage(document.title, 'Signed consent document')}</option>)}</select><span className="mt-1 block text-xs font-normal text-secondary">The signed Document Manager record is checked again by the server. Its details do not appear publicly.</span></label> : null}
        {serviceKeys.length ? <label className="block text-sm font-bold">Partner service<select value={selectedServiceKey} onChange={(event) => setSelectedServiceKey(event.target.value)} className="mt-1 block rounded-lg border p-3 font-normal"><option value="">Choose an approved service</option>{serviceKeys.map((item) => <option key={item.serviceKey} value={item.serviceKey}>{item.label}</option>)}</select></label> : null}
        <button disabled={busyId !== '' || !mediaAsset || mediaAsset.state !== 'ready' || !caption.trim()} className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-50">Save draft</button>
      </form>
      <div className="space-y-3">{myPosts.map((post) => <article key={post.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{safeCommunityMessage(post.caption, 'Post without a caption')}</h3><span className="rounded-full bg-surface-container-low px-3 py-1 text-sm capitalize">{post.state.replaceAll('_', ' ')}</span></div>{post.reviewReason ? <p className="mt-2 text-sm text-secondary">Review note: {safeCommunityMessage(post.reviewReason, '')}</p> : null}{post.publicationErrorCode ? <p role="alert" className="mt-2 text-sm">Content could not be prepared. The server reported a processing issue; refresh this post for current status.</p> : null}<div className="mt-3 flex flex-wrap gap-3">{post.state === 'draft' || post.state === 'rejected' ? <button disabled={busyId !== ''} onClick={() => void submitDraft(post)} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary">Submit for moderation</button> : null}{post.mediaIds.length ? <span className="self-center text-sm text-secondary">{post.mediaIds.length} photo attached · private author preview</span> : null}</div></article>)}{!myPosts.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No drafts or posts yet.</p> : null}</div>
    </section> : null}
    {!loading && tab === 'explore' ? <section><h2 className="mb-3 text-xl font-black">Sponsored</h2>{sponsored.length ? <div className="mb-7 grid gap-4 md:grid-cols-2">{sponsored.map((post) => <PostCard key={`sponsored-${post.id}`} post={post} sponsored viewer={false} engagement={null} onEngagement={() => undefined} comments={[]} commentDraft="" setCommentDraft={() => undefined} onComments={() => undefined} onComment={() => undefined} reportDraft={{ reason: 'spam', details: '' }} setReportDraft={() => undefined} onReport={() => undefined} busy={false} />)}</div> : <p className="mb-7 rounded-xl bg-surface-container-low p-4 text-sm">No sponsored posts are currently available.</p>}{feedState === 'newest_fallback' ? <p className="mb-3 rounded-lg bg-surface-container-low p-3 text-sm">Explore ranking is unavailable, so posts are shown in newest-first order.</p> : null}<PostList posts={posts} isAuthenticated={isAuthenticated} engagement={engagement} busyId={busyId} comments={comments} commentDraft={commentDraft} setCommentDraft={(id, value) => setCommentDraft((current) => ({ ...current, [id]: value }))} onEngagement={changeEngagement} onComments={reloadComments} onComment={submitComment} reportDraft={reportDraft} setReportDraft={(id, value) => setReportDraft((current) => ({ ...current, [id]: value }))} onReport={reportPost}/></section> : null}
    {!loading && tab === 'feed' ? <PostList posts={posts} isAuthenticated={isAuthenticated} engagement={engagement} busyId={busyId} comments={comments} commentDraft={commentDraft} setCommentDraft={(id, value) => setCommentDraft((current) => ({ ...current, [id]: value }))} onEngagement={changeEngagement} onComments={reloadComments} onComment={submitComment} reportDraft={reportDraft} setReportDraft={(id, value) => setReportDraft((current) => ({ ...current, [id]: value }))} onReport={reportPost}/> : null}
    {!loading && tab === 'following' ? <FollowingItems items={feedItems}/> : null}
    {cursor && !loading && tab !== 'my-posts' ? <button onClick={() => void load(false)} className="rounded-lg border bg-white px-5 py-3 font-bold">{tab === 'following' ? 'Load older followed updates' : 'Load more'}</button> : null}
    {tab === 'following' && cursor && !loading ? <button onClick={() => void load(false)} className="rounded-lg border bg-white px-5 py-3 font-bold">Load older followed updates</button> : null}
  </main></PublicLayout>;
}

function PostList({ posts, isAuthenticated, engagement, busyId, comments, commentDraft, setCommentDraft, onEngagement, onComments, onComment, reportDraft, setReportDraft, onReport }: { posts: Group07PublicPost[]; isAuthenticated: boolean; engagement: Record<string, Engagement>; busyId: string; comments: Record<string, Array<{ id: string; text: string; createdAt: string }>>; commentDraft: Record<string, string>; setCommentDraft: (id: string, value: string) => void; onEngagement: (post: Group07PublicPost, kind: 'like' | 'save' | 'share') => void; onComments: (id: string) => void; onComment: (id: string) => void; reportDraft: Record<string, { reason: string; details: string }>; setReportDraft: (id: string, value: { reason: string; details: string }) => void; onReport: (post: Group07PublicPost) => void }) {
  if (!posts.length) return <p className="rounded-xl border border-dashed bg-white p-6 text-secondary">No published community posts are available right now.</p>;
  return <section className="space-y-4">{posts.map((post) => <PostCard key={post.id} post={post} viewer={isAuthenticated} engagement={engagement[post.id] ?? null} comments={comments[post.id] ?? []} commentDraft={commentDraft[post.id] ?? ''} setCommentDraft={(value) => setCommentDraft(post.id, value)} onComments={() => onComments(post.id)} onEngagement={(kind) => onEngagement(post, kind)} onComment={() => onComment(post.id)} reportDraft={reportDraft[post.id] ?? { reason: 'spam', details: '' }} setReportDraft={(value) => setReportDraft(post.id, value)} onReport={() => onReport(post)} busy={busyId === post.id}/>)}</section>;
}

function PostCard({ post, sponsored = false, viewer, engagement, comments, commentDraft, setCommentDraft, onComments, onEngagement, onComment, reportDraft, setReportDraft, onReport, busy }: { post: Group07PublicPost; sponsored?: boolean; viewer: boolean; engagement: Engagement | null; comments: Array<{ id: string; text: string; createdAt: string }>; commentDraft: string; setCommentDraft: (value: string) => void; onComments: () => void; onEngagement: (kind: 'like' | 'save' | 'share') => void; onComment: () => void; reportDraft: { reason: string; details: string }; setReportDraft: (value: { reason: string; details: string }) => void; onReport: () => void; busy: boolean }) {
  const media = post.media[0];
  return <article className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 p-4"><div><Link to={`/profiles/${encodeURIComponent(post.author.profileId ?? '')}`} className="font-black text-primary hover:underline">{safeCommunityMessage(post.author.name, 'REALTIQ member')}</Link><p className="text-xs text-secondary">{safeCommunityMessage(post.author.roleLabel, '')} · {new Date(post.publishedAt).toLocaleDateString('en-GB')}</p></div>{sponsored || post.sponsored ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black">Sponsored</span> : null}{post.author.verified ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold">Verified</span> : null}</div>{media ? media.kind === 'short_video' || media.kind === 'walkthrough' ? <video controls muted playsInline poster={media.coverUrl ?? undefined} className="max-h-[34rem] w-full bg-black" src={media.url}/> : <img className="max-h-[34rem] w-full bg-surface-container-low object-contain" src={media.url} alt={safeCommunityMessage(media.captionText, 'Post image')} referrerPolicy="no-referrer"/> : null}<div className="space-y-4 p-4"><p className="whitespace-pre-wrap">{safeCommunityMessage(post.caption, 'Post without a caption')}</p>{post.hashtags.length ? <p className="text-sm text-primary">{post.hashtags.map((tag) => `#${tag}`).join(' ')}</p> : null}{post.tag?.route ? <Link to={post.tag.route} className="font-bold text-primary underline">{safeCommunityMessage(post.tag.title, 'View related item')}</Link> : null}{post.sponsorship?.clickPath ? <a href={post.sponsorship.clickPath} rel="noreferrer" className="inline-block rounded-lg bg-amber-100 px-4 py-2 font-bold">Sponsored · View</a> : null}
      {viewer ? <div className="flex flex-wrap gap-2 border-t pt-3"><button disabled={busy} onClick={() => onEngagement('like')} className="rounded-lg border px-3 py-2 text-sm font-bold">{engagement?.liked ? 'Liked' : 'Like'}</button><button disabled={busy} onClick={() => onEngagement('save')} className="rounded-lg border px-3 py-2 text-sm font-bold">{engagement?.saved ? 'Saved' : 'Save'}</button><button disabled={busy} onClick={() => onEngagement('share')} className="rounded-lg border px-3 py-2 text-sm font-bold">{engagement?.shared ? 'Shared' : 'Share'}</button><button onClick={onComments} className="rounded-lg border px-3 py-2 text-sm font-bold">Show comments</button></div> : null}
      {comments.length || commentDraft ? <div className="space-y-2">{comments.map((comment) => <p key={comment.id} className="rounded-lg bg-surface-container-low p-3 text-sm">{safeCommunityMessage(comment.text, '')}</p>)}{viewer && post.commentsEnabled ? <div className="flex gap-2"><input aria-label="Write a comment" maxLength={2000} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border p-2"/><button disabled={busy || !commentDraft.trim()} onClick={onComment} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">Submit</button></div> : null}</div> : null}
      {viewer ? <details className="text-sm"><summary className="cursor-pointer font-bold">Report this post</summary><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select value={reportDraft.reason} onChange={(event) => setReportDraft({ ...reportDraft, reason: event.target.value })} className="rounded border p-2"><option value="fraud_scam">Fraud or scam</option><option value="fake_misleading_listing">Misleading information</option><option value="impersonation">Impersonation</option><option value="harassment_abuse">Harassment or abuse</option><option value="off_platform_contact">Off-platform contact</option><option value="spam">Spam</option><option value="other">Other</option></select>{reportDraft.reason === 'other' ? <input value={reportDraft.details} onChange={(event) => setReportDraft({ ...reportDraft, details: event.target.value })} className="rounded border p-2" placeholder="Explain briefly"/> : null}<button disabled={busy || reportDraft.reason === 'other' && !reportDraft.details.trim()} onClick={onReport} className="rounded border px-3 py-2 font-bold">Send report</button></div></details> : null}
    </div></article>;
}

function FollowingItems({ items }: { items: Array<Record<string, unknown>> }) {
  if (!items.length) return <div className="rounded-xl border border-dashed bg-white p-8 text-center text-secondary">No followed updates are available. Follow public profiles or projects to receive current on-platform notices.</div>;
  return <section className="space-y-3">{items.map((item, index) => {
    const post = item.post && typeof item.post === 'object' ? item.post as Group07PublicPost : null;
    const property = item.property && typeof item.property === 'object' ? item.property as Record<string, unknown> : null;
    return <article key={String(item.id ?? index)} className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-widest text-secondary">{String(item.kind ?? 'Update').replaceAll('_', ' ')}</p>{post ? <div className="mt-2"><p className="font-bold">{post.author.name}</p><p className="mt-1">{post.caption}</p><Link className="mt-2 inline-block font-bold text-primary underline" to={`/community`}>Open post feed</Link></div> : property ? <div className="mt-2"><Link className="font-black text-primary underline" to={`/properties/${encodeURIComponent(String(property.publicReference ?? property._id ?? ''))}`}>{String(property.title ?? 'Property update')}</Link><p className="mt-1 text-sm text-secondary">{String(item.title ?? property.location ?? '')}</p>{typeof item.milestone === 'string' ? <p className="mt-1 text-sm">{item.milestone}{typeof item.milestonePhase === 'string' ? ` · ${item.milestonePhase}` : ''}</p> : null}</div> : <p className="mt-2 text-sm">{String(item.title ?? 'A followed profile or project has an update.')}</p>}<time className="mt-2 block text-xs text-secondary">{typeof item.occurredAt === 'string' ? new Date(item.occurredAt).toLocaleString('en-GB') : ''}</time></article>;
  })}</section>;
}
