import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useHasScrolled from '../../hooks/useHasScrolled';

type LandlordNavKey =
  | 'messages'
  | 'notifications'
  | 'overview'
  | 'my-properties'
  | 'projects'
  | 'add-property'
  | 'verification'
  | 'title-verifications'
  | 'tours'
  | 'installments'
  | 'inquiries'
  | 'payment-history'
  | 'escrows'
  | 'roi'
  | 'settings'
  | 'trust';

interface LandlordPortalLayoutProps {
  active: LandlordNavKey;
  title: string;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  children: ReactNode;
}

const navItems: Array<{ key: LandlordNavKey; to: string; icon: string; label: string }> = [
  { key: 'overview', to: '/dashboard/landlord', icon: 'dashboard', label: 'Overview' },
  { key: 'my-properties', to: '/dashboard/landlord/my-properties', icon: 'domain', label: 'My Properties' },
  { key: 'projects', to: '/dashboard/landlord/projects', icon: 'business', label: 'Projects' },
  { key: 'add-property', to: '/dashboard/landlord/add-property', icon: 'add_circle', label: 'Add Property' },
  { key: 'inquiries', to: '/dashboard/landlord/inquiries', icon: 'chat_bubble', label: 'Inquiries' },
  { key: 'messages', to: '/messages', icon: 'chat', label: 'Messages' },
  { key: 'notifications', to: '/dashboard/notifications', icon: 'notifications', label: 'Notifications' },
  { key: 'trust', to: '/dashboard/trust', icon: 'workspace_premium', label: 'Trust & Badge' },
  { key: 'verification', to: '/dashboard/landlord/settings/verification', icon: 'verified_user', label: 'Verification' },
  { key: 'title-verifications', to: '/dashboard/landlord/title-verifications', icon: 'verified', label: 'Title Verification' },
  { key: 'tours', to: '/dashboard/landlord/tours', icon: 'tour', label: 'Tours' },
  { key: 'installments', to: '/dashboard/landlord/installments', icon: 'payments', label: 'Installments' },
  { key: 'escrows', to: '/dashboard/landlord/escrows', icon: 'shield_lock', label: 'Property Escrows' },
  { key: 'payment-history', to: '/dashboard/landlord/payment-history', icon: 'payments', label: 'Payment History' },
  { key: 'roi', to: '/tools/roi-calculator', icon: 'monitoring', label: 'ROI Calculator' },
  { key: 'settings', to: '/dashboard/landlord/settings', icon: 'settings', label: 'Settings' },
];

const LandlordPortalLayout = ({ active, title, topLeft, topRight, children }: LandlordPortalLayoutProps) => {
  const { logout } = useAuth();
  const hasScrolled = useHasScrolled(8);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {menuOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`h-screen w-64 fixed left-0 top-0 flex flex-col bg-slate-50 border-r border-slate-200 z-50 overflow-y-auto overscroll-contain transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">RealtIQ</h1>
          <p className="text-xs text-secondary font-medium uppercase tracking-widest mt-1">Landlord Portal</p>
        </div>

        <nav className="flex flex-col gap-2 px-4 pb-6">
          {navItems.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={
                item.key === active
                  ? 'bg-white text-slate-900 font-bold rounded-lg shadow-sm px-4 py-3 flex items-center gap-3'
                  : 'text-slate-500 px-4 py-3 hover:bg-slate-200/50 rounded-lg transition-all flex items-center gap-3'
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-6 flex flex-col gap-2 border-t border-slate-200/70">
          <Link to="/dashboard/landlord/add-property" className="w-full bg-primary text-on-primary py-3 rounded-md font-bold text-sm tracking-tight mb-2 text-center">
            Add Property
          </Link>
          <Link to="/contact" className="text-slate-500 px-4 py-2 hover:bg-slate-200/50 rounded-lg transition-all flex items-center gap-3 text-sm text-left">
            <span className="material-symbols-outlined text-lg">help</span>
            <span>Help Center</span>
          </Link>
          <button
            onClick={logout}
            className="text-slate-500 px-4 py-2 hover:bg-slate-200/50 rounded-lg transition-all flex items-center gap-3 text-sm text-left"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-64">
        <header
          className={`w-full sticky top-0 z-40 backdrop-blur-xl flex flex-wrap gap-4 justify-between items-center px-4 sm:px-6 lg:px-8 h-auto min-h-16 py-3 transition-all duration-200 ${
            hasScrolled ? 'bg-white/95 border-b border-slate-200 shadow-lg shadow-slate-200/30' : 'bg-white/75 border-b border-transparent shadow-none'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3"><button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><span className="material-symbols-outlined">menu</span></button>{topLeft ?? <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h2>}</div>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-end">
            {topRight ?? (
              <>
                <div className="flex items-center gap-3">
                  <Link to="/dashboard/landlord/inquiries" className="text-slate-500 hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                  </Link>
                  <Link to="/dashboard/landlord/settings" className="text-slate-500 hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">settings</span>
                  </Link>
                </div>
                <div className="h-8 w-[1px] bg-slate-200" />
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-300" />
              </>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};

export default LandlordPortalLayout;
