import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { legalHoldService } from './legalHoldService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('legalHoldService', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses the documented list filters and response projection', async () => {
    const response = { holds: [], nextCursor: null };
    vi.mocked(api.get).mockResolvedValue({ data: response } as never);
    await expect(legalHoldService.list({ limit: 50, state: 'active', subjectKind: 'profile' })).resolves.toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/admin/legal-holds', { params: { limit: 50, state: 'active', subjectKind: 'profile' } });
  });
  it('binds create and independent release payloads to their exact routes', async () => {
    const hold = { id: 'hold-1', version: 1, state: 'active' };
    vi.mocked(api.post).mockResolvedValue({ data: { hold } } as never);
    const create = { subjectKind: 'profile' as const, subjectId: 'profile-1', category: 'account_profile' as const, reasonCode: 'identity_review' as const, operationKey: 'legal_hold_12345678' };
    await legalHoldService.create(create, 'create-proof');
    await legalHoldService.release('hold-1', { expectedVersion: 1, reasonCode: 'resolved' }, 'release-proof');
    expect(api.post).toHaveBeenNthCalledWith(1, '/admin/legal-holds', create, { headers: { 'X-Step-Up-Challenge': 'create-proof' } });
    expect(api.post).toHaveBeenNthCalledWith(2, '/admin/legal-holds/hold-1/release', { expectedVersion: 1, reasonCode: 'resolved' }, { headers: { 'X-Step-Up-Challenge': 'release-proof' } });
  });
});
