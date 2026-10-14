import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { resolveSiteUrl } from './config/site-url.mjs';
import { generateSeoFiles } from './scripts/generate-sitemap.mjs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const siteUrl = resolveSiteUrl(loadEnv(mode, process.cwd(), ['VITE_SITE_URL', 'SITE_URL']));
  // Resolve again for the actual Vite mode, including direct Vite invocations.
  generateSeoFiles(siteUrl);
  return {
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl) },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), {
      name: 'site-seo-html',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => html.replaceAll('__SITE_URL__', siteUrl),
      },
    }],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query"],
    },
  };
});
