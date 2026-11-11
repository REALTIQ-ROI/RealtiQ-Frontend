import { useParams } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import FinanceExecutionPanel from '../../../components/escrow/FinanceExecutionPanel';
import { useAuth } from '../../../contexts/AuthContext';

const ProxyFinanceExecution = () => {
  const { requestId = '' } = useParams();
  const { activeProfile } = useAuth();
  return <AdminLayout><main className="mx-auto max-w-5xl p-4 sm:p-8"><h1 className="text-3xl font-black">Inspection Finance execution</h1><p className="mt-2 text-sm text-secondary">Current provider settlement and refund status for this inspection request.</p>
    {/^[0-9a-f]{24}$/i.test(requestId) ? <><FinanceExecutionPanel key={`settlement:${activeProfile?.id}:${requestId}`} kind="proxy_settlement" resourceId={requestId} /><FinanceExecutionPanel key={`refund:${activeProfile?.id}:${requestId}`} kind="proxy_refund" resourceId={requestId} /></> : <p role="alert" className="mt-4 text-sm">This inspection request reference is invalid.</p>}
  </main></AdminLayout>;
};

export default ProxyFinanceExecution;
