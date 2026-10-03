import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = await readFile(new URL('../src/components/reviews/review-utils.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const { filterReviews, sortReviews, sourceSummary, legitimateRating, safeUrl } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const data = JSON.parse(await readFile(new URL('../src/data/reviews/reviews.json', import.meta.url), 'utf8'));
assert.equal(data.length, 5); assert.equal(new Set(data.map(r => r.id)).size, 5);
assert.deepEqual(data.map(r => r.client), ['Aneta K-o', 'Sylwia Malys', 'Agnieszka Kałużna', 'Sebastian Kolesnik', 'Marta Kasz']);
assert.equal(filterReviews(data).length, 5);
assert.ok(data.every(r => r.quote.length > 100 && r.avatar.endsWith(`${r.id}.jpg`) && r.recommendation && r.rating === null));
assert.ok(data.find(r => r.id === 'marta').quote.endsWith('z czystym sumieniem polecam!'));
const base = { ...data[0], source: 'whatsapp' };
assert.equal(filterReviews([base, { ...base, consentConfirmed: false }, { ...base, consentConfirmed: true, approved: false }]).length, 0);
assert.equal(filterReviews([{ ...base, consentConfirmed: true }]).length, 1);
assert.equal(filterReviews([{ ...base, consentConfirmed: true, enabled: false }]).length, 0);
assert.equal(filterReviews([{ ...data[0], quote: '   ' }]).length, 0);
assert.equal(filterReviews(data, { source: 'google' }).length, 0);
assert.equal(filterReviews(data, { minRating: 4 }).length, 0);
assert.equal(filterReviews(data, { authorInclude: ['marta'], keywordInclude: ['trening'] }).length, 1);
assert.equal(filterReviews(data, { authorExclude: ['marta'] }).length, 4);
assert.equal(filterReviews(data, { keywordExclude: ['Kacper'] }).length, 0);
assert.equal(filterReviews([{ ...data[0], featured: false }], { featuredOnly: true }).length, 0);
assert.equal(legitimateRating({ ...data[0], rating: 5 }), null);
assert.equal(legitimateRating({ ...data[0], source: 'google', rating: 4.5 }), 4.5);
assert.equal(legitimateRating({ ...data[0], source: 'manual', rating: 8 }), null);
assert.deepEqual(sourceSummary(data).map(s => [s.source, s.count, s.recommendations, s.average]), [['facebook', 5, 5, null]]);
assert.equal(sourceSummary([...data, { ...data[0], source: 'google', rating: 4 }])[1].average, 4);
const dated = [{ ...data[0], id: 'new', date: '2026-01-01' }, { ...data[0], id: 'missing' }, { ...data[0], id: 'old', date: '2025-01-01' }];
assert.deepEqual(sortReviews(dated, 'oldest').map(r => r.id), ['old', 'new', 'missing']);
assert.deepEqual(sortReviews(dated, 'newest').map(r => r.id), ['new', 'old', 'missing']);
assert.deepEqual(sortReviews(data, 'random', 'session'), sortReviews(data, 'random', 'session'));
assert.deepEqual(sortReviews(data, 'manual'), data);
assert.equal(safeUrl('javascript:alert(1)'), undefined); assert.equal(safeUrl('//evil.example'), undefined);
for (const route of ['reviews-widget-preview', 'pl/reviews-widget-preview']) {
  const html = await readFile(new URL(`../dist/${route}/index.html`, import.meta.url), 'utf8');
  assert.equal((html.match(/data-review-widget(?:\s|>)/g) || []).length, 1, `${route}: one widget`);
  assert.equal((html.match(/data-review-card(?:\s|>)/g) || []).length, 5);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /application\/ld\+json|data-filter="google"|data-filter="whatsapp"|class="rw-rating"/);
}
const sitemap = await readFile(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
assert.doesNotMatch(sitemap, /reviews-widget-preview/);
for (const route of ['index.html', 'pl/index.html']) {
  const html = await readFile(new URL(`../dist/${route}`, import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<section[^>]*data-review-widget|href="[^"]*reviews-widget-preview/);
}
console.log('PASS: review consent/filtering/rating/sorting rules, content, unique widgets, noindex, sitemap and homepage isolation.');
