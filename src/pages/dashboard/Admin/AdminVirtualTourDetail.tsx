import { useParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { virtualTourService } from '../../../services/virtualTourService';

const AdminVirtualTourDetail = () => {
  const { propertyId = '' } = useParams();
  const { data, loading, error, execute } = useAsync(() => virtualTourService.getAdminVirtualTour(propertyId), Boolean(propertyId));
  return <AdminLayout><main className="mx-auto max-w-5xl space-y-6 p-8"><header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Safe provider data</p><h1 className="text-3xl font-black">Virtual Tour Detail</h1></header>{loading ? <LoadingState label="Loading safe detail..." /> : error ? <ErrorState message={error} onRetry={() => void execute()} /> : data ? <><section className="rounded-xl bg-white p-6"><h2 className="text-xl font-black">{data.property.title}</h2><p className="text-sm text-secondary">{data.property.publicReference} · resolved {data.resolvedProvider ?? 'none'}{data.fallbackUsed ? ' via fallback' : ''}</p><p className="mt-2 text-sm">Project: {data.project?.name ?? 'None'} · Owner: {data.owner?.name ?? 'None'}</p></section><section className="grid gap-5 md:grid-cols-2">{(['realsee','matterport'] as const).map((provider) => { const config = data.providers[provider]; return <article key={provider} className="rounded-xl bg-white p-6"><h2 className="font-black capitalize">{provider}</h2><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-secondary">Status</dt><dd>{config.status}</dd></div><div><dt className="text-secondary">Enabled</dt><dd>{config.enabled ? 'Yes' : 'No'}</dd></div><div><dt className="text-secondary">Identifier</dt><dd>{provider === 'realsee' ? data.providers.realsee.workId : data.providers.matterport.modelSid}</dd></div><div><dt className="text-secondary">Failure</dt><dd>{config.failureReason ?? 'None'}</dd></div></dl></article>; })}</section></> : null}</main></AdminLayout>;
};
export default AdminVirtualTourDetail;
