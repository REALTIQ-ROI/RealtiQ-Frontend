import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { dataProtectionService } from './dataProtectionService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('dataProtectionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts a field-scoped correction with the bound challenge', async () => {
    const request = { id: 'request-1', profileId: 'profile-1', requestType: 'correction', state: 'submitted', version: 0, submittedAt: '2026-10-26T09:00:00Z', reviewedAt: null, completedAt: null, resultCodes: [], scopes: ['account_identity'], correctionFields: ['account_phone'] };
    vi.mocked(api.post).mockResolvedValue({ data: { request } } as never);
    const payload = {
      requestType: 'correction' as const,
      scopes: ['account_identity' as const],
      correctionFields: ['account_phone' as const],
      corrections: { account_phone: '+2348012345678' },
      operationKey: 'privacy_correction_12345678',
      expectedProfileVersion: 4,
    };

    await expect(dataProtectionService.create(payload, 'challenge-1')).resolves.toEqual(request);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/data-protection-requests', payload, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('withdraws with the request version and a bound challenge', async () => {
    const request = { id: 'request-2', profileId: 'profile-1', requestType: 'access', state: 'withdrawn', version: 5, submittedAt: '2026-10-26T09:00:00Z', reviewedAt: null, completedAt: null, resultCodes: [] };
    vi.mocked(api.post).mockResolvedValue({ data: { request } } as never);

    await expect(dataProtectionService.withdraw('request/2', { expectedVersion: 4 }, 'challenge-2')).resolves.toEqual(request);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/data-protection-requests/request%2F2/withdraw', { expectedVersion: 4 }, { headers: { 'X-Step-Up-Challenge': 'challenge-2' } });
  });
});
