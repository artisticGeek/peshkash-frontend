// API Configuration
// For local development, use localhost backend
// For production, use the deployed backend URL

const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:4000/api'
  : 'https://peshkash-backend.onrender.com/api';
