import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../contexts/AuthContext';
import { group07Service, type Group07PartnerProfile, type Group07PublicProfile, type Group07PublicReview } from '../../services/group07Service';

type Follower = { profileId: string; name: string; roleLabel: string; profileImageUrl?: string | null };
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const list = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(record) : [];

export default function PublicProfile() {
  const { profileId = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, activeProfile, token } = useAuth();
  const [profile, setProfile] = useState<Group07PublicProfile | null>(null);
  const [partner, setPartner] = useState<Group07PartnerProfile | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [reviews, setReviews] = useState<Group07PublicReview[]>([]);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof group07Service.profilePosts>>['posts']>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [followerCursor, setFollowerCursor] = useState<string | null>(null);
  const [reviewCursor, setReviewCursor] = useState<string | null>(null);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const load = async (reset = true) => {
    setLoading(true); setError('');
    try {
      const [core, followerPage, reviewPage, postPage] = await Promise.all([
        group07Service.publicProfile(profileId),
        group07Service.publicFollowers(profileId, reset ? null : followerCursor),
        group07Service.publicReviews(profileId, reset ? null : reviewCursor),
        group07Service.profilePosts(profileId, reset ? null : postCursor).catch(() => ({ posts: [], nextCursor: null })),
      ]);
      let partnerPage: Group07PartnerProfile | null = null;
      if (core.kind.endsWith('_partner') || core.kind.endsWith('_agent')) partnerPage = await group07Service.publicPartner(profileId);
      setProfile(core); setPartner(partnerPage);
      setFollowers((old) => reset ? followerPage.followers : [...old, ...followerPage.followers]);
      setReviews((old) => reset ? reviewPage.reviews : [...old, ...reviewPage.reviews]);
      setPosts((old) => reset ? postPage.posts : [...old, ...postPage.posts]);
      setAverage(reviewPage.average); setReviewCount(reviewPage.qualifyingReviewCount);
      setFollowerCursor(followerPage.nextCursor); setReviewCursor(reviewPage.nextCursor);
      setPostCursor(postPage.nextCursor);
    } catch (raw) { setError(raw instanceof Error ? raw.message : 'This profile is unavailable.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    setFollowing(null); setProfile(null); setPartner(null); setFollowers([]); setReviews([]); setPosts([]);
    void load(true);
    // Public profile is keyed by URL, while viewer state is scoped to the active profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, activeProfile?.id, token]);
  useEffect(() => {
    const clearViewerState = () => setFollowing(null);
    window.addEventListener('realtiq:session-changed', clearViewerState);
    return () => window.removeEventListener('realtiq:session-changed', clearViewerState);
  }, []);

  const toggleFollow = async () => {
    if (!isAuthenticated) { void navigate('/login'); return; }
    if (actionBusy) return;
    setActionBusy(true);
    try {
      if (following) { await group07Service.unfollowProfile(profileId); setFollowing(false); toast.success('Profile unfollowed.'); }
      else { await group07Service.followProfile(profileId); setFollowing(true); toast.success('Profile followed.'); }
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to update this follow.'); }
    finally { setActionBusy(false); }
  };

  const body = record(profile?.body);
  const listings = list(body.listings);
  const managedListings = list(body.managedListings);
  const projects = list(body.projects);
  const team = list(body.team);

  return <PublicLayout><main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8">
    {loading ? <LoadingState label="Loading public profile…" /> : null}
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    {!loading && !error && profile ? <>
      <header className="rounded-3xl border bg-white p-6 sm:p-9">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container-low text-2xl font-black text-primary">{profile.profileImageUrl ? <img src={profile.profileImageUrl} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}</div><div><p className="text-sm font-bold text-secondary">{profile.roleLabel}</p><h1 className="mt-1 text-3xl font-black">{profile.name}</h1><p className="mt-1 text-sm text-secondary">Member since {profile.memberSince ? new Date(profile.memberSince).toLocaleDateString('en-GB') : 'date not returned'}</p></div></div>
          {isAuthenticated && activeProfile && activeProfile.kind !== 'admin' ? <button disabled={actionBusy} onClick={() => void toggleFollow()} className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-60">{actionBusy ? 'Updating…' : following ? 'Following · Unfollow' : 'Follow profile'}</button> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{profile.verified ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-900" title="Verified by REALTIQ">Verified</span> : null}{profile.trust?.state === 'new' ? <span className="rounded-full bg-surface-container-low px-3 py-1 text-sm font-semibold">New to REALTIQ — building history</span> : profile.trust?.tier ? <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold capitalize">{profile.trust.tier} trust tier</span> : profile.trust?.state === 'unavailable' ? <span className="rounded-full bg-surface-container-low px-3 py-1 text-sm">Trust details currently unavailable</span> : null}{profile.rating?.average != null ? <span className="rounded-full bg-surface-container-low px-3 py-1 text-sm font-bold">{profile.rating.average.toFixed(1)} average · {profile.rating.qualifyingReviewCount} reviews</span> : <span className="rounded-full bg-surface-container-low px-3 py-1 text-sm">Rating not yet available</span>}</div>
        {profile.trust?.state === 'established' && profile.trust.score != null ? <p className="mt-3 text-sm text-secondary">Trust score: {profile.trust.score}. This reflects current source-backed platform activity and is separate from verification.</p> : null}
        <p className="mt-4 text-sm text-secondary">{profile.counts?.followers ?? 0} followers · {profile.counts?.following ?? 0} following</p>
      </header>

      {profile.kind === 'buyer' ? <p className="rounded-xl border bg-white p-5 text-sm text-secondary">This profile shares only the information the account holder has chosen to make public.</p> : null}
      {(body.kind === 'owner' || body.kind === 'agency') ? <section className="space-y-3"><div><h2 className="text-2xl font-black">{body.kind === 'agency' ? 'Managed listings' : 'Properties'}</h2>{body.state === 'unavailable' || body.managedListingsState === 'unavailable' ? <p role="status" className="mt-1 text-sm text-secondary">Property previews are currently unavailable.</p> : null}</div><PublicCards items={body.kind === 'agency' ? managedListings : listings} kind="property" /></section> : null}
      {profile.kind === 'agency' && team.length ? <section><h2 className="text-2xl font-black">Team</h2><ul className="mt-3 grid gap-3 sm:grid-cols-2">{team.map((member, index) => <li key={`${String(member.name)}-${index}`} className="rounded-xl border bg-white p-4"><p className="font-bold">{String(member.name ?? 'Team member')}</p><p className="text-sm text-secondary">{String(member.role ?? '')}</p></li>)}</ul></section> : null}
      {body.kind === 'developer' ? <section className="space-y-3"><div><h2 className="text-2xl font-black">Projects</h2>{body.projectsState === 'unavailable' ? <p role="status" className="mt-1 text-sm text-secondary">Project previews are currently unavailable.</p> : null}</div><PublicCards items={projects} kind="project" /></section> : null}

      <section className="space-y-3"><div><h2 className="text-2xl font-black">Public posts</h2><p className="text-sm text-secondary">Only posts currently approved and visible to the public are shown.</p></div>{posts.length ? <div className="grid gap-4 md:grid-cols-2">{posts.map((post) => <article key={post.id} className="overflow-hidden rounded-xl border bg-white"><div className="p-4"><p className="whitespace-pre-wrap">{post.caption}</p>{post.hashtags.length ? <p className="mt-2 text-sm text-primary">{post.hashtags.map((tag) => `#${tag}`).join(' ')}</p> : null}</div><div className="grid gap-1">{post.media.map((media) => media.kind === 'short_video' || media.kind === 'walkthrough' ? <video key={media.id} controls playsInline poster={media.coverUrl ?? undefined} src={media.url} className="max-h-96 w-full bg-black" /> : <img key={media.id} src={media.url} alt={media.captionText || 'Public post media'} referrerPolicy="no-referrer" className="max-h-96 w-full bg-surface-container-low object-contain" />)}</div>{post.tag?.route ? <Link to={post.tag.route} className="m-4 inline-block font-bold text-primary underline">{post.tag.title ?? 'View related item'}</Link> : null}</article>)}</div> : <p className="rounded-xl border border-dashed bg-white p-5 text-secondary">No public posts are available.</p>}{postCursor ? <button className="font-bold text-primary underline" onClick={() => void load(false)}>Load more posts</button> : null}</section>

      {partner ? <PartnerProfileDetails details={partner} /> : null}
      <div className="grid gap-7 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Followers</h2><p className="text-sm text-secondary">Only profiles that are currently visible are shown.</p></div><span className="text-sm">{profile.counts?.followers ?? 0}</span></div><ul className="mt-4 space-y-2">{followers.map((follower) => <li key={follower.profileId} className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-white font-bold">{follower.name.slice(0, 1)}</div><div><p className="font-bold">{follower.name}</p><p className="text-xs text-secondary">{follower.roleLabel}</p></div></li>)}</ul>{!followers.length ? <p className="mt-4 text-sm text-secondary">No public followers to show.</p> : null}{followerCursor ? <button className="mt-4 font-bold text-primary underline" onClick={() => void load(false)}>Load more followers</button> : null}</section>
        <section className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Reviews</h2><p className="text-sm text-secondary">Only currently eligible reviews are shown.</p></div><span className="text-sm">{reviewCount} qualifying</span></div>{average !== null ? <p className="mt-2 font-bold">Average rating {average.toFixed(1)} out of 5</p> : <p className="mt-2 text-sm text-secondary">An average appears after enough qualifying reviews.</p>}<ul className="mt-4 space-y-3">{reviews.map((review) => <li key={review.id} className="rounded-lg bg-surface-container-low p-4"><div className="flex items-center justify-between"><strong>{review.rating ? `${review.rating}/5` : 'Review'}</strong><time className="text-xs text-secondary">{new Date(review.createdAt).toLocaleDateString('en-GB')}</time></div>{review.comment ? <p className="mt-2 whitespace-pre-wrap">{review.comment}</p> : null}{review.reply ? <div className="mt-3 border-l-2 border-primary pl-3"><p className="text-xs font-bold uppercase">Response</p><p className="mt-1">{review.reply.text}</p></div> : null}</li>)}</ul>{!reviews.length ? <p className="mt-4 text-sm text-secondary">No public reviews to show.</p> : null}{reviewCursor ? <button className="mt-4 font-bold text-primary underline" onClick={() => void load(false)}>Load more reviews</button> : null}</section>
      </div>
    </> : null}
  </main></PublicLayout>;
}

function PublicCards({ items, kind }: { items: Record<string, unknown>[]; kind: 'property' | 'project' }) {
  if (!items.length) return <p className="rounded-xl border border-dashed p-6 text-secondary">No public {kind === 'property' ? 'listings' : 'projects'} to show.</p>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => {
    const title = String(item.title ?? item.name ?? 'Property');
    const slugOrReference = String(item.publicReference ?? item.slug ?? item.id ?? item._id ?? index);
    const href = kind === 'project' ? `/projects/${encodeURIComponent(String(item.slug ?? slugOrReference))}` : `/properties/${encodeURIComponent(slugOrReference)}`;
    const handover = record(item.handoverSchedule);
    return <article key={`${kind}-${slugOrReference}`} className="overflow-hidden rounded-xl border bg-white"><Link to={href} className="block p-4"><h3 className="font-black text-primary">{title}</h3><p className="mt-1 text-sm text-secondary">{String(item.location ?? item.area ?? '')}</p>{kind === 'project' && typeof handover.currentMonth === 'string' ? <p className="mt-3 text-xs">Projected handover: {handover.currentMonth}{handover.historyAvailable === false ? ' · Original promise unknown' : handover.revised === true ? ' · Revised' : ''}</p> : null}<span className="mt-3 inline-block text-sm font-bold">View {kind}</span></Link></article>;
  })}</div>;
}

function PartnerProfileDetails({ details }: { details: Group07PartnerProfile }) {
  return <section className="rounded-2xl border bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Partner services</p><h2 className="mt-1 text-2xl font-black">{details.profile.roleLabel}</h2><p className="mt-2 max-w-3xl whitespace-pre-wrap text-secondary">{details.about}</p></div><div className="rounded-xl bg-surface-container-low p-3 text-sm"><strong>Availability</strong><p className="capitalize">{details.availability.status}</p>{details.availability.nextAvailableAt ? <p>Next available {new Date(details.availability.nextAvailableAt).toLocaleString('en-GB')}</p> : null}</div></div><div className="mt-5 grid gap-3 md:grid-cols-2">{details.services.map((service) => <article key={service.id} className="rounded-xl border p-4"><h3 className="font-bold">{service.label}</h3><p className="mt-1 text-sm">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: service.currency, maximumFractionDigits: 0 }).format(service.rateMinor / 100)} · {service.turnaroundHours} hours</p><p className="mt-1 text-sm text-secondary">Payment: {service.paymentTerm.replaceAll('_', ' ')}</p>{service.observational ? <p className="mt-2 text-xs text-amber-900">Observational visit, not a technical inspection.</p> : null}{!service.bookable ? <p className="mt-2 rounded bg-amber-50 p-2 text-sm">Not bookable right now. The current service availability must be confirmed before a request.</p> : null}</article>)}</div><p className="mt-5 rounded-lg bg-surface-container-low p-3 text-sm">Independent third-party professional. Proxy visits or handover attendance are observational only; they do not certify condition, title or construction quality.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{details.credentials.map((credential) => <div key={`${credential.kind}-${credential.label}`} className="rounded-lg border p-3"><p className="font-bold">{credential.label}</p>{credential.issuerName ? <p className="text-sm">Issuer: {credential.issuerName}</p> : null}<p className="mt-1 text-xs text-secondary capitalize">{credential.status}{credential.expiresAt ? ` · expires ${new Date(credential.expiresAt).toLocaleDateString('en-GB')}` : ''}</p></div>)}</div>{details.indemnityInsurance?.held ? <p className="mt-3 text-sm">Professional indemnity insurance: {details.indemnityInsurance.status ?? 'status not returned'}{details.indemnityInsurance.issuerName ? ` · ${details.indemnityInsurance.issuerName}` : ''}</p> : null}</section>;
}
