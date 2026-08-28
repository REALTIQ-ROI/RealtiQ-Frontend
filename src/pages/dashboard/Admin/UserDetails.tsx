import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';
import SellerTrustBadge from '../../../components/trust/SellerTrustBadge';

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const initials = (name: string) =>
  name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();

const UserDetails = () => {
  const { id } = useParams();
  const { data: user, loading, error, execute } = useAsync(
    () => (id ? userService.fetchUserById(id) : Promise.reject(new Error('Missing user id'))),
    Boolean(id),
  );

  return (
    <AdminLayout>
      <div className="pt-8 pb-20 px-10 max-w-5xl">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-secondary uppercase mb-2 block">User Profile</span>
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter">{user?.name ?? 'User Details'}</h1>
          </div>
          <Link className="text-primary text-sm font-bold hover:underline" to="/dashboard/admin/manage-users">
            Back to users
          </Link>
        </div>

        {!id ? (
          <ErrorState message="No user was selected." />
        ) : loading ? (
          <LoadingState label="Loading user profile..." />
        ) : error || !user ? (
          <ErrorState message={error ?? 'User not found.'} onRetry={() => void execute()} />
        ) : (
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-8 space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center text-xl font-extrabold">
                  {initials(user.name)}
                </div>
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">{user.name}{user.role === 'landlord' ? <SellerTrustBadge badge={user.trustBadge as import('../../../types/phase45').TrustBadge} compact /> : null}</h2>
                  <p className="text-secondary">{user.email}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                user.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {user.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              <p><strong>Role:</strong> <span className="capitalize">{user.role}</span></p>
              <p><strong>Phone:</strong> {user.phone ?? 'No phone on file'}</p>
              <p><strong>Created:</strong> {formatDate(user.createdAt)}</p>
              <p><strong>Updated:</strong> {formatDate(user.updatedAt)}</p>
              <p><strong>User ID:</strong> {user._id}</p>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserDetails;
