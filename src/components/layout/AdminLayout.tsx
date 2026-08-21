import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useHasScrolled from '../../hooks/useHasScrolled';

interface AdminLayoutProps {
  children: ReactNode;
}

const navLinks = [
  { to: '/dashboard/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/dashboard/admin/property-approvals', label: 'Listing Approval', icon: 'fact_check' },
  { to: '/dashboard/admin/manage-properties', label: 'Manage Properties', icon: 'home_work' },
  { to: '/dashboard/admin/virtual-tours', label: 'Virtual Tours', icon: 'view_in_ar' },
  { to: '/dashboard/admin/projects', label: 'Projects', icon: 'business' },
  { to: '/dashboard/admin/property-imports', label: 'Property Imports', icon: 'upload_file' },
  { to: '/dashboard/admin/manage-landlords', label: 'Manage Landlords', icon: 'person_pin' },
  { to: '/dashboard/admin/manage-users', label: 'Manage Users', icon: 'group' },
  { to: '/dashboard/admin/manage-inquiries', label: 'Inquiries', icon: 'mail' },
  { to: '/dashboard/admin/manage-payments', label: 'Payments', icon: 'payments' },
  { to: '/dashboard/admin/cart-checkouts', label: 'Cart Checkouts', icon: 'receipt_long' },
  { to: '/admin/proxy-inspectors', label: 'Verified Property Agents', icon: 'engineering' },
  { to: '/admin/proxy-inspections', label: 'Verified Property Agent Jobs', icon: 'fact_check' },
  { to: '/dashboard/admin/wallet', label: 'Platform Ledger', icon: 'account_balance_wallet' },
  { to: '/dashboard/admin/escrows', label: 'Escrow Management', icon: 'shield_lock' },
  { to: '/dashboard/admin/escrow-disputes', label: 'Escrow Disputes', icon: 'gavel' },
  { to: '/dashboard/admin/title-verifications', label: 'Title Review', icon: 'verified' },
  { to: '/dashboard/admin/tours', label: 'Tours', icon: 'tour' },
  { to: '/dashboard/admin/installments', label: 'Installments', icon: 'schedule' },
  { to: '/dashboard/admin/kyc', label: 'KYC Review', icon: 'verified_user' },
  { to: '/dashboard/admin/roi-assumptions', label: 'ROI Assumptions', icon: 'monitoring' },
  { to: '/dashboard/admin/featured', label: 'Featured Listings', icon: 'star' },
  { to: '/dashboard/admin/notifications/digest', label: 'Digest', icon: 'campaign' },
  { to: '/dashboard/admin/settings', label: 'Settings', icon: 'settings' },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const hasScrolled = useHasScrolled(8);
  const [menuOpen, setMenuOpen] = useState(false);

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
      {menuOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`h-screen w-64 fixed left-0 top-0 bg-slate-50 flex flex-col p-4 z-50 overflow-y-auto overscroll-contain transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-4">
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900 font-headline">RealtiQ</h1>
          <p className="text-xs text-secondary font-medium uppercase tracking-widest mt-1">Admin Console</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
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
          <NavLink
            to="/dashboard/admin/settings"
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </NavLink>
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
      <header
        className={`fixed top-0 right-0 left-0 lg:left-64 w-full lg:w-[calc(100%-16rem)] min-h-16 z-40 backdrop-blur-xl flex gap-3 items-center justify-between px-3 sm:px-6 lg:px-8 py-3 transition-all duration-200 ${
          hasScrolled ? 'bg-white/95 border-b border-slate-100 shadow-lg shadow-slate-200/40' : 'bg-white/75 border-b border-transparent'
        }`}
      >
        <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><span className="material-symbols-outlined">menu</span></button>
        <div className="hidden sm:flex items-center flex-1 max-w-xl min-w-0">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm transition-all placeholder:text-slate-400 outline-none"
              placeholder="Search admin records..."
              type="search"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-sm font-medium justify-end">
          <button className="hidden text-primary font-bold hover:underline sm:block" onClick={() => void navigate('/contact')}>
            Support
          </button>
          <div className="flex items-center gap-3 text-slate-500">
            <Link to="/dashboard/admin/notifications/digest" className="hover:text-slate-900 transition-opacity duration-150">
              <span className="material-symbols-outlined">notifications</span>
            </Link>
            <Link to="/dashboard/admin/manage-inquiries" className="hover:text-slate-900 transition-opacity duration-150">
              <span className="material-symbols-outlined">help_outline</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-6">
            <div className="hidden text-right sm:block">
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
      <main className="pt-16 min-h-screen bg-surface lg:ml-64">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
