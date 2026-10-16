import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkPublishedSite } from '../scripts/live-production-smoke.mjs';
import { activeOfferIds } from '../src/lib/promotions.mjs';

const site = 'https://kkcoaching.fit';
const offers = JSON.parse(readFileSync(new URL('../src/data/promotions.json', import.meta.url), 'utf8')).offers;
const trial = 'free-7-day-kk-coaching-trial';
const taster = 'october-2026-free-pt-taster';
const october = 'october-2026-20-off-everything';

function mockSite({ now = '2026-10-16T12:00:00Z', missingTrial = false, oldDiscount = false, missingNoStore = false } = {}) {
  const clock = new Date(now);
  const ids = activeOfferIds(offers, clock);
  const discount = ids.includes(october);
  const homeIds = [trial, taster, ...(discount ? [october] : [])];
  const mocks = new Map();

  mocks.set('/promotion-state.json', {
    body: JSON.stringify({ version: 1, londonDate: '2026-10-16', activeOfferIds: ids }),
    headers: {
      'cache-control': missingNoStore ? 'public, max-age=3600' : 'no-store',
      'x-robots-tag': 'noindex'
    }
  });

  for (const [lang, home] of [['en', '/'], ['pl', '/pl/']]) {
    const cards = homeIds.filter(id => !(id === trial && missingTrial))
      .map(id => '<article data-promotion-id="' + id + '"></article>').join('');
    mocks.set(home, { body:
      '<html><head><link rel="canonical" href="' + site + home + '"></head>' +
      '<body><h1>Coaching</h1>' + cards +
      '<a href="https://kkcoaching.mypthub.net/p/' + (lang === 'pl' ? '240387' : '240389') + '">Trial</a>' +
      '<a href="' + (lang === 'pl' ? '/pl' : '') + '/contact/?interest=taster">Taster</a>' +
      (oldDiscount ? '<div data-october-only>£24</div>' : '') + '</body></html>'
    });
    mocks.set((lang === 'pl' ? '/pl' : '') + '/contact/', {
      body: '<form id="contact-form"><input name="email"><select name="interest"></select></form>'
    });
    const planId = site + (lang === 'pl' ? '/pl/training-plan#service' : '/training-plan#service');
    mocks.set((lang === 'pl' ? '/pl' : '') + '/training-plan/', {
      body: '<script type="application/ld+json">' +
        JSON.stringify({ '@graph': [{ '@id': planId, offers: { price: discount ? 24 : 30 } }] }) +
        '</script>'
    });
  }
  mocks.set('/robots.txt', { body: 'User-agent: *\nSitemap: https://kkcoaching.fit/sitemap-index.xml\n' });
  mocks.set('/sitemap-index.xml', { body: '<sitemapindex></sitemapindex>' });

  const paths = [];
  const fetcher = async url => {
    const path = url.slice(site.length);
    paths.push(path);
    const value = mocks.get(path);
    return value
      ? new Response(value.body, { status: 200, headers: value.headers || {} })
      : new Response('Missing', { status: 404 });
  };
  return { fetcher, now: clock, paths };
}

test('release smoke checks only read-only public routes and passes October', async () => {
  const fixture = mockSite();
  assert.deepEqual(await checkPublishedSite(fixture), []);
  assert.equal(fixture.paths.length, 9);
  assert(fixture.paths.every(path => !path.includes('/.netlify/functions/')));
});

test('release smoke passes November with expired discount omitted', async () => {
  assert.deepEqual(await checkPublishedSite(mockSite({ now: '2026-11-01T12:00:00Z' })), []);
});

test('release smoke blocks a stale deployment missing trial', async () => {
  const problems = await checkPublishedSite(mockSite({ missingTrial: true }));
  assert(problems.some(p => p.includes('unexpected live promotion cards')));
});

test('release smoke blocks expired promotional HTML in November', async () => {
  const problems = await checkPublishedSite(mockSite({ now: '2026-11-01T12:00:00Z', oldDiscount: true }));
  assert(problems.some(p => p.includes('expired promotional pricing')));
});

test('release smoke blocks improperly cached promotion manifests', async () => {
  const problems = await checkPublishedSite(mockSite({ missingNoStore: true }));
  assert(problems.some(p => p.includes('Cache-Control: no-store')));
});
