import { ApiRequestError } from '../lib/axios';

export const isUnknownCheckoutInitialization = (value: unknown): value is ApiRequestError =>
  value instanceof ApiRequestError && value.code === 'PAYMENT_CHECKOUT_INITIALIZATION_PENDING';

export const checkoutHasUnresolvedProviderOutcome = (initializationState?: string | null): boolean =>
  initializationState === 'outcome_unknown';

type CheckoutRecoveryState = {
  paymentReference?: string | null;
  initializationState?: string | null;
  paymentParts?: Array<{ reference: string; state: string }>;
};

export const checkoutNeedsReconciliation = (checkout: CheckoutRecoveryState): boolean =>
  checkoutHasUnresolvedProviderOutcome(checkout.initializationState) ||
  Boolean(checkout.paymentParts?.some((part) => part.state === 'outcome_unknown'));

export const checkoutHasReference = (checkout: CheckoutRecoveryState, reference: string): boolean =>
  checkout.paymentReference === reference || Boolean(checkout.paymentParts?.some((part) => part.reference === reference));
