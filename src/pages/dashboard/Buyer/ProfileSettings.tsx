import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import useHasScrolled from '../../../hooks/useHasScrolled';
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

const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const hasScrolled = useHasScrolled(8);
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
    <div className="bg-surface font-body text-on-surface antialiased">
      <aside className="fixed left-0 top-0 h-screen w-64 z-50 bg-white flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Curator</h1>
          <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">Premium Real Estate</p>
        </div>
        <nav className="flex-1 space-y-1">
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold font-headline" to="/dashboard/buyer"><span className="material-symbols-outlined">dashboard</span>Overview</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold font-headline" to="/dashboard/buyer/my-properties"><span className="material-symbols-outlined">domain</span>My Properties</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold font-headline" to="/dashboard/buyer/payment-history"><span className="material-symbols-outlined">payments</span>Payment History</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 text-sm font-semibold font-headline" to="/dashboard/buyer/inquiry-history"><span className="material-symbols-outlined">chat_bubble</span>Inquiry History</Link>
          <Link className="flex items-center gap-3 px-4 py-3 text-slate-900 bg-slate-100 rounded-md font-bold scale-98 transition-all text-sm font-headline" to="/dashboard/buyer/profile-settings"><span className="material-symbols-outlined">settings</span>Settings</Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100">
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold"><span className="material-symbols-outlined">help</span>Help Center</button>
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold" onClick={logout}><span className="material-symbols-outlined">logout</span>Logout</button>
        </div>
      </aside>

      <header
        className={`fixed top-0 w-full z-40 backdrop-blur-xl flex justify-between items-center px-8 h-16 ml-64 max-w-[calc(100%-16rem)] transition-all duration-200 ${
          hasScrolled ? 'bg-slate-50/95 border-b border-slate-200 shadow-lg shadow-slate-200/30' : 'bg-slate-50/75 border-b border-transparent'
        }`}
      >
        <div className="flex items-center gap-4"><span className="text-xl font-bold tracking-tighter text-slate-900 font-headline">Architectural Curator</span></div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-slate-500"><button className="hover:text-slate-900 transition-colors"><span className="material-symbols-outlined">notifications</span></button><button className="hover:text-slate-900 transition-colors"><span className="material-symbols-outlined">mail</span></button></div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {(profile?.name ?? user?.name ?? 'U').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="ml-64 pt-24 pb-20 px-12 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-secondary font-headline mb-2 block">Account Management</span>
            <h2 className="text-5xl font-extrabold font-headline text-primary tracking-tighter">Profile Settings</h2>
            <p className="mt-3 text-sm text-secondary max-w-2xl">
              Review the profile data tied to your buyer account. Email verification, trust badge, and activity counters are read-only here.
            </p>
          </div>

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
                        <input className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Email Address</label>
                          <input className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 rounded-lg px-4 py-3 text-sm" type="email" value={profile?.email ?? user?.email ?? ''} readOnly />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">Phone Number</label>
                          <input className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-surface-tint rounded-lg px-4 py-3 text-sm transition-all outline-none" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" />
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
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${account?.emailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
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
                <button className="text-secondary text-sm font-semibold hover:text-primary transition-colors" type="button" onClick={() => {
                  setName(profile?.name ?? user?.name ?? '');
                  setPhone(profile?.phone ?? '');
                  setFormError(null);
                }}>
                  Discard Changes
                </button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile Settings'}</Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings;
