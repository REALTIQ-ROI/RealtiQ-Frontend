import axios from 'axios';

// const API = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
//   timeout: 10000,
// });
// const API = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL ?? 'https://realtiq-backend.onrender.com/api',
//   timeout: 10000,
// });
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'https://api.realtiq.com.ng/api',
  timeout: 10000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;