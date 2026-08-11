import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE_URL = 'https://kkcoaching.fit';

export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/thank-you') && !page.endsWith('/pl/thank-you')
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
