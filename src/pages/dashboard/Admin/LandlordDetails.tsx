import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

const initials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const LandlordDetails = () => {
  const { id } = useParams();
  const { data: user, loading, error, execute } = useAsync(
    () => (id ? userService.fetchUserById(id) : Promise.reject(new Error('Missing user id'))),
    Boolean(id),
  );

  return (
    <AdminLayout>
      <div className="pt-8 pb-20 px-10">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <nav className="flex items-center gap-2 text-secondary text-sm mb-3 tracking-wide">
              <span>Admin</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <Link className="hover:text-primary" to="/dashboard/admin/manage-landlords">Landlords</Link>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-on-background font-medium">{user?.name ?? 'Profile'}</span>
            </nav>
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter">{user?.name ?? 'Landlord Profile'}</h1>
            <p className="text-secondary mt-2 text-lg">User profile and account details</p>
          </div>
        </div>

        {!id ? (
          <ErrorState message="No user was selected." />
        ) : loading ? (
          <LoadingState label="Loading user profile..." />
        ) : error || !user ? (
          <ErrorState message={error ?? 'User not found.'} onRetry={() => void execute()} />
        ) : (
          <div className="grid grid-cols-12 gap-6 mb-12">
            <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl p-8 transition-all">
              <div className="flex items-center gap-6 mb-8">
                <div className="h-24 w-24 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-fixed font-extrabold text-3xl">
                  {initials(user.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-xl">{user.name}</h3>
                    {user.isVerified ? (
                      <span className="material-symbols-outlined text-blue-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    ) : null}
                  </div>
                  <p className="text-secondary text-sm capitalize">{user.role}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider rounded-full">
                    {user.isVerified ? 'Verified Account' : 'Unverified Account'}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary">alternate_email</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Email Address</p>
                    <p className="font-medium text-on-background">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary">call</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="font-medium text-on-background">{user.phone ?? 'No phone on file'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Created Date</p>
                    <p className="font-medium text-on-background">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-primary-container text-on-primary-container p-8 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Role</p>
                  <h2 className="text-3xl font-extrabold text-white capitalize">{user.role}</h2>
                </div>
                <div className="bg-surface-container-lowest p-8 rounded-xl">
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-2">Properties</p>
                  <h2 className="text-4xl font-extrabold">{user.propertyCount ?? 0}</h2>
                </div>
                <div className="bg-surface-container-lowest p-8 rounded-xl">
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-2">Updated</p>
                  <h2 className="text-xl font-extrabold">{formatDate(user.updatedAt)}</h2>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-8">
                <h3 className="text-xl font-bold mb-6">Account Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p><strong>User ID:</strong> {user._id}</p>
                  <p><strong>Verification:</strong> {user.isVerified ? 'Verified' : 'Unverified'}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Phone:</strong> {user.phone ?? 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LandlordDetails;
