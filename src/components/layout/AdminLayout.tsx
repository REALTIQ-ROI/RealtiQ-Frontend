import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useHasScrolled from '../../hooks/useHasScrolled';
import usePreservedSidebarScroll from '../../hooks/usePreservedSidebarScroll';
import AdminGlobalSearch from '../admin/AdminGlobalSearch';
import { canManageAdminStaff, hasAnyAdminCapability, hasAdminCapability, isAdminAccessReadOnly } from '../../services/adminAccessService';

interface AdminLayoutProps {
  children: ReactNode;
}

const navLinks = [
  { to: '/dashboard/admin', label: 'Dashboard', icon: 'dashboard', end: true, capability: 'dashboard.read' },
  { to: '/dashboard/admin/property-approvals', label: 'Listing Approval', icon: 'fact_check', capability: 'listings.manage' },
  { to: '/dashboard/admin/manage-properties', label: 'Manage Properties', icon: 'home_work', capability: 'listings.read' },
  { to: '/dashboard/admin/featured', label: 'Featured Listings', icon: 'star', capability: 'marketing.manage' },
  { to: '/dashboard/admin/projects', label: 'Projects', icon: 'business', capability: 'projects.read' },
  { to: '/dashboard/admin/property-imports', label: 'Property Imports', icon: 'upload_file', capability: 'imports.read' },
  { to: '/dashboard/admin/manage-owners', label: 'Manage Owners', icon: 'person_pin', capability: 'accounts.read' },
  { to: '/dashboard/admin/manage-users', label: 'Manage Users', icon: 'group', capability: 'accounts.read' },
  { to: '/dashboard/admin/kyc', label: 'KYC Review', icon: 'verified_user', capability: 'verification.read' },
  { to: '/dashboard/admin/data-protection-execution', label: 'Privacy Execution', icon: 'privacy_tip', capability: 'privacy.read' },
  { to: '/dashboard/admin/legal-holds', label: 'Legal Holds', icon: 'gavel', capability: 'legal_holds.read' },
  { to: '/dashboard/admin/staff-access-changes', label: 'Staff Access', icon: 'admin_panel_settings', capability: 'staff.access.manage' },
  { to: '/dashboard/admin/manage-inquiries', label: 'Inquiries', icon: 'mail', capability: 'support.read' },
  { to: '/dashboard/admin/message-moderation', label: 'Message Moderation', icon: 'shield', capability: 'moderation.manage' },
  { to: '/dashboard/admin/notifications/digest', label: 'Digest', icon: 'campaign', capability: 'marketing.manage' },
  { to: '/dashboard/admin/notification-deliveries', label: 'Delivery Reconciliation', icon: 'outbox', capability: 'notification_delivery.read' },
  { to: '/admin/proxy-inspectors', label: 'Inspection Partners', icon: 'engineering', capability: ['network.read', 'search.proxy_inspector.read'] },
  { to: '/admin/proxy-inspections', label: 'Inspection Partner Jobs', icon: 'fact_check', capability: 'network.read' },
  { to: '/dashboard/admin/virtual-tours', label: 'Virtual Tours', icon: 'view_in_ar', capability: 'virtual_tours.manage' },
  { to: '/dashboard/admin/title-verifications', label: 'Title Review', icon: 'verified', capability: 'title_verification.read' },
  { to: '/dashboard/admin/trust-appeals', label: 'Trust Appeals', icon: 'balance', capability: 'trust.read' },
  { to: '/dashboard/admin/manage-payments', label: 'Payments', icon: 'payments', capability: 'finance.read' },
  { to: '/dashboard/admin/revenue', label: 'Finance Revenue', icon: 'receipt_long', capability: 'finance.read' },
  { to: '/dashboard/admin/cart-checkouts', label: 'Cart Checkouts', icon: 'receipt_long', capability: 'finance.read' },
  { to: '/dashboard/admin/wallet', label: 'Platform Ledger', icon: 'account_balance_wallet', capability: 'finance.read' },
  { to: '/dashboard/admin/escrows', label: 'Escrow Management', icon: 'shield_lock', capability: ['escrow.read', 'finance.read'] },
  { to: '/dashboard/admin/escrow-disputes', label: 'Escrow Disputes', icon: 'gavel', capability: 'escrow.read' },
  { to: '/dashboard/admin/installments', label: 'Installments', icon: 'schedule', capability: 'search.installment.read' },
  { to: '/dashboard/admin/roi-assumptions', label: 'ROI Assumptions', icon: 'monitoring', capability: 'roi.manage' },
  { to: '/dashboard/admin/policies', label: 'Policies', icon: 'policy', capability: 'policies.read' },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, adminAccess, logout } = useAuth();
  const navigate = useNavigate();
  const hasScrolled = useHasScrolled(8);
  const sidebarRef = usePreservedSidebarScroll('admin');
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
      <aside ref={sidebarRef} className={`h-screen w-64 fixed left-0 top-0 bg-slate-50 flex flex-col p-4 z-50 overflow-y-auto overscroll-contain transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-4">
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900 font-headline">REALTIQ</h1>
          <p className="text-xs text-secondary font-medium uppercase tracking-widest mt-1">Admin Console</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navLinks.filter((link) => link.to === '/dashboard/admin/staff-access-changes'
            ? canManageAdminStaff(adminAccess)
            : Array.isArray(link.capability)
              ? hasAnyAdminCapability(adminAccess, link.capability)
              : hasAdminCapability(adminAccess, link.capability)).map((link) => (
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
              <span aria-hidden="true" className="material-symbols-outlined">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-200 space-y-1">
          {!isAdminAccessReadOnly(adminAccess) && hasAdminCapability(adminAccess, 'dashboard.read') ? <NavLink
            to="/dashboard/admin/settings"
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </NavLink> : null}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined">logout</span>
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
        {adminAccess?.capabilities.some((capability) => capability.startsWith('search.')) ? <AdminGlobalSearch /> : <div className="min-w-0 flex-1" />}

        <div className="flex items-center gap-3 sm:gap-6 text-sm font-medium justify-end">
          <button className="hidden text-primary font-bold hover:underline sm:block" onClick={() => void navigate('/contact')}>
            Support
          </button>
          <div className="flex items-center gap-3 text-slate-500">
            {hasAdminCapability(adminAccess, 'marketing.manage') ? <Link aria-label="Digest" to="/dashboard/admin/notifications/digest" className="hover:text-slate-900 transition-opacity duration-150"><span aria-hidden="true" className="material-symbols-outlined">campaign</span></Link> : null}
            {hasAdminCapability(adminAccess, 'support.read') ? <Link aria-label="Inquiries" to="/dashboard/admin/manage-inquiries" className="hover:text-slate-900 transition-opacity duration-150"><span aria-hidden="true" className="material-symbols-outlined">help_outline</span></Link> : null}
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-6">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-on-surface">{user?.name ?? 'Admin'}</p>
              <p className="max-w-44 truncate text-[10px] text-secondary" title={adminAccess?.departmentAssignments.map((department) => department.label).join(' · ')}>
                {adminAccess?.departmentAssignments.map((department) => department.label).join(' · ') || 'Admin Console'}
              </p>
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
