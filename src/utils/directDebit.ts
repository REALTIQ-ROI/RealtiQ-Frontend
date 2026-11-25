export const DIRECT_DEBIT_CALLBACK_PATH = '/settings/billing/direct-debit/callback';

const pendingDirectDebitStates = new Set([
  'pending_initialization',
  'initializing',
  'outcome_unknown',
  'pending_activation',
]);

const terminalDirectDebitStates = new Set([
  'active',
  'provider_declined',
  'expired',
  'revoked',
]);

export const isPendingDirectDebitState = (state: string): boolean => pendingDirectDebitStates.has(state);
export const isTerminalDirectDebitState = (state: string): boolean => terminalDirectDebitStates.has(state);

export const isValidDirectDebitOperationKey = (value: string): boolean =>
  value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);

export const directDebitOperationStorageKey = (profileId: string): string =>
  `realtiq.directDebitOperation:${profileId}`;

export const clearDirectDebitOperationKey = (profileId: string): void => {
  try {
    sessionStorage.removeItem(directDebitOperationStorageKey(profileId));
  } catch {
    // The operation key is only an idempotency aid; authorization state remains server-owned.
  }
};
