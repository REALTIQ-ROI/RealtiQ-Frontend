import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import Input from '../../../components/ui/Input';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';
import type { User, UserRole } from '../../../types';

const ITEMS_PER_PAGE = 10;
const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const ManageUsers = () => {
  const { data, loading, error, execute } = useAsync(() => userService.fetchUsers(), true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const users = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !needle ||
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [query, roleFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPhone(user.phone ?? '');
    setEditError(null);
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      setEditError('Name is required.');
      return;
    }
    if (editPhone.trim() && !phoneRegex.test(editPhone.trim())) {
      setEditError('Enter a valid Nigerian phone number.');
      return;
    }

    setSaving(true);
    setEditError(null);
    try {
      await userService.updateUser(editingUser._id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });
      toast.success('User updated successfully.');
      setEditingUser(null);
      await execute();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Unable to update user.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: User) => {
    const result = await Swal.fire({
      title: 'Delete this user permanently?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete User',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;

    try {
      await userService.deleteUser(user._id);
      toast.success('User deleted successfully.');
      await execute();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete user.');
    }
  };

  return (
    <AdminLayout>
      <div className="p-10 min-h-screen">
        <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-secondary uppercase mb-2 block">
              System Administration
            </span>
            <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-on-background">
              Manage Users
            </h2>
            <p className="text-secondary mt-2 max-w-xl font-body">
              View, update, and remove registered platform accounts.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface-container-lowest p-6 rounded-xl">
            <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-1">Total Users</p>
            <h3 className="font-headline text-3xl font-bold">{users.length}</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl">
            <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-1">Buyers</p>
            <h3 className="font-headline text-3xl font-bold">{users.filter((user) => user.role === 'buyer').length}</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl">
            <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-1">Landlords</p>
            <h3 className="font-headline text-3xl font-bold">{users.filter((user) => user.role === 'landlord').length}</h3>
          </div>
          <div className="bg-primary-container p-6 rounded-xl">
            <p className="text-on-primary-container text-xs font-semibold uppercase tracking-wider mb-1">Verified</p>
            <h3 className="font-headline text-3xl font-bold text-white">{users.filter((user) => user.isVerified).length}</h3>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-xl overflow-hidden">
          <div className="px-8 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-low/30">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                className="min-w-[260px]"
                placeholder="Search name or email"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
              <select
                className="bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-3 text-sm"
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value as UserRole | 'all');
                  setPage(1);
                }}
              >
                <option value="all">All Roles</option>
                <option value="buyer">Buyer</option>
                <option value="landlord">Landlord</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider">
              Showing {paginated.length} of {filtered.length} users
            </p>
          </div>

          {loading ? (
            <LoadingState label="Loading users..." />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void execute()} />
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-secondary">
              <span className="material-symbols-outlined text-5xl opacity-30 mb-3 block">group_off</span>
              <p className="font-semibold">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/10">
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Name</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Email</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Role</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Verified</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Created</th>
                    <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/50">
                  {paginated.map((user) => (
                    <tr key={user._id} className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-fixed">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="font-headline font-bold text-on-surface">{user.name}</p>
                            <p className="text-[10px] text-secondary">ID: {user._id.slice(-8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-body text-sm text-on-surface-variant">{user.email}</td>
                      <td className="px-8 py-5">
                        <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold capitalize">{user.role}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {user.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-on-surface-variant">{formatDate(user.createdAt)}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <Link className="text-primary font-bold text-sm self-center hover:underline" to={`/dashboard/admin/users/${user._id}`}>
                            View
                          </Link>
                          <Button variant="secondary" onClick={() => openEdit(user)}>Edit</Button>
                          <Button className="bg-red-50 text-red-700 hover:bg-red-100" variant="secondary" onClick={() => void deleteUser(user)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-8 py-6 border-t border-surface-container flex items-center justify-between">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
              Previous
            </Button>
            <p className="text-xs text-secondary font-medium">Page {page} of {totalPages}</p>
            <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </section>

        {editingUser ? (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
            <form className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onSubmit={submitEdit}>
              <div>
                <h3 className="text-xl font-extrabold">Edit User</h3>
                <p className="text-sm text-secondary">{editingUser.email}</p>
              </div>
              <Input label="Name" value={editName} onChange={(event) => setEditName(event.target.value)} required />
              <Input label="Phone" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} placeholder="08012345678" />
              {editError ? <p className="text-error text-sm">{editError}</p> : null}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default ManageUsers;
