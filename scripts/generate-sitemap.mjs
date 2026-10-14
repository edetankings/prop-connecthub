import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { absoluteSiteUrl, resolveSiteUrl } from '../config/site-url.mjs';

// Public static routes only; authentication and account routes are intentionally absent.
export const publicRoutes = [
  '/', '/properties', '/agents', '/announcements', '/analytics',
  '/guides/investing-in-nigeria', '/terms', '/privacy',
  '/trust/safety-center', '/trust/escrow-protection', '/trust/agent-verification',
  '/trust/property-verification', '/trust/fraud-prevention', '/trust/code-of-conduct',
];

export function renderSitemap(base) {
  const urls = publicRoutes.map((path) =>
    `  <url><loc>${absoluteSiteUrl(path, base)}</loc></url>`);
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls, '</urlset>', ''].join('\n');
}

export function renderRobots(base) {
  // Crawling remains allowed; sitemap inclusion is not access control or a noindex rule.
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteSiteUrl('/sitemap.xml', base)}\n`;
}

export function generateSeoFiles(base, directory = resolve('public')) {
  writeFileSync(resolve(directory, 'sitemap.xml'), renderSitemap(base));
  writeFileSync(resolve(directory, 'robots.txt'), renderRobots(base));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { loadEnv } = await import('vite');
  const modeIndex = process.argv.indexOf('--mode');
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] :
    (process.env.npm_lifecycle_event === 'predev' ? 'development' : 'production');
  if (!mode) throw new Error('--mode requires a value');
  const base = resolveSiteUrl(loadEnv(mode, process.cwd(), ['VITE_SITE_URL', 'SITE_URL']));
  generateSeoFiles(base);
  console.log(`SEO files written (${publicRoutes.length} public routes)`);
}
