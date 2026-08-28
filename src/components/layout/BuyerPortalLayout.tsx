import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import useHasScrolled from '../../hooks/useHasScrolled';

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
  { to: '/dashboard/personalisation', icon: 'favorite', label: 'Saved Activity' },
  { to: '/dashboard/buyer/inquiry-history', icon: 'chat_bubble', label: 'Inquiry History' },
  { to: '/messages', icon: 'chat', label: 'Messages' },
  { to: '/dashboard/notifications', icon: 'notifications', label: 'Notifications' },
  { to: '/dashboard/trust', icon: 'verified_user', label: 'Account Trust' },
  { to: '/buyer/proxy-inspections', icon: 'fact_check', label: 'Proxy Inspections' },
  { to: '/dashboard/buyer/tours', icon: 'tour', label: 'Tours' },
  { to: '/dashboard/buyer/installments', icon: 'schedule', label: 'Installments' },
  { to: '/dashboard/buyer/escrows', icon: 'shield_lock', label: 'My Escrows' },
  { to: '/dashboard/buyer/payment-history', icon: 'payments', label: 'Payment History' },
  { to: '/dashboard/buyer/cart', icon: 'shopping_cart', label: 'Service Cart' },
  { to: '/dashboard/buyer/cart-checkouts', icon: 'receipt_long', label: 'Cart Checkouts' },
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
  const { itemCount } = useCart();
  const hasScrolled = useHasScrolled(8);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-surface text-on-background antialiased min-h-screen">
      {menuOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`fixed left-0 top-0 h-screen w-64 z-50 bg-white dark:bg-slate-950 flex flex-col p-6 gap-y-2 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-y-auto overscroll-contain transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
              end={item.to === '/dashboard/buyer'}
              onClick={() => setMenuOpen(false)}
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

      <header
        className={`fixed top-0 left-0 lg:left-64 right-0 w-full lg:w-[calc(100%-16rem)] z-40 backdrop-blur-xl flex gap-3 justify-between items-center px-3 sm:px-6 lg:px-8 min-h-16 py-3 lg:py-0 transition-all duration-200 ${
          hasScrolled ? 'bg-slate-50/95 border-b border-slate-200/70 shadow-lg shadow-slate-200/30' : 'bg-slate-50/75 border-b border-transparent'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3 flex-1">
          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><span className="material-symbols-outlined">menu</span></button>
          <div className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tighter text-slate-900 font-headline sm:text-xl">Architectural Curator</span>
            <div className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold mt-1">{pageEyebrow}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 justify-end">
          <div className="hidden md:block">{topbarRight}</div>
          <div className="flex gap-3">
            <Link to="/dashboard/buyer/cart" className="text-slate-500 hover:text-slate-900 transition-colors relative" aria-label="Service cart">
              <span className="material-symbols-outlined">shopping_cart</span>
              {itemCount ? <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary">{itemCount}</span> : null}
            </Link>
            <Link to="/dashboard/buyer/inquiry-history" className="text-slate-500 hover:text-slate-900 transition-colors" aria-label="Inquiry history">
              <span className="material-symbols-outlined">mail</span>
            </Link>
          </div>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <span className="hidden text-sm font-bold text-slate-900 sm:block">{user?.name ?? 'Buyer'}</span>
          </div>
        </div>
      </header>

      <main className="lg:ml-64 pt-24 pb-12 px-4 sm:px-6 lg:px-12 min-h-screen">
        <div className="max-w-screen-2xl mx-auto">
          <section className="mb-8 sm:mb-12">
            <div className="flex flex-col gap-1">
              <span className="text-secondary font-bold tracking-widest text-[0.65rem] uppercase">{pageEyebrow}</span>
              <h2 className="text-3xl font-extrabold text-primary tracking-tight sm:text-4xl">{pageTitle}</h2>
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
