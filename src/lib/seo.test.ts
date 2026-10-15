import { describe, expect, it } from 'vitest';
import { absoluteSiteUrl, DEFAULT_SITE_URL, resolveSiteUrl } from '../../config/site-url.mjs';
import { publicRoutes, renderRobots, renderSitemap } from '../../scripts/generate-sitemap.mjs';

describe('portable SEO URLs', () => {
  it('retains production by default and accepts either environment variable', () => {
    expect(resolveSiteUrl()).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl({ VITE_SITE_URL: ' https://example.com/// ' })).toBe('https://example.com');
    expect(resolveSiteUrl({ SITE_URL: 'https://example.com/' })).toBe('https://example.com');
    expect(resolveSiteUrl({ VITE_SITE_URL: 'https://example.com', SITE_URL: 'https://example.com/' })).toBe('https://example.com');
    expect(() => resolveSiteUrl({ VITE_SITE_URL: 'https://example.com', SITE_URL: 'https://other.example' })).toThrow();
  });

  it('rejects credentials, non-web protocols, and ambiguous base paths', () => {
    for (const value of ['javascript:alert(1)', 'https://user:secret@example.com',
      'https://example.com/subsite', 'https://example.com/?q=x', 'https://example.com/#fragment']) {
      expect(() => resolveSiteUrl({ VITE_SITE_URL: value })).toThrow();
    }
  });

  it('keeps dynamic page paths on the configured origin', () => {
    expect(absoluteSiteUrl('/', 'https://example.com/')).toBe('https://example.com/');
    expect(absoluteSiteUrl('/property/public-id/', 'https://example.com')).toBe('https://example.com/property/public-id');
    expect(absoluteSiteUrl('/agent/public-id', 'https://example.com')).toBe('https://example.com/agent/public-id');
    for (const path of ['//other.example/x', 'https://other.example/x', '/\\other.example']) {
      expect(() => absoluteSiteUrl(path, 'https://example.com')).toThrow();
    }
  });

  it('emits valid absolute public URLs without auth or private routes', () => {
    for (const base of [DEFAULT_SITE_URL, 'https://example.com']) {
      const xml = new DOMParser().parseFromString(renderSitemap(base), 'application/xml');
      expect(xml.querySelector('parsererror')).toBeNull();
      const locations = [...xml.querySelectorAll('loc')].map((node) => node.textContent!);
      expect(locations).toHaveLength(13);
      expect(new Set(locations).size).toBe(locations.length);
      expect(locations.map((url) => new URL(url).pathname)).toEqual(publicRoutes);
      expect(locations.every((url) => new URL(url).origin === base)).toBe(true);
      expect(locations.some((url) => /login|register|password|dashboard|settings|admin|chat/.test(url))).toBe(false);
      expect(xml.querySelector('priority, changefreq, lastmod')).toBeNull();
      expect(renderRobots(base)).toContain(`Sitemap: ${base}/sitemap.xml`);
    }
  });
});
