// API base URL for backend requests.
// Local run defaults to the backend on this PC (localhost:5000). For a remote/tunnel
// deployment, override at runtime with `window.__API_BASE__` or build-time `VITE_API_BASE`
// (e.g., https://<name>.trycloudflare.com/api).
const runtimeOverride =
  (typeof window !== 'undefined' && (window as any).__API_BASE__) ||
  ((import.meta as any)?.env?.VITE_API_BASE) ||
  '';

export const API_BASE_URL = (runtimeOverride && String(runtimeOverride).trim())
  ? String(runtimeOverride).trim().replace(/\/+$/, '')
  : 'http://localhost:5000/api';
