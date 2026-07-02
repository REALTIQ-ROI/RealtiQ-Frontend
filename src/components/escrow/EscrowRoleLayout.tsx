import type { ReactNode } from 'react';
import AdminLayout from '../layout/AdminLayout';
import BuyerPortalLayout from '../layout/BuyerPortalLayout';
import LandlordPortalLayout from '../layout/LandlordPortalLayout';
import { useAuth } from '../../contexts/AuthContext';

const EscrowRoleLayout = ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminLayout><section className="mx-auto max-w-7xl px-4 py-8 sm:px-8"><header className="mb-8"><p className="text-xs font-bold uppercase tracking-widest text-secondary">Escrow Management</p><h1 className="mt-2 text-3xl font-extrabold text-primary sm:text-4xl">{title}</h1>{subtitle ? <p className="mt-2 max-w-2xl text-sm text-secondary">{subtitle}</p> : null}</header>{children}</section></AdminLayout>;
  if (user?.role === 'landlord') return <LandlordPortalLayout active="escrows" title={title}><section className="mx-auto max-w-7xl px-4 py-8 sm:px-8"><header className="mb-8"><h1 className="text-3xl font-extrabold text-primary">{title}</h1>{subtitle ? <p className="mt-2 text-sm text-secondary">{subtitle}</p> : null}</header>{children}</section></LandlordPortalLayout>;
  return <BuyerPortalLayout pageTitle={title} pageSubtitle={subtitle}>{children}</BuyerPortalLayout>;
};
export default EscrowRoleLayout;
