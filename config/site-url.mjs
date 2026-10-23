// Approved public application origin.
export const DEFAULT_SITE_URL = "https://propconnect-vine.vercel.app";

export function normalizeSiteUrl(value = DEFAULT_SITE_URL) {
  const url = new URL(value.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || url.pathname.replace(/\/+$/, '')) {
    throw new Error('Site URL must be an HTTP(S) origin without credentials, path, query, or fragment.');
  }
  return url.origin;
}

export function resolveSiteUrl(env = {}) {
  const vite = env.VITE_SITE_URL?.trim();
  const node = env.SITE_URL?.trim();
  if (vite && node && normalizeSiteUrl(vite) !== normalizeSiteUrl(node)) {
    throw new Error('VITE_SITE_URL and SITE_URL must identify the same site.');
  }
  return normalizeSiteUrl(vite || node || DEFAULT_SITE_URL);
}

export function absoluteSiteUrl(path = '/', base = DEFAULT_SITE_URL) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('SEO paths must be site-relative and start with a single slash.');
  }
  const url = new URL(path, normalizeSiteUrl(base));
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href;
}
