import AdminLayout from '../../../components/layout/AdminLayout';
import { useAsync } from '../../../hooks/useAsync';
import { userService } from '../../../services/userService';

const ManageUsers = () => {
  const { data: users } = useAsync(() => userService.getUsers(), true);

  return (
    <AdminLayout>
      <div className="p-10 min-h-screen">
        {/* Editorial Header Section */}
        <section className="mb-12">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-secondary uppercase mb-2 block">
                System Administration
              </span>
              <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-on-background">
                Manage Users
              </h2>
              <p className="text-secondary mt-2 max-w-xl font-body">
                Overview of all registered platform buyers and general users. Monitor activity trends, manage account
                statuses, and review user-saved preferences.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="bg-secondary-container text-on-secondary-fixed px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-80 transition-all">
                <span className="material-symbols-outlined text-sm">file_download</span>
                Export List
              </button>
              <button className="bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 hover:shadow-lg transition-all">
                <span className="material-symbols-outlined text-sm">person_add</span>
                Add Platform User
              </button>
            </div>
          </div>
        </section>

        {/* Stats Grid (Bento Style) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between">
            <span className="material-symbols-outlined text-surface-tint mb-4">group</span>
            <div>
              <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-1">Total Users</p>
              <h3 className="font-headline text-3xl font-bold">12,482</h3>
            </div>
            <div className="mt-4 flex items-center gap-1 text-emerald-600 text-xs font-bold">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              12% increase this month
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between">
            <span className="material-symbols-outlined text-surface-tint mb-4">how_to_reg</span>
            <div>
              <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-1">Active Buyers</p>
              <h3 className="font-headline text-3xl font-bold">3,891</h3>
            </div>
            <div className="mt-4 flex items-center gap-1 text-secondary text-xs font-medium">
              31% of total user base
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between">
            <span className="material-symbols-outlined text-surface-tint mb-4">favorite</span>
            <div>
              <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-1">Saved Properties</p>
              <h3 className="font-headline text-3xl font-bold">48,209</h3>
            </div>
            <div className="mt-4 flex items-center gap-1 text-secondary text-xs font-medium">
              Avg. 12.4 saves per active user
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between">
            <span className="material-symbols-outlined text-surface-tint mb-4">bolt</span>
            <div>
              <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-1">Daily Activity</p>
              <h3 className="font-headline text-3xl font-bold">1,102</h3>
            </div>
            <div className="mt-4 flex items-center gap-1 text-on-error-container text-xs font-bold">
              <span className="material-symbols-outlined text-xs">trending_down</span>
              2% decrease since yesterday
            </div>
          </div>
        </section>

        {/* Main User Table */}
        <section className="bg-surface-container-lowest rounded-xl overflow-hidden">
          <div className="px-8 py-6 flex justify-between items-center bg-surface-container-low/30">
            <div className="flex gap-4">
              <button className="bg-white border-0 py-1.5 px-4 rounded-full text-xs font-bold shadow-sm ring-1 ring-slate-100">
                All Users
              </button>
              <button className="text-secondary py-1.5 px-4 rounded-full text-xs font-medium hover:bg-white transition-all">
                Verified Buyers
              </button>
              <button className="text-secondary py-1.5 px-4 rounded-full text-xs font-medium hover:bg-white transition-all">
                New (Last 48h)
              </button>
              <button className="text-secondary py-1.5 px-4 rounded-full text-xs font-medium hover:bg-white transition-all">
                Suspended
              </button>
            </div>
            <button className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm font-medium">
              <span className="material-symbols-outlined text-lg">filter_list</span>
              Advanced Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/10">
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest border-b border-surface-container">
                    User Name
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest border-b border-surface-container">
                    Email
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest border-b border-surface-container text-center">
                    Last Active
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest border-b border-surface-container text-center">
                    Saved Properties
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest border-b border-surface-container text-center">
                    Status
                  </th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest border-b border-surface-container text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container/50">
                {(users ?? []).length > 0 ? (
                  (users ?? []).map((user) => {
                    const initials = user.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <tr key={user._id} className="hover:bg-surface-container-low/20 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-fixed">
                              {initials}
                            </div>
                            <div>
                              <p className="font-headline font-bold text-on-surface">{user.name}</p>
                              <p className="text-[10px] text-secondary">Registered user</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 font-body text-sm text-on-surface-variant">{user.email}</td>
                        <td className="px-8 py-5 text-center text-sm font-medium text-on-surface-variant">—</td>
                        <td className="px-8 py-5 text-center">
                          <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold">—</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button className="p-2 hover:bg-surface-container rounded-lg text-secondary transition-colors">
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    {/* Static demo rows */}
                    <tr className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-fixed">
                            EA
                          </div>
                          <div>
                            <p className="font-headline font-bold text-on-surface">Elias Alexander</p>
                            <p className="text-[10px] text-secondary">Registered 2m ago</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-body text-sm text-on-surface-variant">e.alexander@lifestyle.com</td>
                      <td className="px-8 py-5 text-center text-sm font-medium text-on-surface-variant">2 hours ago</td>
                      <td className="px-8 py-5 text-center">
                        <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold">24</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 hover:bg-surface-container rounded-lg text-secondary transition-colors">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <img
                            alt="Sarah Jenkins"
                            className="w-10 h-10 rounded-full object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzeJDVULv1ZxlgpQop_JHSGG6rI2fLjGt0sdhGwqQXj-jMwGnMyioOi3wgUYBerMpMsOgVsv4jFfirQIAN3Q1E8oENTTg4KS69l03zu7yJcbVakO9eWgTjDGjRF3uE_8eYhfNhDtbfcIrVYdiYTg4RIGKRLWl9Ogo_zSGfPyzy59Ob-fzBqjv9HOE0GPa8r3FDtUm54xqof8upSiqmIagwiEoAc7ocf7EAILXXvo34ABFwIcy5X0jO6l7hqErRGv2uxzTMgw94aQ"
                          />
                          <div>
                            <p className="font-headline font-bold text-on-surface">Sarah Jenkins</p>
                            <p className="text-[10px] text-secondary">Registered 1y ago</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-body text-sm text-on-surface-variant">sarah.j@realtiq.me</td>
                      <td className="px-8 py-5 text-center text-sm font-medium text-on-surface-variant">Yesterday</td>
                      <td className="px-8 py-5 text-center">
                        <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold">156</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 hover:bg-surface-container rounded-lg text-secondary transition-colors">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-on-surface-variant">
                            MW
                          </div>
                          <div>
                            <p className="font-headline font-bold text-on-surface">Marcus Wright</p>
                            <p className="text-[10px] text-secondary">Registered 5m ago</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-body text-sm text-on-surface-variant">m.wright@gmail.com</td>
                      <td className="px-8 py-5 text-center text-sm font-medium text-on-surface-variant">Oct 12, 2023</td>
                      <td className="px-8 py-5 text-center">
                        <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold">3</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Inactive
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 hover:bg-surface-container rounded-lg text-secondary transition-colors">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <img
                            alt="David Chen"
                            className="w-10 h-10 rounded-full object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5DJ8CoB4HuGOhGG4--ybtdkC6pXFDuh-t4oorKakRDUj2LA5sXRNtf4ZZPqVruobozvEY8F88cDbE1nLmGXIzGdFYHbrwMaR78NoCoeczg0PWNifhX1e5iDm_rNJDt4qAMxlqK5uZRLT1kh6qQqNJVbpixRdz9ug1SHjV4UX6yonmLuiKs8pxi_jz__9QR89g3TgkeJ2N_O0ZYfYZu0iCEC4X0HriOPzC_MF8rY8GUpCY1A1-Z_x7tRcXcAxCRLtGd6NJaouHeA"
                          />
                          <div>
                            <p className="font-headline font-bold text-on-surface">David Chen</p>
                            <p className="text-[10px] text-secondary">Registered 8m ago</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-body text-sm text-on-surface-variant">chen.david@corporate.io</td>
                      <td className="px-8 py-5 text-center text-sm font-medium text-on-surface-variant">15 min ago</td>
                      <td className="px-8 py-5 text-center">
                        <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold">42</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 hover:bg-surface-container rounded-lg text-secondary transition-colors">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-error-container/30 flex items-center justify-center font-bold text-error">
                            LK
                          </div>
                          <div>
                            <p className="font-headline font-bold text-on-surface">Lana Kovic</p>
                            <p className="text-[10px] text-secondary">Registered 2y ago</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-body text-sm text-on-surface-variant">lana_k@hotmail.com</td>
                      <td className="px-8 py-5 text-center text-sm font-medium text-on-surface-variant">Aug 05, 2023</td>
                      <td className="px-8 py-5 text-center">
                        <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold">12</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/20 text-error text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          Suspended
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 hover:bg-surface-container rounded-lg text-secondary transition-colors">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-8 py-6 border-t border-surface-container flex items-center justify-between">
            <p className="text-xs text-secondary font-medium">
              Showing 1 to {(users ?? []).length > 0 ? (users ?? []).length : 5} of 12,482 users
            </p>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container text-secondary hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary text-xs font-bold">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low text-xs font-bold text-secondary">
                2
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low text-xs font-bold text-secondary">
                3
              </button>
              <span className="text-secondary">...</span>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low text-xs font-bold text-secondary">
                2,496
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container text-secondary hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default ManageUsers;
