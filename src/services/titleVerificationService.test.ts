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

  it('sends admin approve, reject, and revoke payloads', async () => {
    mockedApi.patch.mockResolvedValue({ data: { verification: { verificationId: 'tv1', status: 'published' } } });

    await titleVerificationService.reviewTitleVerification('tv1', { decision: 'approve', reviewNotes: 'Reviewed.' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/title-verifications/tv1/review', {
      decision: 'approve',
      reviewNotes: 'Reviewed.',
    });

    await titleVerificationService.reviewTitleVerification('tv1', { decision: 'reject', rejectionReason: 'Mismatch.' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/title-verifications/tv1/review', {
      decision: 'reject',
      rejectionReason: 'Mismatch.',
    });

    await titleVerificationService.revokeTitleVerification('tv1', { revocationReason: 'Corrected document.' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/title-verifications/tv1/revoke', {
      revocationReason: 'Corrected document.',
    });
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

  it('requests optional external anchoring through the registry endpoint', async () => {
    mockedApi.post.mockResolvedValue({ data: { record: { publicVerificationId: 'RTQ-TV-2026-000001' } } });

    await titleVerificationService.requestRegistryExternalAnchor('RTQ-TV-2026-000001');

    expect(mockedApi.post).toHaveBeenCalledWith('/title-registry/RTQ-TV-2026-000001/request-external-anchor');
  });
});
