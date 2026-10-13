import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Inspect the deployed output after all finalizers, rather than Astro source.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const origin = 'https://kkcoaching.fit';
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(([, key, value]) => [key.toLowerCase(), value]));
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
assert.ok(fs.existsSync(dist), 'Build dist before running SEO integrity checks');
const files = walk(dist);
const pages = new Map();
for (const file of files.filter(file => file.endsWith('.html'))) {
  const relative = path.relative(dist, file).split(path.sep).join('/');
  if (relative === 'admin/index.html' || relative.startsWith('admin/')) continue;
  const route = relative === 'index.html' ? '/' : relative === '404.html' ? '/404/' : relative.endsWith('/index.html')
    ? `/${relative.slice(0, -'index.html'.length)}` : `/${relative}`;
  const html = fs.readFileSync(file, 'utf8');
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attrs(tag));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attrs(tag));
  const canonical = links.filter(link => link.rel === 'canonical');
  assert.equal(canonical.length, 1, `${route}: exactly one canonical`);
  assert.equal(canonical[0].href, `${origin}${route}`, `${route}: final canonical matches output route`);
  const robots = metas.filter(meta => meta.name === 'robots');
  assert.equal(robots.length, 1, `${route}: exactly one robots directive`);
  const noindex = /\bnoindex\b/i.test(robots[0].content ?? '');
  const alternates = links.filter(link => link.rel === 'alternate' && link.hreflang);
  const schema = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(([, json]) => JSON.parse(json));
  pages.set(route, { html, noindex, alternates, schema });
}

let localized = 0;
for (const [route, page] of pages) {
  if (!page.noindex) assert.equal(page.alternates.length, 3, `${route}: indexable EN/PL page has three language alternates`);
  if (!page.alternates.length) continue;
  localized += 1;
  const byLanguage = new Map(page.alternates.map(link => [link.hreflang, link.href]));
  assert.deepEqual([...byLanguage.keys()].sort(), ['en', 'pl', 'x-default'], `${route}: unique supported languages`);
  assert.equal(byLanguage.get('x-default'), byLanguage.get('en'), `${route}: x-default is English`);
  const language = page.html.match(/<html\b[^>]*lang=["']([^"']+)["']/i)?.[1];
  assert.equal(byLanguage.get(language), `${origin}${route}`, `${route}: own language alternate is self-canonical`);
  for (const [alternateLanguage, href] of byLanguage) {
    const url = new URL(href);
    assert.equal(url.origin, origin, `${route}: ${alternateLanguage} stays on canonical origin`);
    const target = pages.get(url.pathname);
    assert.ok(target, `${route}: ${alternateLanguage} route exists (${url.pathname})`);
    assert.equal(target.noindex, page.noindex, `${route}: alternate has matching indexability`);
    assert.deepEqual([...new Map(target.alternates.map(link => [link.hreflang, link.href]))].sort(), [...byLanguage].sort(), `${route}: reciprocal language cluster at ${url.pathname}`);
  }
}

const indexXml = fs.readFileSync(path.join(dist, 'sitemap-index.xml'), 'utf8');
const sitemapFiles = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => {
  const url = new URL(value);
  assert.equal(url.origin, origin, 'Sitemap index stays on canonical origin');
  return path.join(dist, url.pathname.replace(/^\//, ''));
});
assert.ok(sitemapFiles.length, 'Sitemap index references at least one sitemap');
const sitemapUrls = sitemapFiles.flatMap(file => [...fs.readFileSync(file, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => value));
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'No duplicate sitemap URLs');
const listed = new Set();
for (const value of sitemapUrls) {
  const url = new URL(value);
  assert.equal(url.origin, origin, `Sitemap URL has canonical origin: ${value}`);
  assert.ok(!url.pathname.startsWith('/admin/'), 'CMS is excluded from sitemap');
  const page = pages.get(url.pathname);
  assert.ok(page, `Sitemap route exists: ${value}`);
  assert.equal(page.noindex, false, `Sitemap excludes noindex: ${value}`);
  assert.equal(value, `${origin}${url.pathname}`, `Sitemap URL has no query/fragment: ${value}`);
  listed.add(url.pathname);
}
for (const [route, page] of pages) {
  if (!page.noindex) assert.ok(listed.has(route), `Indexable page is in sitemap: ${route}`);
}

const commercial = ['personal-training-cwmbran', 'online-coaching', 'hybrid-coaching', 'training-plan'];
for (const prefix of ['/', '/pl/']) {
  for (const service of commercial) {
    const target = `${prefix}${service}/`;
    const page = pages.get(target);
    assert.ok(page && !page.noindex, `Commercial destination is indexable: ${target}`);
    const referringPages = [...pages].filter(([route, record]) => route !== target && !record.noindex && [...record.html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].some(([, href]) => {
      const url = new URL(href.replaceAll('&amp;', '&'), `${origin}${route}`);
      return url.origin === origin && url.pathname === target;
    }));
    assert.ok(referringPages.length, `Commercial destination has an internal link from another indexable page: ${target}`);
    const nodes = page.schema.flatMap(block => block['@graph'] ?? [block]);
    const serviceNode = nodes.find(node => node['@type'] === 'Service' && node.provider);
    assert.ok(serviceNode, `${target}: describes its service and provider`);
    assert.equal(serviceNode.provider['@id'], `${origin}/#business`, `${target}: service references the independent business`);
  }
}
for (const [route, page] of pages) {
  if (page.noindex) continue;
  const nodes = page.schema.flatMap(block => block['@graph'] ?? [block]);
  const businesses = nodes.filter(node => node['@id'] === `${origin}/#business` && node.name);
  assert.ok(businesses.length, `${route}: shared business entity exists`);
  for (const business of businesses) {
    assert.equal(business.name, 'KK Coaching', `${route}: consistent business identity`);
    assert.ok(!business.address, `${route}: training venue address is not assigned to KK Coaching's own premises`);
  }
  const venue = nodes.find(node => node['@id'] === `${origin}/#jd-gyms-cwmbran-training-location` && node.name);
  assert.equal(venue?.['@type'], 'Place', `${route}: venue remains a separate place`);
  assert.equal(venue?.name, 'JD Gyms Cwmbran', `${route}: accurate training venue identity`);
}
console.log(`SEO integrity passed: ${pages.size} public HTML pages, ${localized} pages with reciprocal alternates, ${listed.size} indexable sitemap URLs, 8 linked commercial destinations, independent business/venue relationships.`);
