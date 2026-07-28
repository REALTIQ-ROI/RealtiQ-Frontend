import { useParams } from 'react-router-dom';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import ProxyInspectorLayout from '../../components/layout/ProxyInspectorLayout';
import AdminLayout from '../../components/layout/AdminLayout';
import ProxyWorkspace from '../../components/proxyNetwork/ProxyWorkspace';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import { shouldPollProxyDetail } from '../../features/proxyNetwork/selectors';
import { useProxyResource } from '../../features/proxyNetwork/useProxyResource';
import { proxyNetworkService } from '../../services/proxyNetworkService';

const loadParticipant = async (id: string, role: 'buyer'|'proxy_inspector', signal: AbortSignal) => {
  const detail = role === 'proxy_inspector' ? await proxyNetworkService.getInspectorTask(id,signal) : await proxyNetworkService.getDetail(id,signal);
  const [conversation,payout] = await Promise.all([
    proxyNetworkService.getConversation(id,signal).catch(() => detail.conversation),
    role === 'proxy_inspector' ? proxyNetworkService.getPayoutAccount(signal).catch(() => null) : Promise.resolve(null),
  ]);
  return { detail: {...detail,conversation}, payoutVerified: !!payout?.verifiedAt };
};
const Shell = ({ role }: { role: 'buyer'|'proxy_inspector'|'admin' }) => {
  const { requestId = '' } = useParams();
  const resource = useProxyResource(async (signal) => {
    if (role === 'admin') {
      const detail = await proxyNetworkService.getAdminJob(requestId,signal);
      const profileId = typeof detail.request.inspectorProfile === 'string' ? detail.request.inspectorProfile : detail.request.inspectorProfile._id;
      const inspector = profileId ? await proxyNetworkService.getAdminInspector(profileId,signal).catch(() => null) : null;
      return { detail: { ...detail, payoutAccount: inspector?.payoutAccount ?? detail.payoutAccount }, payoutVerified: !!inspector?.payoutAccount?.verifiedAt };
    }
    return loadParticipant(requestId,role,signal);
  }, [requestId,role], { poll: (value) => shouldPollProxyDetail(value?.detail) });
  const content = resource.loading && !resource.data ? <LoadingState label="Loading inspection workspace…" /> : resource.status === 404 ? <div className="py-20 text-center"><h2 className="text-2xl font-black">Inspection job not found</h2><p className="mt-2 text-secondary">It may not exist or you may not participate in it.</p></div> : resource.status === 403 ? <div className="py-20 text-center"><h2 className="text-2xl font-black">Access denied</h2><p className="mt-2 text-secondary">You do not have access to this private inspection job.</p></div> : resource.error || !resource.data ? <ErrorState message={resource.error?.message || 'Unable to load inspection.'} onRetry={() => void resource.reload()} /> : <ProxyWorkspace detail={resource.data.detail} requestId={requestId} role={role} payoutVerified={resource.data.payoutVerified} reload={resource.reload} />;
  if (role === 'buyer') return <BuyerPortalLayout pageTitle="Inspection Workspace">{content}</BuyerPortalLayout>;
  if (role === 'proxy_inspector') return <ProxyInspectorLayout title="Task workspace">{content}</ProxyInspectorLayout>;
  return <AdminLayout><main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{content}</main></AdminLayout>;
};
export const BuyerProxyWorkspace = () => <Shell role="buyer" />;
export const InspectorProxyWorkspace = () => <Shell role="proxy_inspector" />;
export const AdminProxyWorkspace = () => <Shell role="admin" />;
