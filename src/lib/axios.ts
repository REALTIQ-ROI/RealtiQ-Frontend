import axios, { type AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
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
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }
    if (!error.response) {
      return Promise.reject(new Error('Unable to connect. Check your internet connection.'));
    }

    const status = error.response.status;
    if (status >= 500) {
      return Promise.reject(new Error('Something went wrong. Please try again later.'));
    }

    const responseData = error.response.data;
    const message =
      typeof responseData === 'object' && responseData !== null && 'message' in responseData
        ? String((responseData as { message?: unknown }).message ?? '')
        : '';

    if (message.trim()) {
      return Promise.reject(new Error(message));
    }

    return Promise.reject(new Error('Something went wrong. Please try again later.'));
  },
);

export default api;
