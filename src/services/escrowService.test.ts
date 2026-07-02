import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { escrowService } from './escrowService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, ApiRequestError: class extends Error {} }));
const mockedApi = vi.mocked(api);

describe('escrowService', () => {
  beforeEach(() => { sessionStorage.clear(); });
  it('sends default-rule and custom-rule create payloads unchanged', async () => {
    mockedApi.post.mockResolvedValue({ data: { _id: 'e1' } });
    await escrowService.create({ propertyId: 'p1', amount: 50_000_000 });
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow', { propertyId: 'p1', amount: 50_000_000 });
    const rules = [{ type: 'inspection_completed' as const, description: 'Inspect property', required: true, metadata: {} }];
    await escrowService.create({ propertyId: 'p1', amount: 50_000_000, rules });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/escrow', { propertyId: 'p1', amount: 50_000_000, rules });
  });
  it('uses every mutation endpoint with the required body', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} }); mockedApi.post.mockResolvedValue({ data: {} });
    await escrowService.satisfyRule('e1', 'r1', 'checked');
    await escrowService.requestRelease('e1', 'ready');
    await escrowService.approveRelease('e1', 'approved');
    await escrowService.cancel('e1', 'duplicate');
    await escrowService.dispute('e1', 'title issue', { document: 'title' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/rules/r1/satisfy', { note: 'checked' });
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/request-release', { note: 'ready' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/approve-release', { note: 'approved' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/cancel', { note: 'duplicate' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/dispute', { note: 'title issue', metadata: { document: 'title' } });
  });
  it('persists only escrow checkout context when payment is initialized', async () => {
    mockedApi.post.mockResolvedValue({ data: { redirectUrl: 'https://pay.test', reference: 'ref1', paymentId: 'pay1', escrowId: 'e1' } });
    await escrowService.initializePayment('e1');
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/initialize-payment');
    expect(escrowService.getPendingId()).toBe('e1'); expect(escrowService.getPendingReference()).toBe('ref1');
  });
  it('lists and gets role-authorized escrow resources', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: { _id: 'e1' } });
    await escrowService.list(); await escrowService.get('e1');
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/escrow'); expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/escrow/e1');
  });
  it('uses all refund endpoints and preserves account numbers as strings', async () => {
    mockedApi.get.mockResolvedValue({ data: { conversation: null, messages: [] } });
    mockedApi.post.mockResolvedValue({ data: {}, status: 202 }); mockedApi.patch.mockResolvedValue({ data: {} });
    await escrowService.requestRefundDetails('e1', ' Please send details ');
    await escrowService.getRefundChat('e1'); await escrowService.sendRefundMessage('e1', ' Hello ');
    await escrowService.saveRefundDetails('e1', { accountName: 'Ada', accountNumber: '0123456789', bankName: 'Bank', bankCode: '001' });
    const result = await escrowService.processRefund('e1');
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/refund-chat/request-details', { message: 'Please send details' });
    expect(mockedApi.get).toHaveBeenCalledWith('/escrow/e1/refund-chat');
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/refund-chat/messages', { message: 'Hello' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/refund-details', { accountName: 'Ada', accountNumber: '0123456789', bankName: 'Bank', bankCode: '001' });
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/process-refund', {}); expect(result.status).toBe(202);
  });
});
