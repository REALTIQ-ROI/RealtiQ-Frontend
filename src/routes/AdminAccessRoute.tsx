import { useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from '../components/ui/LoadingState';
import { canManageAdminStaff, hasAnyAdminCapability, hasAdminCapability } from '../services/adminAccessService';

export const AdminAccessBoundary = ({ children }: { children: ReactNode }) => {
  const { activeProfile, profileError, refreshProfiles, adminAccess, adminAccessNotAssigned, adminAccessError, adminAccessLoading, refreshAdminAccess, logout } = useAuth();
  const navigate = useNavigate();
  const [checkingOnEntry, setCheckingOnEntry] = useState(true);

  useEffect(() => {
    if (!activeProfile?.id) return;
    let current = true;
    setCheckingOnEntry(true);
    void refreshAdminAccess(activeProfile.id).catch(() => undefined).finally(() => {
      if (current) setCheckingOnEntry(false);
    });
    return () => { current = false; };
  }, [activeProfile?.id, refreshAdminAccess]);

  if ((adminAccessNotAssigned && (!adminAccess || (!adminAccess.staffDepartments.length && !adminAccess.capabilities.length))) || (adminAccess && !adminAccess.staffDepartments.length && !adminAccess.capabilities.length)) return <main className="mx-auto max-w-xl p-8">
    <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm" role="status">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-800">Admin Console</p>
      <h1 className="mt-2 text-2xl font-bold text-primary">Staff access is not assigned</h1>
      <p className="mt-3 text-sm text-secondary">This admin account has no active staff department or console capability. An authorized deployment operator or Executive administrator must assign access.</p>
      <button type="button" className="mt-5 rounded-lg border border-outline-variant/30 px-4 py-2 font-semibold" onClick={() => { logout(); void navigate('/auth/admin/login'); }}>Sign out</button>
    </section>
  </main>;
  if (!activeProfile && profileError) return <main className="mx-auto max-w-xl p-8" role="alert">
    <h1 className="text-2xl font-bold text-primary">Staff profile could not be loaded</h1>
    <p className="mt-3 text-sm text-secondary">{profileError}</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" className="rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary" onClick={() => void refreshProfiles().catch(() => undefined)}>Reload staff profile</button>
      <button type="button" className="rounded-lg border border-outline-variant/30 px-4 py-2 font-semibold" onClick={() => { logout(); void navigate('/auth/admin/login'); }}>Sign in again</button>
    </div>
  </main>;
  if (!activeProfile) return <LoadingState label="Checking your staff profile…" />;
  if (checkingOnEntry || adminAccessLoading) return <LoadingState label="Verifying Admin Console access…" />;
  if (adminAccessError || !adminAccess) return <main className="mx-auto max-w-xl p-8" role="alert">
    <h1 className="text-2xl font-bold text-primary">Admin access could not be verified</h1>
    <p className="mt-3 text-sm text-secondary">{adminAccessError ?? 'The current staff profile has no verified Admin Console access.'}</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" className="rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary" onClick={() => void refreshAdminAccess(activeProfile.id).catch(() => undefined)}>Retry access check</button>
      <button type="button" className="rounded-lg border border-outline-variant/30 px-4 py-2 font-semibold" onClick={() => { logout(); void navigate('/auth/admin/login'); }}>Sign in again</button>
    </div>
  </main>;
  return <>{children}</>;
};

export const AdminAccessRoute = () => <AdminAccessBoundary><Outlet /></AdminAccessBoundary>;

interface AdminCapabilityRouteProps {
  capability: string | readonly string[];
  children: ReactNode;
  allowReadOnly?: boolean;
}

export const AdminCapabilityRoute = ({ capability, children, allowReadOnly = false }: AdminCapabilityRouteProps) => {
  const { adminAccess } = useAuth();
  const asksToManageStaff = Array.isArray(capability)
    ? capability.includes('staff.access.manage')
    : capability === 'staff.access.manage';
  const permitted = (asksToManageStaff
    ? canManageAdminStaff(adminAccess)
    : (!adminAccess?.readOnly || allowReadOnly) && (Array.isArray(capability)
    ? hasAnyAdminCapability(adminAccess, capability)
    : hasAdminCapability(adminAccess, capability as string)));
  if (permitted) return <>{children}</>;
  return <main className="mx-auto max-w-2xl p-8">
    <section className="rounded-2xl border border-outline-variant/20 bg-white p-6" role="status">
      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Department access</p>
      <h1 className="mt-2 text-2xl font-bold text-primary">This Admin Console section is unavailable</h1>
      <p className="mt-3 text-sm text-secondary">The current server-issued access projection does not include the capability required for this section. Your role label alone does not grant access.</p>
      <Link className="mt-5 inline-flex font-semibold text-primary underline" to="/dashboard/admin">Return to your available Admin Console sections</Link>
    </section>
  </main>;
};
