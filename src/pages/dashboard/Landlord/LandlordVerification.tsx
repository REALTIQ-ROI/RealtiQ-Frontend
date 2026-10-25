import { Link } from 'react-router-dom';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { profileService } from '../../../services/profileService';

const formatStatus = (value?: string) => value
  ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not submitted';

const formatDate = (date?: string | null) => date
  ? new Date(date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Not reviewed';

const LandlordVerification = () => {
  const { activeProfile } = useAuth();
  const { data, loading, error, execute } = useAsync(
    () => activeProfile
      ? profileService.current(activeProfile.id)
      : Promise.reject(new Error('Select an authorized profile to view verification.')),
    Boolean(activeProfile),
    activeProfile?.id,
  );
  const profile = data?.profile ?? activeProfile;

  return (
    <LandlordPortalLayout active="verification" title="Profile Verification">
      <main className="mx-auto max-w-6xl space-y-8 p-8 lg:p-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Profile compliance</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-primary">Verification</h1>
            <p className="mt-2 max-w-2xl text-sm text-secondary">Verification belongs to your selected profile and is reviewed through protected case evidence.</p>
          </div>
          <Link to="/dashboard/landlord/settings" className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Settings
          </Link>
        </header>

        {loading ? <LoadingState label="Loading profile verification..." /> : null}
        {error ? <ErrorState message={error} onRetry={() => void execute()} /> : null}
        {!loading && !error && profile ? (
          <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 lg:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Current profile</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{profile.name}</h2>
            <dl className="mt-6 grid gap-4 text-sm md:grid-cols-3">
              <div className="rounded-xl bg-white/70 p-4">
                <dt className="text-xs font-bold uppercase tracking-wider text-secondary">Verification status</dt>
                <dd className="mt-2 font-semibold">{formatStatus(profile.verification?.status)}</dd>
              </div>
              <div className="rounded-xl bg-white/70 p-4">
                <dt className="text-xs font-bold uppercase tracking-wider text-secondary">Profile status</dt>
                <dd className="mt-2 font-semibold">{formatStatus(profile.status)}</dd>
              </div>
              <div className="rounded-xl bg-white/70 p-4">
                <dt className="text-xs font-bold uppercase tracking-wider text-secondary">Last reviewed</dt>
                <dd className="mt-2 font-semibold">{formatDate(profile.verification?.reviewedAt)}</dd>
              </div>
            </dl>
            <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              Evidence upload and case submission are unavailable until the protected evidence metadata, case submission body and one-use security challenge exchange are documented. Identity files must not be uploaded as public property media.
            </p>
          </section>
        ) : null}
      </main>
    </LandlordPortalLayout>
  );
};

export default LandlordVerification;
