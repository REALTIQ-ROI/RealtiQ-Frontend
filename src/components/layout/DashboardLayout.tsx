import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardSidebar from './DashboardSidebar';

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface text-on-surface px-6 py-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <DashboardSidebar role={user?.role ?? 'buyer'} />
        <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">{children}</section>
      </div>
    </div>
  );
};

export default DashboardLayout;