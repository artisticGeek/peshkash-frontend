// API Configuration
// For local development, use localhost backend
// For production, use the deployed backend URL

const isDevelopment = import.meta.env.DEV;
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const isLocalBrowser = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = configuredApiBaseUrl || (isDevelopment || isLocalBrowser
  ? 'http://localhost:4000/api'
  : 'https://peshkash-backend.onrender.com/api');
