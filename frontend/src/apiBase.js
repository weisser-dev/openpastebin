import axios from 'axios'

// Base URL of the backend. Empty (default) = same origin, e.g. behind the nginx container that
// proxies /api/. On Cloudflare Pages set VITE_API_BASE at build time, e.g. https://api.paste.example.org
// (the backend allows cross-origin requests via CORS).
export const API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

axios.defaults.baseURL = API_BASE

/** Absolute URL for links opened outside axios (e.g. the raw view): apiUrl('/api/raw/abc'). */
export const apiUrl = (path) => `${API_BASE}${path}`
