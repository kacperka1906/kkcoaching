import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const path = 'pl/moja-kolej-2027/index.html';
const htmlFile = join(dist, path);
assert.ok(existsSync(htmlFile), 'Preview is generated at /pl/moja-kolej-2027/');
const html = readFileSync(htmlFile, 'utf8');
const normalize = value => value.replaceAll('&amp;', '&').replace(/\s+/g, ' ');
const body = normalize(html);
const must = (condition, message) => assert.ok(condition, message);

must(/<html\s+lang="pl"/.test(body), 'Preview is entirely a Polish-language HTML page');
must(/<meta\s+name="robots"\s+content="noindex, follow"/.test(body), 'Preview has noindex, follow');
must(/<link\s+rel="canonical"\s+href="https:\/\/kkcoaching\.fit\/pl\/moja-kolej-2027\/"/.test(body), 'Canonical is self-referencing and slash-normalised');
must(!/<link\s+rel="alternate"\s+hreflang=/i.test(body), 'No fake EN alternate or hreflang');
must((body.match(/<h1\b/g) ?? []).length === 1, 'Exactly one H1');
must(/MOJA/.test(body) && /KOLEJ/.test(body) && /2027/.test(body), 'Campaign H1 is visible');
for (const sentence of [
  '16 tygodni', '10 osób', '4 stycznia 2027', '25 kwietnia 2027',
  '16 spotkań na żywo', 'Tym razem', 'indywidualne prowadzenie',
  'Zapisy jeszcze nie ruszyły', '£450', '£50', '£175', '£225',
  'Dla kogo', 'MyPTHub', 'WhatsApp'
]) must(body.toLowerCase().includes(sentence.toLowerCase()), 'Missing required preview text: ' + sentence);

must((body.match(/class="mk-stage"/g) ?? []).length === 4, 'Exactly four curriculum stages');
must((body.match(/class="mk-week"/g) ?? []).length === 16, 'Exactly 16 programme weeks');
must((body.match(/class="mk-feature /g) ?? []).length === 6, 'Exactly six community modules');
must((body.match(/class="mk-faq-index"/g) ?? []).length >= 15, 'At least 15 FAQ answers');
must(/<fieldset\s+disabled/.test(body), 'Form controls are disabled');
must(/<button[^>]*type="button"[^>]*disabled/.test(body), 'Cannot submit any form');
must(!/action="\/\.netlify\/functions\//.test(body), 'No active signup endpoint');
must(!/stripe\.com|mypthub\.net\/p\//i.test(body.slice(body.indexOf('mk-signup'),body.indexOf('mk-faq'))), 'No payment checkout in signup section');
must(!/https:\/\/wa\.me\/.*moja-kolej/.test(body), 'No WhatsApp invitation link');

const sitemapIndex = readFileSync(join(dist, 'sitemap-index.xml'), 'utf8');
const sitemapRefs = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)];
must(sitemapRefs.length > 0, 'Sitemap index exists');
const xmlFiles = readdirSync(dist).filter(file => /^sitemap.*\.xml$/.test(file));
for (const xml of xmlFiles) {
 const content = readFileSync(join(dist,xml),'utf8');
 must(!content.includes('moja-kolej-2027'), 'Preview excluded from ' + xml);
}
const files = ['index.html','pl/index.html','services/index.html','pl/services/index.html','contact/index.html','pl/contact/index.html'];
for (const file of files) {
 const current = readFileSync(join(dist,file),'utf8');
 must(!current.includes('moja-kolej-2027'), 'Existing page must not link to campaign: ' + file);
 must(!/<meta\s+name="robots"\s+content="noindex/.test(current), 'Existing page remains indexable: ' + file);
}
for(const image of ['kacper-gym-physique.webp','kacper-story-dscf1102.webp']) {
 must(existsSync(join(dist,'images',image)), 'Source photo exists: '+image);
}
console.log('MOJA KOLEJ 2027 preview audit passed: robots, canonical, Polish lang, 16 weeks, 15 FAQ, disabled form, isolated links, sitemap exclusion, existing pages indexable.');
