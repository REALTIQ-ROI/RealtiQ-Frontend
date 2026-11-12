import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useHasScrolled from '../../hooks/useHasScrolled';
import usePreservedSidebarScroll from '../../hooks/usePreservedSidebarScroll';
import { isVerifiedOwner } from '../../utils/landlordPropertyAccess';
import ProfileSwitcher from './ProfileSwitcher';

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
  | 'trust'
  | 'organization'
  | 'billing'
  | 'documents';

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
  { key: 'organization', to: '/dashboard/organization', icon: 'groups', label: 'Organization Team' },
  { key: 'billing', to: '/dashboard/billing', icon: 'receipt_long', label: 'Billing' },
  { key: 'documents', to: '/dashboard/documents', icon: 'description', label: 'Document Manager' },
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
  const { logout, user, activeProfile } = useAuth();
  const isDeveloperProfile = activeProfile?.kind === 'developer';
  const canAddProperty = isVerifiedOwner(user);
  const hasScrolled = useHasScrolled(8);
  const sidebarRef = usePreservedSidebarScroll('owner');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {menuOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} /> : null}
      <aside ref={sidebarRef} className={`h-screen w-64 fixed left-0 top-0 flex flex-col bg-slate-50 border-r border-slate-200 z-50 overflow-y-auto overscroll-contain transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">REALTIQ</h1>
          <p className="text-xs text-secondary font-medium uppercase tracking-widest mt-1">{isDeveloperProfile ? 'Developer Portal' : 'Seller Portal'}</p>
        </div>

        <nav className="flex flex-col gap-2 px-4 pb-6">
          {navItems.filter((item) => (item.key !== 'add-property' || canAddProperty) && (item.key !== 'projects' || isDeveloperProfile)).map((item) => (
            <Link
              key={item.key}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              aria-current={item.key === active ? 'page' : undefined}
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
          <Link to={canAddProperty ? '/dashboard/landlord/add-property' : '/dashboard/landlord/settings/verification'} className="w-full bg-primary text-on-primary py-3 rounded-md font-bold text-sm tracking-tight mb-2 text-center">
            {canAddProperty ? 'Add Property' : 'Complete Verification'}
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
            <ProfileSwitcher />
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
          {user?.role === 'owner' && !canAddProperty ? (
            <div role="status" className="flex w-full flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-amber-700">info</span>
                <p className="text-sm font-medium">Your Owner account must be verified before you can add properties. Complete KYC to submit your verification.</p>
              </div>
              <Link
                to="/dashboard/landlord/settings/verification"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
              >
                Complete verification
              </Link>
            </div>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  );
};

export default LandlordPortalLayout;
