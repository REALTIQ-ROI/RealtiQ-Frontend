import axios, { type AxiosError } from 'axios';

export class ApiRequestError extends Error {
  status?: number;
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
  fieldErrors?: Array<{ path?: string; msg?: string; value?: unknown }>;

  constructor(message: string, details?: { status?: number; missing?: string[]; missingRules?: unknown; eligibleAt?: string; existingPayment?: unknown; details?: unknown; requiresAccountDetails?: boolean; requiresSellerAccount?: boolean; reconciliationRequired?: boolean; existingAccess?: boolean; invalidItems?: unknown; fieldErrors?: Array<{ path?: string; msg?: string; value?: unknown }> }) {
    super(message);
    this.name = 'ApiRequestError';
    Object.assign(this, details);
  }
}

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
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiRequestError('Request timed out. Please try again.'));
    }
    if (!error.response) {
      return Promise.reject(new ApiRequestError('Unable to connect. Check your internet connection.'));
    }

    const status = error.response.status;
    if (status === 401) {
      window.dispatchEvent(new Event('realtiq:session-expired'));
    }
    const responseData = error.response.data;
    const message =
      typeof responseData === 'object' && responseData !== null && 'message' in responseData
        ? String((responseData as { message?: unknown }).message ?? '')
        : '';

    if (message.trim()) {
      const details = responseData as { missing?: unknown; missingRules?: unknown; eligibleAt?: string; payment?: unknown; details?: unknown; requiresAccountDetails?: boolean; requiresSellerAccount?: boolean; reconciliationRequired?: boolean; existingAccess?: boolean; invalidItems?: unknown; errors?: Array<{ path?: string; msg?: string; value?: unknown }> };
      return Promise.reject(new ApiRequestError(message, {
        status,
        missing: Array.isArray(details.missing) ? details.missing.map(String) : undefined,
        missingRules: details.missingRules,
        eligibleAt: details.eligibleAt,
        existingPayment: details.payment,
        details: details.details,
        requiresAccountDetails: details.requiresAccountDetails,
        requiresSellerAccount: details.requiresSellerAccount,
        reconciliationRequired: details.reconciliationRequired,
        existingAccess: details.existingAccess,
        invalidItems: details.invalidItems,
        fieldErrors: details.errors,
      }));
    }

    if (status >= 500) {
      return Promise.reject(new ApiRequestError(
        status === 502
          ? 'The provider response is uncertain. Refresh the latest status before retrying.'
          : 'Something went wrong. Please try again later.',
        { status },
      ));
    }

    if (status === 403) {
      return Promise.reject(new ApiRequestError('You do not have access to perform this action.', { status }));
    }
    if (status === 413) {
      return Promise.reject(new ApiRequestError('The selected file is larger than the server allows. Choose a smaller file and try again.', { status }));
    }

    const validationErrors =
      typeof responseData === 'object' && responseData !== null && 'errors' in responseData
        ? (responseData as { errors?: Array<{ path?: string; msg?: string; value?: unknown }> }).errors
        : undefined;
    const validationMessage = validationErrors?.map((item) => item.msg).filter(Boolean).join(' ');
    return Promise.reject(new ApiRequestError(
      validationMessage || 'Something went wrong. Please try again later.',
      { status, fieldErrors: validationErrors },
    ));
  },
);

export default api;
