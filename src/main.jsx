import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

axios.interceptors.request.use((config) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null') || {};
    const token = localStorage.getItem('auth_token');
    config.headers = config.headers || {};
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (user.id) config.headers['X-User-Id'] = String(user.id);
    if (user.name || user.username) config.headers['X-User-Name'] = user.name || user.username;
    if (user.role) config.headers['X-User-Role'] = user.role;
  } catch {
    // Ignore malformed local session data and let the API respond normally.
  }
  return config;
});

// A number of legacy pages use native fetch instead of axios. Attach the same
// signed session/audit headers there as well so Transaction History always
// records the actual logged-in user.
const nativeFetch = window.fetch.bind(window);
const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const isApiRequest = url.startsWith(configuredApiBase) || url.startsWith('/api/');
  if (!isApiRequest) return nativeFetch(input, init);

  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null') || {};
    const token = localStorage.getItem('auth_token');
    const inheritedHeaders = typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined;
    const headers = new Headers(init.headers || inheritedHeaders || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (user.id) headers.set('X-User-Id', String(user.id));
    if (user.name || user.username) headers.set('X-User-Name', user.name || user.username);
    if (user.role) headers.set('X-User-Role', user.role);
    return nativeFetch(input, { ...init, headers });
  } catch {
    return nativeFetch(input, init);
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
