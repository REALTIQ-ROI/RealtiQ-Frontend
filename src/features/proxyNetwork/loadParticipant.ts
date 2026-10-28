import { ApiRequestError } from '../../lib/axios';
import { proxyNetworkService } from '../../services/proxyNetworkService';

export const loadParticipant = async (id: string, role: 'buyer' | 'proxy_inspector', signal: AbortSignal) => {
  const detail = role === 'proxy_inspector'
    ? await proxyNetworkService.getInspectorTask(id, signal)
    : await proxyNetworkService.getDetail(id, signal);
  const [conversation, report, evidence, payout] = await Promise.all([
    proxyNetworkService.getConversation(id, signal).catch(() => detail.conversation),
    proxyNetworkService.getReport(id, signal).catch((error: unknown) => {
      if (error instanceof ApiRequestError && error.status === 404 && error.message === 'Inspection report not found') return detail.report;
      throw error;
    }),
    proxyNetworkService.getEvidence(id, signal).catch(() => detail.evidence),
    role === 'proxy_inspector' ? proxyNetworkService.getPayoutAccount(signal).catch(() => null) : Promise.resolve(null),
  ]);
  return { detail: { ...detail, conversation, report, evidence }, payoutVerified: !!payout?.verifiedAt };
};
