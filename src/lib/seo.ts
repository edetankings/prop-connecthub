import { absoluteSiteUrl, resolveSiteUrl } from '../../config/site-url.mjs';

export const SITE_URL = resolveSiteUrl({ VITE_SITE_URL: import.meta.env.VITE_SITE_URL });
export const siteUrl = (path = '/') => absoluteSiteUrl(path, SITE_URL);
export const SOCIAL_IMAGE_URL = siteUrl('/social-preview.jpg');
