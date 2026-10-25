import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../lib/axios';
import { checkoutHasUnresolvedProviderOutcome, isUnknownCheckoutInitialization } from './cartCheckoutRecovery';

describe('cart checkout unresolved provider recovery', () => {
  it('recognizes only the documented unknown-initialization error and state', () => {
    expect(isUnknownCheckoutInitialization(new ApiRequestError('Pending', { code: 'PAYMENT_CHECKOUT_INITIALIZATION_PENDING', status: 503 }))).toBe(true);
    expect(isUnknownCheckoutInitialization(new ApiRequestError('Unavailable', { code: 'FEATURE_PAYMENT_PROVIDER_UNCONFIGURED', status: 503 }))).toBe(false);
    expect(checkoutHasUnresolvedProviderOutcome('outcome_unknown')).toBe(true);
    expect(checkoutHasUnresolvedProviderOutcome('failed')).toBe(false);
  });
});
