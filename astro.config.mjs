import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Replace with the real production domain before deploying.
const SITE_URL = 'https://kkcoaching.fit';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl'],
    routing: {
      prefixDefaultLocale: false // EN stays at /, PL lives under /pl/
    }
  }
});
