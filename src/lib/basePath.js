/** Prefix public asset paths when app is served under basePath (e.g. /admin on production). */
export function withBasePath(path = '') {
  const base = String(process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

/**
 * Login hero image — on GoDaddy/IP deploy static files may live on port 80
 * while Next.js runs on :3001. Set NEXT_PUBLIC_STATIC_ORIGIN=http://72.167.43.139
 */
export function getLoginImageSrc() {
  const origin = String(process.env.NEXT_PUBLIC_STATIC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '');
  if (origin) {
    return `${origin}${withBasePath('/login.png')}`;
  }
  return withBasePath('/login.png');
}
