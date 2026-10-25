import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import AccountSecuritySettings from '../../../components/profile/AccountSecuritySettings';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';
import DataProtectionRequests from '../../../components/profile/DataProtectionRequests';

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const formatLabel = (value?: string) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'N/A';

const ProfileSettings = () => {
  const { user } = useAuth();
  const { data: profile, loading, error, execute } = useAsync(
    () => (user?._id ? userService.fetchUserById(user._id) : Promise.reject(new Error('Missing user id'))),
    Boolean(user?._id),
  );
  const account = profile ?? user;

  return (
    <BuyerPortalLayout
      pageEyebrow="Account Management"
      pageTitle="Profile Settings"
      pageSubtitle="Review the profile data tied to your buyer account. Email verification, trust badge, and activity counters are read-only here."
    >
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <LoadingState label="Loading profile..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void execute()} />
        ) : (
          <form className="space-y-12" onSubmit={(event) => event.preventDefault()}>
            <section className="bg-surface-container-low p-8 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-bold font-headline mb-1">Personal Details</h3>
                  <p className="text-sm text-secondary leading-relaxed">Review your public identity and contact information.</p>
                </div>
                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Full Name</label>
                      <input
                        className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none"
                        type="text"
                        value={account?.name ?? ''}
                        readOnly
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Email Address</label>
                        <input
                          className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 rounded-lg px-4 py-3 text-sm"
                          type="email"
                          value={profile?.email ?? user?.email ?? ''}
                          readOnly
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Phone Number</label>
                        <input
                          className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none"
                          type="tel"
                          value={account?.phone ?? ''}
                          readOnly
                          placeholder="+2348012345678"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-bold font-headline mb-1">Account Summary</h3>
                  <p className="text-sm text-secondary">Verification and profile activity pulled from the logged-in user object.</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    account?.emailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {account?.emailVerified ? 'Email verified' : 'Email unverified'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Role</p>
                  <p className="mt-2 text-base font-semibold capitalize">{account?.role ?? 'buyer'}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Trust Badge</p>
                  <p className="mt-2 text-base font-semibold capitalize">{formatLabel(account?.trustBadge)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Rating Average</p>
                  <p className="mt-2 text-base font-semibold">{typeof account?.ratingAverage === 'number' ? account.ratingAverage.toFixed(1) : '0.0'}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Ratings Received</p>
                  <p className="mt-2 text-base font-semibold">{account?.ratingCount ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Favourites</p>
                  <p className="mt-2 text-base font-semibold">{account?.favourites?.length ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Saved Searches</p>
                  <p className="mt-2 text-base font-semibold">{account?.savedSearches?.length ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Recently Viewed</p>
                  <p className="mt-2 text-base font-semibold">{account?.recentlyViewed?.length ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Created</p>
                  <p className="mt-2 text-base font-semibold">{formatDate(account?.createdAt)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Updated</p>
                  <p className="mt-2 text-base font-semibold">{formatDate(account?.updatedAt)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Phone</p>
                  <p className="mt-2 text-base font-semibold">{account?.phone ?? 'Not set'}</p>
                </div>
              </div>
            </section>

          </form>
        )}
        {account ? <div className="mt-8"><AccountSecuritySettings user={account} /></div> : null}
        <div className="mt-8"><DataProtectionRequests /></div>
      </div>
    </BuyerPortalLayout>
  );
};

export default ProfileSettings;
