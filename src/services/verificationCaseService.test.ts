import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import api from '../lib/axios';
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
