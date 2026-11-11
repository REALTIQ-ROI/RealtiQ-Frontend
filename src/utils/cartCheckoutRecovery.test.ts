import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../lib/axios';
import { checkoutHasReference, checkoutHasUnresolvedProviderOutcome, checkoutNeedsReconciliation, isUnknownCheckoutInitialization } from './cartCheckoutRecovery';

describe('cart checkout unresolved provider recovery', () => {
  it('recognizes only the documented unknown-initialization error and state', () => {
    expect(isUnknownCheckoutInitialization(new ApiRequestError('Pending', { code: 'PAYMENT_CHECKOUT_INITIALIZATION_PENDING', status: 503 }))).toBe(true);
    expect(isUnknownCheckoutInitialization(new ApiRequestError('Unavailable', { code: 'FEATURE_PAYMENT_PROVIDER_UNCONFIGURED', status: 503 }))).toBe(false);
    expect(checkoutHasUnresolvedProviderOutcome('outcome_unknown')).toBe(true);
    expect(checkoutHasUnresolvedProviderOutcome('failed')).toBe(false);
  });

  it('reconciles an exact checkout part reference before clearing an unknown outcome', () => {
    const pending = { paymentReference: 'checkout-reference', initializationState: 'ready', paymentParts: [{ reference: 'part-reference', state: 'outcome_unknown' }] };
    expect(checkoutNeedsReconciliation(pending)).toBe(true);
    expect(checkoutHasReference(pending, 'part-reference')).toBe(true);
    expect(checkoutHasReference(pending, 'another-reference')).toBe(false);
    expect(checkoutNeedsReconciliation({ ...pending, paymentParts: [{ reference: 'part-reference', state: 'paid' }] })).toBe(false);
  });
});
