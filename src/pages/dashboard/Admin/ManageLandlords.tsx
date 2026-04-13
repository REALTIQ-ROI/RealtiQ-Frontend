import { useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';
import type { User } from '../../../types';

const ITEMS_PER_PAGE = 10;

const LandlordRow = ({ landlord }: { landlord: User }) => {
  const initials = landlord.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr className="bg-surface-container-lowest hover:bg-surface-container transition-colors group">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-on-surface-variant">
            {initials}
          </div>
          <div>
            <div className="font-bold text-primary group-hover:underline underline-offset-4 cursor-pointer">
              {landlord.name}
            </div>
            <div className="text-[10px] text-secondary font-bold tracking-tighter uppercase">
              ID: {landlord._id.slice(-8).toUpperCase()}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="text-sm font-medium text-on-surface">{landlord.email}</div>
        <div className="text-[10px] text-secondary">Registered Account</div>
      </td>
      <td className="px-6 py-5 text-center">
        <span className="inline-flex items-center justify-center bg-secondary-container text-on-secondary-fixed text-xs font-bold px-3 py-1 rounded-full">
          —
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="text-sm text-on-surface">—</div>
        <div className="text-[10px] text-secondary font-medium">Verified Account</div>
      </td>
      <td className="px-6 py-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex justify-end gap-2">
          <button
            className="p-2 hover:bg-surface-container-high rounded-md transition-colors text-primary"
            title="View Details"
          >
            <span className="material-symbols-outlined text-xl">visibility</span>
          </button>
          <button
            className="p-2 hover:bg-error-container/20 rounded-md transition-colors text-error"
            title="Suspend Account"
          >
            <span className="material-symbols-outlined text-xl">person_off</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

const ManageLandlords = () => {
  const { data, loading } = useAsync(() => userService.getLandlords(), true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const landlords = data ?? [];
  const totalPages = Math.max(1, Math.ceil(landlords.length / ITEMS_PER_PAGE));
  const paginated = landlords.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <AdminLayout>
      <main className="pt-8 pb-12 px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-10 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 text-secondary text-xs font-bold uppercase tracking-widest mb-2">
                <span>Console</span>
                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                <span>Partners</span>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-primary font-headline">Manage Landlords</h2>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface text-sm font-semibold rounded-md hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined text-sm">file_download</span>
                Export CSV
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-md hover:opacity-90 transition-opacity">
                <span className="material-symbols-outlined text-sm">add</span>
                Invite Landlord
              </button>
            </div>
          </div>

          {/* Stats Bento */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="col-span-1 bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between">
              <p className="text-secondary text-xs font-bold uppercase tracking-widest">Total Partners</p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary font-headline">{landlords.length}</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span>
                  12%
                </span>
              </div>
            </div>
            <div className="col-span-1 bg-surface-container-low p-6 rounded-xl flex flex-col justify-between">
              <p className="text-secondary text-xs font-bold uppercase tracking-widest">Active Accounts</p>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-primary font-headline">{landlords.length}</span>
              </div>
            </div>
            <div className="col-span-1 bg-surface-container-low p-6 rounded-xl flex flex-col justify-between">
              <p className="text-secondary text-xs font-bold uppercase tracking-widest">Pending Verification</p>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-primary font-headline">0</span>
              </div>
            </div>
            <div className="col-span-1 bg-primary-container p-6 rounded-xl flex flex-col justify-between">
              <p className="text-on-primary-container text-xs font-bold uppercase tracking-widest">Suspended</p>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-on-primary font-headline">0</span>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden">
            {/* Filters Bar */}
            <div className="p-4 flex items-center justify-between bg-surface-container-lowest">
              <div className="flex gap-4">
                <div className="relative">
                  <select
                    className="appearance-none bg-surface-container-low border-none rounded-lg py-2 pl-4 pr-10 text-xs font-semibold focus:ring-1 focus:ring-primary/10"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">Status: All</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none">
                    expand_more
                  </span>
                </div>
                <div className="relative">
                  <select className="appearance-none bg-surface-container-low border-none rounded-lg py-2 pl-4 pr-10 text-xs font-semibold focus:ring-1 focus:ring-primary/10">
                    <option>Portfolio Size: Any</option>
                    <option>1-5 Properties</option>
                    <option>6-20 Properties</option>
                    <option>20+ Properties</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
              <div className="text-xs font-bold text-secondary uppercase tracking-tighter">
                Showing {paginated.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(page * ITEMS_PER_PAGE, landlords.length)} of {landlords.length} landlords
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left bg-surface-container-low">
                    <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Name</th>
                    <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Contact Information</th>
                    <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] text-center">Properties</th>
                    <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Joined Date</th>
                    <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">Status</th>
                    <th className="px-6 py-5 text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-secondary text-sm">
                        Loading landlords…
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-secondary text-sm">
                        No landlords found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((landlord) => <LandlordRow key={landlord._id} landlord={landlord} />)
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-6 flex items-center justify-between border-t border-surface-container">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-surface-container text-on-surface text-xs font-bold uppercase rounded-md hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <span className="material-symbols-outlined text-sm">arrow_back_ios</span>
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                      page === n
                        ? 'bg-primary text-on-primary'
                        : 'hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {totalPages > 3 && (
                  <>
                    <span className="px-2 text-secondary text-xs">...</span>
                    <button
                      onClick={() => setPage(totalPages)}
                      className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                        page === totalPages
                          ? 'bg-primary text-on-primary'
                          : 'hover:bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-surface-container text-on-surface text-xs font-bold uppercase rounded-md hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
              </button>
            </div>
          </div>

          {/* Footer Meta */}
          <div className="mt-16 pt-8 border-t border-surface-container flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">System Status</span>
                <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  All Systems Operational
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">Last Data Sync</span>
                <span className="text-xs font-semibold text-primary">Just now</span>
              </div>
            </div>
            <div className="flex gap-4">
              <a className="text-[10px] font-bold text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
                Documentation
              </a>
              <a className="text-[10px] font-bold text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
                Privacy Policy
              </a>
              <a className="text-[10px] font-bold text-secondary uppercase tracking-widest hover:text-primary transition-colors" href="#">
                Support Center
              </a>
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
};

export default ManageLandlords;
