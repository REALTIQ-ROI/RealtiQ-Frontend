import { useEffect, useState, type FormEvent } from 'react';
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

const LandlordSettings = () => {
  const { user } = useAuth();
  const { data: profile, loading, error, execute } = useAsync(
    () => (user?._id ? userService.fetchUserById(user._id) : Promise.reject(new Error('Missing user id'))),
    Boolean(user?._id),
  );
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

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
          <p className="text-sm text-secondary mt-2">Manage your landlord profile and contact details.</p>
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
              <h3 className="text-lg font-bold mb-5">Account Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p>
                  <strong>Role:</strong> <span className="capitalize">{profile?.role ?? user?.role}</span>
                </p>
                <p>
                  <strong>Verification:</strong> {profile?.isVerified ? 'Verified' : 'Unverified'}
                </p>
                <p>
                  <strong>Created:</strong> {formatDate(profile?.createdAt)}
                </p>
                <p>
                  <strong>Updated:</strong> {formatDate(profile?.updatedAt)}
                </p>
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
