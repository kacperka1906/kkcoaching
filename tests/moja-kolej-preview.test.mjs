import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const route = '/pl/moja-kolej-2027/';
const origin = 'https://kkcoaching.fit';
const target = new URL('pl/moja-kolej-2027/index.html', dist);
assert.ok(fs.existsSync(target), 'Preview HTML exists after build');
const html = fs.readFileSync(target, 'utf8');
const head = html.split('</head>')[0];
const main = html.split('<main id="main">')[1]?.split('</main>')[0];
assert.ok(main, 'Page renders its content inside the standard main landmark');
assert.match(html, /<html lang="pl">/, 'Polish document language');
assert.match(head, /<meta name="robots" content="noindex, follow"/, 'Explicit noindex and follow');
assert.match(head, /<link rel="canonical" href="https:\/\/kkcoaching\.fit\/pl\/moja-kolej-2027\/"/, 'Self canonical');
assert.doesNotMatch(head, /hreflang=/i, 'No fabricated English alternate');
assert.equal((main.match(/<h1\b/g) ?? []).length, 1, 'One landing page H1');
assert.match(main, /PODGLĄD PROGRAMU/, 'Clearly labelled preview');
assert.match(main, /Zapisy jeszcze nie ruszyły/, 'Disabled enrolment notice');
assert.match(main, /<fieldset disabled/, 'All input controls are disabled');
assert.match(main, /<button[^>]+disabled/, 'No live submission button');
assert.doesNotMatch(main, /<form\b/i, 'No live signup form');
assert.doesNotMatch(main, /<a\b[^>]*href="(?:https:\/\/(?:checkout\.stripe\.com|kkcoaching\.mypthub\.net)|\/\.netlify\/functions)/i, 'No checkout or submission links');
assert.match(main, /£450/, 'Working proposed price');
for (const value of ['£50','£175','£225','16 spotkań na żywo','25 KWIETNIA 2027','04 STYCZNIA 2027']) assert.ok(main.includes(value), 'Missing programme detail: ' + value);
assert.equal((main.match(/class="phase-head"/g) ?? []).length, 4, 'Four timeline phases');
assert.equal((main.match(/class="week-index"/g) ?? []).length, 16, 'Sixteen weekly steps');
assert.equal((main.match(/<details\b/g) ?? []).length, 15, 'Fifteen FAQ entries');
assert.equal((main.match(/class="day-name"/g) ?? []).length, 6, 'Six weekly rhythm entries');
assert.ok(main.includes('/images/kacper.jpg'), 'Uses existing coach photography');
const index = fs.readFileSync(new URL('sitemap-index.xml', dist), 'utf8');
const sitemaps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => path.basename(new URL(m[1]).pathname));
assert.ok(sitemaps.length, 'Sitemap index exists');
for (const name of sitemaps) {
  const xml = fs.readFileSync(new URL(name, dist), 'utf8');
  assert.ok(!xml.includes('/pl/moja-kolej-2027'), 'Preview must not enter any sitemap');
}
for (const original of ['index.html','pl/index.html','services/index.html','pl/services/index.html',
  'contact/index.html','pl/contact/index.html']) {
  const existing = fs.readFileSync(new URL(original, dist), 'utf8');
  assert.ok(!existing.includes('/moja-kolej-2027'), original + ' must not link to preview');
  assert.doesNotMatch(existing, /<meta name="robots" content="noindex/, original + ' remains indexable');
}
const siteConfig = fs.readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
assert.ok(siteConfig.includes("'/pl/moja-kolej-2027'"), 'Exact sitemap exclusion is in config');
assert.ok(!fs.readFileSync(new URL('robots.txt', dist), 'utf8').includes('Disallow: /pl/moja-kolej-2027'), 'No robots.txt block');
const outputFiles = fs.readdirSync(new URL('pl/', dist));
assert.ok(outputFiles.includes('moja-kolej-2027'), 'Only expected PL route created');
console.log('PASS: MOJA KOLEJ 2027 isolated noindex preview; sitemap, meta, 15 FAQs, 16 weeks, inactive signup, prices, and original page isolation.');
