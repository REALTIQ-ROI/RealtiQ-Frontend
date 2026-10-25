import { ApiRequestError } from '../lib/axios';

export const isUnknownCheckoutInitialization = (value: unknown): value is ApiRequestError =>
  value instanceof ApiRequestError && value.code === 'PAYMENT_CHECKOUT_INITIALIZATION_PENDING';

export const checkoutHasUnresolvedProviderOutcome = (initializationState?: string | null): boolean =>
  initializationState === 'outcome_unknown';
