import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
}

const navLinks = [
  { to: '/dashboard/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/dashboard/admin/manage-properties', label: 'Manage Properties', icon: 'home_work' },
  { to: '/dashboard/admin/manage-landlords', label: 'Manage Landlords', icon: 'person_pin' },
  { to: '/dashboard/admin/manage-users', label: 'Manage Users', icon: 'group' },
  { to: '/dashboard/admin/manage-inquiries', label: 'Inquiries', icon: 'mail' },
  { to: '/dashboard/admin/manage-payments', label: 'Payments', icon: 'payments' },
  { to: '/dashboard/admin/tours', label: 'Tours', icon: 'tour' },
  { to: '/dashboard/admin/installments', label: 'Installments', icon: 'schedule' },
  { to: '/dashboard/admin/roi-assumptions', label: 'ROI Assumptions', icon: 'monitoring' },
  { to: '/dashboard/admin/featured', label: 'Featured Listings', icon: 'star' },
  { to: '/dashboard/admin/notifications/digest', label: 'Digest', icon: 'campaign' },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    void navigate('/auth/admin/login');
  };

  const initials = (user?.name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="antialiased text-on-surface">
      {/* Fixed Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 flex flex-col p-4 z-50">
        <div className="mb-10 px-4">
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900 font-headline">RealtiQ</h1>
          <p className="text-xs text-secondary font-medium uppercase tracking-widest mt-1">Admin Console</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-3 px-4 py-3 bg-white text-slate-900 rounded-lg font-semibold shadow-sm transition-all duration-200 ease-in-out'
                  : 'flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 transition-all duration-200 ease-in-out'
              }
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-200 space-y-1">
          <NavLink
            to="/dashboard/admin/manage-properties"
            className="w-full flex items-center gap-3 px-4 py-3 mb-4 bg-primary text-on-primary rounded-lg font-bold transition-all hover:opacity-90"
          >
            <span className="material-symbols-outlined">add</span>
            <span>New Listing</span>
          </NavLink>
          {/* <button
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 cursor-not-allowed transition-colors"
            disabled
            title="Admin settings are coming soon"
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button> */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Fixed Top Nav */}
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 border-b border-slate-100">
        <div className="flex items-center flex-1 max-w-xl">
          {/* <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 disabled:cursor-not-allowed"
              placeholder="Global search coming soon"
              type="text"
              disabled
            />
          </div> */}
        </div>

        <div className="flex items-center gap-6 text-sm font-medium">
          <button className="text-primary font-bold hover:underline" onClick={() => void navigate('/contact')}>
            Support
          </button>
          <div className="flex items-center gap-4 text-slate-500">
            <button className="hover:text-slate-900 transition-opacity duration-150">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="hover:text-slate-900 transition-opacity duration-150">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface">{user?.name ?? 'Admin'}</p>
              <p className="text-[10px] text-secondary">Super Admin</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-64 pt-16 min-h-screen bg-surface">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
