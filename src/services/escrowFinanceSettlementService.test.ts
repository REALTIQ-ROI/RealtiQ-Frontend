import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { escrowFinanceSettlementService } from './escrowFinanceSettlementService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('Finance escrow settlement contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads beneficiary state through the selected-profile API client', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { settlement: null, complete: false } });
    await escrowFinanceSettlementService.get('escrow-1');
    expect(api.get).toHaveBeenCalledWith('/escrow/escrow-1/settlement');
  });

  it('binds a fresh challenge to the exact empty reconciliation body', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { settlement: null, complete: false, reconciliationRequired: true } });
    await escrowFinanceSettlementService.reconcile('escrow-1', 'challenge-1');
    expect(api.post).toHaveBeenCalledWith('/escrow/escrow-1/settlement/reconcile', {}, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('authorizes only the selected beneficiary with the provider code and bound challenge', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { settlement: null, complete: false } });
    await escrowFinanceSettlementService.authorizeTransfer('escrow-1', 'beneficiary-2', { authorizationCode: '123456' }, 'challenge-2');
    expect(api.post).toHaveBeenCalledWith('/escrow/escrow-1/settlement/beneficiaries/beneficiary-2/authorize-transfer', { authorizationCode: '123456' }, { headers: { 'X-Step-Up-Challenge': 'challenge-2' } });
  });
});
