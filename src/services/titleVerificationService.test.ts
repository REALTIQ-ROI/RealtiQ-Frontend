import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { titleVerificationService } from './titleVerificationService';

vi.mock('../lib/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('titleVerificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends admin approve, reject, and revoke payloads with bound step-up', async () => {
    mockedApi.patch.mockResolvedValue({ data: { verification: { verificationId: 'tv1', status: 'published' } } });

    await titleVerificationService.reviewTitleVerification('tv1', { decision: 'approve', reviewNotes: 'Reviewed.' }, 'challenge-approve');
    expect(mockedApi.patch).toHaveBeenCalledWith('/title-verifications/tv1/review', {
      decision: 'approve',
      reviewNotes: 'Reviewed.',
    }, { headers: { 'X-Step-Up-Challenge': 'challenge-approve' } });

    await titleVerificationService.reviewTitleVerification('tv1', { decision: 'reject', rejectionReason: 'Mismatch.' }, 'challenge-reject');
    expect(mockedApi.patch).toHaveBeenCalledWith('/title-verifications/tv1/review', {
      decision: 'reject',
      rejectionReason: 'Mismatch.',
    }, { headers: { 'X-Step-Up-Challenge': 'challenge-reject' } });

    await titleVerificationService.revokeTitleVerification('tv1', { revocationReason: 'Corrected document.' }, 'challenge-revoke');
    expect(mockedApi.patch).toHaveBeenCalledWith('/title-verifications/tv1/revoke', {
      revocationReason: 'Corrected document.',
    }, { headers: { 'X-Step-Up-Challenge': 'challenge-revoke' } });
  });

  it('attaches the bound step-up challenge to the exact review and revoke requests', async () => {
    mockedApi.patch.mockResolvedValue({ data: { verification: { verificationId: 'tv1', status: 'published' } } });

    const approveBody = { decision: 'approve' as const, reviewNotes: 'Reviewed.' };
    await titleVerificationService.reviewTitleVerification('tv1', approveBody, 'challenge-1', 'access-token');
    expect(mockedApi.patch).toHaveBeenCalledWith('/title-verifications/tv1/review', approveBody, {
      headers: { Authorization: 'Bearer access-token', 'X-Step-Up-Challenge': 'challenge-1' },
    });

    const revokeBody = { revocationReason: 'Superseded.' };
    await titleVerificationService.revokeTitleVerification('tv1', revokeBody, 'challenge-2');
    expect(mockedApi.patch).toHaveBeenCalledWith('/title-verifications/tv1/revoke', revokeBody, {
      headers: { 'X-Step-Up-Challenge': 'challenge-2' },
    });
  });

  it('sends an empty JSON body and the one-use challenge for external-anchor requests', async () => {
    mockedApi.post.mockResolvedValue({ data: { record: { publicVerificationId: 'RTQ-TV-2026-000001' } } });

    await titleVerificationService.requestRegistryExternalAnchor('RTQ-TV-2026-000001', 'challenge-3');

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/title-registry/RTQ-TV-2026-000001/request-external-anchor',
      {},
      { headers: { 'X-Step-Up-Challenge': 'challenge-3' } },
    );
  });

  it('binds the retry-anchor request to the step-up challenge', async () => {
    mockedApi.post.mockResolvedValue({ data: { verification: { verificationId: 'tv1', status: 'published' } } });

    await titleVerificationService.retryTitleVerificationExternalAnchor('tv1', 'challenge-4');

    expect(mockedApi.post).toHaveBeenCalledWith('/title-verifications/tv1/retry-anchor', {}, {
      headers: { 'X-Step-Up-Challenge': 'challenge-4' },
    });
  });

  it('rejects protected title decisions and anchor requests without a challenge', async () => {
    await expect(titleVerificationService.reviewTitleVerification('tv1', { decision: 'approve' }, ' ')).rejects.toThrow('step-up challenge is required');
    await expect(titleVerificationService.revokeTitleVerification('tv1', { revocationReason: 'Reason' }, '')).rejects.toThrow('step-up challenge is required');
    await expect(titleVerificationService.retryTitleVerificationExternalAnchor('tv1', '')).rejects.toThrow('step-up challenge is required');
    await expect(titleVerificationService.requestRegistryExternalAnchor('RTQ-TV-2026-000001', '')).rejects.toThrow('step-up challenge is required');
    expect(mockedApi.patch).not.toHaveBeenCalled();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('uses FormData file field for public document match checks', async () => {
    mockedApi.post.mockResolvedValue({ data: { matches: true } });
    const file = new File(['pdf'], 'title.pdf', { type: 'application/pdf' });

    await titleVerificationService.verifyRegistryDocument('RTQ-TV-2026-000001', file);

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/title-registry/RTQ-TV-2026-000001/verify-document',
      expect.any(FormData),
    );
    const form = mockedApi.post.mock.calls[0][1] as FormData;
    expect(form.get('file')).toBe(file);
  });

  it('requests external anchoring through the registry endpoint with a bound challenge', async () => {
    mockedApi.post.mockResolvedValue({ data: { record: { publicVerificationId: 'RTQ-TV-2026-000001' } } });

    await titleVerificationService.requestRegistryExternalAnchor('RTQ-TV-2026-000001', 'challenge-5');

    expect(mockedApi.post).toHaveBeenCalledWith('/title-registry/RTQ-TV-2026-000001/request-external-anchor', {}, {
      headers: { 'X-Step-Up-Challenge': 'challenge-5' },
    });
  });
});
