import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const source = await readFile(new URL('../src/components/reviews/review-utils.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const { filterReviews, sortReviews, sourceSummary, legitimateRating, safeUrl } =
  await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

const fallback = JSON.parse(await readFile(new URL('../src/data/reviews/reviews.json', import.meta.url), 'utf8'));
const admin = JSON.parse(await readFile(new URL('../src/data/admin-v2.json', import.meta.url), 'utf8'));
const adminReviews = admin.reviews.items;
const widgetConfig = JSON.parse(await readFile(new URL('../src/data/reviews/reviews-config.json', import.meta.url), 'utf8'));

assert.equal(fallback.length, 5);
const facebook = adminReviews.filter(r => r.source === 'facebook');
const google = adminReviews.filter(r => r.source === 'google');
assert.ok(google.some(r => r.client === 'Thomas Matthews'));
assert.ok(google.some(r => r.client === 'Marisa Gough'));
assert.deepEqual(facebook.map(r => r.client), ['Aneta K-o', 'Sylwia Malys', 'Agnieszka Kałużna', 'Sebastian Kolesnik', 'Marta Kasz']);
assert.deepEqual(facebook.map(r => r.quote), fallback.map(r => r.quote));
assert.ok(facebook.every(r => r.approved && r.avatar));
assert.equal(facebook.find(r => r.id === 'marta').enabled, false);
assert.equal(google.length, 5);
assert.ok(google.every(r => r.enabled && r.approved && !r.client.startsWith('Marta') && !r.quote.includes('…') && r.quote.length > 200));
assert.ok(facebook.every(r => r.source === 'facebook' && r.recommendation === true && r.rating === null));
assert.ok(adminReviews.find(r => r.client === 'Marta Kasz').quote.endsWith('z czystym sumieniem polecam!'));

const base = { ...fallback[0], approved: true, enabled: true };
const whatsapp = { ...base, source: 'whatsapp', recommendation: null };
const messenger = { ...base, source: 'messenger', recommendation: null };
assert.equal(filterReviews([whatsapp]).length, 0);
assert.equal(filterReviews([{ ...whatsapp, consentConfirmed: true }]).length, 1);
assert.equal(filterReviews([messenger]).length, 0);
assert.equal(filterReviews([{ ...messenger, consentConfirmed: true }]).length, 1);
assert.equal(filterReviews([{ ...messenger, consentConfirmed: true, approved: false }]).length, 0);
assert.equal(legitimateRating({ ...base, source: 'facebook', rating: 5 }), null);
assert.equal(legitimateRating({ ...base, source: 'whatsapp', rating: 5 }), null);
assert.equal(legitimateRating({ ...base, source: 'messenger', rating: 5 }), null);
assert.equal(legitimateRating({ ...base, source: 'google', rating: 4.5 }), 4.5);
assert.deepEqual(sourceSummary(fallback).map(s => [s.source, s.count, s.recommendations, s.average]), [['facebook', 5, 5, null]]);
assert.equal(safeUrl('javascript:alert(1)'), undefined);
assert.equal(safeUrl('//evil.example'), undefined);
assert.equal(widgetConfig.desktopColumns, 1);
assert.equal(widgetConfig.tabletColumns, 1);
assert.equal(widgetConfig.mobileCardWidth, '100%');
assert.equal(widgetConfig.reviewClampLines, 5);

const dated = [{ ...base, id: 'new', date: '2026-01-01' }, { ...base, id: 'missing' }, { ...base, id: 'old', date: '2025-01-01' }];
assert.deepEqual(sortReviews(dated, 'oldest').map(r => r.id), ['old', 'new', 'missing']);
assert.deepEqual(sortReviews(dated, 'newest').map(r => r.id), ['new', 'old', 'missing']);

for (const route of ['reviews-widget-preview', 'pl/reviews-widget-preview']) {
  const html = await readFile(new URL(`../dist/${route}/index.html`, import.meta.url), 'utf8');
  assert.equal((html.match(/data-review-widget(?:\s|>)/g) || []).length, 1, `${route}: one widget`);
  assert.equal((html.match(/data-review-card(?:\s|>)/g) || []).length, google.length);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /data-filter="all"|data-review-card data-source="facebook"/);
  assert.ok(html.includes(admin.reviews.leaveGoogleReviewUrl));
  assert.ok(html.includes(admin.reviews.googlePlaceId));
  assert.ok(html.includes(admin.reviews.googleReviewsUrl.replaceAll('&', '&amp;')) || html.includes(admin.reviews.googleReviewsUrl));
  assert.doesNotMatch(html, /data-filter="whatsapp"|data-filter="messenger"/);
}

for (const route of ['index.html', 'pl/index.html']) {
  const html = await readFile(new URL(`../dist/${route}`, import.meta.url), 'utf8');
  assert.equal((html.match(/data-review-widget(?:\s|>)/g) || []).length, 1, `${route}: one homepage widget`);
  assert.equal((html.match(/data-review-card(?:\s|>)/g) || []).length, google.length);
  assert.doesNotMatch(html, /data-filter="all"|data-review-card data-source="facebook"/);
  assert.ok(html.includes(admin.reviews.leaveGoogleReviewUrl));
  assert.ok(html.includes(admin.reviews.googlePlaceId));
  assert.ok(html.includes(admin.reviews.googleReviewsUrl.replaceAll('&', '&amp;')) || html.includes(admin.reviews.googleReviewsUrl));
  assert.doesNotMatch(html, /data-filter="whatsapp"|data-filter="messenger"/);
}

const sitemap = await readFile(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
assert.doesNotMatch(sitemap, /reviews-widget-preview/);

const adminConfig = JSON.parse(await readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8'));
const reviewsField = adminConfig.collections.find(c => c.name === 'admin_v2').files[0].fields.find(f => f.name === 'reviews');
const itemsField = reviewsField.fields.find(f => f.name === 'items');
const sourceField = itemsField.fields.find(f => f.name === 'source');
assert.deepEqual(sourceField.options.map(o => o.value), ['facebook', 'google', 'whatsapp', 'messenger', 'manual']);
assert.equal(itemsField.fields.find(f => f.name === 'approved').default, false);
assert.equal(itemsField.fields.find(f => f.name === 'consentConfirmed').default, false);
assert.equal(reviewsField.fields.find(f => f.name === 'enabled').widget, 'hidden');

console.log('PASS: admin-backed reviews, private-message consent, rating rules, widget placement and preview SEO isolation.');
