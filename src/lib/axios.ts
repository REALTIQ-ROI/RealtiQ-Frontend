import axios, { type AxiosError } from 'axios';

export interface ApiFieldError {
  path?: string;
  msg?: string;
  value?: unknown;
}

export class ApiRequestError extends Error {
  status?: number;
  code?: string;
  requestId?: string;
  retryAfter?: string;
  provider?: string;
  missing?: string[];
  missingRules?: unknown;
  eligibleAt?: string;
  existingPayment?: unknown;
  details?: unknown;
  requiresAccountDetails?: boolean;
  requiresSellerAccount?: boolean;
  reconciliationRequired?: boolean;
  existingAccess?: boolean;
  invalidItems?: unknown;
  fieldErrors?: ApiFieldError[];
  publicationReadiness?: { projectBlockers?: Array<{ field: string; code: string }>; units?: Array<{ unitId: string; blockers: Array<{ field: string; code: string }> }> };

  constructor(message: string, details?: {
    status?: number;
    code?: string;
    requestId?: string;
    retryAfter?: string;
    provider?: string;
    missing?: string[];
    missingRules?: unknown;
    eligibleAt?: string;
    existingPayment?: unknown;
    details?: unknown;
    requiresAccountDetails?: boolean;
    requiresSellerAccount?: boolean;
    reconciliationRequired?: boolean;
    existingAccess?: boolean;
    invalidItems?: unknown;
    fieldErrors?: ApiFieldError[];
    publicationReadiness?: ApiRequestError['publicationReadiness'];
  }) {
    super(message);
    this.name = 'ApiRequestError';
    Object.assign(this, details);
  }
}

type ErrorObject = Record<string, unknown>;

const asObject = (value: unknown): ErrorObject | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as ErrorObject
    : null;

const responseHeader = (headers: unknown, name: string): string | undefined => {
  const headerObject = asObject(headers);
  if (!headerObject) return undefined;
  const getter = (headers as { get?: (headerName: string) => unknown }).get;
  const direct = getter?.call(headers, name) ?? headerObject[name.toLowerCase()] ?? headerObject[name];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (typeof direct === 'number' && Number.isFinite(direct)) return String(direct);
  return undefined;
};

const normalizeFieldErrors = (errors: unknown): ApiFieldError[] | undefined => {
  if (!Array.isArray(errors)) return undefined;
  const normalized = errors.flatMap((item): ApiFieldError[] => {
    const entry = asObject(item);
    if (!entry) return [];
    const result: ApiFieldError = {};
    if (typeof entry.path === 'string') result.path = entry.path;
    if (typeof entry.msg === 'string') result.msg = entry.msg;
    if ('value' in entry) result.value = entry.value;
    return Object.keys(result).length ? [result] : [];
  });
  return normalized.length ? normalized : undefined;
};

export const retryAfterDelayMs = (retryAfter?: string, now = Date.now()): number | undefined => {
  if (!retryAfter) return undefined;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const date = Date.parse(retryAfter);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
};

const fallbackMessage = (status: number, code?: string, hasFieldErrors = false): string => {
  if (hasFieldErrors || code === 'VALIDATION_FAILED') return 'The request contains invalid fields. Review the highlighted values and try again.';
  if (status === 400) return 'The request could not be accepted. Review the submitted values and try again.';
  if (status === 401) return 'Your session is missing, expired or no longer valid. Sign in again to continue.';
  if (status === 403) return 'You do not have permission to perform this action with the current profile.';
  if (status === 404) return 'This item is unavailable or cannot be accessed with the current profile.';
  if (status === 409) return 'The server state changed. Refresh and review the current values before submitting again.';
  if (status === 410) return 'This operation is no longer available.';
  if (status === 412) return 'The request precondition is no longer valid. Refresh and review the current state.';
  if (status === 413) return 'The selected file or request is larger than the server allows. Choose a smaller file and try again.';
  if (status === 415) return 'This file or request format is not supported.';
  if (status === 422) return 'The server could not validate this request. Review the submitted values and try again.';
  if (status === 429) return 'The server is rate-limiting this request. Check operation status before resubmitting.';
  if (status === 503) return 'This service or configuration is temporarily unavailable. Keep your selections and check operation status before submitting again.';
  if (status >= 500) return 'The server did not confirm this request. Refresh its latest status before retrying; it may have been processed.';
  return 'The request could not be completed.';
};

/** Normalize only documented error-envelope fields. The raw response is never exposed to UI messages. */
export const normalizeApiError = (error: AxiosError<unknown>): Error => {
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') return error;

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiRequestError('The request timed out. Check the latest server status before retrying; the request may have been processed.');
  }

  const response = error.response;
  if (!response) {
    return new ApiRequestError('Unable to confirm a response from the server. Check the latest status before retrying; the request may have been processed.');
  }

  const status = response.status;
  const requestId = responseHeader(response.headers, 'x-request-id');
  const retryAfter = responseHeader(response.headers, 'retry-after');
  if (status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('realtiq:session-expired'));
  }

  const payload = asObject(response.data);
  const code = typeof payload?.code === 'string' ? payload.code : undefined;
  const fieldErrors = normalizeFieldErrors(payload?.errors);
  const responseMessage = typeof payload?.message === 'string' ? payload.message.trim() : '';
  const fieldMessage = fieldErrors?.map((item) => item.msg).filter((item): item is string => Boolean(item?.trim())).join(' ');
  const retryDelay = status === 429 ? retryAfterDelayMs(retryAfter) : undefined;
  const retryGuidance = retryDelay && retryDelay > 0
    ? ` Wait at least ${Math.ceil(retryDelay / 1000)} seconds before trying again.`
    : '';
  const message = `${responseMessage || fieldMessage || fallbackMessage(status, code, Boolean(fieldErrors))}${retryGuidance}`;

  return new ApiRequestError(message, {
    status,
    requestId,
    retryAfter,
    code,
    provider: typeof payload?.provider === 'string' ? payload.provider : undefined,
    missing: Array.isArray(payload?.missing) ? payload.missing.filter((item): item is string => typeof item === 'string') : undefined,
    missingRules: payload?.missingRules,
    eligibleAt: typeof payload?.eligibleAt === 'string' ? payload.eligibleAt : undefined,
    existingPayment: payload?.payment,
    details: payload?.details,
    requiresAccountDetails: typeof payload?.requiresAccountDetails === 'boolean' ? payload.requiresAccountDetails : undefined,
    requiresSellerAccount: typeof payload?.requiresSellerAccount === 'boolean' ? payload.requiresSellerAccount : undefined,
    reconciliationRequired: typeof payload?.reconciliationRequired === 'boolean' ? payload.reconciliationRequired : undefined,
    existingAccess: typeof payload?.existingAccess === 'boolean' ? payload.existingAccess : undefined,
    invalidItems: payload?.invalidItems,
    fieldErrors,
    publicationReadiness: payload?.publicationReadiness as ApiRequestError['publicationReadiness'],
  });
};

// const defaultBaseURL = import.meta.env.DEV ? '/api' : 'https://api.realtiq.com.ng/api';
const defaultBaseURL = import.meta.env.DEV ? '/api' : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultBaseURL,
  timeout: 60_000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const profileId = localStorage.getItem('activeProfileId');
  if (token && profileId && !config.headers['X-Profile-ID']) {
    config.headers['X-Profile-ID'] = profileId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => Promise.reject(normalizeApiError(error)),
);

export default api;
