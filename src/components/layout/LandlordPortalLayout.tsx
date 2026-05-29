import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

type LandlordNavKey =
  | 'overview'
  | 'my-properties'
  | 'add-property'
  | 'tours'
  | 'installments'
  | 'inquiries'
  | 'payment-history'
  | 'roi'
  | 'settings';

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
  { key: 'add-property', to: '/dashboard/landlord/add-property', icon: 'add_circle', label: 'Add Property' },
  { key: 'tours', to: '/dashboard/landlord/tours', icon: 'tour', label: 'Tours' },
  { key: 'installments', to: '/dashboard/landlord/installments', icon: 'payments', label: 'Installments' },
  { key: 'inquiries', to: '/dashboard/landlord/inquiries', icon: 'chat_bubble', label: 'Inquiries' },
  { key: 'payment-history', to: '/dashboard/landlord/payment-history', icon: 'payments', label: 'Payment History' },
  { key: 'roi', to: '/tools/roi-calculator', icon: 'monitoring', label: 'ROI Calculator' },
  { key: 'settings', to: '/dashboard/landlord/settings', icon: 'settings', label: 'Settings' },
];

const LandlordPortalLayout = ({ active, title, topLeft, topRight, children }: LandlordPortalLayoutProps) => {
  const { logout } = useAuth();

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col bg-slate-50 border-r border-slate-200 z-50 overflow-y-auto overscroll-contain">
        <div className="p-6">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">RealtiQ</h1>
          <p className="text-xs text-secondary font-medium uppercase tracking-widest mt-1">Landlord Portal</p>
        </div>

        <nav className="flex flex-col gap-2 px-4 pb-6">
          {navItems.map((item) => (
            <Link
              key={item.key}
              to={item.to}
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

      <main className="ml-64 min-h-screen">
        <header className="w-full sticky top-0 z-40 bg-white/80 backdrop-blur-xl flex flex-wrap gap-4 justify-between items-center px-4 sm:px-6 lg:px-8 h-auto min-h-16 py-3 shadow-sm">
          <div className="flex items-center gap-4">{topLeft ?? <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>}</div>
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
