import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isOfferActive, activeOfferIds } from '../src/lib/promotions.mjs';

const root = new URL('../', import.meta.url);
const read = relative => fs.readFileSync(new URL(relative, root), 'utf8');
const offers = JSON.parse(read('src/data/promotions.json')).offers;
const pricing = JSON.parse(read('src/data/pricing.json'));
const state = JSON.parse(read('dist/promotion-state.json'));
const now = new Date(state.builtAt);
assert.deepEqual(state.activeOfferIds, activeOfferIds(offers, now), 'Published state matches built offers');
const october = isOfferActive(offers.find(o => o.id === 'october-2026-20-off-everything'), now);
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
  ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
for (const file of walk(fileURLToPath(new URL('dist/', root))).filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  if (!october) {
    assert.doesNotMatch(html, /data-promotion-id="october-2026-20-off-everything"/, `${file}: expired article absent`);
    assert.doesNotMatch(html, /data-october-only/, `${file}: expired price/note markup absent`);
    const text = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /OCTOBER|PAŹDZIERNIK|październik|20% OFF EVERYTHING/, `${file}: expired offer text absent`);
  }
}
for (const prefix of ['', 'pl/']) {
  const html = read(`dist/${prefix}training-plan/index.html`);
  const nodes = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap(([, text]) => { const schema = JSON.parse(text); return schema['@graph'] ?? [schema]; });
  const service = nodes.find(node => node['@id'] === `https://kkcoaching.fit/${prefix}training-plan#service`);
  assert.ok(service?.offers, 'Plan service has its Offer');
  assert.equal(service.offers.price, pricing.trainingPlan.price * (october ? 0.8 : 1), 'Plan schema uses the current visible price');
  assert.equal(service.offers.priceCurrency, 'GBP');
}
console.log(`Promotion HTML/schema passed for London date ${state.londonDate}; October active=${october}`);
