// Read-only production smoke test. Never submit enquiries, trigger build hooks,
// change CMS data or call payment/analytics endpoints.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { activeOfferIds, isOfferActive } from '../src/lib/promotions.mjs';

const site = 'https://kkcoaching.fit';
const offers = JSON.parse(readFileSync(new URL('../src/data/promotions.json', import.meta.url), 'utf8')).offers;
const pricing = JSON.parse(readFileSync(new URL('../src/data/pricing.json', import.meta.url), 'utf8'));
const october = offers.find(offer => offer.id === 'october-2026-20-off-everything');
const trialId = 'free-7-day-kk-coaching-trial';
const tasterId = 'october-2026-free-pt-taster';
const octoberId = 'october-2026-20-off-everything';

function must(condition, message) {
  if (!condition) throw new Error(message);
}

function promotionMarkupIds(html) {
  return [...html.matchAll(/data-promotion-id="([^"]+)"/g)].map(match => match[1]);
}

function planOfferPrice(html, language) {
  const serviceId = site + (language === 'pl' ? '/pl/training-plan#service' : '/training-plan#service');
  const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const [, contents] of scripts) {
    const data = JSON.parse(contents);
    const nodes = data['@graph'] || [data];
    const match = nodes.find(node => node['@id'] === serviceId);
    if (match?.offers) return Number(match.offers.price);
  }
  return null;
}

export async function checkPublishedSite({ fetcher = fetch, now = new Date() } = {}) {
  const errors = [];
  const get = async (path) => {
    const response = await fetcher(site + path, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'KK-Coaching-Release-Smoke/1.0' },
      signal: AbortSignal.timeout(12_000)
    });
    must(response.ok, path + ': expected HTTP 2xx, got ' + response.status);
    return { body: await response.text(), headers: response.headers };
  };
  // Keep checks independent so one broken URL does not conceal other issues.
  async function check(label, fn) {
    try { await fn(); } catch (error) {
      errors.push(label + ': ' + (error instanceof Error ? error.message : 'unknown check failure'));
    }
  }

  const activeIds = activeOfferIds(offers, now);
  const discountActive = isOfferActive(october, now);
  const expectedHomepageIds = [trialId, tasterId, ...(discountActive ? [octoberId] : [])];

  await check('promotion-state', async () => {
    const { body, headers } = await get('/promotion-state.json');
    const state = JSON.parse(body);
    must(state.version === 1 && Array.isArray(state.activeOfferIds),
      'published manifest missing or malformed');
    must(JSON.stringify([...state.activeOfferIds].sort()) === JSON.stringify(activeIds),
      'published offer IDs do not match the current GitHub configuration');
    must((headers.get('cache-control') || '').includes('no-store'),
      'manifest response must use Cache-Control: no-store');
    must((headers.get('x-robots-tag') || '').includes('noindex'),
      'manifest response must be noindex');
  });

  for (const [language, prefix] of [['en', '/'], ['pl', '/pl/']]) {
    await check(language + ' homepage', async () => {
      const { body } = await get(prefix);
      const ids = promotionMarkupIds(body);
      must(JSON.stringify(ids) === JSON.stringify(expectedHomepageIds),
        'unexpected live promotion cards or order: ' + JSON.stringify(ids));
      must(body.includes('https://kkcoaching.mypthub.net/p/' + (language === 'pl' ? '240387' : '240389')),
        '7-day trial has incorrect or missing checkout destination');
      must(body.includes((language === 'pl' ? '/pl' : '') + '/contact/?interest=taster'),
        'free taster CTA is missing or incorrectly linked');
      if (!discountActive) {
        must(!body.includes('data-october-only'), 'expired promotional pricing remains in original HTML');
      }
      must(/<h1(?:\s|>)/i.test(body), 'homepage H1 missing');
      must(body.includes('rel="canonical"'), 'canonical tag missing');
    });

    await check(language + ' contact', async () => {
      const { body } = await get((language === 'pl' ? '/pl' : '') + '/contact/');
      must(body.includes('id="contact-form"'), 'contact form missing');
      must(body.includes('name="email"') && body.includes('name="interest"'),
        'contact form required fields missing');
    });

    await check(language + ' training plan', async () => {
      const { body } = await get((language === 'pl' ? '/pl' : '') + '/training-plan/');
      const price = planOfferPrice(body, language);
      const expectedPrice = pricing.trainingPlan.price * (discountActive ? 0.8 : 1);
      must(price === expectedPrice,
        'training plan structured-data price differs from the active offer: ' + price);
    });
  }

  await check('MOJA KOLEJ 2027 — hidden Polish preview', async () => {
    const {body} = await get('/pl/moja-kolej-2027/');
    must(/<html lang="pl">/.test(body), 'programme page must be Polish');
    must(/<meta name="robots" content="noindex, follow"/.test(body), 'production page must remain noindex, follow');
    must(/<link rel="canonical" href="https:\/\/kkcoaching\.fit\/pl\/moja-kolej-2027\/"/.test(body), 'canonical must be self-referencing');
    must(!/hreflang=/.test(body), 'must not invent an English alternate');
    must(body.includes('Zapisy jeszcze nie ruszyły'), 'preview enrolment warning missing');
    must(body.includes('<fieldset disabled'), 'enrolment fields must remain disabled');
    must(!/<form\b/i.test(body), 'no active form on the preview');
    must(!body.includes('checkout.stripe.com'), 'checkout must not be activated');
    const config = JSON.parse((await get('/admin/config.yml')).body);
    must(config.backend.branch === 'main', 'production CMS must remain on main');
    must(config.collections.some(item=>item.name==='moja_kolej_2027'), 'dedicated programme editor not published');
  });
  await check('MOJA KOLEJ 2027 — excluded from all published sitemaps', async () => {
    const xml = (await get('/sitemap-index.xml')).body;
    const links = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);
    must(links.length > 0, 'sitemap index is empty');
    for (const url of links) {
      const page = (await get(url)).body;
      must(!page.includes('/pl/moja-kolej-2027'), 'new hidden page leaked into '+url);
    }
  });
  await check('MOJA KOLEJ 2027 — no accidental promotion on home or offers', async () => {
    for(const url of ['/','/pl/','/services/','/pl/services/']) {
      const page=(await get(url)).body;
      must(!page.includes('/moja-kolej-2027'), 'campaign linked from '+url);
      must(!page.includes('<meta name="robots" content="noindex'), 'existing page accidentally noindexed: '+url);
    }
  });

  await check('robots.txt', async () => {
    const { body } = await get('/robots.txt');
    must(body.includes('Sitemap: https://kkcoaching.fit/sitemap-index.xml'), 'canonical sitemap declaration missing');
  });
  await check('sitemap', async () => {
    const { body } = await get('/sitemap-index.xml');
    must(body.includes('<sitemapindex') || body.includes('<urlset'), 'sitemap document missing');
  });
  return errors;
}

async function main() {
  const maxAttempts = 12;
  const retryMs = 30_000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const errors = await checkPublishedSite();
    if (!errors.length) {
      console.log('PASS: production offers, active forms, plan prices, manifest, robots, sitemap and hidden MOJA KOLEJ programme verified.');
      return;
    }
    console.error('Attempt ' + attempt + '/' + maxAttempts + ': ' + errors.join('; '));
    if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, retryMs));
  }
  throw new Error('Production does not match the audited main-branch release. Inspect Netlify published deploy and build logs.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
