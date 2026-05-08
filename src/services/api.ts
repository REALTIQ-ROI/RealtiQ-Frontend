import axios from 'axios';

// const API = axios.create({
//   baseURL: 'http://localhost:5000/api',
//   timeout: 10000,
// });
// const API = axios.create({
//   baseURL: 'https://realtiq-backend.onrender.com/api',
//   timeout: 10000,
// });
const API = axios.create({
  baseURL: 'https://api.realtiq.com.ng/api',
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