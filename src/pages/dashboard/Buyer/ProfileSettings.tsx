import { useEffect, useState, type FormEvent } from 'react';
import BuyerPortalLayout from '../../../components/layout/BuyerPortalLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';
import { toast } from 'sonner';

const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;

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
  const [name, setName] = useState(account?.name ?? '');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      localStorage.setItem('user', JSON.stringify({ ...user, ...updated }));
      toast.success('Profile updated successfully.');
      await execute();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

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
          <form className="space-y-12" onSubmit={onSave}>
            <section className="bg-surface-container-low p-8 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-bold font-headline mb-1">Personal Details</h3>
                  <p className="text-sm text-secondary leading-relaxed">Update your public identity and contact information.</p>
                </div>
                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Full Name</label>
                      <input
                        className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="08012345678"
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

            {formError ? <p className="text-error text-sm font-semibold">{formError}</p> : null}

            <div className="flex items-center justify-end gap-6 pt-2">
              <button
                className="text-secondary text-sm font-semibold hover:text-primary transition-colors"
                type="button"
                onClick={() => {
                  setName(profile?.name ?? user?.name ?? '');
                  setPhone(profile?.phone ?? '');
                  setFormError(null);
                }}
              >
                Discard Changes
              </button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile Settings'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </BuyerPortalLayout>
  );
};

export default ProfileSettings;
