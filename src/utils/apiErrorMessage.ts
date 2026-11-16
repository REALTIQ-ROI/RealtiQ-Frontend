import { ApiRequestError } from '../lib/axios';

/** Safe user-facing API error text with support correlation when available. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiRequestError) {
    return `${error.message}${error.code ? ` (${error.code})` : ''}${error.requestId ? ` · Request ${error.requestId}` : ''}`;
  }
  return error instanceof Error ? error.message : fallback;
};
