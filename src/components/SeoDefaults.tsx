import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { siteUrl, SOCIAL_IMAGE_URL } from '@/lib/seo';

// Page Helmets override these defaults without duplicating static HTML metadata.
export default function SeoDefaults() {
  const { pathname } = useLocation();
  return (
    <Helmet>
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl(pathname)} />
      <meta property="og:title" content="Prop Connect — Verified Landed Properties in Nigeria" />
      <meta property="og:description" content="Prop Connect is a digital platform designed to help Nigerians safely search, verify, and acquire genuine landed properties from trusted agents." />
      <meta property="og:image" content={SOCIAL_IMAGE_URL} />
      <meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
    </Helmet>
  );
}
