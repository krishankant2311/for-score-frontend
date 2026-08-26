/** Prefix public asset paths when app is served under basePath (e.g. /admin on production). */
export function withBasePath(path = '') {
  const base = String(process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
