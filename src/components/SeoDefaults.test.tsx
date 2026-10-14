import { render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import SeoDefaults from './SeoDefaults';
import { siteUrl } from '@/lib/seo';

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('[data-rh]').forEach((node) => node.remove());
});

it('replaces HTML defaults and keeps one canonical and one page-specific social URL', async () => {
  const original = document.createElement('meta');
  original.setAttribute('data-rh', 'true');
  original.setAttribute('property', 'og:url');
  original.content = siteUrl('/');
  document.head.append(original);
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/property/public-id']}>
        <SeoDefaults />
        <Helmet>
          <link rel="canonical" href={siteUrl('/property/public-id')} />
          <meta property="og:url" content={siteUrl('/property/public-id')} />
          <meta property="og:image" content="https://images.example/property.jpg" />
        </Helmet>
      </MemoryRouter>
    </HelmetProvider>,
  );
  await waitFor(() => {
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(1);
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(siteUrl('/property/public-id'));
    expect(document.head.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://images.example/property.jpg');
    expect(document.head.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(siteUrl('/social-preview.jpg'));
  });
});
