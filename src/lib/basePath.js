/** Prefix public asset paths when app is served under basePath (e.g. /admin on production). */
export function withBasePath(path = '') {
  const base = String(process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

/**
 * Public folder asset URL — respects basePath and optional static origin (nginx :80 vs Next :3001).
 */
export function getPublicAssetSrc(assetPath = '/') {
  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  const path = withBasePath(normalized);
  const origin = String(process.env.NEXT_PUBLIC_STATIC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '');
  if (origin) return `${origin}${path}`;
  return path;
}

/**
 * Login hero image — on GoDaddy/IP deploy static files may live on port 80
 * while Next.js runs on :3001. Set NEXT_PUBLIC_STATIC_ORIGIN=http://72.167.43.139
 */
export function getLoginImageSrc() {
  return getPublicAssetSrc('/login.png');
}

export function getLogoSrc() {
  return getPublicAssetSrc('/logo.png');
}
