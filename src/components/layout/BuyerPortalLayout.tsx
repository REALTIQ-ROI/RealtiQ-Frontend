import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface BuyerPortalLayoutProps {
  children: ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  pageEyebrow?: string;
  topbarRight?: ReactNode;
}

const navItems = [
  { to: '/dashboard/buyer', icon: 'dashboard', label: 'Overview' },
  { to: '/dashboard/buyer/my-properties', icon: 'domain', label: 'My Properties' },
  { to: '/dashboard/buyer/tours', icon: 'tour', label: 'Tours' },
  { to: '/dashboard/buyer/installments', icon: 'schedule', label: 'Installments' },
  { to: '/dashboard/buyer/payment-history', icon: 'payments', label: 'Payment History' },
  { to: '/dashboard/buyer/inquiry-history', icon: 'chat_bubble', label: 'Inquiry History' },
  { to: '/dashboard/roi-scenarios', icon: 'monitoring', label: 'ROI Scenarios' },
  { to: '/dashboard/buyer/profile-settings', icon: 'settings', label: 'Settings' },
] as const;

const BuyerPortalLayout = ({
  children,
  pageTitle,
  pageSubtitle,
  pageEyebrow = 'Buyer Portal',
  topbarRight,
}: BuyerPortalLayoutProps) => {
  const { user, logout } = useAuth();

  return (
    <div className="bg-surface text-on-background antialiased min-h-screen">
      <aside className="relative lg:fixed left-0 top-0 h-auto lg:h-screen w-full lg:w-64 z-50 bg-white dark:bg-slate-950 flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-y-auto overscroll-contain">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Curator</h1>
          <p className="text-xs tracking-widest font-semibold text-slate-500 uppercase mt-1">Premium Real Estate</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:translate-x-1'
                }`
              }
              to={item.to}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 space-y-1">
          <Link className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold" to="/contact">
            <span className="material-symbols-outlined">help</span>
            <span>Help Center</span>
          </Link>
          <button
            className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-semibold"
            onClick={logout}
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <header className="relative lg:fixed top-0 left-0 lg:left-64 right-0 w-full lg:w-[calc(100%-16rem)] z-40 bg-slate-50/80 backdrop-blur-xl flex flex-wrap gap-4 justify-between items-center px-4 sm:px-6 lg:px-8 h-auto lg:h-16 py-3 lg:py-0">
        <div className="flex items-center gap-4 flex-1">
          <div>
            <span className="text-xl font-bold tracking-tighter text-slate-900 font-headline">Architectural Curator</span>
            <div className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold mt-1">{pageEyebrow}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-end">
          {topbarRight}
          <div className="flex gap-3">
            <Link to="/dashboard/buyer/payment-history" className="text-slate-500 hover:text-slate-900 transition-colors relative" aria-label="Payment history">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </Link>
            <Link to="/dashboard/buyer/inquiry-history" className="text-slate-500 hover:text-slate-900 transition-colors" aria-label="Inquiry history">
              <span className="material-symbols-outlined">mail</span>
            </Link>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <span className="text-sm font-bold text-slate-900">{user?.name ?? 'Buyer'}</span>
          </div>
        </div>
      </header>

      <main className="lg:ml-64 pt-8 lg:pt-24 pb-12 px-4 sm:px-6 lg:px-12 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <section className="mb-12">
            <div className="flex flex-col gap-1">
              <span className="text-secondary font-bold tracking-widest text-[0.65rem] uppercase">{pageEyebrow}</span>
              <h2 className="text-4xl font-extrabold text-primary tracking-tight">{pageTitle}</h2>
            </div>
            {pageSubtitle ? <p className="text-on-surface-variant max-w-2xl mt-3 text-sm leading-relaxed">{pageSubtitle}</p> : null}
          </section>
          {children}
        </div>
      </main>
    </div>
  );
};

export default BuyerPortalLayout;
