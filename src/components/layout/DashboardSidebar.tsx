import { NavLink } from 'react-router-dom';
import type { UserRole } from '../../types';

interface DashboardSidebarProps {
  role: UserRole;
}

const roleLinks: Record<UserRole, Array<{ to: string; label: string }>> = {
  buyer: [
    { to: '/dashboard/buyer', label: 'Overview' },
    { to: '/dashboard/buyer/my-properties', label: 'My Properties' },
    { to: '/dashboard/buyer/tours', label: 'Tours' },
    { to: '/dashboard/buyer/installments', label: 'Installments' },
    { to: '/dashboard/roi-scenarios', label: 'ROI Scenarios' },
    { to: '/dashboard/buyer/payment-history', label: 'Payments' },
    { to: '/dashboard/buyer/inquiry-history', label: 'Inquiries' },
    { to: '/dashboard/buyer/profile-settings', label: 'Profile' },
  ],
  landlord: [
    { to: '/dashboard/landlord', label: 'Overview' },
    { to: '/dashboard/landlord/my-properties', label: 'My Properties' },
    { to: '/dashboard/landlord/add-property', label: 'Add Property' },
    { to: '/dashboard/landlord/tours', label: 'Tours' },
    { to: '/dashboard/landlord/installments', label: 'Installments' },
    { to: '/dashboard/landlord/inquiries', label: 'Inquiries' },
    { to: '/dashboard/landlord/payment-history', label: 'Payments' },
  ],
  admin: [
    { to: '/dashboard/admin', label: 'Overview' },
    { to: '/dashboard/admin/manage-users', label: 'Users' },
    { to: '/dashboard/admin/manage-properties', label: 'Properties' },
    { to: '/dashboard/admin/manage-payments', label: 'Payments' },
    { to: '/dashboard/admin/manage-inquiries', label: 'Inquiries' },
    { to: '/dashboard/admin/tours', label: 'Tours' },
    { to: '/dashboard/admin/installments', label: 'Installments' },
    { to: '/dashboard/admin/roi-assumptions', label: 'ROI Assumptions' },
    { to: '/dashboard/admin/notifications/digest', label: 'Digest' },
  ],
};

const DashboardSidebar = ({ role }: DashboardSidebarProps) => {
  return (
    <aside className="w-full lg:w-72 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 lg:sticky lg:top-24 h-fit">
      <p className="text-xs uppercase tracking-widest text-secondary mb-4">{role} dashboard</p>
      <nav className="space-y-2">
        {roleLinks[role].map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-semibold ${
                isActive ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-low text-on-surface'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;
