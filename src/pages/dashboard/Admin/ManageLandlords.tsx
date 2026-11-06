import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import Input from '../../../components/ui/Input';
import LoadingState from '../../../components/ui/LoadingState';
import SellerTrustBadge from '../../../components/trust/SellerTrustBadge';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';
import type { User } from '../../../types';
import { isUserVerified } from '../../../utils/userVerification';

const ITEMS_PER_PAGE = 10;

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const displayName = (owner: User) =>
  typeof owner.name === 'string' && owner.name.trim() ? owner.name.trim() : 'Unnamed owner';

const initials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const OwnerRow = ({ owner }: { owner: User }) => (
  <tr className="bg-surface-container-lowest hover:bg-surface-container transition-colors group">
    <td className="px-6 py-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-on-surface-variant">
          {initials(displayName(owner))}
        </div>
        <div>
          <Link className="font-bold text-primary group-hover:underline underline-offset-4" to={`/dashboard/admin/owners/${owner._id}`}>
            {displayName(owner)}
          </Link>
          {owner.role === 'owner' ? <SellerTrustBadge badge={owner.trustBadge} compact /> : null}
          <div className="text-[10px] text-secondary font-bold tracking-tighter uppercase">
            ID: {owner._id.slice(-8).toUpperCase()}
          </div>
        </div>
      </div>
    </td>
    <td className="px-6 py-5">
      <div className="text-sm font-medium text-on-surface">{owner.email || 'No email on file'}</div>
      <div className="text-[10px] text-secondary">{owner.phone || 'No phone on file'}</div>
    </td>
    <td className="px-6 py-5 text-center">
      <span className="inline-flex items-center justify-center bg-secondary-container text-on-secondary-fixed text-xs font-bold px-3 py-1 rounded-full">
        {owner.propertyCount ?? 0}
      </span>
    </td>
    <td className="px-6 py-5">
      <div className="text-sm text-on-surface">{formatDate(owner.createdAt)}</div>
      <div className="text-[10px] text-secondary font-medium">Joined Date</div>
    </td>
    <td className="px-6 py-5">
      <span className="text-sm font-semibold capitalize">{owner.accountStatus || 'Not returned'}</span>
    </td>
    <td className="px-6 py-5">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        owner.emailVerified === true ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}>
        {owner.emailVerified === true ? 'Email verified' : owner.emailVerified === false ? 'Email unverified' : 'Email status unavailable'}
      </span>
    </td>
    <td className="px-6 py-5">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        owner.ownerVerified === true ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {owner.ownerVerified === true ? 'Owner verified' : owner.ownerVerified === false ? 'Owner unverified' : 'Owner status unavailable'}
      </span>
    </td>
    <td className="px-6 py-5 text-right">
      <Link className="text-primary font-bold text-sm hover:underline" to={`/dashboard/admin/owners/${owner._id}`}>
        View Profile
      </Link>
    </td>
  </tr>
);

const ManageOwners = () => {
  const { data, loading, error, execute } = useAsync(() => userService.fetchOwners(), true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const owners = useMemo(
    () => (Array.isArray(data) ? data : []).filter((owner) => Boolean(owner && typeof owner._id === 'string' && owner._id.trim())),
    [data],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return owners.filter((owner) => {
      const matchesQuery =
        !needle ||
        displayName(owner).toLowerCase().includes(needle) ||
        (typeof owner.email === 'string' && owner.email.toLowerCase().includes(needle));
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'verified' ? isUserVerified(owner) : !isUserVerified(owner));
      return matchesQuery && matchesStatus;
    });
  }, [owners, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <AdminLayout>
      <main className="pt-8 pb-12 px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-secondary text-xs font-bold uppercase tracking-widest mb-2">
                <span>Console</span>
                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                <span>Owners</span>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-primary font-headline">Manage Owners</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface-container-lowest p-6 rounded-xl">
              <p className="text-secondary text-xs font-bold uppercase tracking-widest">Total Owners</p>
              <span className="text-3xl font-extrabold text-primary font-headline">{owners.length}</span>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl">
              <p className="text-secondary text-xs font-bold uppercase tracking-widest">Verified</p>
              <span className="text-3xl font-extrabold text-primary font-headline">{owners.filter(isUserVerified).length}</span>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl">
              <p className="text-secondary text-xs font-bold uppercase tracking-widest">Pending Verification</p>
              <span className="text-3xl font-extrabold text-primary font-headline">{owners.filter((item) => !isUserVerified(item)).length}</span>
            </div>
            <div className="bg-primary-container p-6 rounded-xl">
              <p className="text-on-primary-container text-xs font-bold uppercase tracking-widest">Properties</p>
              <span className="text-3xl font-extrabold text-on-primary font-headline">
                {owners.reduce((sum, owner) => sum + (owner.propertyCount ?? 0), 0)}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl overflow-hidden">
            <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  className="min-w-[260px]"
                  placeholder="Search owners"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
                <select
                  className="appearance-none bg-surface-container-low border-none rounded-lg py-3 px-4 text-sm font-semibold"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Owner verification: All</option>
                  <option value="verified">Owner verified</option>
                  <option value="unverified">Owner unverified</option>
                </select>
              </div>
              <div className="text-xs font-bold text-secondary uppercase tracking-tighter">
                Showing {paginated.length} of {filtered.length} owners
              </div>
            </div>

            {loading ? (
              <LoadingState label="Loading owners..." />
            ) : error ? (
              <ErrorState message={error} onRetry={() => void execute()} />
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-secondary">
                <span className="material-symbols-outlined text-5xl opacity-30 mb-3 block">real_estate_agent</span>
                <p className="font-semibold">No owners available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse">
                  <thead>
                    <tr className="text-left bg-surface-container-low">
                      <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Name</th>
                      <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Contact</th>
                      <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] text-center">Properties</th>
                      <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Joined</th>
                      <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Account status</th>
                      <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Email verification</th>
                      <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Owner verification</th>
                      <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {paginated.map((owner) => <OwnerRow key={owner._id} owner={owner} />)}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-6 flex items-center justify-between border-t border-surface-container">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                Previous
              </Button>
              <p className="text-xs text-secondary font-medium">Page {page} of {totalPages}</p>
              <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>
                Next
              </Button>
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
};

export default ManageOwners;
