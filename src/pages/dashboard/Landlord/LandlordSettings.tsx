import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import LandlordPortalLayout from '../../../components/layout/LandlordPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';

const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const formatLabel = (value?: string) =>
  value
    ? value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'N/A';

const LandlordSettings = () => {
  const { user, updateUser } = useAuth();
  const { data: profile, loading, error, execute } = useAsync(
    () => (user?._id ? userService.fetchUserById(user._id) : Promise.reject(new Error('Missing user id'))),
    Boolean(user?._id),
  );
  const account = profile ?? user;
  const [name, setName] = useState(account?.name ?? '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setName(account?.name ?? '');
    setPhone(account?.phone ?? '');
  }, [account]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }

    if (phone.trim() && !phoneRegex.test(phone.trim())) {
      setFormError('Enter a valid Nigerian phone number.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const updated = await userService.updateUser(user._id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      updateUser({ ...user, ...updated });
      toast.success('Settings saved successfully.');
      await execute();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LandlordPortalLayout active="settings" title="Settings">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">Account Management</p>
          <h2 className="text-4xl font-extrabold tracking-tight text-primary">Settings</h2>
          <p className="text-sm text-secondary mt-2">Manage your landlord profile, verification status, and contact details.</p>
        </div>

        {loading ? (
          <LoadingState label="Loading settings..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void execute()} />
        ) : (
          <form className="space-y-8" onSubmit={onSave}>
            <section className="bg-surface-container-lowest p-8 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-bold mb-1">Profile</h3>
                  <p className="text-sm text-secondary">Update the information shown across the landlord portal.</p>
                </div>
                <div className="md:col-span-2 space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Full Name</label>
                    <input
                      className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      type="text"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Email Address</label>
                      <input
                        className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 rounded-lg px-4 py-3 text-sm"
                        value={profile?.email ?? user?.email ?? ''}
                        readOnly
                        type="email"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Phone Number</label>
                      <input
                        className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="08012345678"
                        type="tel"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">Account Summary</h3>
                  <p className="text-sm text-secondary">These fields come from the signed-in landlord user object.</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${account?.landlordVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {account?.landlordVerified ? 'Landlord verified' : 'Landlord unverified'}
                </span>
              </div>
              <div className="mb-5 rounded-xl border border-outline-variant/10 bg-white/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">KYC Verification</p>
                    <p className="mt-1 text-sm text-secondary">
                      {account?.landlordVerified
                        ? 'Your verification is approved.'
                        : account?.kyc?.status === 'pending'
                          ? 'Your verification is under review.'
                          : 'Complete KYC to unlock property uploads.'}
                    </p>
                  </div>
                  <Link
                    to="/dashboard/landlord/settings/verification"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition-opacity"
                  >
                    Open Verification
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Role</p>
                  <p className="mt-2 text-base font-semibold capitalize">{account?.role ?? 'landlord'}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Email Verification</p>
                  <p className="mt-2 text-base font-semibold">{account?.emailVerified ? 'Verified' : 'Unverified'}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Trust Badge</p>
                  <p className="mt-2 text-base font-semibold capitalize">{formatLabel(account?.trustBadge)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-4 border border-outline-variant/10">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">KYC Status</p>
                  <p className="mt-2 text-base font-semibold">{formatLabel(account?.kyc?.status)}</p>
                  <p className="mt-1 text-xs text-secondary">Reviewed: {formatDate(account?.kyc?.reviewedAt)}</p>
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

            {formError ? <p className="text-error text-sm font-semibold">{formError}</p> : null}

            <div className="flex items-center justify-end gap-3">
              <button
                className="text-secondary text-sm font-semibold hover:text-primary transition-colors"
                type="button"
                onClick={() => {
                  setName(profile?.name ?? user?.name ?? '');
                  setPhone(profile?.phone ?? '');
                  setFormError(null);
                }}
              >
                Reset
              </button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </LandlordPortalLayout>
  );
};

export default LandlordSettings;
