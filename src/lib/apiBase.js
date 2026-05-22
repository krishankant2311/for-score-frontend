/**
 * Admin panel API origin. Defaults to local Express (PORT 3000) when env is unset.
 */
export function getApiBaseUrl() {
  const raw =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) || '';
  const trimmed = String(raw).trim().replace(/\/$/, '');
  if (trimmed) return trimmed;
  return 'http://localhost:3000';
}

/** Build full URL: getApiBaseUrl() + /api/admin/... */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${p}`;
}
