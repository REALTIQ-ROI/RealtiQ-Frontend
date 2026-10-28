import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { adminPolicyService, type AdminPolicyRevision } from './adminPolicyService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

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

  it('reads only the supported policy keys and preserves the history cursor', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { policy: { key: 'identity_email', state: 'unconfigured', revision: 0, value: null } } } as never);
    vi.mocked(api.get).mockResolvedValueOnce({ data: { revisions: [], nextCursor: 'opaque-cursor' } } as never);
    vi.mocked(api.get).mockResolvedValueOnce({ data: { policy: { key: 'retention', state: 'configured', revision: 2, value: { periods: [30, null, 90] } } } } as never);
    await expect(adminPolicyService.getPolicy('identity_email')).resolves.toMatchObject({ policy: { key: 'identity_email', state: 'unconfigured', revision: 0, value: null } });
    await expect(adminPolicyService.getHistory('identity_email', { limit: 25, before: 'prior-cursor' })).resolves.toEqual({ revisions: [], nextCursor: 'opaque-cursor' });
    await expect(adminPolicyService.getPolicy('retention')).resolves.toMatchObject({ policy: { key: 'retention', value: { periods: [30, null, 90] } } });
    expect(api.get).toHaveBeenNthCalledWith(1, '/admin/policies/identity_email');
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/policies/identity_email/history', { params: { limit: 25, before: 'prior-cursor' } });
    expect(api.get).toHaveBeenNthCalledWith(3, '/admin/policies/retention');
  });

  it('prepares the exact supplied policy body with a bound challenge header', async () => {
    const input = {
      value: { verificationTtlSeconds: 7200, resetTtlSeconds: 1800, cooldownSeconds: 300, deliveryAttempts: 2, retrySeconds: [60, 300] },
      reason: 'Policy owner approval REF-17', expectedRevision: 4,
    };
    const revision = { id: 'revision-1', key: 'identity_email', state: 'pending' } as AdminPolicyRevision;
    vi.mocked(api.post).mockResolvedValueOnce({ data: { revision } } as never);
    await expect(adminPolicyService.prepareRevision('identity_email', input, 'challenge-1')).resolves.toBe(revision);
    expect(api.post).toHaveBeenCalledWith('/admin/policies/identity_email/revisions', input, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('submits approval and rejection without a request body and binds each challenge', async () => {
    const revision = { id: 'revision/1', key: 'notification_delivery', state: 'approved' } as AdminPolicyRevision;
    vi.mocked(api.post).mockResolvedValue({ data: { revision } } as never);
    await adminPolicyService.decideRevision('notification_delivery', 'revision/1', 'approved', 'approve-challenge');
    await adminPolicyService.decideRevision('notification_delivery', 'revision/1', 'rejected', 'reject-challenge');
    expect(api.post).toHaveBeenNthCalledWith(1, '/admin/policies/notification_delivery/revisions/revision%2F1/approved', undefined, { headers: { 'X-Step-Up-Challenge': 'approve-challenge' } });
    expect(api.post).toHaveBeenNthCalledWith(2, '/admin/policies/notification_delivery/revisions/revision%2F1/rejected', undefined, { headers: { 'X-Step-Up-Challenge': 'reject-challenge' } });
  });

  it('requires a nonempty challenge for protected policy mutations', async () => {
    await expect(adminPolicyService.decideRevision('identity_email', 'revision-1', 'approved', ' ')).rejects.toThrow(/step-up challenge is required/);
    expect(api.post).not.toHaveBeenCalled();
  });
});
