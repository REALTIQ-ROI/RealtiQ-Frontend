import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../lib/axios';
import { stepUpService } from './stepUpService';
import { verificationCaseService } from './verificationCaseService';

describe('verificationCaseService evidence mutations', () => {
  beforeEach(() => {
    vi.spyOn(api, 'get');
    vi.spyOn(api, 'post');
    vi.spyOn(api, 'delete');
  });
  afterEach(() => vi.restoreAllMocks());

  it('requests versioned profile evidence content validation with the bound challenge header', async () => {
    const evidence = { id: 'evidence-1', version: 3, state: 'validating', contentValidatedAt: null };
    vi.mocked(api.post).mockResolvedValue({ data: evidence });
    const body = { expectedVersion: 2 };

    await expect(verificationCaseService.retryEvidence('evidence-1', body, 'challenge-1')).resolves.toEqual(evidence);
    expect(api.post).toHaveBeenCalledWith(
      '/profiles/current/onboarding/evidence/evidence-1/retry',
      body,
      { headers: { 'X-Step-Up-Challenge': 'challenge-1' } },
    );
  });

  it('uses the current evidence DTO timestamp and does not depend on legacy scan fields', async () => {
    const evidence = {
      id: 'evidence-available', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin_slip',
      version: 1, previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available',
      errorCode: null, contentValidatedAt: '2026-10-25T10:45:00.000Z', createdAt: '2026-10-25T10:45:00.000Z',
    };
    vi.mocked(api.get).mockResolvedValue({ data: evidence });

    await expect(verificationCaseService.getEvidence('evidence-available')).resolves.toEqual(evidence);
    expect(api.get).toHaveBeenCalledWith('/profiles/current/onboarding/evidence/evidence-available');
  });

  it('loads every evidence page at 100 records so replacement can find the newest tombstone', async () => {
    const older = { id: 'older', profileId: 'profile-1', purpose: 'bvn', subject: 'self', version: 1, state: 'available' };
    const tombstone = { id: 'newest-tombstone', profileId: 'profile-1', purpose: 'bvn', subject: 'self', version: 2, state: 'deleted' };
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { evidence: [older], nextCursor: 'opaque-page-2' } })
      .mockResolvedValueOnce({ data: { evidence: [tombstone], nextCursor: null } });

    await expect(verificationCaseService.listAllEvidence()).resolves.toEqual([older, tombstone]);
    expect(api.get).toHaveBeenNthCalledWith(1, '/profiles/current/onboarding/evidence', { params: { limit: 100 } });
    expect(api.get).toHaveBeenNthCalledWith(2, '/profiles/current/onboarding/evidence', { params: { limit: 100, before: 'opaque-page-2' } });
  });

  it('stops requesting evidence pages as soon as the active profile changes', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { evidence: [{ id: 'profile-one-only' }], nextCursor: 'opaque-page-2' } });
    const shouldContinue = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    await expect(verificationCaseService.listAllEvidence(shouldContinue)).resolves.toEqual([{ id: 'profile-one-only' }]);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(shouldContinue).toHaveBeenCalledTimes(2);
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

