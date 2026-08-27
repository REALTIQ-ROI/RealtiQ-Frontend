import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BuyerPortalLayout from '../layout/BuyerPortalLayout';
import LandlordPortalLayout from '../layout/LandlordPortalLayout';
import AdminLayout from '../layout/AdminLayout';
export default function PortalShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const landlordActive = pathname.startsWith('/dashboard/notifications')
    ? 'notifications'
    : pathname.startsWith('/messages')
      ? 'messages'
      : 'overview';
  if (user?.role === 'admin') return <AdminLayout>{children}</AdminLayout>;
  if (user?.role === 'landlord') return <LandlordPortalLayout active={landlordActive} title='Marketplace'>{children}</LandlordPortalLayout>;
  return <BuyerPortalLayout pageTitle='Marketplace'>{children}</BuyerPortalLayout>;
}
