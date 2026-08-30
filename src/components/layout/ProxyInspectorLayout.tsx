import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const links = [
  ['/proxy/tasks', 'Tasks'], ['/proxy-inspector/onboarding', 'Verification'],
  ['/proxy-inspector/payout-account', 'Payout account'], ['/proxy-inspectors', 'Public directory'],
] as const;
const ProxyInspectorLayout = ({ children, title }: { children: ReactNode; title: string }) => {
  const { user, logout } = useAuth();
  return <div className="min-h-screen bg-surface"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">RealtIQ Verified Property Agent Portal</p><h1 className="text-xl font-black">{title}</h1></div><nav className="flex flex-wrap gap-2">{links.map(([to,label]) => <NavLink key={to} to={to} className={({isActive}) => `rounded-lg px-3 py-2 text-sm font-bold ${isActive ? 'bg-primary text-on-primary' : 'bg-surface-container-low'}`}>{label}</NavLink>)}<button onClick={logout} className="rounded-lg px-3 py-2 text-sm font-bold">Log out</button></nav><p className="w-full text-xs text-secondary sm:w-auto">{user?.name}</p></div></header><main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main></div>;
};
export default ProxyInspectorLayout;
