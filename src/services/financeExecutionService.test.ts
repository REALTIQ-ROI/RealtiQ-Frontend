import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { financeExecutionService } from './financeExecutionService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('Finance execution routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the documented nested execution envelopes', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { execution: { id: 'escrow-refund' } } }).mockResolvedValueOnce({ data: { settlement: { id: 'proxy-settlement' } } }).mockResolvedValueOnce({ data: { refundExecution: { id: 'proxy-refund' } } });
    expect((await financeExecutionService.getEscrowRefund('escrow-id')).id).toBe('escrow-refund');
    expect((await financeExecutionService.getProxySettlement('request-id')).id).toBe('proxy-settlement');
    expect((await financeExecutionService.getProxyRefund('request-id')).id).toBe('proxy-refund');
    expect(api.get).toHaveBeenNthCalledWith(1, '/admin/escrows/escrow-id/refund-execution');
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/proxy-inspections/request-id/settlement');
    expect(api.get).toHaveBeenNthCalledWith(3, '/admin/proxy-inspections/request-id/refund-execution');
  });

  it('reconciles existing references and authorizes only the selected transfer using distinct challenges', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    await financeExecutionService.reconcileEscrowRefund('escrow-id', 'challenge-1');
    await financeExecutionService.authorizeEscrowRefund('escrow-id', 'beneficiary-1', { authorizationCode: '1234' }, 'challenge-2');
    await financeExecutionService.reconcileProxySettlement('request-id', 'challenge-3');
    await financeExecutionService.authorizeProxySettlement('request-id', 'beneficiary-2', { authorizationCode: '5678' }, 'challenge-4');
    await financeExecutionService.reconcileProxyRefund('request-id', 'challenge-5');
    await financeExecutionService.authorizeProxyRefund('request-id', { authorizationCode: '9012' }, 'challenge-6');
    expect(api.post).toHaveBeenNthCalledWith(1, '/admin/escrows/escrow-id/refund-execution/reconcile', {}, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
    expect(api.post).toHaveBeenNthCalledWith(2, '/admin/escrows/escrow-id/refund-execution/beneficiaries/beneficiary-1/authorize-transfer', { authorizationCode: '1234' }, { headers: { 'X-Step-Up-Challenge': 'challenge-2' } });
    expect(api.post).toHaveBeenNthCalledWith(3, '/admin/proxy-inspections/request-id/settlement/reconcile', {}, { headers: { 'X-Step-Up-Challenge': 'challenge-3' } });
    expect(api.post).toHaveBeenNthCalledWith(4, '/admin/proxy-inspections/request-id/settlement/beneficiaries/beneficiary-2/authorize-transfer', { authorizationCode: '5678' }, { headers: { 'X-Step-Up-Challenge': 'challenge-4' } });
    expect(api.post).toHaveBeenNthCalledWith(5, '/admin/proxy-inspections/request-id/refund-execution/reconcile', {}, { headers: { 'X-Step-Up-Challenge': 'challenge-5' } });
    expect(api.post).toHaveBeenNthCalledWith(6, '/admin/proxy-inspections/request-id/refund-execution/authorize-transfer', { authorizationCode: '9012' }, { headers: { 'X-Step-Up-Challenge': 'challenge-6' } });
  });
});