describe('verificationCaseService private transport and history', () => {
  const originalAdapter = api.defaults.adapter;
  const requests: InternalAxiosRequestConfig[] = [];
  let response: unknown;

  beforeEach(() => {
    requests.length = 0;
    response = {};
    localStorage.setItem('token', 'test-session');
    localStorage.setItem('activeProfileId', 'buyer-profile');
    api.defaults.adapter = async (config) => {
      requests.push(config);
      return { data: response, status: 200, statusText: 'OK', headers: { 'cache-control': 'private, no-store' }, config };
    };
  });
  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    localStorage.removeItem('token');
    localStorage.removeItem('activeProfileId');
  });

  it('uses the real interceptor for the exact individual payload and current profile on each request', async () => {
    const body = {
      expectedDraftVersion: 8, operationKey: 'verification_case_buyer_001', people: [],
      identityRoute: 'nigerian' as const, identityCountry: 'NG',
      identityEvidence: [{ purpose: 'nin', evidenceId: 'private-evidence' }],
    };
    response = { id: 'case-buyer', state: 'submitted', draftVersion: 8 };
    await expect(verificationCaseService.createHolderCase(body, 'one-use-challenge')).resolves.toEqual(response);
    expect(requests[0].url).toBe('/profiles/current/verification-cases');
    expect(requests[0].method).toBe('post');
    expect(JSON.parse(requests[0].data)).toEqual(body);
    expect(requests[0].headers.get('Authorization')).toBe('Bearer test-session');
    expect(requests[0].headers.get('X-Profile-ID')).toBe('buyer-profile');
    expect(requests[0].headers.get('X-Step-Up-Challenge')).toBe('one-use-challenge');

    localStorage.setItem('activeProfileId', 'second-profile');
    response = { cases: [], nextCursor: null };
    await verificationCaseService.listHolderCases({ limit: 25 });
    expect(requests[1].headers.get('X-Profile-ID')).toBe('second-profile');
    expect(requests[1].headers.get('X-Step-Up-Challenge')).toBeUndefined();
  });

  it('sends the bound file digest through authenticated challenge and verification requests', async () => {
    const body = {
      purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_nin_2026_a1b2',
      previousEvidenceId: 'latest-evidence', __stepUpFileSha256: 'a'.repeat(64),
    };
    response = { challengeId: 'evidence-challenge', expiresAt: '2026-11-12T12:05:00.000Z', method: 'totp' };
    await stepUpService.start('POST', '/api/profiles/current/onboarding/evidence', body);
    expect(requests[0].url).toBe('/auth/step-up');
    expect(JSON.parse(requests[0].data)).toEqual({ method: 'POST', path: '/api/profiles/current/onboarding/evidence', body });
    expect(requests[0].headers.get('Authorization')).toBe('Bearer test-session');
    expect(requests[0].headers.get('X-Profile-ID')).toBe('buyer-profile');

    response = { challengeId: 'evidence-challenge', verified: true };
    await stepUpService.verify('evidence-challenge', '123456');
    expect(requests[1].url).toBe('/auth/step-up/evidence-challenge/verify');
    expect(JSON.parse(requests[1].data)).toEqual({ code: '123456' });
    expect(requests[1].headers.get('Authorization')).toBe('Bearer test-session');
    expect(requests[1].headers.get('X-Profile-ID')).toBe('buyer-profile');
  });

  it('passes evidence FormData through unchanged and leaves multipart boundary selection to the browser', async () => {
    const form = new FormData();
    const file = new File(['private bytes'], 'nin.pdf', { type: 'application/pdf' });
    form.append('file', file);
    form.append('purpose', 'nin');
    form.append('subject', 'self');
    form.append('documentKind', 'nin_slip');
    form.append('operationKey', 'evidence_operation_123');
    form.append('__stepUpFileSha256', 'a'.repeat(64));
    response = { id: 'evidence-1', profileId: 'buyer-profile', purpose: 'nin', subject: 'self', state: 'available' };

    await verificationCaseService.uploadEvidence(form, 'evidence-challenge');

    expect(requests[0].url).toBe('/profiles/current/onboarding/evidence');
    expect(requests[0].method).toBe('post');
    expect(requests[0].data).toBe(form);
    expect(requests[0].headers.get('Authorization')).toBe('Bearer test-session');
    expect(requests[0].headers.get('X-Profile-ID')).toBe('buyer-profile');
    expect(requests[0].headers.get('X-Step-Up-Challenge')).toBe('evidence-challenge');
    expect(requests[0].headers.get('Content-Type')).toBeNull();
    expect([...form.keys()]).toEqual(['file', 'purpose', 'subject', 'documentKind', 'operationKey', '__stepUpFileSha256']);
    expect(form.getAll('file')).toHaveLength(1);
    expect(form.get('profileId')).toBeNull();
    expect(form.get('X-Step-Up-Challenge')).toBeNull();
  });

  it('retrieves private evidence only as authenticated content bytes without public URLs or persistence', async () => {
    const storageBefore = { ...localStorage };
    response = new Blob(['private fixture'], { type: 'application/pdf' });
    const file = await verificationCaseService.getEvidenceContent('evidence/1');
    expect(file).toBe(response);
    expect(requests[0].url).toBe('/profiles/current/onboarding/evidence/evidence%2F1/content');
    expect(requests[0].responseType).toBe('blob');
    expect(requests[0].headers.get('Authorization')).toBe('Bearer test-session');
    expect(requests[0].headers.get('X-Profile-ID')).toBe('buyer-profile');
    expect({ ...localStorage }).toEqual(storageBefore);
  });

  it.each(['holder', 'staff'] as const)('normalizes the current %s history envelope and preserves its cursor', async (scope) => {
    const event = { id: 'audit-1', action: 'verification_submitted', version: 1, at: '2026-11-11T10:00:00.000Z' };
    response = { history: [event], nextCursor: 'opaque-next' };
    const history = scope === 'holder'
      ? await verificationCaseService.holderHistory('case-1', 'opaque-before')
      : await verificationCaseService.staffHistory('case-1', 'opaque-before');
    expect(history).toEqual({ events: [event], nextCursor: 'opaque-next' });
    expect(requests[0].params).toEqual({ limit: 25, before: 'opaque-before' });
    expect(requests[0].url).toBe(scope === 'holder' ? '/profiles/current/verification-cases/case-1/history' : '/admin/verification-cases/case-1/history');
  });

  it('retains the chapter 19 events envelope without dropping authorized audit fields', async () => {
    const event = { id: 'audit-2', action: 'verification_decided', version: 2, at: '2026-11-11T11:00:00.000Z', actorId: 'reviewer', decision: { decision: 'rejected' } };
    response = { events: [event], nextCursor: null };
    await expect(verificationCaseService.staffHistory('case-1')).resolves.toEqual(response);
  });

  it('reports malformed history instead of silently treating it as an empty successful page', async () => {
    response = { history: null, events: [], nextCursor: null };
    await expect(verificationCaseService.holderHistory('case-1')).rejects.toThrow('unsupported response');
  });
});
