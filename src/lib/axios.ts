import axios, { type AxiosError } from 'axios';

// const api = axios.create({
//   baseURL: 'http://localhost:5000/api',
//   timeout: 10_000,
// });
const api = axios.create({
  baseURL: 'https://api.realtiq.com.ng/api',
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
  (error: AxiosError<{ message?: string }>) => {
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
    const message = error.response.data?.message ?? 'Something went wrong. Please try again later.';
    return Promise.reject(new Error(message));
  },
);

export default api;
