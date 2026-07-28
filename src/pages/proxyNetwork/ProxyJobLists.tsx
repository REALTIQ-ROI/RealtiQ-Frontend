import { Link } from 'react-router-dom';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import ProxyInspectorLayout from '../../components/layout/ProxyInspectorLayout';
import AdminLayout from '../../components/layout/AdminLayout';
import ProxyJobList from '../../components/proxyNetwork/ProxyJobList';

export const BuyerProxyInspections = () => <BuyerPortalLayout pageTitle="Proxy Inspections" pageSubtitle="Private inspection requests, evidence, reports, and protected service payments."><ProxyJobList scope="buyer" basePath="/buyer/proxy-inspections"><Link to="/buyer/proxy-inspections/new" className="inline-block rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">New inspection request</Link></ProxyJobList></BuyerPortalLayout>;
export const InspectorTasks = () => <ProxyInspectorLayout title="Assigned inspection tasks"><ProxyJobList scope="inspector" basePath="/proxy/tasks" /></ProxyInspectorLayout>;
export const AdminProxyInspections = () => <AdminLayout><main className="mx-auto max-w-7xl px-4 py-8 sm:px-8"><h1 className="text-3xl font-black">Verified Property Agent Jobs</h1><p className="mt-2 text-secondary">All protected property-agent service jobs, disputes, and payout states.</p><ProxyJobList scope="admin" basePath="/admin/proxy-inspections" /></main></AdminLayout>;
