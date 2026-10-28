import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../lib/axios';
import type { ProxyInspectionDetail } from '../../types/proxyNetwork';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import { loadParticipant } from '../../features/proxyNetwork/loadParticipant';

vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    getDetail: vi.fn(),
    getInspectorTask: vi.fn(),
    getConversation: vi.fn(),
    getReport: vi.fn(),
    getEvidence: vi.fn(),
    getPayoutAccount: vi.fn(),
  },
}));

const baseDetail = {
  request: { _id: 'request-1', status: 'in_progress', requestedServices: [] },
  serviceEscrow: null,
  report: null,
  evidence: [],
  dispute: null,
} as unknown as ProxyInspectionDetail;

describe('proxy participant response recovery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('treats only the documented missing-report 404 as an absent report', async () => {
    vi.mocked(proxyNetworkService.getDetail).mockResolvedValue(baseDetail);
    vi.mocked(proxyNetworkService.getConversation).mockResolvedValue({ conversation: { _id: 'c1', type: 'proxy_inspection' }, messages: [] });
    vi.mocked(proxyNetworkService.getEvidence).mockResolvedValue([]);
    vi.mocked(proxyNetworkService.getReport).mockRejectedValue(
      new ApiRequestError('Inspection report not found', { status: 404 }),
    );

    await expect(loadParticipant('request-1', 'buyer', new AbortController().signal)).resolves.toMatchObject({
      detail: { report: null },
      payoutVerified: false,
    });
  });

  it('does not convert a forbidden report read into a successful missing-report state', async () => {
    vi.mocked(proxyNetworkService.getDetail).mockResolvedValue(baseDetail);
    vi.mocked(proxyNetworkService.getConversation).mockResolvedValue({ conversation: { _id: 'c1', type: 'proxy_inspection' }, messages: [] });
    vi.mocked(proxyNetworkService.getEvidence).mockResolvedValue([]);
    const forbidden = new ApiRequestError('You do not have access to this report.', { status: 403, code: 'FORBIDDEN' });
    vi.mocked(proxyNetworkService.getReport).mockRejectedValue(forbidden);

    await expect(loadParticipant('request-1', 'buyer', new AbortController().signal)).rejects.toBe(forbidden);
  });
});
