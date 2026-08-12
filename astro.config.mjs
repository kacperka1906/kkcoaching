import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE_URL = 'https://kkcoaching.fit';
const SITEMAP_EXCLUSIONS = new Set(['/thank-you', '/pl/thank-you', '/404']);

export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\/+$/, '') || '/';
        return !SITEMAP_EXCLUSIONS.has(pathname);
      },
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          pl: 'pl'
        }
      }
    })
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});
