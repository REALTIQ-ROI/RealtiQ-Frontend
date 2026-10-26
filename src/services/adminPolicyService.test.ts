import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { adminPolicyService } from './adminPolicyService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

describe('adminPolicyService', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses only current approved manual sources returned by policy', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { policy: { key: 'company_verification', state: 'approved', revision: 3, value: { manualSources: ['official_registry', 'approved_provider'] } } } } as never);
    await expect(adminPolicyService.getCompanyVerificationManualSources()).resolves.toEqual({ revision: 3, sources: ['official_registry', 'approved_provider'] });
    expect(api.get).toHaveBeenCalledWith('/admin/policies/company_verification');
  });
  it('does not enable approval when the current policy is unapproved or lacks manualSources', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { policy: { key: 'company_verification', state: 'unconfigured', revision: 0, value: {} } } } as never);
    await expect(adminPolicyService.getCompanyVerificationManualSources()).rejects.toThrow(/not currently approved/);
  });
});
