import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { escrowService } from './escrowService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() }, ApiRequestError: class extends Error {} }));
const mockedApi = vi.mocked(api);

describe('escrowService', () => {
  beforeEach(() => { sessionStorage.clear(); });
  it('sends default-rule and custom-rule create payloads unchanged', async () => {
    mockedApi.post.mockResolvedValue({ data: { _id: 'e1' } });
    await escrowService.create({ propertyId: 'p1', amount: 50_000_000 });
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow', { propertyId: 'p1', amount: 50_000_000 });
    const rules = [{ type: 'inspection_completed' as const, description: 'Inspect property', required: true, amount: 50_000_000, metadata: {} }];
    await escrowService.create({ propertyId: 'p1', amount: 50_000_000, rules });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/escrow', { propertyId: 'p1', amount: 50_000_000, rules });
    expect(typeof rules[0].amount).toBe('number');
  });
  it('uses every mutation endpoint with the required body', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} }); mockedApi.post.mockResolvedValue({ data: {} });
    await escrowService.satisfyRule('e1', 'r1', 'checked');
    await escrowService.requestRelease('e1', 'ready');
    await escrowService.approveRelease('e1', 'approved');
    await escrowService.cancel('e1', 'duplicate');
    await escrowService.dispute('e1', { reason: 'title issue', evidence: [{ document: 'title' }] });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/rules/r1/satisfy', { note: 'checked' });
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/request-release', { note: 'ready' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/approve-release', { note: 'approved' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/cancel', { note: 'duplicate' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/escrow/e1/dispute', { reason: 'title issue', evidence: [{ document: 'title' }] });
  });
  it('preserves milestone create and satisfaction response amounts', async () => {
    const created = {
      _id: 'e1',
      amount: 100_000_000,
      status: 'pending_payment',
      rules: [{ _id: 'r1', sequence: 1, type: 'inspection_completed', description: 'Inspect', required: true, amount: 100_000_000, satisfied: false }],
      milestoneSummary: { configured: true, totalAllocated: 100_000_000, satisfiedAmount: 0, remainingAmount: 100_000_000, milestoneCount: 1, satisfiedMilestoneCount: 0 },
    };
    mockedApi.post.mockResolvedValueOnce({ data: created });
    await expect(escrowService.create({
      propertyId: 'p1',
      amount: 100_000_000,
      rules: [{ type: 'inspection_completed', description: 'Inspect', required: true, amount: 100_000_000 }],
    })).resolves.toEqual(created);

    const satisfied = {
      escrow: { _id: 'e1', status: 'locked', amount: 100_000_000 },
      rule: { ...created.rules[0], satisfied: true },
      missingRules: [],
      milestoneSummary: { ...created.milestoneSummary, satisfiedAmount: 100_000_000, remainingAmount: 0, satisfiedMilestoneCount: 1 },
    };
    mockedApi.patch.mockResolvedValueOnce({ data: satisfied });
    await expect(escrowService.satisfyRule('e1', 'r1')).resolves.toEqual(satisfied);
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
    await escrowService.saveRefundDetails('e1', { accountNumber: '0123456789', bankName: 'Bank', bankCode: '001' });
    const result = await escrowService.processRefund('e1');
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/refund-chat/request-details', { message: 'Please send details' });
    expect(mockedApi.get).toHaveBeenCalledWith('/escrow/e1/refund-chat');
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/refund-chat/messages', { message: 'Hello' });
    expect(mockedApi.post).toHaveBeenCalledWith('/escrow/e1/refund-account-details', { accountNumber: '0123456789', bankName: 'Bank', bankCode: '001' });
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/escrows/e1/process-refund', {}); expect(result.status).toBe(202);
  });
  it('maps admin dispute list, detail, and four-option resolution routes', async () => {
    mockedApi.get.mockResolvedValue({ data: { items: [], pagination: { page: 2, limit: 20, total: 0, pages: 0 } } });
    mockedApi.patch.mockResolvedValue({ data: { escrow: { _id: 'e1', status: 'release_processing' }, pending: true }, status: 202 });
    await escrowService.listAdminDisputes({ page: 2, limit: 20, status: 'open', search: 'lekki' });
    await escrowService.getAdminDispute('d1');
    const result = await escrowService.resolveAdminDispute('d1', { action: 'release_seller', reason: 'Milestones complete' });
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/escrow-disputes', { params: { page: 2, limit: 20, status: 'open', search: 'lekki' } });
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/escrow-disputes/d1');
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/escrow-disputes/d1/resolve', { action: 'release_seller', reason: 'Milestones complete' });
    expect(result.status).toBe(202);
  });
  it('uses seller-owned payout account routes', async () => {
    mockedApi.get.mockResolvedValue({ data: { configured: false } });
    mockedApi.put.mockResolvedValue({ data: { configured: true, maskedAccountNumber: '******6789' } });
    await escrowService.getPayoutAccount();
    await escrowService.savePayoutAccount({ accountNumber: '0123456789', bankCode: '058', bankName: 'GTBank' });
    expect(mockedApi.get).toHaveBeenCalledWith('/escrow/payout-account');
    expect(mockedApi.put).toHaveBeenCalledWith('/escrow/payout-account', { accountNumber: '0123456789', bankCode: '058', bankName: 'GTBank' });
  });
});
