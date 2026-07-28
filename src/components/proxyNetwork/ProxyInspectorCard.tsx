import { Link } from 'react-router-dom';
import type { PublicInspectorProfile } from '../../types/proxyNetwork';
import { formatLabel, refId } from '../../features/proxyNetwork/config';

const ProxyInspectorCard = ({ inspector, propertyId }: { inspector: PublicInspectorProfile; propertyId?: string }) => {
  const name = typeof inspector.user === 'string' ? 'Verified professional' : inspector.user.name;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-outline-variant/20 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        {inspector.profilePhoto?.url ? <img src={inspector.profilePhoto.url} alt={`${name}'s profile`} className="h-16 w-16 rounded-full object-cover" /> : <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-xl font-black">{name[0]}</div>}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">RealtiQ Verified Property Agent</p>
          <h2 className="truncate text-xl font-extrabold">{name}</h2>
          <p className="text-sm text-secondary">{inspector.professionalTitle || formatLabel(inspector.professionalType)}</p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm text-secondary">{inspector.bio || 'Independent property inspection professional.'}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-xs text-secondary">Rating</dt><dd className="font-bold">{inspector.ratingAverage.toFixed(1)} / 5 ({inspector.ratingCount})</dd></div>
        <div><dt className="text-xs text-secondary">Completed jobs</dt><dd className="font-bold">{inspector.completedJobs}</dd></div>
        <div><dt className="text-xs text-secondary">Location</dt><dd>{[inspector.location?.city, inspector.location?.state].filter(Boolean).join(', ') || 'Not specified'}</dd></div>
        <div><dt className="text-xs text-secondary">Availability</dt><dd className="font-semibold">{formatLabel(inspector.availabilityStatus)}</dd></div>
      </dl>
      {inspector.serviceAreas?.length ? <p className="mt-3 text-xs text-secondary">Serves: {inspector.serviceAreas.join(', ')}</p> : null}
      <Link className="mt-auto pt-5 font-bold text-primary underline-offset-4 hover:underline" to={`/proxy-inspectors/${inspector._id}${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ''}`} state={{ inspectorUserId: refId(inspector.user) }}>View profile</Link>
    </article>
  );
};
export default ProxyInspectorCard;
