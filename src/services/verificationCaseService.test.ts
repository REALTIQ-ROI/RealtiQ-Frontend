import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { verificationCaseService } from './verificationCaseService';

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('verificationCaseService evidence mutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retries a versioned profile evidence scan with the bound challenge header', async () => {
    const evidence = { id: 'evidence-1', version: 3, state: 'quarantined' };
    vi.mocked(api.post).mockResolvedValue({ data: evidence });
    const body = { expectedVersion: 2 };

    await expect(verificationCaseService.retryEvidence('evidence-1', body, 'challenge-1')).resolves.toEqual(evidence);
    expect(api.post).toHaveBeenCalledWith(
      '/profiles/current/onboarding/evidence/evidence-1/retry',
      body,
      { headers: { 'X-Step-Up-Challenge': 'challenge-1' } },
    );
  });

  it('requests versioned evidence removal without putting private identifiers in a query string', async () => {
    const evidence = { id: 'evidence-2', version: 4, state: 'deleting' };
    vi.mocked(api.delete).mockResolvedValue({ data: evidence });
    const body = { expectedVersion: 4 };

    await expect(verificationCaseService.deleteEvidence('evidence-2', body, 'challenge-2')).resolves.toEqual(evidence);
    expect(api.delete).toHaveBeenCalledWith(
      '/profiles/current/onboarding/evidence/evidence-2',
      { data: body, headers: { 'X-Step-Up-Challenge': 'challenge-2' } },
    );
  });

  it('submits the onboarding snapshot version, declared person routes, and operation key with a bound challenge', async () => {
    const created = { id: 'case-1', state: 'submitted', draftVersion: 7, version: 1 };
    vi.mocked(api.post).mockResolvedValueOnce({ data: created });
    const body = { expectedDraftVersion: 7, operationKey: 'verification_case_001', people: [{ path: 'directors[0]', route: 'nigerian' as const, country: 'NG' }] };
    await expect(verificationCaseService.createHolderCase(body, 'challenge-1')).resolves.toEqual(created);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/verification-cases', body, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });
});
