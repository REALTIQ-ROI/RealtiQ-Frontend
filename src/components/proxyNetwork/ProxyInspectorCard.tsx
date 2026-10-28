import { Link } from 'react-router-dom';
import type { PublicInspectorProfile } from '../../types/proxyNetwork';
import { formatLabel, publicInspectorDisplayName, refId } from '../../features/proxyNetwork/config';

const ProxyInspectorCard = ({ inspector, propertyId }: { inspector: PublicInspectorProfile; propertyId?: string }) => {
  const name = publicInspectorDisplayName(inspector.user);
  const profileId = typeof inspector._id === 'string' && inspector._id.trim() ? inspector._id.trim() : '';
  const inspectorUserId = refId(inspector.user);
  const ratingAverage = typeof inspector.ratingAverage === 'number' && Number.isFinite(inspector.ratingAverage)
    ? inspector.ratingAverage
    : null;
  const ratingCount = typeof inspector.ratingCount === 'number' && Number.isFinite(inspector.ratingCount)
    ? inspector.ratingCount
    : null;
  const completedJobs = typeof inspector.completedJobs === 'number' && Number.isFinite(inspector.completedJobs)
    ? inspector.completedJobs
    : null;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-outline-variant/20 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        {inspector.profilePhoto?.url ? <img src={inspector.profilePhoto.url} alt={`${name}'s profile`} className="h-16 w-16 rounded-full object-cover" /> : <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-xl font-black">{name[0]}</div>}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">RealtIQ Verified Property Agent</p>
          <h2 className="truncate text-xl font-extrabold">{name}</h2>
          <p className="text-sm text-secondary">{inspector.professionalTitle || formatLabel(inspector.professionalType)}</p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm text-secondary">{inspector.bio || 'Independent property inspection professional.'}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-xs text-secondary">Rating</dt><dd className="font-bold">{ratingAverage === null ? 'Not rated' : `${ratingAverage.toFixed(1)} / 5${ratingCount === null ? '' : ` (${ratingCount} reviews)`}`}</dd></div>
        <div><dt className="text-xs text-secondary">Completed jobs</dt><dd className="font-bold">{completedJobs ?? '—'}</dd></div>
        <div><dt className="text-xs text-secondary">Location</dt><dd>{[inspector.location?.city, inspector.location?.state].filter(Boolean).join(', ') || 'Not specified'}</dd></div>
        <div><dt className="text-xs text-secondary">Availability</dt><dd className="font-semibold">{formatLabel(inspector.availabilityStatus)}</dd></div>
      </dl>
      {inspector.serviceAreas?.length ? <p className="mt-3 text-xs text-secondary">Serves: {inspector.serviceAreas.join(', ')}</p> : null}
      {profileId ? <Link className="mt-auto pt-5 font-bold text-primary underline-offset-4 hover:underline" to={`/proxy-inspectors/${encodeURIComponent(profileId)}${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ''}`} state={inspectorUserId ? { inspectorUserId } : undefined}>View profile</Link> : <p className="mt-auto pt-5 text-sm text-secondary" role="note">Profile details are unavailable.</p>}
    </article>
  );
};
export default ProxyInspectorCard;
