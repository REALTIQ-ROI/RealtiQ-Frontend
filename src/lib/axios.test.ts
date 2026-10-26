import { afterEach, describe, expect, it } from 'vitest';
import type { AxiosAdapter, AxiosError } from 'axios';
import api, { ApiRequestError, normalizeApiError, retryAfterDelayMs } from './axios';

const responseError = (status: number, data: unknown, headers: Record<string, string> = {}): AxiosError<unknown> => ({
  name: 'AxiosError',
  message: 'Request failed',
  config: {} as AxiosError['config'],
  response: { status, data, headers, statusText: '', config: {} as AxiosError['config'] },
} as AxiosError<unknown>);

describe('API profile context', () => {
  afterEach(() => localStorage.clear());

  it('sends bearer and selected profile on authenticated requests', async () => {
    localStorage.setItem('token', 'test-access-token');
    localStorage.setItem('activeProfileId', 'profile-2');
    const adapter: AxiosAdapter = async (config) => ({
      data: { authorization: config.headers.Authorization, profileId: config.headers['X-Profile-ID'] },
      status: 200, statusText: 'OK', headers: {}, config,
    });
    const { data } = await api.get('/profiles/current', { adapter });
    expect(data).toEqual({ authorization: 'Bearer test-access-token', profileId: 'profile-2' });
  });
});

describe('API error normalization', () => {
  it('normalizes validation envelopes without a message and preserves nested field paths and request IDs', () => {
    const normalized = normalizeApiError(responseError(422, {
      code: 'VALIDATION_FAILED',
      errors: [
        { path: 'canonicalFields.address.postcode', msg: 'Enter a valid postcode.' },
        { path: 'units.0.price', msg: 'Price must be greater than zero.' },
      ],
    }, { 'x-request-id': 'req-validation-1' }));

    expect(normalized).toBeInstanceOf(ApiRequestError);
    expect(normalized).toMatchObject({
      message: 'Enter a valid postcode. Price must be greater than zero.',
      status: 422,
      code: 'VALIDATION_FAILED',
      requestId: 'req-validation-1',
      fieldErrors: [
        { path: 'canonicalFields.address.postcode', msg: 'Enter a valid postcode.' },
        { path: 'units.0.price', msg: 'Price must be greater than zero.' },
      ],
    });
  });

  it('keeps the server message and code while providing safe conflict recovery when a message is absent', () => {
    const conflict = normalizeApiError(responseError(409, { code: 'CONFLICT_PROJECT_VERSION' }));
    expect(conflict).toMatchObject({
      message: expect.stringMatching(/server state changed.*refresh/i),
      status: 409,
      code: 'CONFLICT_PROJECT_VERSION',
    });

    const explicit = normalizeApiError(responseError(409, { message: 'The project version is stale.', code: 'CONFLICT_PROJECT_VERSION' }));
    expect(explicit.message).toBe('The project version is stale.');
  });

  it('preserves a duplicate proxy request reference from a conflict response', () => {
    const normalized = normalizeApiError(responseError(409, {
      code: 'CONFLICT_PROXY_INSPECTION_DUPLICATE',
      message: 'An active inspection request already exists.',
      existingRequestId: 'request-existing-1',
    }));

    expect(normalized).toMatchObject({
      status: 409,
      code: 'CONFLICT_PROXY_INSPECTION_DUPLICATE',
      existingRequestId: 'request-existing-1',
    });
  });

  it('preserves Retry-After for rate-limit recovery without scheduling an automatic retry', () => {
    const normalized = normalizeApiError(responseError(429, { code: 'AUTH_FACTOR_RATE_LIMITED' }, { 'retry-after': '30' }));
    expect(normalized).toMatchObject({ status: 429, code: 'AUTH_FACTOR_RATE_LIMITED', retryAfter: '30' });
    expect(normalized.message).toContain('Wait at least 30 seconds');
    expect(normalized.message).toMatch(/check operation status before resubmitting/i);
    expect(retryAfterDelayMs((normalized as ApiRequestError).retryAfter, 0)).toBe(30_000);
    expect(retryAfterDelayMs('Thu, 01 Jan 1970 00:00:10 GMT', 0)).toBe(10_000);
  });

  it('does not recommend blind resubmission for temporary service outages', () => {
    const unavailable = normalizeApiError(responseError(503, { code: 'FEATURE_PROVIDER_UNAVAILABLE' }));
    expect(unavailable.message).toMatch(/check operation status before submitting again/i);
  });

  it('preserves the gazetteer configuration code for the suggestion UI', () => {
    const unavailable = normalizeApiError(responseError(503, { code: 'FEATURE_SEARCH_GAZETTEER_UNCONFIGURED' }));
    expect(unavailable).toMatchObject({ status: 503, code: 'FEATURE_SEARCH_GAZETTEER_UNCONFIGURED' });
  });

  it('preserves durable payment references and reconciliation state from the corrected error DTO', () => {
    const normalized = normalizeApiError(responseError(503, {
      code: 'PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN', message: 'Provider status is unresolved.',
      reference: 'PAY-REF-1', status: 'pending', reconciliationRequired: true,
    }));
    expect(normalized).toMatchObject({ code: 'PAYMENT_INITIALIZATION_OUTCOME_UNKNOWN', reference: 'PAY-REF-1', paymentState: 'pending', reconciliationRequired: true });
  });

  it('treats paid virtual tours as a product-unavailable state', () => {
    const unavailable = normalizeApiError(responseError(503, { code: 'FEATURE_PAID_TOUR_UNAVAILABLE', message: 'Temporary issue.' }));
    expect(unavailable.message).toMatch(/Paid\/live virtual tours are not available/);
    expect(unavailable.message).not.toMatch(/temporarily unavailable/i);
  });

  it('does not log out on permission denial, but dispatches session cleanup for 401', () => {
    let expirations = 0;
    const onExpired = () => { expirations += 1; };
    window.addEventListener('realtiq:session-expired', onExpired);
    try {
      normalizeApiError(responseError(403, { message: 'Permission denied.', code: 'PERMISSION_PROFILE_REQUIRED' }));
      expect(expirations).toBe(0);
      normalizeApiError(responseError(401, { code: 'AUTH_SESSION_REQUIRED' }));
      expect(expirations).toBe(1);
    } finally {
      window.removeEventListener('realtiq:session-expired', onExpired);
    }
  });

  it('returns cancellation unchanged and warns that an unconfirmed timeout may have been processed', () => {
    const cancelled = Object.assign(new Error('canceled'), { code: 'ERR_CANCELED', __CANCEL__: true }) as unknown as AxiosError<unknown>;
    expect(normalizeApiError(cancelled)).toBe(cancelled);

    const timedOut = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }) as AxiosError<unknown>;
    expect(normalizeApiError(timedOut).message).toMatch(/check the latest server status.*may have been processed/i);
  });
});
