import AccountSecuritySettings from '../../../components/profile/AccountSecuritySettings';
import AdminLayout from '../../../components/layout/AdminLayout';
import AdminVirtualTourSettings from '../../../components/virtualTour/AdminVirtualTourSettings';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const AdminSettings = () => {
  const { user } = useAuth();
  const { data: profile, loading, error, execute } = useAsync(
    () => (user?._id ? userService.fetchUserById(user._id) : Promise.reject(new Error('Missing user id'))),
    Boolean(user?._id),
  );
  const account = profile ?? user;

  return (
    <AdminLayout>
      <section className="mx-auto max-w-5xl space-y-8 p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Account Management</p>
          <h1 className="text-3xl font-extrabold">Settings</h1>
          <p className="mt-1 text-sm text-secondary">Review your signed-in account and manage its security settings.</p>
        </div>

        {loading ? <LoadingState label="Loading settings..." /> : error ? <ErrorState message={error} onRetry={() => void execute()} /> : (
          <>
            <section className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-8">
              <h2 className="mb-5 text-lg font-bold">Account summary</h2>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <p><strong>Name:</strong> {account?.name ?? 'Unavailable'}</p>
                <p><strong>Email:</strong> {account?.email ?? 'Unavailable'}</p>
                <p><strong>Role:</strong> <span className="capitalize">{account?.role ?? 'Unavailable'}</span></p>
                <p><strong>Verification:</strong> {account?.isVerified ? 'Verified' : 'Unverified'}</p>
                <p><strong>Created:</strong> {formatDate(account?.createdAt)}</p>
                <p><strong>Updated:</strong> {formatDate(account?.updatedAt)}</p>
              </div>
            </section>
            {account ? <AccountSecuritySettings user={account} /> : null}
          </>
        )}
        <AdminVirtualTourSettings />
      </section>
    </AdminLayout>
  );
};

export default AdminSettings;
