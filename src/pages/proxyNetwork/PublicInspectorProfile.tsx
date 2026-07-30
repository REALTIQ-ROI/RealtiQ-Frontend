import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { formatLabel, refId } from '../../features/proxyNetwork/config';
import { useProxyResource } from '../../features/proxyNetwork/useProxyResource';
import { proxyNetworkService } from '../../services/proxyNetworkService';

const PublicInspectorProfilePage = () => {
  const { profileId = '' } = useParams(); const location = useLocation(); const [params] = useSearchParams(); const { user } = useAuth();
  const resource = useProxyResource((signal) => proxyNetworkService.getPublicInspector(profileId, signal), [profileId]);
  if (resource.loading) return <PublicLayout><LoadingState /></PublicLayout>;
  if (resource.status === 404) return <PublicLayout><div className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-3xl font-black">Inspector not found</h1><p className="mt-3 text-secondary">This professional is not currently available in the public directory.</p><Link className="mt-6 inline-block font-bold underline" to="/proxy-inspectors">Browse inspectors</Link></div></PublicLayout>;
  if (resource.error || !resource.data) return <PublicLayout><ErrorState message={resource.error?.message || 'Unable to load inspector.'} onRetry={() => void resource.reload()} /></PublicLayout>;
  const profile = resource.data; const name = typeof profile.user === 'string' ? 'Verified professional' : profile.user.name;
  const inspectorUserId = refId(profile.user) || (location.state as { inspectorUserId?: string } | null)?.inspectorUserId || '';
  const propertyQuery = params.get('propertyId') ? `&propertyId=${encodeURIComponent(params.get('propertyId')!)}` : '';
  const hirePath = `/buyer/proxy-inspections/new?inspectorId=${encodeURIComponent(inspectorUserId)}${propertyQuery}`;
  return <PublicLayout><main className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
    <Link to="/proxy-inspectors" className="text-sm font-bold">← Inspector directory</Link>
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm sm:p-10">
      <div className="flex flex-col gap-6 sm:flex-row">
        {profile.profilePhoto?.url ? <img src={profile.profilePhoto.url} alt={`${name}'s profile`} className="h-32 w-32 rounded-2xl object-cover" /> : null}
        <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">RealtiQ Verified Property Agent</p><h1 className="mt-2 text-4xl font-black">{name}</h1><p className="mt-2 text-lg text-secondary">{profile.professionalTitle || formatLabel(profile.professionalType)}</p><p className="mt-3">{profile.ratingAverage.toFixed(1)} / 5 · {profile.ratingCount} reviews · {profile.completedJobs} completed jobs</p></div>
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_18rem]"><div><h2 className="text-xl font-bold">About</h2><p className="mt-3 whitespace-pre-wrap text-secondary">{profile.bio || 'No biography provided.'}</p><h2 className="mt-8 text-xl font-bold">Professional coverage</h2><p className="mt-3 text-secondary">{profile.yearsOfExperience ? `${profile.yearsOfExperience} years of experience · ` : ''}{[profile.location?.city, profile.location?.state, profile.location?.country].filter(Boolean).join(', ')}</p>{profile.specialties?.length ? <p className="mt-2 text-secondary">Specialties: {profile.specialties.join(', ')}</p> : null}{profile.serviceAreas?.length ? <p className="mt-2 text-secondary">Service areas: {profile.serviceAreas.join(', ')}</p> : null}</div>
      <aside className="rounded-xl bg-surface-container-low p-5"><h2 className="font-bold">Request an inspection</h2><p className="mt-2 text-sm text-secondary">Choose an approved, available property and specify the recorded evidence and report you need.</p>{user?.role === 'landlord' || user?.role === 'admin' || user?.role === 'proxy_inspector' ? <p className="mt-4 text-sm font-semibold">Only a Buyer can hire a RealtiQ Verified Property Agent.</p> : <Link to={user?.role === 'buyer' ? hirePath : '/login'} state={user ? { inspectorName: name } : { redirectTo: hirePath, inspectorName: name }} className="mt-5 block rounded-lg bg-primary px-4 py-3 text-center text-sm font-bold text-on-primary">{user?.role === 'buyer' ? 'Request inspection' : 'Log in as Buyer to hire'}</Link>}<p className="mt-4 text-xs text-secondary">RealtiQ Verified Property Agents are independent third parties and are not RealtiQ employees. This service uses recorded media; it does not include live video or calls.</p></aside></div>
    </section>
  </main></PublicLayout>;
};
export default PublicInspectorProfilePage;
